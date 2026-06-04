from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Family, Membership, Payment, PaymentWebhookEvent, User


def list_payments(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "paid_at",
    sort_order: str = "desc",
    search: str | None = None,
    status_filter: str | None = None,
    payment_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    # Query joining Payment and Membership
    query = (
        select(Payment, Membership, User)
        .join(Membership, Payment.membership_id == Membership.id)
        .join(User, Payment.user_id == User.id)
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Payment.provider_order_id.ilike(search_pattern),
                Payment.provider_payment_id.ilike(search_pattern),
                Membership.membership_number.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )

    if status_filter:
        query = query.where(Payment.status == status_filter)

    if payment_type:
        query = query.where(Payment.payment_type == payment_type)

    if start_date:
        query = query.where(Payment.created_at >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    if end_date:
        query = query.where(Payment.created_at <= datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc))

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Apply sorting
    sort_attr = Payment.paid_at
    if sort_by == "created_at":
        sort_attr = Payment.created_at
    elif sort_by == "amount":
        sort_attr = Payment.amount
    elif sort_by == "status":
        sort_attr = Payment.status
    elif sort_by == "payment_type":
        sort_attr = Payment.payment_type

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
            "id": payment.id,
            "membership_number": membership.membership_number,
            "payment_type": payment.payment_type,
            "status": payment.status,
            "amount": payment.amount,
            "currency": payment.currency,
            "paid_at": payment.paid_at,
        })

    return items, total_items


def get_payment_detail(db: Session, payment_id: str) -> dict[str, Any]:
    payment = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

    user = db.execute(select(User).where(User.id == payment.user_id)).scalar_one_or_none()
    membership = db.execute(select(Membership).where(Membership.id == payment.membership_id)).scalar_one_or_none()

    # Get webhook events / status transitions related to this order
    webhook_events = db.execute(
        select(PaymentWebhookEvent)
        .where(PaymentWebhookEvent.provider_order_id == payment.provider_order_id)
        .order_by(PaymentWebhookEvent.created_at.asc())
    ).scalars().all()

    status_transitions = []
    for event in webhook_events:
        status_transitions.append({
            "event_id": event.id,
            "event_type": event.event_type,
            "processed": event.processed,
            "processed_at": event.processed_at,
            "error_message": event.error_message,
            "created_at": event.created_at,
        })

    return {
        "payment": payment,
        "member": user,
        "membership": membership,
        "status_transitions": status_transitions,
    }
