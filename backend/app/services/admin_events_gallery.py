from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import Event, GalleryAlbum, GalleryPhoto
from app.schemas.admin import (
    AdminCreateAlbumRequest,
    AdminCreateEventRequest,
    AdminUpdateAlbumRequest,
    AdminUpdateEventRequest,
)
from app.services.admin_members import create_admin_audit_log


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --- Events CRUD ---

def list_events_admin(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
    status_filter: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[Event], int]:
    query = select(Event).where(Event.deleted_at.is_(None))

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Event.title.ilike(search_pattern),
                Event.slug.ilike(search_pattern),
                Event.description.ilike(search_pattern),
                Event.location.ilike(search_pattern),
            )
        )

    if status_filter:
        query = query.where(Event.status == status_filter)

    if start_date:
        query = query.where(Event.event_date >= datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc))
    if end_date:
        query = query.where(Event.event_date <= datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc))

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Apply sorting
    sort_attr = Event.created_at
    if sort_by == "title":
        sort_attr = Event.title
    elif sort_by == "event_date":
        sort_attr = Event.event_date
    elif sort_by == "published_at":
        sort_attr = Event.published_at
    elif sort_by == "status":
        sort_attr = Event.status

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).scalars().all()
    return list(results), total_items


def get_event_detail(db: Session, event_id: str) -> Event:
    event = db.execute(select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


def create_event(
    db: Session,
    payload: AdminCreateEventRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> Event:
    # Check slug uniqueness
    existing = db.execute(select(Event).where(Event.slug == payload.slug, Event.deleted_at.is_(None))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An event with this slug already exists")

    event = Event(
        title=payload.title.strip(),
        slug=payload.slug.strip().lower(),
        description=payload.description.strip(),
        event_date=payload.event_date,
        location=payload.location.strip() if payload.location else None,
        status=payload.status,
        published_at=_utcnow() if payload.status == "published" else None,
    )
    db.add(event)
    db.flush()

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="event_created",
        entity_type="event",
        entity_id=event.id,
        before_state=None,
        after_state={
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "status": event.status,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(event)
    return event


def update_event(
    db: Session,
    event_id: str,
    payload: AdminUpdateEventRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> Event:
    event = db.execute(select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    before_state = {
        "title": event.title,
        "description": event.description,
        "event_date": str(event.event_date) if event.event_date else None,
        "location": event.location,
        "status": event.status,
        "published_at": str(event.published_at) if event.published_at else None,
    }

    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description.strip()
    if payload.event_date is not None:
        event.event_date = payload.event_date
    if payload.location is not None:
        event.location = payload.location.strip() if payload.location else None
    if payload.status is not None:
        if payload.status == "published" and event.status != "published":
            event.published_at = _utcnow()
        elif payload.status == "draft":
            event.published_at = None
        event.status = payload.status

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="event_updated",
        entity_type="event",
        entity_id=event.id,
        before_state=before_state,
        after_state={
            "title": event.title,
            "description": event.description,
            "event_date": str(event.event_date) if event.event_date else None,
            "location": event.location,
            "status": event.status,
            "published_at": str(event.published_at) if event.published_at else None,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(event)
    return event


def delete_event(
    db: Session,
    event_id: str,
    reason: str,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    event = db.execute(select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    before_state = {
        "title": event.title,
        "slug": event.slug,
        "status": event.status,
    }

    now = _utcnow()
    event.deleted_at = now

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="event_deleted",
        entity_type="event",
        entity_id=event.id,
        before_state=before_state,
        after_state={"reason": reason, "deleted_at": str(now)},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()


# --- Gallery Album CRUD ---

def list_albums_admin(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
    status_filter: str | None = None,
) -> tuple[list[GalleryAlbum], int]:
    query = select(GalleryAlbum).where(GalleryAlbum.deleted_at.is_(None))

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                GalleryAlbum.title.ilike(search_pattern),
                GalleryAlbum.slug.ilike(search_pattern),
                GalleryAlbum.description.ilike(search_pattern),
            )
        )

    if status_filter:
        query = query.where(GalleryAlbum.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Sorting
    sort_attr = GalleryAlbum.created_at
    if sort_by == "title":
        sort_attr = GalleryAlbum.title
    elif sort_by == "status":
        sort_attr = GalleryAlbum.status

    if sort_order == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(sort_attr)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).scalars().all()
    return list(results), total_items


def get_album_detail(db: Session, album_id: str) -> GalleryAlbum:
    album = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == album_id, GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery album not found")
    return album


def create_album(
    db: Session,
    payload: AdminCreateAlbumRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> GalleryAlbum:
    # Check slug uniqueness
    existing = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.slug == payload.slug, GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An album with this slug already exists")

    album = GalleryAlbum(
        title=payload.title.strip(),
        slug=payload.slug.strip().lower(),
        description=payload.description.strip() if payload.description else None,
        status=payload.status,
        photo_count=0,
    )
    db.add(album)
    db.flush()

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="album_created",
        entity_type="gallery_album",
        entity_id=album.id,
        before_state=None,
        after_state={
            "id": album.id,
            "title": album.title,
            "slug": album.slug,
            "status": album.status,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(album)
    return album


def update_album(
    db: Session,
    album_id: str,
    payload: AdminUpdateAlbumRequest,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> GalleryAlbum:
    album = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == album_id, GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery album not found")

    before_state = {
        "title": album.title,
        "description": album.description,
        "status": album.status,
    }

    if payload.title is not None:
        album.title = payload.title.strip()
    if payload.description is not None:
        album.description = payload.description.strip() if payload.description else None
    if payload.status is not None:
        album.status = payload.status

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="album_updated",
        entity_type="gallery_album",
        entity_id=album.id,
        before_state=before_state,
        after_state={
            "title": album.title,
            "description": album.description,
            "status": album.status,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(album)
    return album


def delete_album(
    db: Session,
    album_id: str,
    reason: str,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    album = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == album_id, GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery album not found")

    before_state = {
        "title": album.title,
        "slug": album.slug,
        "status": album.status,
    }

    now = _utcnow()
    album.deleted_at = now

    # Soft delete all photos in this album
    photos = db.execute(
        select(GalleryPhoto).where(GalleryPhoto.album_id == album.id, GalleryPhoto.deleted_at.is_(None))
    ).scalars().all()
    for photo in photos:
        photo.deleted_at = now

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="album_deleted",
        entity_type="gallery_album",
        entity_id=album.id,
        before_state=before_state,
        after_state={"reason": reason, "deleted_at": str(now)},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()


# --- Gallery Photo CRUD ---

def get_album_photos(db: Session, album_id: str) -> tuple[GalleryAlbum, list[GalleryPhoto]]:
    album = get_album_detail(db, album_id)
    photos = db.execute(
        select(GalleryPhoto)
        .where(GalleryPhoto.album_id == album_id, GalleryPhoto.deleted_at.is_(None))
        .order_by(GalleryPhoto.sort_order.asc(), GalleryPhoto.created_at.desc())
    ).scalars().all()
    return album, list(photos)


def upload_photo(
    db: Session,
    album_id: str,
    title: str | None,
    filepath: str,
    public_url: str,
    sort_order: int,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> GalleryPhoto:
    album = get_album_detail(db, album_id)

    photo = GalleryPhoto(
        album_id=album.id,
        title=title.strip() if title else None,
        filepath=filepath,
        public_url=public_url,
        sort_order=sort_order,
    )
    db.add(photo)

    # Increment photo count
    album.photo_count += 1

    db.flush()

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="photo_uploaded",
        entity_type="gallery_photo",
        entity_id=photo.id,
        before_state=None,
        after_state={
            "id": photo.id,
            "album_id": album.id,
            "title": photo.title,
            "public_url": photo.public_url,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(photo)
    return photo


def delete_photo(
    db: Session,
    photo_id: str,
    reason: str,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    photo = db.execute(
        select(GalleryPhoto).where(GalleryPhoto.id == photo_id, GalleryPhoto.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    album = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == photo.album_id, GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()

    before_state = {
        "id": photo.id,
        "album_id": photo.album_id,
        "title": photo.title,
        "public_url": photo.public_url,
    }

    now = _utcnow()
    photo.deleted_at = now

    if album and album.photo_count > 0:
        album.photo_count -= 1

    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="photo_deleted",
        entity_type="gallery_photo",
        entity_id=photo.id,
        before_state=before_state,
        after_state={"reason": reason, "deleted_at": str(now)},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()
