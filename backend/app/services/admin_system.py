from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.db.models import AdminUser, AuditLog, SystemSetting
from app.services.admin_members import create_admin_audit_log


def list_audit_logs(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: str | None = None,
    action_filter: str | None = None,
    entity_type_filter: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    # Query joining AuditLog and AdminUser to get email
    query = (
        select(AuditLog, AdminUser)
        .outerjoin(AdminUser, AuditLog.actor_admin_id == AdminUser.id)
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.action.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                AuditLog.entity_id.ilike(search_pattern),
                AdminUser.email.ilike(search_pattern),
            )
        )

    if action_filter:
        query = query.where(AuditLog.action == action_filter)
    if entity_type_filter:
        query = query.where(AuditLog.entity_type == entity_type_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_items = db.execute(count_query).scalar_one()

    # Apply sorting
    sort_attr = AuditLog.created_at
    if sort_order == "asc":
        query = query.order_by(sort_attr)
    else:
        query = query.order_by(desc(sort_attr))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    results = db.execute(query).all()

    items = []
    for audit, admin in results:
        items.append({
            "id": audit.id,
            "actor_admin_id": audit.actor_admin_id,
            "actor_admin_email": admin.email if admin else None,
            "actor_type": audit.actor_type,
            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "before_state": audit.before_state,
            "after_state": audit.after_state,
            "ip_address": audit.ip_address,
            "user_agent": audit.user_agent,
            "created_at": audit.created_at,
        })

    return items, total_items


# Default system settings structure
DEFAULT_SETTINGS = {
    "trust_name": "Kumbhad Samaj Trust",
    "contact_details": {
        "email": "contact@kumbhadsamaj.org",
        "phone": "+919876543210",
        "address": "Ahmedabad, Gujarat, India",
    },
    "social_links": [
        {"platform": "facebook", "url": "https://facebook.com"},
        {"platform": "youtube", "url": "https://youtube.com"},
    ],
    "receipt_settings": {
        "footer_note": "Thank you for your support. This is a computer generated receipt.",
        "terms": "Subject to Ahmedabad jurisdiction.",
    },
}


def get_system_settings(db: Session) -> dict[str, Any]:
    # Fetch all settings
    settings_records = db.execute(select(SystemSetting)).scalars().all()
    records_dict = {r.key: json.loads(r.value) for r in settings_records}

    # Merge with default settings
    merged_settings = DEFAULT_SETTINGS.copy()
    for key, val in records_dict.items():
        merged_settings[key] = val

    return merged_settings


def update_system_setting(
    db: Session,
    key: str,
    value: Any,
    *,
    actor_admin_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    # Validate key
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settings key: {key}",
        )

    # Fetch existing
    record = db.execute(select(SystemSetting).where(SystemSetting.key == key)).scalar_one_or_none()

    before_val = None
    if record:
        before_val = json.loads(record.value)
    else:
        before_val = DEFAULT_SETTINGS.get(key)

    new_val_str = json.dumps(value)

    if record:
        record.value = new_val_str
    else:
        record = SystemSetting(key=key, value=new_val_str)
        db.add(record)

    db.flush()

    # Log critical settings changes to audit logs
    create_admin_audit_log(
        db,
        actor_admin_id=actor_admin_id,
        action="setting_updated",
        entity_type="system_setting",
        entity_id=record.id,
        before_state={key: before_val},
        after_state={key: value},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.commit()
    return {
        "key": key,
        "updated": True,
    }
