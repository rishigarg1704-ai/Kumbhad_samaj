# Acceptance Test Suite

This document is mandatory before implementation. Each feature ticket must map to one or more acceptance tests before development starts.

## Test Format

Each test uses:

- ID.
- Given.
- When.
- Then.
- Evidence required.

## Public Pages

### PUB-001 Required Footer Links

Given: Any public page is open.

When: User scrolls to the footer.

Then: Footer includes About Us, Membership Benefits, Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, and Contact Us links.

Evidence required: Browser test on a representative public page.

### PUB-002 About And Benefits Content

Given: Public user opens About Us or Membership Benefits.

When: Page loads.

Then: About Us shows trust history, mission, vision, objectives, community activities, trustee or committee info, registration info, and contact info; Membership Benefits explains eligibility, benefits, participation, event access, voting rights if applicable, family rules, and renewal process.

Evidence required: Browser content test.

### PUB-003 Registration Consent Tracking

Given: Public user starts membership registration.

When: User proceeds without accepting Terms & Conditions and Privacy Policy.

Then: Submission is blocked until both are accepted, and accepted policy version, timestamp, and IP are stored on success.

Evidence required: Form and backend audit test.

### PUB-004 Payment Disclosure

Given: Public user reviews membership payment.

When: User reaches checkout.

Then: UI shows membership fee, membership validity, and refund policy link before user confirms payment.

Evidence required: Browser test.

## Authentication

### AUTH-001 Member Route Guard

Given: User is not logged in.

When: User opens `/member/dashboard`.

Then: User is redirected to `/member/login`.

Evidence required: Browser test showing redirect and no member API data rendered.

### AUTH-002 Expired JWT Refresh

Given: User has an expired access token and a valid refresh cookie.

When: User performs an authenticated API request.

Then: Frontend calls refresh, retries the failed request once, and renders the requested page.

Evidence required: Integration test showing refresh call and one retry.

### AUTH-003 Failed Refresh Logout

Given: User has an expired access token and invalid refresh cookie.

When: User performs an authenticated API request.

Then: User is logged out, local app state is cleared, React Query cache is cleared, and user is redirected to login.

Evidence required: Browser test checking storage, cache-visible UI state, and redirect.

### AUTH-004 Admin Route Forbidden For Member

Given: User is logged in as a member.

When: User opens `/admin/dashboard`.

Then: User sees `/403` and no admin data is fetched.

Evidence required: Browser test and network assertion.

### AUTH-005 Member Route Forbidden For Admin

Given: User is logged in as an admin.

When: User opens `/member/dashboard`.

Then: User sees `/403` and no member data is fetched.

Evidence required: Browser test and network assertion.

### AUTH-006 Admin 2FA Required

Given: Admin submits valid email and password.

When: Login succeeds.

Then: Admin is redirected to `/admin/2fa` before dashboard access is allowed.

Evidence required: Browser test showing dashboard is unavailable before 2FA verification.

## Membership

### MEM-001 Registration Payment Confirmation

Given: Public user submits a valid membership registration.

When: Razorpay payment succeeds and backend payment status becomes `success`.

Then: Membership status becomes `active` and confirmation page is shown.

Evidence required: End-to-end test with mocked Razorpay callback and verified backend status polling.

### MEM-002 Registration Does Not Trust Frontend Payment Success

Given: Public user completes checkout but backend payment status remains `pending`.

When: Frontend receives checkout success callback.

Then: UI shows payment confirmation pending and does not show active membership.

Evidence required: Browser test with mocked pending status.

### MEM-003 Duplicate Email Registration

Given: Email already belongs to an active member.

When: User submits registration with same email.

Then: API returns `409` and frontend shows a clear conflict message.

Evidence required: API and frontend validation test.

### MEM-004 Family Member Validation

Given: User enters invalid family member data.

When: User submits registration.

Then: Validation errors appear next to invalid fields and request is not submitted.

Evidence required: Form test.

## Renewals

### REN-001 Renewal Payment Confirmation

Given: Member is eligible for renewal.

When: Member completes payment and backend confirms verified webhook.

Then: Membership expiry date is extended and confirmation page is shown.

Evidence required: End-to-end test with backend status transition.

### REN-002 Renewal Pending State

Given: Member completes checkout but backend status is still `pending`.

When: Renewal status page loads.

Then: UI shows pending confirmation and allows manual refresh.

Evidence required: Browser test with pending payment fixture.

### REN-003 Renewal Not Eligible

Given: Member membership is active for sufficient duration.

When: Member opens renewal page.

Then: Renewal action is disabled and the reason is shown.

Evidence required: Browser test.

## Events

### EVT-001 Public Events Only Show Published

Given: Draft, published, and archived events exist.

When: Public user opens `/events`.

Then: Only published events are shown.

Evidence required: API and browser test.

### EVT-002 Event Detail Not Found For Draft

Given: Draft event exists.

When: Public user opens `/events/{slug}` for draft event.

Then: User sees not found state.

Evidence required: Browser test.

### EVT-003 Admin Event Audit

Given: Admin edits an event.

When: Save succeeds.

Then: Event is updated and audit log is written.

Evidence required: API integration test.

## Gallery

### GAL-001 Empty Album State

Given: Published gallery album has no photos.

When: Public user opens the album page.

Then: Empty gallery state is shown.

Evidence required: Browser test.

### GAL-002 Gallery Upload Validation

Given: Admin uploads a non-image file.

When: Upload is submitted.

Then: API returns `422` and frontend shows validation error.

Evidence required: API and browser test.

### GAL-003 Public Gallery Uses Dynamic Data

Given: Gallery album and photos exist in API.

When: Public gallery page loads.

Then: Photos render from API response and no hardcoded production assets are required.

Evidence required: Browser test with API fixture.

## Notifications

### NOT-001 Mark Notification Read

Given: Member has an unread notification.

When: Member marks it as read.

Then: Notification status changes to read and unread count updates.

Evidence required: Browser test and API assertion.

### NOT-002 Member Cannot Read Other Notification

Given: Notification belongs to another member.

When: Member requests it.

Then: API returns `403` or `404`.

Evidence required: API authorization test.

## Reports

### RPT-001 Report Filters

Given: Admin opens payment report.

When: Admin applies status, date, sorting, and pagination filters.

Then: API receives standard query params and table updates with paginated response.

Evidence required: Browser test with network assertion.

### RPT-002 Birthday Report Month Filter

Given: Family members have birthdays across multiple months.

When: Admin filters birthday report by month.

Then: Only matching month results appear.

Evidence required: API integration test.

### RPT-003 Report Access Denied To Member

Given: User is logged in as member.

When: User requests an admin report endpoint.

Then: API returns `403`.

Evidence required: API authorization test.

## Admin Panel

### ADM-001 Destructive Confirmation

Given: Admin opens delete member action.

When: Admin attempts deletion.

Then: Confirmation is required before API mutation runs.

Evidence required: Browser test proving no mutation before confirmation.

### ADM-002 Member Search And Pagination

Given: More than one page of members exists.

When: Admin searches and changes pages.

Then: API receives `search`, `page`, and `page_size`, and table renders returned page.

Evidence required: Browser test with network assertion.

### ADM-003 Fee Change Preserves History

Given: Existing fee history and historical payment exist.

When: Admin creates a new fee change.

Then: New fee row is created, old payment amount remains unchanged, and audit log is written.

Evidence required: API integration test.

### ADM-004 Admin Permission Hides Action

Given: Admin lacks `fees:create`.

When: Admin opens fee page.

Then: Create fee action is hidden and direct API request returns `403`.

Evidence required: Browser and API authorization test.

### ADM-005 Audit Log Visibility

Given: Critical admin action has occurred.

When: Admin with audit permission opens audit logs.

Then: Action, actor, resource, old value, new value, timestamp, and request metadata are visible.

Evidence required: Browser test and database assertion.
