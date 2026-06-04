from __future__ import annotations

import os
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import session_user_from_token
from app.db.deps import get_db
from app.db.models import Event, GalleryAlbum, GalleryPhoto
from app.schemas.admin import (
    AdminCreateAlbumRequest,
    AdminCreateEventRequest,
    AdminDeleteAlbumRequest,
    AdminDeleteEventRequest,
    AdminDeletePhotoRequest,
    AdminUpdateAlbumRequest,
    AdminUpdateEventRequest,
)
from app.services import admin_events_gallery

router = APIRouter(prefix="", tags=["content"])


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


# --- Public Content Endpoints ---

@router.get("/public/events")
def get_public_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total_items = admin_events_gallery.list_events_admin(
        db,
        page=page,
        page_size=page_size,
        status_filter="published",
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": ev.id,
                    "title": ev.title,
                    "slug": ev.slug,
                    "description": ev.description,
                    "event_date": ev.event_date,
                    "location": ev.location,
                }
                for ev in items
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


@router.get("/public/events/{slug}")
def get_public_event_by_slug(slug: str, db: Session = Depends(get_db)):
    event = db.execute(
        select(Event).where(Event.slug == slug, Event.status == "published", Event.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return {
        "success": True,
        "data": {
            "id": event.id,
            "title": event.title,
            "slug": event.slug,
            "description": event.description,
            "event_date": event.event_date,
            "location": event.location,
        },
        "meta": {},
    }


@router.get("/public/gallery/albums")
def get_public_albums(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total_items = admin_events_gallery.list_albums_admin(
        db,
        page=page,
        page_size=page_size,
        status_filter="published",
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": al.id,
                    "title": al.title,
                    "slug": al.slug,
                    "description": al.description,
                    "photo_count": al.photo_count,
                }
                for al in items
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


@router.get("/public/gallery/albums/{slug}/photos")
def get_public_album_photos_by_slug(slug: str, db: Session = Depends(get_db)):
    album = db.execute(
        select(GalleryAlbum).where(GalleryAlbum.slug == slug, GalleryAlbum.status == "published", GalleryAlbum.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery album not found")

    photos = db.execute(
        select(GalleryPhoto)
        .where(GalleryPhoto.album_id == album.id, GalleryPhoto.deleted_at.is_(None))
        .order_by(GalleryPhoto.sort_order.asc(), GalleryPhoto.created_at.desc())
    ).scalars().all()

    return {
        "success": True,
        "data": {
            "album": {
                "id": album.id,
                "title": album.title,
                "slug": album.slug,
                "description": album.description,
            },
            "photos": [
                {
                    "id": ph.id,
                    "title": ph.title,
                    "public_url": ph.public_url,
                    "sort_order": ph.sort_order,
                }
                for ph in photos
            ],
        },
        "meta": {},
    }


# --- Admin Content Endpoints ---

@router.get("/admin/events")
def get_admin_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_events_gallery.list_events_admin(
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
            "items": [
                {
                    "id": ev.id,
                    "title": ev.title,
                    "slug": ev.slug,
                    "status": ev.status,
                    "event_date": ev.event_date,
                }
                for ev in items
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


@router.post("/admin/events")
def post_admin_event(
    payload: AdminCreateEventRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ev = admin_events_gallery.create_event(
        db,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "event_id": ev.id,
            "slug": ev.slug,
            "created": True,
        },
        "meta": {},
    }


@router.get("/admin/events/{event_id}")
def get_admin_event(
    event_id: str,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ev = admin_events_gallery.get_event_detail(db, event_id)
    return {
        "success": True,
        "data": {
            "id": ev.id,
            "title": ev.title,
            "slug": ev.slug,
            "description": ev.description,
            "event_date": ev.event_date,
            "location": ev.location,
            "status": ev.status,
            "published_at": ev.published_at,
            "created_at": ev.created_at,
            "updated_at": ev.updated_at,
        },
        "meta": {},
    }


@router.patch("/admin/events/{event_id}")
def patch_admin_event(
    event_id: str,
    payload: AdminUpdateEventRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ev = admin_events_gallery.update_event(
        db,
        event_id,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "event_id": ev.id,
            "updated": True,
        },
        "meta": {},
    }


@router.delete("/admin/events/{event_id}")
def delete_admin_event(
    event_id: str,
    payload: AdminDeleteEventRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    admin_events_gallery.delete_event(
        db,
        event_id,
        payload.reason,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "event_id": event_id,
            "deleted": True,
        },
        "meta": {},
    }


@router.get("/admin/gallery/albums")
def get_admin_albums(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    items, total_items = admin_events_gallery.list_albums_admin(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        status_filter=status,
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": al.id,
                    "title": al.title,
                    "slug": al.slug,
                    "status": al.status,
                    "photo_count": al.photo_count,
                }
                for al in items
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


@router.post("/admin/gallery/albums")
def post_admin_album(
    payload: AdminCreateAlbumRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    al = admin_events_gallery.create_album(
        db,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "album_id": al.id,
            "slug": al.slug,
            "created": True,
        },
        "meta": {},
    }


@router.patch("/admin/gallery/albums/{album_id}")
def patch_admin_album(
    album_id: str,
    payload: AdminUpdateAlbumRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    al = admin_events_gallery.update_album(
        db,
        album_id,
        payload,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "album_id": al.id,
            "updated": True,
        },
        "meta": {},
    }


@router.delete("/admin/gallery/albums/{album_id}")
def delete_admin_album(
    album_id: str,
    payload: AdminDeleteAlbumRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    admin_events_gallery.delete_album(
        db,
        album_id,
        payload.reason,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "album_id": album_id,
            "deleted": True,
        },
        "meta": {},
    }


@router.get("/admin/gallery/albums/{album_id}/photos")
def get_admin_album_photos(
    album_id: str,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    album, photos = admin_events_gallery.get_album_photos(db, album_id)
    return {
        "success": True,
        "data": {
            "id": album.id,
            "title": album.title,
            "slug": album.slug,
            "description": album.description,
            "status": album.status,
            "photos": [
                {
                    "id": ph.id,
                    "album_id": ph.album_id,
                    "title": ph.title,
                    "filepath": ph.filepath,
                    "public_url": ph.public_url,
                    "sort_order": ph.sort_order,
                    "created_at": ph.created_at,
                }
                for ph in photos
            ],
        },
        "meta": {},
    }


@router.post("/admin/gallery/albums/{album_id}/photos")
def post_admin_photo(
    album_id: str,
    title: str | None = Form(default=None),
    sort_order: int = Form(default=1),
    file: UploadFile = File(...),
    request: Request = None,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    # Save file locally
    os.makedirs("uploads", exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file type. Allowed: jpg, jpeg, png, webp.",
        )

    # Read content to validate size (max 5MB)
    content = file.file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed of 5MB.",
        )

    filename = f"{uuid4()}{file_ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as f:
        f.write(content)

    public_url = f"/uploads/{filename}"

    photo = admin_events_gallery.upload_photo(
        db,
        album_id,
        title,
        filepath,
        public_url,
        sort_order,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "success": True,
        "data": {
            "photo_id": photo.id,
            "public_url": photo.public_url,
            "uploaded": True,
        },
        "meta": {},
    }


@router.delete("/admin/gallery/photos/{photo_id}")
def delete_admin_photo(
    photo_id: str,
    payload: AdminDeletePhotoRequest,
    request: Request,
    admin_user: Any = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    admin_events_gallery.delete_photo(
        db,
        photo_id,
        payload.reason,
        actor_admin_id=admin_user.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "success": True,
        "data": {
            "photo_id": photo_id,
            "deleted": True,
        },
        "meta": {},
    }
