from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import session_user_from_token
from app.db.deps import get_db
from app.schemas.admin import AdminUpdateSettingRequest
from app.schemas.auth import AdminChangePasswordRequest
from app.services import admin_reports, admin_system

router = APIRouter(prefix="/admin", tags=["admin-system"])


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


# --- Reports ---

@router.get("/reports/active-members")
def get_report_active_members(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="membership_number"),
    sort_order: str = Query(default="asc"),
    search: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_reports.get_active_members_report(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
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


@router.get("/reports/expiring-members")
def get_report_expiring_members(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="expiry_date"),
    sort_order: str = Query(default="asc"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_reports.get_expiring_members_report(
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


@router.get("/reports/birthdays")
def get_report_birthdays(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="date_of_birth"),
    sort_order: str = Query(default="asc"),
    month: int = Query(...),
    search: str | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_reports.get_birthday_report(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        month=month,
        search=search,
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


@router.get("/reports/payments")
def get_report_payments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="paid_at"),
    sort_order: str = Query(default="desc"),
    status: str | None = Query(default=None),
    payment_type: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, summary, total_items = admin_reports.get_payment_report(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
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
            "summary": summary,
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


# --- Settings ---

@router.get("/settings")
def get_settings(
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_system.get_system_settings(db)
    return {
        "success": True,
        "data": res,
        "meta": {},
    }


@router.patch("/settings/{key}")
def patch_setting(
    key: str,
    payload: AdminUpdateSettingRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_system.update_system_setting(
        db,
        key,
        payload.value,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": res,
        "meta": {},
    }


# --- Audit Logs ---

@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_system.list_audit_logs(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        action_filter=action,
        entity_type_filter=entity_type,
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


@router.post("/settings/change-password")
def change_admin_password(
    payload: AdminChangePasswordRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    from app.db.models import AdminUser
    from app.core.auth import pwd_context
    from app.services.admin_members import create_admin_audit_log

    db_admin = db.query(AdminUser).filter(AdminUser.email == admin_user.email).first()
    if not db_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found in database.",
        )

    # Verify current password
    if not pwd_context.verify(payload.current_password, db_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )

    # Hash and save new password
    db_admin.password_hash = pwd_context.hash(payload.new_password)
    db.commit()

    # Log action to audit logs
    create_admin_audit_log(
        db,
        actor_admin_id=db_admin.id,
        action="change_password",
        entity_type="admin_user",
        entity_id=db_admin.id,
        before_state=None,
        after_state=None,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "success": True,
        "message": "Password changed successfully.",
        "data": {},
        "meta": {},
    }
