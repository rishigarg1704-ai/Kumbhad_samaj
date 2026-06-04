# Security Document

## Security Objectives

- Protect member and family data.
- Protect payment integrity.
- Prevent unauthorized admin access.
- Maintain immutable audit trails.
- Follow OWASP Top 10 practices.
- Avoid security shortcuts in production code.

## Threat Model

### Assets

- Member identity data.
- Family records.
- Membership status and expiry dates.
- Payment records and receipts.
- Admin accounts.
- Fee configuration.
- Website content.
- Audit logs.

### Main Threats

- Unauthorized admin login.
- Member accessing another family's data.
- Payment spoofing through frontend callbacks.
- Webhook replay or forged webhook calls.
- Cross-site request forgery.
- Cross-site scripting.
- SQL injection.
- File upload abuse.
- Brute-force login attempts.
- Accidental deletion of business records.
- Unauthorized fee changes.

## Authentication Controls

### Member Login

- Use Google OAuth 2.0.
- Validate Google tokens server-side.
- Enforce one email per user.
- Store Google ID, email, full name, profile picture URL, and last login timestamp.
- Never store Google passwords.
- Reject login for suspended users.

### Admin Login

- Use email and password.
- Hash passwords using Argon2.
- Require mandatory 2FA.
- Rate limit login attempts.
- Log successful and failed login attempts.
- Manually create admin accounts.

## Session Security

- Use short-lived JWT access tokens.
- Store refresh tokens in secure, HTTP-only cookies.
- Set `Secure`, `HttpOnly`, and `SameSite` cookie attributes.
- Rotate refresh tokens.
- Revoke refresh tokens on logout.
- Protect state-changing requests against CSRF.

## Authorization Model

### Public

- Can access public pages, public events, public gallery, and contact information.
- Can start membership registration.

### Member

- Can access only their own user, family, membership, payments, receipts, and notifications.
- Cannot delete membership or family records.
- Cannot access admin APIs.

### Admin

- Can manage member records, family records, fees, payments, events, gallery, reports, content, and settings according to assigned permissions.
- Critical admin actions must be audited.

### System

- Processes payment webhooks.
- Sends notifications.
- Runs scheduled jobs.

## Permission Matrix

| Feature | Public | Member | Admin | System |
| --- | --- | --- | --- | --- |
| View public website | Yes | Yes | Yes | No |
| Register membership | Yes | No | Yes | No |
| View own membership | No | Yes | Yes | No |
| Renew own membership | No | Yes | Yes | No |
| Delete membership | No | No | Soft delete only | No |
| Manage fees | No | No | Yes | No |
| Process payment webhook | No | No | No | Yes |
| Manage events | No | No | Yes | No |
| Manage gallery | No | No | Yes | No |
| View reports | No | No | Yes | No |
| View audit logs | No | No | Yes | No |

## Payment Security

Membership activation and renewal extension must only happen after:

1. Razorpay webhook received.
2. Webhook signature verified.
3. Razorpay order and payment identifiers matched.
4. Amount verified against expected historical fee.
5. Payment status confirmed.
6. Database transaction succeeds.

Controls:

- Never activate membership from frontend success response.
- Make webhook processing idempotent.
- Store payment status transitions.
- Log webhook failures.
- Alert admins for failed payment webhooks.

## Data Protection

- Store only required personal data.
- Do not store Aadhaar unless legally required later.
- Do not store family member photos.
- Do not store Google passwords.
- Do not store raw payment card data.
- Use database constraints to preserve integrity.
- Use soft deletes for business records.
- Never delete payment history.
- Never mutate historical fee values on old payments.

## Input and Output Security

- Validate all request bodies using Pydantic on backend.
- Validate frontend forms using Zod.
- Encode output to prevent XSS.
- Sanitize rich content if rich content editing is introduced.
- Use parameterized queries through ORM or query builder.

## File Upload Security

Gallery uploads must validate:

- Allowed extensions.
- MIME type.
- File size.
- Image structure.
- Storage path.

Rules:

- Never execute uploaded files.
- Never trust client-provided filenames.
- Store generated filenames.
- Restrict public access to approved media paths.

## Audit Logging

Critical actions must be logged with:

- Actor user ID.
- Actor role.
- Action.
- Resource type.
- Resource ID.
- Timestamp.
- Old value.
- New value.
- Request metadata where appropriate.

Audit logs must be immutable.

## Rate Limiting

Apply rate limits to:

- Admin login.
- OAuth callback handling.
- Payment order creation.
- Contact forms.
- Registration forms.
- Password reset or OTP endpoints when added.

## Security Headers

Nginx or backend should enforce:

- HTTPS redirects.
- HSTS.
- Content Security Policy.
- X-Frame-Options or frame-ancestors.
- X-Content-Type-Options.
- Referrer-Policy.

## Operational Security

- Store secrets in environment variables or secret management.
- Never commit secrets.
- Rotate credentials when compromised.
- Restrict database access.
- Keep backups encrypted.
- Monitor failed logins, failed webhooks, and backup failures.

## Production Security Gate

- API endpoints must use the standard error payload and must not leak stack traces or sensitive values.
- Every endpoint must enforce authentication and authorization server-side, even when frontend hides actions.
- Admin 2FA must be enabled before production use.
- Refresh tokens must remain in secure, HTTP-only cookies.
- CSRF protection must cover cookie-authenticated state-changing requests.
- Razorpay webhook signature verification must be tested before payment go-live.
- Failed payment webhooks must alert immediately.
- Backup failures must alert immediately.
- Audit logs must exist for all critical admin, fee, payment, deletion, and reconciliation actions.
- Security headers and rate limits must be enabled before production launch.

## Security Acceptance Requirements

- Authentication and authorization tests are defined in `docs/11-acceptance-test-suite.md`.
- Monitoring thresholds are defined in `docs/10-monitoring-alerting-plan.md`.
- Disaster recovery and security rebuild procedures are defined in `docs/09-disaster-recovery-plan.md`.
