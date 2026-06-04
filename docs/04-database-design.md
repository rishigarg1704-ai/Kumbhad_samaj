# Database Design

## Database Principles

- Use PostgreSQL.
- Use UUID primary keys.
- Use foreign key constraints.
- Use indexes for lookup and reporting.
- Use transactions for registration, renewal, payment, and audit workflows.
- Use soft deletes for business records.
- Never hard delete payment history.
- Never recycle membership numbers.
- Preserve fee history forever.

## Core Tables

Required tables:

- users
- admin_users
- families
- family_members
- memberships
- membership_fee_history
- payments
- events
- gallery_albums
- gallery_photos
- notifications
- audit_logs
- system_settings

## Common Columns

Most business tables should include:

- id UUID primary key
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Audit logs should not include `deleted_at`.

## Table: users

Stores member login identity.

Columns:

- id UUID primary key
- google_user_id text unique nullable
- email text unique not null
- full_name text not null
- profile_picture_url text nullable
- status text not null
- last_login_at timestamp with time zone nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Status values:

- active
- suspended
- inactive

Indexes:

- unique email
- unique google_user_id where not null
- status

## Table: admin_users

Stores admin accounts.

Columns:

- id UUID primary key
- email text unique not null
- full_name text not null
- password_hash text not null
- two_factor_secret text nullable
- two_factor_enabled boolean not null
- status text not null
- last_login_at timestamp with time zone nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Indexes:

- unique email
- status

## Table: families

Stores family unit records.

Columns:

- id UUID primary key
- head_user_id UUID references users(id)
- address text not null
- mobile_number text not null
- email text not null
- status text not null
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Indexes:

- head_user_id
- mobile_number
- email
- status

## Table: family_members

Stores members belonging to a family.

Columns:

- id UUID primary key
- family_id UUID references families(id)
- name text not null
- date_of_birth date not null
- gender text not null
- relationship text not null
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Indexes:

- family_id
- date_of_birth

## Table: memberships

Stores membership status and validity.

Columns:

- id UUID primary key
- family_id UUID references families(id)
- membership_number text unique not null
- status text not null
- start_date date nullable
- expiry_date date nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Status values:

- pending_payment
- active
- expired
- suspended
- cancelled

Indexes:

- unique membership_number
- family_id
- status
- expiry_date

## Table: membership_fee_history

Stores configurable fee history.

Columns:

- id UUID primary key
- membership_fee_amount numeric(12,2) not null
- renewal_fee_amount numeric(12,2) not null
- effective_from date not null
- effective_to date nullable
- created_by_admin_id UUID references admin_users(id)
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Rules:

- Only one active fee record should exist for a given effective period.
- Past fee rows must not be changed in a way that affects historical payments.

Indexes:

- effective_from
- effective_to

## Table: payments

Stores registration and renewal payment history.

Columns:

- id UUID primary key
- user_id UUID references users(id)
- family_id UUID references families(id)
- membership_id UUID references memberships(id)
- fee_history_id UUID references membership_fee_history(id)
- payment_type text not null
- provider text not null
- provider_order_id text unique not null
- provider_payment_id text unique nullable
- provider_signature text nullable
- status text not null
- amount numeric(12,2) not null
- currency text not null
- paid_at timestamp with time zone nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone

Payment types:

- registration
- renewal

Provider:

- razorpay

Status values:

- pending
- success
- failed
- refunded

Indexes:

- provider_order_id
- provider_payment_id
- user_id
- family_id
- membership_id
- status
- paid_at

## Table: events

Stores public event information.

Columns:

- id UUID primary key
- title text not null
- slug text unique not null
- description text not null
- event_date timestamp with time zone nullable
- location text nullable
- status text not null
- published_at timestamp with time zone nullable
- created_by_admin_id UUID references admin_users(id)
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Status values:

- draft
- published
- archived

Indexes:

- slug
- status
- event_date

## Table: gallery_albums

Stores gallery albums.

Columns:

- id UUID primary key
- title text not null
- slug text unique not null
- description text nullable
- status text not null
- created_by_admin_id UUID references admin_users(id)
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Indexes:

- slug
- status

## Table: gallery_photos

Stores gallery photo metadata.

Columns:

- id UUID primary key
- album_id UUID references gallery_albums(id)
- title text nullable
- storage_path text not null
- public_url text not null
- mime_type text not null
- file_size_bytes integer not null
- sort_order integer not null
- uploaded_by_admin_id UUID references admin_users(id)
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Indexes:

- album_id
- sort_order

## Table: notifications

Stores member and admin notifications.

Columns:

- id UUID primary key
- recipient_user_id UUID references users(id) nullable
- recipient_admin_id UUID references admin_users(id) nullable
- channel text not null
- title text not null
- body text not null
- status text not null
- read_at timestamp with time zone nullable
- sent_at timestamp with time zone nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Channels:

- website
- email

Status values:

- queued
- sent
- failed
- read

Indexes:

- recipient_user_id
- recipient_admin_id
- channel
- status
- created_at

## Table: audit_logs

Stores immutable critical action history.

Columns:

- id UUID primary key
- actor_user_id UUID references users(id) nullable
- actor_admin_id UUID references admin_users(id) nullable
- actor_type text not null
- action text not null
- resource_type text not null
- resource_id UUID nullable
- old_value jsonb nullable
- new_value jsonb nullable
- ip_address text nullable
- user_agent text nullable
- created_at timestamp with time zone

Rules:

- No updates after insert.
- No soft delete.
- No hard delete during normal operations.

Indexes:

- actor_user_id
- actor_admin_id
- resource_type
- resource_id
- action
- created_at

## Table: system_settings

Stores admin-configurable system values.

Columns:

- id UUID primary key
- key text unique not null
- value jsonb not null
- updated_by_admin_id UUID references admin_users(id) nullable
- created_at timestamp with time zone
- updated_at timestamp with time zone
- deleted_at timestamp with time zone nullable

Example keys:

- trust_name
- trust_logo
- contact_details
- email_templates
- social_links
- receipt_settings

Indexes:

- unique key

## Migration Rules

- Every schema change must use a migration.
- Migrations must be reversible where practical.
- Production migrations must be reviewed before deployment.
- Avoid destructive migrations on business records.

## Production Database Requirements

- Common member, payment, report, and audit queries must use indexes that keep indexed query time under `50 ms` at target scale.
- List endpoints must support the standard pagination, sorting, searching, filtering, and date filtering contract in `docs/05-api-specification.md`.
- Payment and membership updates must be transactional.
- Razorpay webhook processing must be idempotent at the database level.
- Historical payment amounts and fee history must never be mutated by future fee changes.
- Audit logs must be insert-only during normal operations.
- Backup and restore procedures must follow `docs/08-deployment-plan.md` and `docs/09-disaster-recovery-plan.md`.

## Database Acceptance Requirements

- Migration tests must verify table creation, constraints, indexes, and reversible migrations where practical.
- Payment workflow tests must verify transaction rollback on partial failure.
- Fee history tests must verify historical payments remain unchanged.
- Soft delete tests must verify business records are hidden from normal reads without deleting payment history.
