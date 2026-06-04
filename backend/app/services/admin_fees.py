from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import MembershipFeeHistory
from app.schemas.admin import AdminCreateFeeRequest
from app.services.admin_members import create_admin_audit_log


def list_fee_history(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "effective_from",
    sort_order: str = "desc",
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[MembershipFeeHistory], int]:
    query = select(MembershipFeeHistory).where(MembershipFeeHistory.deleted_at.is_(None))

    if start_date:
        query = query.where(MembershipFeeHistory.effective_from >= start_date)
    if end_date:
        query = query.where(MembershipFeeHistory.effective_from <= end_date)

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    sort_attr = MembershipFeeHistory.effective_from
    if sort_by == "effective_to":
        sort_attr = MembershipFeeHistory.effective_to
    elif sort_by == "created_at":
        sort_attr = MembershipFeeHistory.created_at

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).scalars().all()
    return list(results), total_items


def get_active_fee(db: Session) -> MembershipFeeHistory | None:
    today = datetime.now(timezone.utc).date()
    query = (
        select(MembershipFeeHistory)
        .where(
            MembershipFeeHistory.deleted_at.is_(None),
            MembershipFeeHistory.effective_from <= today,
            or_(MembershipFeeHistory.effective_to.is_(None), MembershipFeeHistory.effective_to >= today),
        )
        .order_by(desc(MembershipFeeHistory.effective_from))
        .limit(1)
    )
    return db.execute(query).scalar_one_or_none()


def create_new_fee(
    db: Session,
    payload: AdminCreateFeeRequest,
    *,
    created_by_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> MembershipFeeHistory:
    # 1. Validation: effective_from cannot be in the past
    today = datetime.now(timezone.utc).date()
    if payload.effective_from < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Effective from date cannot be in the past",
        )

    # 2. Check for overlapping future fees
    overlapping = db.execute(
        select(MembershipFeeHistory)
        .where(
            MembershipFeeHistory.deleted_at.is_(None),
            MembershipFeeHistory.effective_from >= payload.effective_from,
        )
    ).scalars().all()
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="There is already a fee configured with a later or identical start date.",
        )

    # 3. Update the currently active fee's effective_to date
    current_active = db.execute(
        select(MembershipFeeHistory)
        .where(
            MembershipFeeHistory.deleted_at.is_(None),
            MembershipFeeHistory.effective_to.is_(None),
            MembershipFeeHistory.effective_from < payload.effective_from,
        )
    ).scalar_one_or_none()

    before_state = None
    if current_active:
        before_state = {
            "id": current_active.id,
            "membership_fee_amount": float(current_active.membership_fee_amount),
            "renewal_fee_amount": float(current_active.renewal_fee_amount),
            "effective_from": str(current_active.effective_from),
            "effective_to": None,
        }
        current_active.effective_to = payload.effective_from - timedelta(days=1)

    # 4. Insert new fee record
    new_fee = MembershipFeeHistory(
        membership_fee_amount=payload.membership_fee_amount,
        renewal_fee_amount=payload.renewal_fee_amount,
        effective_from=payload.effective_from,
        effective_to=None,
        created_by_admin_id=created_by_admin_id,
    )
    db.add(new_fee)
    db.flush()

    # 5. Audit Log
    create_admin_audit_log(
        db,
        actor_admin_id=created_by_admin_id,
        action="fee_created",
        entity_type="membership_fee_history",
        entity_id=new_fee.id,
        before_state=before_state,
        after_state={
            "id": new_fee.id,
            "membership_fee_amount": float(new_fee.membership_fee_amount),
            "renewal_fee_amount": float(new_fee.renewal_fee_amount),
            "effective_from": str(new_fee.effective_from),
            "effective_to": None,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(new_fee)
    return new_fee
