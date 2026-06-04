from __future__ import annotations

from datetime import datetime, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from app.core.auth import UserProfile
from app.db.models import Family, FamilyMember, Membership, Notification, User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_member_db_user(db: Session, profile: UserProfile) -> User:
    """Resolve authenticated member profile to a User database record.

    Shared helper used by this module and payments service.
    """
    if profile.role != "member":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    user = db.execute(
        select(User).where(
            User.email == profile.email.strip().lower(),
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found")
    if user.status == "suspended" or profile.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Member is suspended")
    return user


def get_member_profile(db: Session, profile: UserProfile) -> User:
    return get_member_db_user(db, profile)


def get_member_membership(db: Session, profile: UserProfile) -> dict:
    user = get_member_db_user(db, profile)
    family = db.execute(
        select(Family).where(
            Family.head_user_id == user.id,
            Family.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family record not found")
    membership = db.execute(
        select(Membership).where(
            Membership.family_id == family.id,
            Membership.deleted_at.is_(None),
        ).order_by(desc(Membership.created_at)).limit(1)
    ).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership record not found")
    return {"family": family, "membership": membership}


def get_member_family_members(db: Session, profile: UserProfile) -> list[FamilyMember]:
    user = get_member_db_user(db, profile)
    family = db.execute(
        select(Family).where(
            Family.head_user_id == user.id,
            Family.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not family:
        return []
    items = db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family.id,
            FamilyMember.deleted_at.is_(None),
        ).order_by(FamilyMember.name)
    ).scalars().all()
    return list(items)


def list_member_notifications(
    db: Session,
    profile: UserProfile,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
    notification_status: str | None,
) -> tuple[list[Notification], int]:
    user = get_member_db_user(db, profile)
    filters = [
        Notification.user_id == user.id,
        Notification.channel == "website",
        Notification.deleted_at.is_(None),
    ]
    if notification_status:
        filters.append(Notification.status == notification_status)
    query = select(Notification).where(and_(*filters))
    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    sort_column = {
        "created_at": Notification.created_at,
        "sent_at": Notification.sent_at,
        "read_at": Notification.read_at,
        "status": Notification.status,
    }.get(sort_by, Notification.created_at)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    items = (
        db.execute(
            query.order_by(sort_column)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )
    return list(items), int(total)


def mark_notification_read(db: Session, profile: UserProfile, notification_id: str) -> Notification:
    user = get_member_db_user(db, profile)
    notification = db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
            Notification.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.status != "read":
        notification.status = "read"
        notification.read_at = _utcnow()
        db.commit()
        db.refresh(notification)
    return notification
