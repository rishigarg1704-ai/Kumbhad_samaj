# Frontend Specification

This document is mandatory before implementation. The frontend must be production-ready, mobile-first, elder-friendly, accessible, and aligned with the API contract.

## Frontend Goals

- Mobile-first experience.
- Elder-friendly design.
- Fast loading.
- Accessible forms and navigation.
- Simple workflows with clear next steps.
- Clean community-focused visual style.
- Deterministic authentication, authorization, payment, loading, and error behavior.

## Technology

- React
- TypeScript
- React Router
- React Query
- React Hook Form
- Zod

## Application Areas

### Public Website

Pages:

- Home
- About Us
- Membership Benefits
- Terms & Conditions
- Privacy Policy
- Refund & Cancellation Policy
- Events
- Event Detail
- Gallery Albums
- Gallery Album Detail
- Contact Us
- Become a Member
- Registration Payment Status

Requirements:

- SEO-friendly page structure.
- Public event listing and event detail pages.
- Dynamic gallery albums and photos.
- Clear membership registration path.
- No donation page.
- No ecommerce UI.
- No hardcoded gallery assets in production.
- Footer links to About Us, Membership Benefits, Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, and Contact Us.

### Member Portal

Pages:

- Login
- Dashboard
- Membership Details
- Family Details
- Payment History
- Renewal
- Renewal Payment Status
- Notifications
- Receipt Download
- 403 Forbidden

Member dashboard should prioritize:

- Membership status.
- Expiry date.
- Renewal action when eligible.
- Recent payments.
- Important notifications.

### Admin Panel

Sections:

- Login
- 2FA Verification
- Dashboard
- Members
- Member Detail
- Families
- Payments
- Membership Fees
- Events
- Gallery
- Website Content
- Reports
- System Settings
- Audit Logs
- 403 Forbidden

Admin UI should prioritize:

- Search.
- Filters.
- Tables with pagination.
- Clear edit flows.
- Confirmation for critical actions.
- No complex visual dashboards unless operationally useful.

## Visual Direction

- Build for a real trust, not a startup template.
- Use a light, trustworthy palette: deep blue, warm saffron, white, off-white, and light gray.
- Avoid glassmorphism, neon, heavy gradients, parallax, and excessive animation.
- Favor readable typography and calm layouts for elderly and non-technical users.
- Keep the homepage simple: hero, about summary, community stats, upcoming events, gallery preview, membership benefits, and contact info.
- Make the member dashboard calm and priority-driven: status, expiry, family members, notifications, payment history, and renew action.
- Keep admin tools functional and efficient, with search, filters, pagination, and sticky table headers.
- Use organized gallery albums, clear event cards, custom empty states, human error text, and skeleton loaders.
- Design mobile-first and verify key layouts at `320px`, `375px`, `390px`, and `414px`.
- Show real trust story, committee info, photos, events, and contact details; do not use generic placeholder content.

## Design Principles

- Use simple language.
- Use large enough tap targets.
- Minimum tap target size is `44px` by `44px`.
- Avoid unnecessary animations.
- Avoid cluttered dashboards.
- Keep forms readable.
- Show validation errors near fields.
- Use confirmation screens for payments and destructive admin actions.
- Make status labels clear.
- Do not show important information by color alone.

## Accessibility Requirements

- Keyboard navigable.
- Semantic HTML.
- Proper labels for inputs.
- Clear focus states.
- Sufficient color contrast.
- Screen-reader friendly form errors.
- No important information shown by color alone.
- Page title changes on route navigation.
- Form submit errors move focus to the first invalid field or alert summary.
- Modals trap focus and return focus after close.

## Frontend Authentication Specification

### Token Storage Policy

- Access token may be stored only in memory or a short-lived secure storage abstraction.
- Refresh token must be stored only by the backend in a secure, HTTP-only cookie.
- Do not store refresh tokens in local storage or session storage.
- Do not store sensitive profile, payment, or permission data in local storage.
- Frontend may persist non-sensitive UI preferences only.

### Google Member Login Flow

Success:

1. User clicks Google login.
2. Frontend calls `GET /api/v1/auth/google/start`.
3. User completes Google OAuth.
4. Backend validates callback and creates session.
5. Frontend receives access token and loads `GET /api/v1/member/me`.
6. React Query cache is initialized for member profile.
7. User is redirected to `/member/dashboard`.

Failure:

1. Show a dedicated login error screen or inline login error.
2. Provide a retry action.
3. Do not create partial member state.
4. Clear any stale access token.

### Admin Login Flow

Success:

1. User submits email and password.
2. Frontend calls `POST /api/v1/admin/auth/login`.
3. If `two_factor_required` is true, redirect to `/admin/2fa`.
4. User submits 2FA code.
5. Frontend calls `POST /api/v1/admin/auth/2fa/verify`.
6. Frontend loads admin profile and permissions.
7. User is redirected to `/admin/dashboard`.

Failure:

- Invalid password shows a generic error without confirming whether the email exists.
- Invalid 2FA code keeps user on `/admin/2fa`.
- Rate-limited login shows a retry-later message.
- Suspended admin receives a forbidden state.

### Session Expiry Flow

If an API request receives `401`:

1. Pause the failed request.
2. Attempt `POST /api/v1/auth/refresh`.
3. If refresh succeeds, update in-memory access token.
4. Retry the original failed request once.
5. If refresh fails, call local logout cleanup.
6. Clear React Query cache, auth state, and local storage.
7. Redirect member users to `/member/login`.
8. Redirect admin users to `/admin/login`.
9. Preserve the intended return path only when it is safe and same-origin.

Rules:

- Only one refresh request may run at a time.
- Parallel failed requests must wait for the same refresh attempt.
- A retried request must not enter an infinite refresh loop.

### Logout Flow

On logout:

1. Call `POST /api/v1/auth/logout`.
2. Clear in-memory auth state.
3. Clear React Query cache.
4. Clear local storage keys owned by the app.
5. Let backend clear secure cookies.
6. Redirect member users to `/member/login`.
7. Redirect admin users to `/admin/login`.

Logout must complete locally even if the network request fails.

### Role-Based Redirects

- Successful admin login redirects to `/admin/dashboard`.
- Successful member login redirects to `/member/dashboard`.
- Authenticated members trying to open admin routes go to `/403`.
- Authenticated admins trying to open member-only routes go to `/403`.
- Unauthenticated member route access redirects to `/member/login`.
- Unauthenticated admin route access redirects to `/admin/login`.
- Authorized but permission-denied access shows `/403`.

## Forms

Use React Hook Form for form state and Zod for validation.

Important forms:

- Membership registration.
- Registration consent.
- Family member entry.
- Contact form.
- Member renewal.
- Admin login.
- Admin 2FA.
- Admin member create/edit.
- Fee change.
- Event create/edit.
- Gallery album create/edit.
- Gallery photo upload.
- System setting edit.

Validation requirements:

- Frontend Zod schemas must mirror API validation rules.
- Backend remains the source of truth for security and business validation.
- Field errors appear next to fields.
- Submit-level errors appear in a visible alert region.
- Duplicate submissions are prevented while a mutation is pending.
- Registration must block submission until Terms & Conditions and Privacy Policy are accepted.

## Data Fetching

Use React Query for:

- Server data fetching.
- Cache management.
- Loading states.
- Error states.
- Mutations.
- Refetch after updates.
- Request retry where safe.

Rules:

- Do not retry non-idempotent mutations automatically.
- Retry idempotent reads at most two times.
- Invalidate affected queries after successful mutations.
- Use the standard API pagination contract for list pages.
- Show empty states instead of blank tables.

## Routing

Use React Router.

Required route groups:

```text
/
/about
/membership-benefits
/terms
/privacy
/refund
/events
/events/:slug
/gallery
/gallery/:albumId
/contact
/become-member
/registration/status/:paymentId

/member/login
/member/dashboard
/member/membership
/member/family
/member/payments
/member/renew
/member/renew/status/:paymentId
/member/notifications

/admin/login
/admin/2fa
/admin/dashboard
/admin/members
/admin/members/:id
/admin/payments
/admin/fees
/admin/events
/admin/gallery
/admin/content
/admin/reports
/admin/settings
/admin/audit-logs

/403
/404
```

## Payment UI Rules

- Frontend may show Razorpay checkout.
- Frontend may show temporary payment processing status.
- Frontend must not mark membership active on checkout success alone.
- Before checkout, show membership fee, validity, and refund policy link, and require explicit user confirmation.
- After payment, frontend must poll or fetch backend payment status.
- UI should explain that confirmation may take a short time.
- Payment status page must support `pending`, `success`, `failed`, and `unknown`.
- Polling interval starts at `2 seconds` and stops after `2 minutes`.
- If still pending after timeout, show a pending confirmation state and allow manual refresh.

## State and Authorization

- Store minimal auth state on frontend.
- Protect member routes.
- Protect admin routes.
- Hide UI actions the user cannot perform.
- Still enforce permissions on backend.
- Do not rely on hidden UI as a security control.
- Clear all cached user-specific data on logout and role change.

## Empty and Error States

Examples:

- No payment history yet.
- No gallery photos in this album.
- No upcoming events.
- Renewal not available because membership is already active for sufficient duration.
- Payment confirmation pending.
- No report results for selected filters.

Error messages should be simple and actionable.

## Performance Requirements

Frontend targets:

- Largest Contentful Paint under `2.5 seconds` on production mobile profile.
- Cumulative Layout Shift under `0.1`.
- Interaction to Next Paint under `200 ms`.
- Initial JavaScript should be split by public, member, and admin route groups.
- Admin report pages must paginate and must not render unbounded rows.

Application workflow targets:

- Authentication login completes under `2 seconds` after provider callback.
- Membership renewal flow completes under `5 seconds` excluding external Razorpay interaction.
- Payment status screen shows first backend status within `2 seconds`.

## Frontend Acceptance Tests

The acceptance test suite is defined in `docs/11-acceptance-test-suite.md`.

Minimum frontend acceptance coverage:

- `AUTH-001` unauthenticated member route redirects to login.
- `AUTH-002` expired access token attempts refresh and retries the failed request.
- `AUTH-003` failed refresh logs user out and clears local state.
- `AUTH-004` member cannot access admin routes.
- `AUTH-005` admin cannot access member routes.
- `MEM-001` registration success waits for backend payment confirmation.
- `REN-001` renewal success extends membership only after verified backend status.
- `EVT-001` public events show only published events.
- `GAL-001` gallery empty state appears when album has no photos.
- `NOT-001` notification read action updates UI and invalidates notification cache.
- `RPT-001` reports apply pagination, sorting, filtering, and date filters.
- `ADM-001` admin destructive action requires confirmation and writes audit-backed mutation.
