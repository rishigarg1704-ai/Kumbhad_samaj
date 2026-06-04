from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import AuditLog, Family, FamilyMember, Membership, Payment, User
from app.schemas.admin import (
    AdminCreateMemberRequest,
    AdminFamilyMemberInput,
    AdminUpdateFamilyMemberRequest,
    AdminUpdateMemberRequest,
)
from app.services.membership import generate_membership_number


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_admin_audit_log(
    db: Session,
    *,
    actor_admin_id: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    before_state: dict[str, Any] | None,
    after_state: dict[str, Any] | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    db.add(
        AuditLog(
            actor_admin_id=actor_admin_id,
            actor_type="admin",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=json.dumps(before_state) if before_state is not None else None,
            after_state=json.dumps(after_state) if after_state is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )


def list_members(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
    status_filter: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    # Base query joining User, Family, and Membership
    query = (
        select(User, Family, Membership)
        .outerjoin(Family, Family.head_user_id == User.id)
        .outerjoin(Membership, Membership.family_id == Family.id)
        .where(User.deleted_at.is_(None))
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                Family.mobile_number.ilike(search_pattern),
                Membership.membership_number.ilike(search_pattern),
            )
        )

    if status_filter:
        query = query.where(Membership.status == status_filter)

    if start_date:
        query = query.where(Membership.start_date >= start_date)
    if end_date:
        query = query.where(Membership.start_date <= end_date)

    # Count total items before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Apply sorting
    sort_attr = User.created_at
    if sort_by == "full_name":
        sort_attr = User.full_name
    elif sort_by == "email":
        sort_attr = User.email
    elif sort_by == "status":
        sort_attr = Membership.status
    elif sort_by == "expiry_date":
        sort_attr = Membership.expiry_date
    elif sort_by == "membership_number":
        sort_attr = Membership.membership_number

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for user, family, membership in results:
        items.append({
            "user_id": user.id,
            "family_id": family.id if family else None,
            "membership_id": membership.id if membership else None,
            "full_name": user.full_name,
            "email": user.email,
            "mobile_number": family.mobile_number if family else None,
            "membership_number": membership.membership_number if membership else None,
            "status": membership.status if membership else "inactive",
            "expiry_date": membership.expiry_date if membership else None,
        })

    return items, total_items


def get_member_detail(db: Session, member_id: str) -> dict[str, Any]:
    # Load user
    user = db.execute(select(User).where(User.id == member_id, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Load family
    family = db.execute(select(Family).where(Family.head_user_id == user.id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Load membership
    membership = db.execute(select(Membership).where(Membership.family_id == family.id, Membership.deleted_at.is_(None))).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")

    # Load family members
    family_members = db.execute(
        select(FamilyMember).where(FamilyMember.family_id == family.id, FamilyMember.deleted_at.is_(None))
    ).scalars().all()

    # Load payments summary
    payments = db.execute(
        select(Payment).where(Payment.family_id == family.id, Payment.status == "success")
    ).scalars().all()

    total_paid = sum(Decimal(p.amount) for p in payments)
    last_payment = max((p.paid_at for p in payments if p.paid_at), default=None)

    return {
        "user": user,
        "family": family,
        "membership": membership,
        "family_members": family_members,
        "payment_summary": {
            "total_paid": total_paid,
            "last_payment_at": last_payment,
        }
    }


def create_member(
    db: Session,
    payload: AdminCreateMemberRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    email = payload.email.strip().lower()

    # Check unique email
    existing_user = db.execute(select(User).where(User.email == email, User.deleted_at.is_(None))).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    # Create User
    user = User(
        email=email,
        full_name=payload.head_name.strip(),
        status="active" if payload.membership_status == "active" else "inactive",
    )
    db.add(user)
    db.flush()

    # Create Family
    family = Family(
        head_user_id=user.id,
        address=payload.address.strip(),
        mobile_number=payload.phone.strip(),
        email=email,
        status="active",
    )
    db.add(family)
    db.flush()

    # Create Family Members
    for fm_input in payload.family_members:
        fm = FamilyMember(
            family_id=family.id,
            name=fm_input.name.strip(),
            date_of_birth=fm_input.date_of_birth,
            gender=fm_input.gender,
            relationship=fm_input.relationship.strip(),
        )
        db.add(fm)

    # Generate membership
    membership_number = generate_membership_number(db)
    membership = Membership(
        family_id=family.id,
        membership_number=membership_number,
        status=payload.membership_status,
        start_date=payload.start_date,
        expiry_date=payload.expiry_date,
    )
    db.add(membership)
    db.flush()

    # Write audit log
    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="member_created",
        entity_type="membership",
        entity_id=membership.id,
        before_state=None,
        after_state={
            "user_id": user.id,
            "family_id": family.id,
            "membership_id": membership.id,
            "membership_number": membership_number,
            "status": membership.status,
            "start_date": str(membership.start_date) if membership.start_date else None,
            "expiry_date": str(membership.expiry_date) if membership.expiry_date else None,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "user_id": user.id,
        "family_id": family.id,
        "membership_id": membership.id,
        "membership_number": membership_number,
        "status": membership.status,
    }


def update_member(
    db: Session,
    member_id: str,
    payload: AdminUpdateMemberRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    # Load user
    user = db.execute(select(User).where(User.id == member_id, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Load family
    family = db.execute(select(Family).where(Family.head_user_id == user.id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Load membership
    membership = db.execute(select(Membership).where(Membership.family_id == family.id, Membership.deleted_at.is_(None))).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")

    before_state = {
        "head_name": user.full_name,
        "phone": family.mobile_number,
        "email": user.email,
        "address": family.address,
        "status": membership.status,
    }

    after_state = before_state.copy()

    if payload.email is not None:
        email = payload.email.strip().lower()
        if email != user.email:
            existing = db.execute(select(User).where(User.email == email, User.deleted_at.is_(None))).scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")
            user.email = email
            family.email = email
            after_state["email"] = email

    if payload.head_name is not None:
        user.full_name = payload.head_name.strip()
        after_state["head_name"] = user.full_name

    if payload.phone is not None:
        family.mobile_number = payload.phone.strip()
        after_state["phone"] = family.mobile_number

    if payload.address is not None:
        family.address = payload.address.strip()
        after_state["address"] = family.address

    if payload.status is not None:
        membership.status = payload.status
        if payload.status == "active":
            user.status = "active"
        after_state["status"] = membership.status

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="member_updated",
        entity_type="membership",
        entity_id=membership.id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "member_id": user.id,
        "updated": True,
    }


def delete_member(
    db: Session,
    member_id: str,
    reason: str,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    # Load user
    user = db.execute(select(User).where(User.id == member_id, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Load family
    family = db.execute(select(Family).where(Family.head_user_id == user.id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    # Load membership
    membership = db.execute(select(Membership).where(Membership.family_id == family.id, Membership.deleted_at.is_(None))).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")

    now = _utcnow()

    before_state = {
        "user_id": user.id,
        "family_id": family.id,
        "membership_id": membership.id,
        "membership_number": membership.membership_number,
        "status": membership.status,
    }

    user.deleted_at = now
    family.deleted_at = now
    membership.deleted_at = now

    # Also soft delete family members
    family_members = db.execute(
        select(FamilyMember).where(FamilyMember.family_id == family.id, FamilyMember.deleted_at.is_(None))
    ).scalars().all()
    for fm in family_members:
        fm.deleted_at = now

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="member_deleted",
        entity_type="membership",
        entity_id=membership.id,
        before_state=before_state,
        after_state={"reason": reason, "deleted_at": str(now)},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "member_id": user.id,
        "deleted": True,
    }


def add_family_member(
    db: Session,
    family_id: str,
    payload: AdminFamilyMemberInput,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    family = db.execute(select(Family).where(Family.id == family_id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    fm = FamilyMember(
        family_id=family.id,
        name=payload.name.strip(),
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        relationship=payload.relationship.strip(),
    )
    db.add(fm)
    db.flush()

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="family_member_created",
        entity_type="family_member",
        entity_id=fm.id,
        before_state=None,
        after_state={
            "family_member_id": fm.id,
            "family_id": family.id,
            "name": fm.name,
            "date_of_birth": str(fm.date_of_birth),
            "gender": fm.gender,
            "relationship": fm.relationship,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "family_member_id": fm.id,
        "created": True,
    }


def update_family_member(
    db: Session,
    family_id: str,
    family_member_id: str,
    payload: AdminUpdateFamilyMemberRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    family = db.execute(select(Family).where(Family.id == family_id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    fm = db.execute(
        select(FamilyMember).where(
            FamilyMember.id == family_member_id,
            FamilyMember.family_id == family_id,
            FamilyMember.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not fm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    before_state = {
        "name": fm.name,
        "date_of_birth": str(fm.date_of_birth),
        "gender": fm.gender,
        "relationship": fm.relationship,
    }

    if payload.name is not None:
        fm.name = payload.name.strip()
    if payload.date_of_birth is not None:
        fm.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        fm.gender = payload.gender
    if payload.relationship is not None:
        fm.relationship = payload.relationship.strip()

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="family_member_updated",
        entity_type="family_member",
        entity_id=fm.id,
        before_state=before_state,
        after_state={
            "name": fm.name,
            "date_of_birth": str(fm.date_of_birth),
            "gender": fm.gender,
            "relationship": fm.relationship,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "family_member_id": fm.id,
        "updated": True,
    }


def remove_family_member(
    db: Session,
    family_id: str,
    family_member_id: str,
    reason: str,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    family = db.execute(select(Family).where(Family.id == family_id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")

    fm = db.execute(
        select(FamilyMember).where(
            FamilyMember.id == family_member_id,
            FamilyMember.family_id == family_id,
            FamilyMember.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not fm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    before_state = {
        "name": fm.name,
        "date_of_birth": str(fm.date_of_birth),
        "gender": fm.gender,
        "relationship": fm.relationship,
    }

    now = _utcnow()
    fm.deleted_at = now

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="family_member_deleted",
        entity_type="family_member",
        entity_id=fm.id,
        before_state=before_state,
        after_state={"reason": reason, "deleted_at": str(now)},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "family_member_id": fm.id,
        "deleted": True,
    }
