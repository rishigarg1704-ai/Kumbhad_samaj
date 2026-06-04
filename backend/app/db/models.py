from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    google_user_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    profile_picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="inactive", index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    families: Mapped[list["Family"]] = orm_relationship(back_populates="head_user")
    payments: Mapped[list["Payment"]] = orm_relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = orm_relationship(back_populates="user")


class AdminUser(Base, TimestampMixin):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    two_factor_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active", index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_reset_token: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    fee_history_created: Mapped[list["MembershipFeeHistory"]] = orm_relationship(back_populates="created_by_admin")
    audit_logs: Mapped[list["AuditLog"]] = orm_relationship(back_populates="actor_admin")


class Family(Base, TimestampMixin):
    __tablename__ = "families"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    head_user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    mobile_number: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    email: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active", index=True)
    consent_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_ip: Mapped[str | None] = mapped_column(Text, nullable=True)

    head_user: Mapped["User"] = orm_relationship(back_populates="families")
    family_members: Mapped[list["FamilyMember"]] = orm_relationship(back_populates="family", cascade="all, delete-orphan")
    memberships: Mapped[list["Membership"]] = orm_relationship(back_populates="family")
    payments: Mapped[list["Payment"]] = orm_relationship(back_populates="family")


class FamilyMember(Base, TimestampMixin):
    __tablename__ = "family_members"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("families.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    gender: Mapped[str] = mapped_column(
        Enum("male", "female", "other", "prefer_not_to_say", name="gender_enum"),
        nullable=False,
    )
    relationship: Mapped[str] = mapped_column(Text, nullable=False)

    family: Mapped["Family"] = orm_relationship(back_populates="family_members")


class Membership(Base, TimestampMixin):
    __tablename__ = "memberships"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    family_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("families.id"), nullable=False, index=True)
    membership_number: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    family: Mapped["Family"] = orm_relationship(back_populates="memberships")
    payments: Mapped[list["Payment"]] = orm_relationship(back_populates="membership")


class MembershipFeeHistory(Base, TimestampMixin):
    __tablename__ = "membership_fee_history"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    membership_fee_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    renewal_fee_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    created_by_admin_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("admin_users.id"), nullable=True)

    created_by_admin: Mapped["AdminUser | None"] = orm_relationship(back_populates="fee_history_created")
    payments: Mapped[list["Payment"]] = orm_relationship(back_populates="fee_history")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    family_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("families.id"), nullable=False, index=True)
    membership_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("memberships.id"), nullable=False, index=True)
    fee_history_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("membership_fee_history.id"), nullable=False, index=True)
    payment_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(Text, nullable=False, default="razorpay")
    provider_order_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    provider_payment_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True, index=True)
    provider_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    receipt_number: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    receipt_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped["User"] = orm_relationship(back_populates="payments")
    family: Mapped["Family"] = orm_relationship(back_populates="payments")
    membership: Mapped["Membership"] = orm_relationship(back_populates="payments")
    fee_history: Mapped["MembershipFeeHistory"] = orm_relationship(back_populates="payments")


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    provider: Mapped[str] = mapped_column(Text, nullable=False, default="razorpay", index=True)
    provider_event_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    provider_order_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    provider_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    raw_payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replay_count: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    actor_admin_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("admin_users.id"), nullable=True, index=True)
    actor_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    action: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    before_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor_admin: Mapped["AdminUser | None"] = orm_relationship(back_populates="audit_logs")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(Text, nullable=False, default="website", index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="sent", index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = orm_relationship(back_populates="notifications")


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft", index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GalleryAlbum(Base, TimestampMixin):
    __tablename__ = "gallery_albums"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft", index=True)
    photo_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    photos: Mapped[list["GalleryPhoto"]] = orm_relationship(back_populates="album", cascade="all, delete-orphan")


class GalleryPhoto(Base, TimestampMixin):
    __tablename__ = "gallery_photos"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    album_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("gallery_albums.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    filepath: Mapped[str] = mapped_column(Text, nullable=False)
    public_url: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    album: Mapped["GalleryAlbum"] = orm_relationship(back_populates="photos")


class SystemSetting(Base, TimestampMixin):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
