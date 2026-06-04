from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import AuditLog, Family, FamilyMember, Membership, MembershipFeeHistory, Payment, User
from app.schemas.membership import (
    AddFamilyMemberRequest,
    FamilyMemberResponse,
    RegistrationDraftRequest,
    UpdateFamilyMemberRequest,
)
from app.services.payments import create_razorpay_order

MEMBERSHIP_NUMBER_LOCK_KEY = 920231


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _lock_membership_number_generation(db: Session) -> None:
    db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": MEMBERSHIP_NUMBER_LOCK_KEY})


def _active_fee_query():
    today = _today()
    return (
        select(MembershipFeeHistory)
        .where(
            MembershipFeeHistory.deleted_at.is_(None),
            MembershipFeeHistory.effective_from <= today,
            or_(MembershipFeeHistory.effective_to.is_(None), MembershipFeeHistory.effective_to >= today),
        )
        .order_by(desc(MembershipFeeHistory.effective_from))
        .limit(1)
    )


def get_active_fee(db: Session) -> MembershipFeeHistory:
    fee = db.execute(_active_fee_query()).scalar_one_or_none()
    if not fee:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Active membership fee is not configured")
    return fee


def generate_membership_number(db: Session) -> str:
    _lock_membership_number_generation(db)
    prefix = settings.membership_number_prefix.strip().upper()
    width = settings.membership_number_width
    latest = db.execute(
        select(Membership.membership_number)
        .where(
            Membership.deleted_at.is_(None),
            Membership.membership_number.like(f"{prefix}-%"),
        )
        .order_by(Membership.membership_number.desc())
        .limit(1)
    ).scalar_one_or_none()
    next_number = 1
    if latest:
        try:
            next_number = int(latest.split("-")[-1]) + 1
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid membership number state") from exc
    return f"{prefix}-{next_number:0{width}d}"


def _ensure_unique_email(db: Session, email: str) -> None:
    user = db.execute(select(User).where(User.email == email, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        return
    membership = (
        db.execute(
            select(Membership)
            .join(Family, Membership.family_id == Family.id)
            .where(
                Family.head_user_id == user.id,
                Membership.deleted_at.is_(None),
                Membership.status == "active",
            )
        ).scalar_one_or_none()
    )
    if membership:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already belongs to an active member")


def _create_audit_log(
    db: Session,
    *,
    actor_type: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    before_state: dict | None,
    after_state: dict | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    db.add(
        AuditLog(
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=json.dumps(before_state) if before_state is not None else None,
            after_state=json.dumps(after_state) if after_state is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )


def create_registration_draft(
    db: Session,
    payload: RegistrationDraftRequest,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> dict:
    email = _normalize_email(payload.email)
    _ensure_unique_email(db, email)
    fee = get_active_fee(db)

    user = db.execute(select(User).where(User.email == email, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            full_name=payload.head_name.strip(),
            status="inactive",
        )
        db.add(user)
        db.flush()
    else:
        user.full_name = payload.head_name.strip()

    family = Family(
        head_user_id=user.id,
        address=payload.address.strip(),
        mobile_number=payload.phone.strip(),
        email=email,
        status="active",
        consent_version=payload.consent_version,
        consent_timestamp=datetime.now(timezone.utc),
        consent_ip=ip_address,
    )
    db.add(family)
    db.flush()

    for item in payload.family_members:
        db.add(
            FamilyMember(
                family_id=family.id,
                name=item.name.strip(),
                date_of_birth=item.date_of_birth,
                gender=item.gender,
                relationship=item.relationship.strip(),
            )
        )

    membership_number = generate_membership_number(db)
    membership = Membership(
        family_id=family.id,
        membership_number=membership_number,
        status="pending_payment",
    )
    db.add(membership)
    db.flush()

    order_receipt = f"reg-{membership_number.lower()}"
    order = create_razorpay_order(
        Decimal(fee.membership_fee_amount),
        order_receipt,
        notes={
            "payment_type": "registration",
            "membership_id": membership.id,
            "membership_number": membership_number,
        },
    )
    payment = Payment(
        user_id=user.id,
        family_id=family.id,
        membership_id=membership.id,
        fee_history_id=fee.id,
        payment_type="registration",
        provider="razorpay",
        provider_order_id=order["id"],
        status="pending",
        amount=fee.membership_fee_amount,
        currency=settings.razorpay_currency,
    )
    db.add(payment)
    db.flush()
    _create_audit_log(
        db,
        actor_type="public",
        action="registration_draft_created",
        entity_type="membership",
        entity_id=membership.id,
        before_state=None,
        after_state={
            "membership_id": membership.id,
            "membership_number": membership_number,
            "family_id": family.id,
            "payment_id": payment.id,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(membership)
    db.refresh(payment)
    return {
        "membership": membership,
        "payment": payment,
    }


def get_registration_status(db: Session, payment_id: str) -> dict:
    payment = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one_or_none()
    if not payment or payment.payment_type != "registration":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration payment not found")
    membership = db.execute(select(Membership).where(Membership.id == payment.membership_id, Membership.deleted_at.is_(None))).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    return {"payment": payment, "membership": membership}


def add_family_member(
    db: Session,
    family_id: str,
    payload: AddFamilyMemberRequest,
    *,
    actor_type: str,
    ip_address: str | None,
    user_agent: str | None,
) -> FamilyMemberResponse:
    family = db.execute(select(Family).where(Family.id == family_id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family not found")
    family_member = FamilyMember(
        family_id=family.id,
        name=payload.name.strip(),
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        relationship=payload.relationship.strip(),
    )
    db.add(family_member)
    db.flush()
    _create_audit_log(
        db,
        actor_type=actor_type,
        action="family_member_created",
        entity_type="family_member",
        entity_id=family_member.id,
        before_state=None,
        after_state={
            "family_member_id": family_member.id,
            "family_id": family.id,
            "name": family_member.name,
            "date_of_birth": str(family_member.date_of_birth),
            "gender": family_member.gender,
            "relationship": family_member.relationship,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(family_member)
    return FamilyMemberResponse.model_validate(family_member)


def update_family_member(
    db: Session,
    family_id: str,
    family_member_id: str,
    payload: UpdateFamilyMemberRequest,
    *,
    actor_type: str,
    ip_address: str | None,
    user_agent: str | None,
) -> FamilyMemberResponse:
    family = db.execute(select(Family).where(Family.id == family_id, Family.deleted_at.is_(None))).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family not found")
    family_member = db.execute(
        select(FamilyMember).where(
            FamilyMember.id == family_member_id,
            FamilyMember.family_id == family_id,
            FamilyMember.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not family_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")
    before_state = {
        "name": family_member.name,
        "date_of_birth": str(family_member.date_of_birth),
        "gender": family_member.gender,
        "relationship": family_member.relationship,
    }
    if payload.name is not None:
        family_member.name = payload.name.strip()
    if payload.date_of_birth is not None:
        family_member.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        family_member.gender = payload.gender
    if payload.relationship is not None:
        family_member.relationship = payload.relationship.strip()
    _create_audit_log(
        db,
        actor_type=actor_type,
        action="family_member_updated",
        entity_type="family_member",
        entity_id=family_member.id,
        before_state=before_state,
        after_state={
            "name": family_member.name,
            "date_of_birth": str(family_member.date_of_birth),
            "gender": family_member.gender,
            "relationship": family_member.relationship,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
    db.refresh(family_member)
    return FamilyMemberResponse.model_validate(family_member)


def delete_family_member(
    db: Session,
    family_id: str,
    family_member_id: str,
    *,
    actor_type: str,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    family_member = db.execute(
        select(FamilyMember).where(
            FamilyMember.id == family_member_id,
            FamilyMember.family_id == family_id,
            FamilyMember.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not family_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")
    family_member.deleted_at = datetime.now(timezone.utc)
    _create_audit_log(
        db,
        actor_type=actor_type,
        action="family_member_deleted",
        entity_type="family_member",
        entity_id=family_member.id,
        before_state={
            "name": family_member.name,
            "date_of_birth": str(family_member.date_of_birth),
            "gender": family_member.gender,
            "relationship": family_member.relationship,
        },
        after_state=None,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
