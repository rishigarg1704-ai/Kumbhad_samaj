from __future__ import annotations

from datetime import date
from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.auth import UserProfile, session_user_from_token
from app.core.config import settings
from app.db.deps import get_db
from app.schemas.payment import RenewalOrderRequest
from app.services.payments import (
    create_renewal_order,
    get_member_payment,
    get_successful_member_payment,
    list_member_payments,
    process_razorpay_webhook,
    render_receipt_html,
)

router = APIRouter(tags=["payments"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _require_member(authorization: str | None) -> UserProfile:
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = session_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required")
    if user.role != "member":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return user


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
    x_razorpay_event_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    result = process_razorpay_webhook(
        db,
        raw_body=await request.body(),
        signature=x_razorpay_signature,
        event_id=x_razorpay_event_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"success": True, "data": result, "meta": {}}


@router.post("/member/membership/renew")
def renew_membership(
    payload: RenewalOrderRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _require_member(authorization)
    try:
        UUID(payload.membership_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="membership_id must be a UUID") from exc
    payment = create_renewal_order(
        db,
        user,
        payload.membership_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "payment_id": payment.id,
            "provider_order_id": payment.provider_order_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "checkout_key_id": settings.razorpay_key_id,
            "status": payment.status,
        },
        "meta": {},
    }


@router.get("/member/payments")
def my_payments(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1, le=100000),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="paid_at", pattern="^(created_at|paid_at|amount|status)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status", pattern="^(pending|success|failed|refunded)$"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="start_date must be before or equal to end_date")
    user = _require_member(authorization)
    items, total = list_member_payments(
        db,
        user,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        payment_status=status_filter,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": item.id,
                    "payment_type": item.payment_type,
                    "status": item.status,
                    "amount": item.amount,
                    "currency": item.currency,
                    "paid_at": item.paid_at,
                    "receipt_number": item.receipt_number,
                }
                for item in items
            ]
        },
        "meta": {
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total,
                "total_pages": ceil(total / page_size) if total else 0,
            }
        },
    }


@router.get("/member/payments/{payment_id}/status")
def my_payment_status(
    payment_id: UUID,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _require_member(authorization)
    payment = get_member_payment(db, user, str(payment_id))
    membership = payment.membership
    return {
        "success": True,
        "data": {
            "payment": {
                "payment_id": payment.id,
                "payment_type": payment.payment_type,
                "provider_order_id": payment.provider_order_id,
                "provider_payment_id": payment.provider_payment_id,
                "status": payment.status,
                "amount": payment.amount,
                "currency": payment.currency,
                "checkout_key_id": settings.razorpay_key_id,
                "paid_at": payment.paid_at,
                "receipt_number": payment.receipt_number,
            },
            "membership": {
                "membership_id": membership.id,
                "membership_number": membership.membership_number,
                "status": membership.status,
                "expiry_date": membership.expiry_date,
            },
        },
        "meta": {},
    }


@router.get("/member/payments/{payment_id}/receipt")
def my_payment_receipt(
    request: Request,
    payment_id: UUID,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _require_member(authorization)
    payment = get_successful_member_payment(db, user, str(payment_id))
    return {
        "success": True,
        "data": {
            "receipt_id": payment.id,
            "receipt_number": payment.receipt_number,
            "download_url": str(request.url_for("my_payment_receipt_file", payment_id=payment.id)),
            "payment": {
                "id": payment.id,
                "amount": payment.amount,
                "currency": payment.currency,
                "paid_at": payment.paid_at,
            },
        },
        "meta": {},
    }


@router.get("/member/payments/{payment_id}/receipt/file", name="my_payment_receipt_file")
def my_payment_receipt_file(
    payment_id: UUID,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _require_member(authorization)
    payment = get_successful_member_payment(db, user, str(payment_id))
    filename = f"{payment.receipt_number}.html"
    return Response(
        content=render_receipt_html(payment),
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
