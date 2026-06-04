# Feature Ticket Backlog

## Phase 0: Requirements and Architecture

### TICKET-001: Approve PRD

Define and approve product scope, user roles, business rules, and non-goals.

Acceptance criteria:

- PRD reviewed.
- No donation scope confirmed.
- Family-based membership confirmed.
- Payment-triggered activation confirmed.

### TICKET-002: Approve Technical Architecture

Define stack, layers, modules, and infrastructure direction.

Acceptance criteria:

- Frontend and backend stack approved.
- Layered backend architecture approved.
- Razorpay webhook flow approved.
- Deployment architecture approved.

### TICKET-003: Approve Security Design

Define authentication, authorization, payment security, audit logs, and operational security.

Acceptance criteria:

- Admin 2FA requirement approved.
- Member Google OAuth requirement approved.
- Permission matrix approved.
- Webhook security approved.

### TICKET-003A: Approve Production Readiness Documents

Approve production implementation documents before code generation begins.

Acceptance criteria:

- API Specification includes DTOs, validation rules, standard filtering, and error matrices for every endpoint.
- Frontend Specification includes login, session expiry, logout, role redirects, payment status, and acceptance behavior.
- Deployment Plan includes backup strategy, restore commands, and performance targets.
- Disaster Recovery Plan includes RTO `4 hours`, RPO `1 hour`, and recovery runbooks.
- Monitoring and Alerting Plan includes thresholds, observability, retention, rotation, and storage.
- Acceptance Test Suite covers authentication, membership, renewals, events, gallery, notifications, reports, and admin panel.
- Implementation is blocked until all production readiness documents are approved.

## Phase 1: Project Foundation

### TICKET-004: Create Monorepo Structure

Create frontend, backend, infrastructure, and docs structure.

Acceptance criteria:

- Frontend app folder exists.
- Backend app folder exists.
- Docker structure exists.
- Docs remain versioned.

### TICKET-005: Configure Backend Foundation

Set up FastAPI app, dependency injection, configuration, logging, and health check.

Acceptance criteria:

- Health endpoint works.
- Environment config loads.
- Structured logging enabled.
- No business logic in route handlers.

### TICKET-006: Configure Database and Migrations

Set up PostgreSQL models and Alembic migrations.

Acceptance criteria:

- Database connection works.
- Initial migration creates core tables.
- UUID primary keys used.
- Foreign keys and indexes included.

### TICKET-007: Configure Frontend Foundation

Set up React TypeScript app with routing, query client, validation libraries, and base layout.

Acceptance criteria:

- React Router configured.
- React Query configured.
- React Hook Form and Zod available.
- Public, member, and admin route groups exist.

### TICKET-007A: Implement Trust and Legal Pages

Create the mandatory public trust, compliance, and payment disclosure pages.

Acceptance criteria:

- About Us, Membership Benefits, Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, and Contact Us pages exist.
- Footer links appear on every public page.
- Registration requires explicit Terms & Conditions and Privacy Policy consent.
- Checkout shows membership fee, validity, and refund policy before payment.

## Phase 2: Authentication

### TICKET-008: Implement Member Google OAuth

Implement Google OAuth login for members.

Acceptance criteria:

- Google callback validated server-side.
- One email maps to one user.
- Google passwords are never stored.
- Suspended users cannot log in.

### TICKET-009: Implement Session Management

Implement JWT access tokens, refresh cookies, logout, and token rotation.

Acceptance criteria:

- Access tokens are short-lived.
- Refresh cookies are secure and HTTP-only.
- Logout revokes session.
- CSRF protection exists where required.

### TICKET-010: Implement Admin Login and 2FA

Implement admin email/password login with mandatory 2FA.

Acceptance criteria:

- Argon2 password hashing used.
- 2FA required.
- Failed login attempts rate limited.
- Login events audited.

## Phase 3: Membership Core

### TICKET-011: Implement Membership Registration Draft

Create pending user, family, membership, and payment order.

Acceptance criteria:

- Active membership fee used.
- Membership remains pending before webhook.
- Duplicate email handling works.
- Audit log created.

### TICKET-012: Implement Family Records

Create and manage family members.

Acceptance criteria:

- Head of family stored.
- Family members stored without photos.
- Validation exists.
- Soft delete supported.

### TICKET-013: Implement Membership Number Generation

Generate permanent membership identifiers.

Acceptance criteria:

- Format is stable.
- Numbers are unique.
- Numbers are never recycled.
- Concurrent registration is safe.

## Phase 4: Razorpay Integration

### TICKET-014: Create Razorpay Orders

Create Razorpay registration and renewal orders.

Acceptance criteria:

- Order ID stored.
- Amount matches active fee.
- Payment starts as pending.
- Frontend receives checkout payload.

### TICKET-015: Process Razorpay Webhooks

Verify and process Razorpay webhooks.

Acceptance criteria:

- Signature verified.
- Processing is idempotent.
- Amount and order IDs are verified.
- Payment and membership update in one transaction.
- Failed webhook alerts are supported.

## Phase 5: Member Portal

### TICKET-016: Member Dashboard

Build dashboard showing membership status, expiry, renewal action, notifications, and recent payments.

Acceptance criteria:

- Member sees only own data.
- Suspended status handled.
- Renewal CTA appears correctly.

### TICKET-017: Member Payment History and Receipts

Show payment history and receipt downloads.

Acceptance criteria:

- Successful payments show receipts.
- Historical fee amount shown.
- Member cannot access another receipt.

### TICKET-018: Member Renewal Flow

Build online renewal workflow.

Acceptance criteria:

- Renewal order created.
- Frontend waits for backend status.
- Expiry extends only after verified webhook.

## Phase 6: Admin Panel

### TICKET-019: Admin Members Module

Build member list, search, filters, create, edit, and soft delete.

Acceptance criteria:

- Pagination works.
- Filters work.
- Critical actions audited.

### TICKET-020: Admin Fee Management

Build fee update and fee history screens.

Acceptance criteria:

- Admin can set membership fee, renewal fee, and effective date.
- Historical payments remain unchanged.
- Fee changes are audited.

### TICKET-021: Admin Payments Module

Build payment list and detail screens.

Acceptance criteria:

- Filter by status, type, date, and member.
- Payment history is never deleted.
- Failed payments visible.

## Phase 7: Events

### TICKET-022: Public Events

Build public event list and detail pages.

Acceptance criteria:

- Published events visible.
- Draft and archived events hidden from public.

### TICKET-023: Admin Events

Build admin event management.

Acceptance criteria:

- Admin can create, edit, publish, archive, and delete events.
- Deletion is soft delete.
- Actions audited.

## Phase 8: Gallery

### TICKET-024: Public Gallery

Build dynamic public albums and photo views.

Acceptance criteria:

- Albums load from API.
- Photos are not hardcoded.
- Empty states handled.

### TICKET-025: Admin Gallery

Build album and photo management.

Acceptance criteria:

- Admin can upload, delete, and organize photos.
- Upload validation exists.
- Actions audited.

## Phase 9: Notifications

### TICKET-026: Website Notifications

Build notification storage and member notification UI.

Acceptance criteria:

- Member sees own notifications.
- Read status works.
- Notification creation service exists.

### TICKET-027: Email Notifications

Implement email notification sending.

Acceptance criteria:

- Registration success email.
- Renewal reminder email.
- Renewal confirmation email.
- Failed sends are logged.

## Phase 10: Reports

### TICKET-028: Active Members Report

Build active members report.

Acceptance criteria:

- Filters available.
- Export strategy defined.
- Query performs with indexes.

### TICKET-029: Expiring Members Report

Build expiring memberships report.

Acceptance criteria:

- Date range filter.
- Useful for renewal follow-up.

### TICKET-030: Birthday Report

Build birthday report from family member dates of birth.

Acceptance criteria:

- Month filter.
- Family and contact details available to admin.

### TICKET-031: Payment Report

Build payment report.

Acceptance criteria:

- Filter by date, status, and payment type.
- Historical amounts shown.

## Phase 11: Security Hardening

### TICKET-032: Security Headers and Rate Limits

Configure production security headers and rate limits.

Acceptance criteria:

- HTTPS enforced.
- Security headers enabled.
- Sensitive endpoints rate limited.

### TICKET-033: Audit Log Review

Verify critical actions produce audit logs.

Acceptance criteria:

- Fee changes audited.
- Member edits audited.
- Deletes audited.
- Payment webhooks audited.

## Phase 12: Production Deployment

### TICKET-034: Docker Compose Deployment

Create production-ready Docker Compose setup.

Acceptance criteria:

- Backend, frontend, database, and Nginx configured.
- Environment variables documented.
- Health checks configured.
- Restore commands documented and tested in staging.
- Performance targets documented.

### TICKET-035: Backup and Restore

Implement backup and restoration documentation.

Acceptance criteria:

- Daily database backup.
- Weekly server backup.
- Monthly archive backup.
- Restoration process documented and tested.

### TICKET-036: Monitoring and Alerts

Implement monitoring and alerting plan.

Acceptance criteria:

- Uptime monitoring.
- Health checks.
- Error tracking.
- Alerts for server down, database down, failed webhooks, and backup failures.
- CPU, memory, disk, database connection, SSL expiry, API latency, and 5xx thresholds configured.
- Application logs, access logs, audit logs, and error logs follow retention and rotation rules.
