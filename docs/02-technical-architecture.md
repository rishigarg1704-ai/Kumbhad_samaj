# Technical Architecture

## Architecture Goals

- Production-ready reliability.
- Secure-by-default implementation.
- Clear separation of concerns.
- Maintainable modules and data boundaries.
- Simple member and admin workflows.
- Scalable enough for 5,000+ members without redesign.

## Technology Stack

### Frontend

- React
- TypeScript
- React Router
- React Query
- React Hook Form
- Zod

### Backend

- FastAPI
- Python
- SQLAlchemy or SQLModel
- Alembic migrations
- Pydantic validation

### Database

- PostgreSQL
- UUID primary keys
- Foreign key constraints
- Indexes
- Transactions
- Soft deletes for business records

### Payments

- Razorpay
- Webhook-driven activation and renewal
- Signature verification required

### Infrastructure

- Cloudflare
- Nginx
- FastAPI application server
- PostgreSQL
- Docker and Docker Compose
- Linux VPS

## High-Level System Flow

```text
Browser
  -> Cloudflare
  -> Nginx
  -> React frontend
  -> FastAPI backend
  -> PostgreSQL

Razorpay
  -> Webhook endpoint
  -> Signature verification
  -> Payment service
  -> Membership transaction
  -> Audit log
```

## Backend Layering

### API Layer

Responsibilities:

- Define routes.
- Validate request and response schemas.
- Enforce authentication and authorization dependencies.
- Call services.
- Return structured responses.

Rules:

- No business logic in route handlers.
- No direct SQL in controllers.
- No fee calculation in route handlers.
- No membership activation logic in route handlers.

### Service Layer

Responsibilities:

- Own business workflows.
- Coordinate repositories.
- Enforce business rules.
- Manage transaction boundaries.
- Emit audit logs.
- Trigger notifications.

Examples:

- Registration service.
- Renewal service.
- Payment service.
- Fee service.
- Notification service.
- Event service.

### Repository Layer

Responsibilities:

- Encapsulate database access.
- Provide query methods.
- Apply soft delete filters.
- Keep persistence concerns away from services.

### Database Layer

Responsibilities:

- Database session management.
- Migrations.
- Model definitions.
- Transaction handling support.

## Core Modules

- Authentication
- Admin authentication and 2FA
- Users
- Families
- Memberships
- Membership fee history
- Payments
- Razorpay webhooks
- Events
- Gallery
- Notifications
- Reports
- Audit logs
- System settings

## Authentication Architecture

### Member Authentication

Primary method:

- Google OAuth 2.0

Stored identity fields:

- Google user ID
- Email
- Full name
- Profile picture URL
- Last login timestamp

Rules:

- One email maps to one user.
- Google passwords are never stored.
- Duplicate accounts must be prevented.
- Suspended members cannot log in.
- Account linking should be supported for future login methods.

Future methods:

- Email OTP
- Phone OTP

### Admin Authentication

Admin login requires:

- Email
- Password
- Mandatory 2FA

Rules:

- Admin accounts are manually created.
- Passwords use Argon2 hashing.
- Admin sessions require stronger controls than member sessions.

## Session Strategy

- Use short-lived JWT access tokens.
- Use secure HTTP-only refresh cookies.
- Use CSRF protection for cookie-authenticated state-changing requests.
- Rotate refresh tokens.
- Revoke sessions on logout.
- Track last login timestamp.

## Payment Architecture

Payment status changes must be driven by Razorpay webhooks, not frontend callbacks.

Required workflow:

1. Backend creates Razorpay order.
2. Payment record is stored as pending.
3. Frontend opens Razorpay checkout.
4. Razorpay sends webhook.
5. Backend verifies webhook signature.
6. Backend checks payment status and amount.
7. Backend performs payment and membership updates in one transaction.
8. Audit log is written.
9. Receipt becomes available.
10. Notification is queued.

Fraud safety rules:

- Never trust frontend payment success alone.
- Verify webhook signature.
- Verify Razorpay order ID and payment ID.
- Verify expected amount.
- Make webhook processing idempotent.
- Store raw event reference where legally and operationally appropriate.

## File Upload Architecture

Gallery uploads must validate:

- File type.
- File extension.
- MIME type.
- File size.
- Image dimensions where needed.

Storage should support migration from local VPS storage to object storage later.

## Audit Logging

Every critical action must create an audit log.

Examples:

- Member created.
- Member edited.
- Member deleted.
- Membership fee changed.
- Payment webhook processed.
- Event deleted.
- Gallery photo removed.

Audit logs are immutable and must not be soft deleted.

## Error Handling

- Use structured error responses.
- Never leak secrets or internal stack traces.
- Log server-side diagnostic details.
- Return user-friendly messages to frontend.

## Scalability Notes

The system target is modest but production-critical. The architecture should support 5,000+ members through:

- Proper indexes.
- Pagination.
- Efficient reporting queries.
- Background jobs for notifications.
- Idempotent webhooks.
- Database-backed configuration.
- Avoiding tight coupling between modules.

## Production Architecture Requirements

- API implementation must follow `docs/05-api-specification.md` DTOs, validation rules, standard list query contract, and error matrix.
- Frontend implementation must follow `docs/06-frontend-specification.md` authentication, session expiry, logout, role redirect, payment, and acceptance behavior.
- Deployment must follow `docs/08-deployment-plan.md`.
- Disaster recovery must follow `docs/09-disaster-recovery-plan.md`.
- Monitoring and observability must follow `docs/10-monitoring-alerting-plan.md`.
- Acceptance coverage must follow `docs/11-acceptance-test-suite.md`.

## Performance Requirements

- Frontend Largest Contentful Paint under `2.5 seconds`.
- Backend 95th percentile API response under `300 ms`.
- Indexed database query under `50 ms`.
- Authentication login under `2 seconds`.
- Membership renewal order flow under `5 seconds` excluding external Razorpay user interaction.
