from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import session_user_from_token
from app.db.deps import get_db
from app.schemas.admin import AdminCreateFeeRequest
from app.services import admin_fees, admin_payments

router = APIRouter(prefix="/admin", tags=["admin-finance"])


def _require_admin(authorization: str | None = Header(default=None)):
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = session_user_from_token(token)
    if not user or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required.",
        )
    return user


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.get("/fees/active")
def get_active_fee(
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    fee = admin_fees.get_active_fee(db)
    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active membership fee is not configured",
        )
    return {
        "success": True,
        "data": {
            "id": fee.id,
            "membership_fee_amount": fee.membership_fee_amount,
            "renewal_fee_amount": fee.renewal_fee_amount,
            "effective_from": fee.effective_from,
            "effective_to": fee.effective_to,
        },
        "meta": {},
    }


@router.get("/fees/history")
def get_fee_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="effective_from"),
    sort_order: str = Query(default="desc"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_fees.list_fee_history(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        start_date=start_date,
        end_date=end_date,
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": f.id,
                    "membership_fee_amount": f.membership_fee_amount,
                    "renewal_fee_amount": f.renewal_fee_amount,
                    "effective_from": f.effective_from,
                    "effective_to": f.effective_to,
                }
                for f in items
            ]
        },
        "meta": {
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
            }
        },
    }


@router.post("/fees")
def post_fee(
    payload: AdminCreateFeeRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    fee = admin_fees.create_new_fee(
        db,
        payload,
        created_by_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "fee_history_id": fee.id,
            "created": True,
        },
        "meta": {},
    }


@router.get("/payments")
def get_payments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="paid_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    payment_type: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_payments.list_payments(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        status_filter=status,
        payment_type=payment_type,
        start_date=start_date,
        end_date=end_date,
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return {
        "success": True,
        "data": {
            "items": items,
        },
        "meta": {
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
            }
        },
    }


@router.get("/payments/{payment_id}")
def get_payment(
    payment_id: str,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_payments.get_payment_detail(db, payment_id)
    p = res["payment"]
    m = res["member"]
    ms = res["membership"]
    return {
        "success": True,
        "data": {
            "payment": {
                "id": p.id,
                "payment_type": p.payment_type,
                "provider": p.provider,
                "provider_order_id": p.provider_order_id,
                "provider_payment_id": p.provider_payment_id,
                "status": p.status,
                "amount": p.amount,
                "currency": p.currency,
                "paid_at": p.paid_at,
                "receipt_number": p.receipt_number,
                "created_at": p.created_at,
            },
            "member": {
                "id": m.id,
                "email": m.email,
                "full_name": m.full_name,
                "profile_picture_url": m.profile_picture_url,
                "status": m.status,
                "last_login_at": m.last_login_at,
                "created_at": m.created_at,
            },
            "membership": {
                "id": ms.id,
                "membership_number": ms.membership_number,
                "status": ms.status,
                "start_date": ms.start_date,
                "expiry_date": ms.expiry_date,
            },
            "status_transitions": res["status_transitions"],
        },
        "meta": {},
    }
