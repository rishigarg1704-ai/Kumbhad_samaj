"""initial core tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-06-03 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


gender_enum = sa.Enum("male", "female", "other", "prefer_not_to_say", name="gender_enum")


def upgrade() -> None:
    bind = op.get_bind()
#    gender_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("google_user_id", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("profile_picture_url", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active', 'suspended', 'inactive')", name="ck_users_status"),
        sa.UniqueConstraint("google_user_id", name="uq_users_google_user_id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "admin_users",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("two_factor_secret", sa.Text(), nullable=True),
        sa.Column("two_factor_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_admin_users_status"),
        sa.UniqueConstraint("email", name="uq_admin_users_email"),
    )

    op.create_table(
        "families",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("head_user_id", pg.UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("mobile_number", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "membership_fee_history",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("membership_fee_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("renewal_fee_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_by_admin_id", pg.UUID(as_uuid=False), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "memberships",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("family_id", pg.UUID(as_uuid=False), sa.ForeignKey("families.id"), nullable=False),
        sa.Column("membership_number", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending_payment', 'active', 'expired', 'suspended', 'cancelled')",
            name="ck_memberships_status",
        ),
        sa.UniqueConstraint("membership_number", name="uq_memberships_membership_number"),
    )

    op.create_table(
        "family_members",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("family_id", pg.UUID(as_uuid=False), sa.ForeignKey("families.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", gender_enum, nullable=False),
        sa.Column("relationship", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "payments",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("user_id", pg.UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("family_id", pg.UUID(as_uuid=False), sa.ForeignKey("families.id"), nullable=False),
        sa.Column("membership_id", pg.UUID(as_uuid=False), sa.ForeignKey("memberships.id"), nullable=False),
        sa.Column("fee_history_id", pg.UUID(as_uuid=False), sa.ForeignKey("membership_fee_history.id"), nullable=False),
        sa.Column("payment_type", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("provider_order_id", sa.Text(), nullable=False),
        sa.Column("provider_payment_id", sa.Text(), nullable=True),
        sa.Column("provider_signature", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("payment_type IN ('registration', 'renewal')", name="ck_payments_payment_type"),
        sa.CheckConstraint("status IN ('pending', 'success', 'failed', 'refunded')", name="ck_payments_status"),
        sa.UniqueConstraint("provider_order_id", name="uq_payments_provider_order_id"),
        sa.UniqueConstraint("provider_payment_id", name="uq_payments_provider_payment_id"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("actor_admin_id", pg.UUID(as_uuid=False), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("actor_type", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("before_state", sa.Text(), nullable=True),
        sa.Column("after_state", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_index("ix_users_status", "users", ["status"])
    op.create_index("ix_admin_users_status", "admin_users", ["status"])
    op.create_index("ix_families_head_user_id", "families", ["head_user_id"])
    op.create_index("ix_families_mobile_number", "families", ["mobile_number"])
    op.create_index("ix_families_email", "families", ["email"])
    op.create_index("ix_families_status", "families", ["status"])
    op.create_index("ix_family_members_family_id", "family_members", ["family_id"])
    op.create_index("ix_family_members_date_of_birth", "family_members", ["date_of_birth"])
    op.create_index("ix_memberships_family_id", "memberships", ["family_id"])
    op.create_index("ix_memberships_status", "memberships", ["status"])
    op.create_index("ix_memberships_expiry_date", "memberships", ["expiry_date"])
    op.create_index("ix_membership_fee_history_effective_from", "membership_fee_history", ["effective_from"])
    op.create_index("ix_membership_fee_history_effective_to", "membership_fee_history", ["effective_to"])
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_family_id", "payments", ["family_id"])
    op.create_index("ix_payments_membership_id", "payments", ["membership_id"])
    op.create_index("ix_payments_fee_history_id", "payments", ["fee_history_id"])
    op.create_index("ix_payments_payment_type", "payments", ["payment_type"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_paid_at", "payments", ["paid_at"])
    op.create_index("ix_audit_logs_actor_admin_id", "audit_logs", ["actor_admin_id"])
    op.create_index("ix_audit_logs_actor_type", "audit_logs", ["actor_type"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_admin_id", table_name="audit_logs")
    op.drop_index("ix_payments_paid_at", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_payment_type", table_name="payments")
    op.drop_index("ix_payments_fee_history_id", table_name="payments")
    op.drop_index("ix_payments_membership_id", table_name="payments")
    op.drop_index("ix_payments_family_id", table_name="payments")
    op.drop_index("ix_payments_user_id", table_name="payments")
    op.drop_index("ix_membership_fee_history_effective_to", table_name="membership_fee_history")
    op.drop_index("ix_membership_fee_history_effective_from", table_name="membership_fee_history")
    op.drop_index("ix_memberships_expiry_date", table_name="memberships")
    op.drop_index("ix_memberships_status", table_name="memberships")
    op.drop_index("ix_memberships_family_id", table_name="memberships")
    op.drop_index("ix_family_members_date_of_birth", table_name="family_members")
    op.drop_index("ix_family_members_family_id", table_name="family_members")
    op.drop_index("ix_families_status", table_name="families")
    op.drop_index("ix_families_email", table_name="families")
    op.drop_index("ix_families_mobile_number", table_name="families")
    op.drop_index("ix_families_head_user_id", table_name="families")
    op.drop_index("ix_admin_users_status", table_name="admin_users")
    op.drop_index("ix_users_status", table_name="users")

    op.drop_table("audit_logs")
    op.drop_table("payments")
    op.drop_table("family_members")
    op.drop_table("memberships")
    op.drop_table("membership_fee_history")
    op.drop_table("families")
    op.drop_table("admin_users")
    op.drop_table("users")
    bind = op.get_bind()
    gender_enum.drop(bind, checkfirst=True)
