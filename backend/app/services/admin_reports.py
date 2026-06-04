from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, extract, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Family, FamilyMember, Membership, Payment, User


def get_active_members_report(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "membership_number",
    sort_order: str = "asc",
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    query = (
        select(Membership, Family, User)
        .join(Family, Membership.family_id == Family.id)
        .join(User, Family.head_user_id == User.id)
        .where(
            Membership.status == "active",
            Membership.deleted_at.is_(None),
            User.deleted_at.is_(None),
        )
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                Membership.membership_number.ilike(search_pattern),
            )
        )

    if start_date:
        query = query.where(Membership.start_date >= start_date)
    if end_date:
        query = query.where(Membership.start_date <= end_date)

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Sorting
    sort_attr = Membership.membership_number
    if sort_by == "full_name":
        sort_attr = User.full_name
    elif sort_by == "expiry_date":
        sort_attr = Membership.expiry_date
    elif sort_by == "created_at":
        sort_attr = Membership.created_at

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for membership, family, user in results:
        items.append({
            "membership_number": membership.membership_number,
            "full_name": user.full_name,
            "email": user.email,
            "mobile_number": family.mobile_number,
            "status": membership.status,
            "expiry_date": membership.expiry_date,
        })

    return items, total_items


def get_expiring_members_report(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "expiry_date",
    sort_order: str = "asc",
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if not start_date or not end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date and end_date range filters are required for this report",
        )

    query = (
        select(Membership, Family, User)
        .join(Family, Membership.family_id == Family.id)
        .join(User, Family.head_user_id == User.id)
        .where(
            Membership.deleted_at.is_(None),
            Membership.expiry_date >= start_date,
            Membership.expiry_date <= end_date,
        )
    )

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Sorting
    sort_attr = Membership.expiry_date
    if sort_by == "membership_number":
        sort_attr = Membership.membership_number
    elif sort_by == "full_name":
        sort_attr = User.full_name

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for membership, family, user in results:
        items.append({
            "membership_number": membership.membership_number,
            "full_name": user.full_name,
            "email": user.email,
            "mobile_number": family.mobile_number,
            "status": membership.status,
            "expiry_date": membership.expiry_date,
        })

    return items, total_items


def get_birthday_report(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "date_of_birth",
    sort_order: str = "asc",
    month: int | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if month is None or not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid month (1-12) is required for this report",
        )

    query = (
        select(FamilyMember, Family)
        .join(Family, FamilyMember.family_id == Family.id)
        .where(
            FamilyMember.deleted_at.is_(None),
            extract("month", FamilyMember.date_of_birth) == month,
        )
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(FamilyMember.name.ilike(search_pattern))

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Sorting
    sort_attr = FamilyMember.date_of_birth
    if sort_by == "name":
        sort_attr = FamilyMember.name
    elif sort_by == "relationship":
        sort_attr = FamilyMember.relationship

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for fm, family in results:
        items.append({
            "name": fm.name,
            "date_of_birth": fm.date_of_birth,
            "relationship": fm.relationship,
            "family_email": family.email,
            "family_mobile": family.mobile_number,
        })

    return items, total_items


def get_payment_report(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "paid_at",
    sort_order: str = "desc",
    status_filter: str | None = None,
    payment_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any], int]:
    query = (
        select(Payment, Membership, User)
        .join(Membership, Payment.membership_id == Membership.id)
        .join(User, Payment.user_id == User.id)
    )

    if status_filter:
        query = query.where(Payment.status == status_filter)
    if payment_type:
        query = query.where(Payment.payment_type == payment_type)

    if start_date:
        query = query.where(Payment.created_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    if end_date:
        query = query.where(Payment.created_at <= datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc))

    # Calculate summary of all matching payments (not paginated)
    summary_query = select(
        func.sum(Payment.amount),
        func.count(Payment.id)
    ).select_from(query.subquery())
    total_amount_raw, payment_count = db.execute(summary_query).first()
    total_amount = Decimal(total_amount_raw) if total_amount_raw is not None else Decimal("0.0")

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Sorting
    sort_attr = Payment.paid_at
    if sort_by == "amount":
        sort_attr = Payment.amount
    elif sort_by == "payment_type":
        sort_attr = Payment.payment_type
    elif sort_by == "status":
        sort_attr = Payment.status

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for payment, membership, user in results:
        items.append({
            "payment_id": payment.id,
            "membership_number": membership.membership_number,
            "full_name": user.full_name,
            "payment_type": payment.payment_type,
            "status": payment.status,
            "amount": payment.amount,
            "paid_at": payment.paid_at,
        })

    return items, {"total_amount": total_amount, "payment_count": payment_count}, total_items
