"""phase 4 payment webhook and receipt fields

Revision ID: 0002_phase4_payments
Revises: 0001_initial
Create Date: 2026-06-04 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision = "0002_phase4_payments"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("receipt_number", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("receipt_generated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_payments_receipt_number", "payments", ["receipt_number"])

    op.create_table(
        "payment_webhook_events",
        sa.Column("id", pg.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("provider_event_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("provider_order_id", sa.Text(), nullable=True),
        sa.Column("provider_payment_id", sa.Text(), nullable=True),
        sa.Column("raw_payload_hash", sa.Text(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replay_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("provider_event_id", name="uq_payment_webhook_events_provider_event_id"),
    )
    op.create_index("ix_payment_webhook_events_provider", "payment_webhook_events", ["provider"])
    op.create_index("ix_payment_webhook_events_event_type", "payment_webhook_events", ["event_type"])
    op.create_index("ix_payment_webhook_events_provider_order_id", "payment_webhook_events", ["provider_order_id"])
    op.create_index("ix_payment_webhook_events_provider_payment_id", "payment_webhook_events", ["provider_payment_id"])
    op.create_index("ix_payment_webhook_events_processed", "payment_webhook_events", ["processed"])


def downgrade() -> None:
    op.drop_index("ix_payment_webhook_events_processed", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_events_provider_payment_id", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_events_provider_order_id", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_events_event_type", table_name="payment_webhook_events")
    op.drop_index("ix_payment_webhook_events_provider", table_name="payment_webhook_events")
    op.drop_table("payment_webhook_events")

    op.drop_constraint("uq_payments_receipt_number", "payments", type_="unique")
    op.drop_column("payments", "receipt_generated_at")
    op.drop_column("payments", "receipt_number")
