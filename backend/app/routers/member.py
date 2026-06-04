from __future__ import annotations

from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import UserProfile, session_user_from_token
from app.db.deps import get_db
from app.services.member import (
    get_member_family_members,
    get_member_membership,
    get_member_profile,
    list_member_notifications,
    mark_notification_read,
)

router = APIRouter(prefix="/member", tags=["member-portal"])


def _require_member(authorization: str | None = Header(default=None)) -> UserProfile:
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = session_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )
    if user.role != "member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    return user


@router.get("/me")
def current_member_profile(
    user: UserProfile = Depends(_require_member),
    db: Session = Depends(get_db),
):
    profile = get_member_profile(db, user)
    return {
        "success": True,
        "data": {
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "profile_picture_url": profile.profile_picture_url,
            "status": profile.status,
        },
        "meta": {},
    }


@router.get("/membership")
def current_member_membership(
    user: UserProfile = Depends(_require_member),
    db: Session = Depends(get_db),
):
    result = get_member_membership(db, user)
    family = result["family"]
    membership = result["membership"]
    return {
        "success": True,
        "data": {
            "family": {
                "id": family.id,
                "address": family.address,
                "mobile_number": family.mobile_number,
                "email": family.email,
            },
            "membership": {
                "id": membership.id,
                "membership_number": membership.membership_number,
                "status": membership.status,
                "start_date": membership.start_date,
                "expiry_date": membership.expiry_date,
            },
        },
        "meta": {},
    }


@router.get("/family-members")
def current_member_family(
    user: UserProfile = Depends(_require_member),
    db: Session = Depends(get_db),
):
    items = get_member_family_members(db, user)
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": item.id,
                    "name": item.name,
                    "date_of_birth": item.date_of_birth,
                    "gender": item.gender,
                    "relationship": item.relationship,
                }
                for item in items
            ]
        },
        "meta": {},
    }


@router.get("/notifications")
def current_member_notifications(
    user: UserProfile = Depends(_require_member),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1, le=100000),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at", pattern="^(created_at|sent_at|read_at|status)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status", pattern="^(sent|read)$"),
):
    items, total = list_member_notifications(
        db,
        user,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        notification_status=status_filter,
    )
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "body": item.body,
                    "status": item.status,
                    "read_at": item.read_at,
                    "created_at": item.created_at,
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


@router.patch("/notifications/{notification_id}/read")
def read_notification(
    notification_id: UUID,
    user: UserProfile = Depends(_require_member),
    db: Session = Depends(get_db),
):
    notification = mark_notification_read(db, user, str(notification_id))
    return {
        "success": True,
        "data": {
            "id": notification.id,
            "status": notification.status,
            "read_at": notification.read_at,
        },
        "meta": {},
    }
