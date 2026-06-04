from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import session_user_from_token
from app.db.deps import get_db
from app.schemas.admin import (
    AdminCreateMemberRequest,
    AdminDeleteMemberRequest,
    AdminFamilyMemberInput,
    AdminRemoveFamilyMemberRequest,
    AdminUpdateFamilyMemberRequest,
    AdminUpdateMemberRequest,
)
from app.services import admin_members

router = APIRouter(prefix="/admin", tags=["admin-members"])


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


@router.get("/members")
def get_members(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    membership_type: str | None = Query(default=None),  # Ignored but accepted for spec compatibility
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_members.list_members(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        status_filter=status,
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


@router.post("/members")
def post_member(
    payload: AdminCreateMemberRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.create_member(
        db,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": res,
        "meta": {},
    }


@router.get("/members/{member_id}")
def get_member(
    member_id: str,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.get_member_detail(db, member_id)
    return {
        "success": True,
        "data": {
            "user": {
                "id": res["user"].id,
                "email": res["user"].email,
                "full_name": res["user"].full_name,
                "profile_picture_url": res["user"].profile_picture_url,
                "status": res["user"].status,
                "last_login_at": res["user"].last_login_at,
                "created_at": res["user"].created_at,
            },
            "family": {
                "id": res["family"].id,
                "address": res["family"].address,
                "mobile_number": res["family"].mobile_number,
                "email": res["family"].email,
                "status": res["family"].status,
            },
            "membership": {
                "id": res["membership"].id,
                "membership_number": res["membership"].membership_number,
                "status": res["membership"].status,
                "start_date": res["membership"].start_date,
                "expiry_date": res["membership"].expiry_date,
            },
            "family_members": [
                {
                    "id": fm.id,
                    "name": fm.name,
                    "date_of_birth": fm.date_of_birth,
                    "gender": fm.gender,
                    "relationship": fm.relationship,
                }
                for fm in res["family_members"]
            ],
            "payment_summary": res["payment_summary"],
        },
        "meta": {},
    }


@router.patch("/members/{member_id}")
def patch_member(
    member_id: str,
    payload: AdminUpdateMemberRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.update_member(
        db,
        member_id,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": res,
        "meta": {},
    }


@router.delete("/members/{member_id}")
def delete_member(
    member_id: str,
    payload: AdminDeleteMemberRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.delete_member(
        db,
        member_id,
        payload.reason,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": res,
        "meta": {},
    }


@router.post("/families/{family_id}/members")
def create_family_member(
    family_id: str,
    payload: AdminFamilyMemberInput,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.add_family_member(
        db,
        family_id,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "family_member_id": res["family_member_id"],
            "created": True,
        },
        "meta": {},
    }


@router.patch("/families/{family_id}/members/{family_member_id}")
def patch_family_member(
    family_id: str,
    family_member_id: str,
    payload: AdminUpdateFamilyMemberRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.update_family_member(
        db,
        family_id,
        family_member_id,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "family_member_id": res["family_member_id"],
            "updated": True,
        },
        "meta": {},
    }


@router.delete("/families/{family_id}/members/{family_member_id}")
def delete_family_member(
    family_id: str,
    family_member_id: str,
    payload: AdminRemoveFamilyMemberRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    res = admin_members.remove_family_member(
        db,
        family_id,
        family_member_id,
        payload.reason,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "family_member_id": res["family_member_id"],
            "deleted": True,
        },
        "meta": {},
    }
