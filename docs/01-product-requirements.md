# Product Requirements Document

## Product Summary

Kumbhad Samaj Trust Membership Management System is a production-grade web platform for managing family-based trust memberships. It will replace manual fee collection and paper-based records with online registration, renewal, member administration, payments, notifications, events, gallery content, reports, and audit logging.

The initial expected usage is approximately 800 active members, with an architecture capable of scaling to 5,000+ members without redesign.

## Objectives

- Allow families to register for membership online.
- Allow existing members to renew membership online.
- Make payment success the source of membership activation and renewal.
- Maintain accurate family, membership, fee, and payment records.
- Give admins tools to manage members, events, gallery, website content, settings, and reports.
- Provide a simple, mobile-first experience for members and admins.

## Non-Goals

- No donation functionality.
- No ecommerce functionality.
- No event ticketing.
- No SMS integration in Phase 1.
- No WhatsApp integration in Phase 1.
- No Aadhaar storage unless legally required later.
- No family member photo storage.

## User Roles

### Public Visitor

- Views public pages.
- Views events and gallery.
- Uses Become a Member registration flow.
- Contacts the trust.

### Member

- Logs in using Google OAuth.
- Views membership and family details.
- Views membership expiry.
- Views payment history.
- Renews membership.
- Downloads receipts.
- Views notifications.

### Admin

- Logs in using email, password, and mandatory 2FA.
- Manages members and family records.
- Manages membership fees and fee history.
- Manages payments and receipts.
- Manages events, gallery, website content, reports, and settings.

## Core Business Rules

### Family-Based Membership

Each membership represents one family. A family has one head of family and zero or more family members.

Head of family fields:

- Full name
- Mobile number
- Email address
- Address
- Membership number
- Membership status
- Membership start date
- Membership expiry date

Family member fields:

- Name
- Date of birth
- Gender
- Relationship

### Membership Activation

Registration flow:

1. User completes membership form.
2. System creates a pending registration and Razorpay order.
3. User completes payment.
4. Razorpay sends webhook.
5. Backend verifies webhook signature.
6. Backend updates payment and membership in one database transaction.
7. Membership becomes active.

Frontend payment success must never activate membership.

### Membership Renewal

Renewal flow:

1. Member logs in.
2. Member selects renewal.
3. System creates a renewal payment order using active renewal fee.
4. User completes payment.
5. Razorpay webhook is verified.
6. Membership expiry date is extended in one database transaction.

No manual admin intervention is required.

### Membership Fees

Membership fee and renewal fee are configurable by admin.

Requirements:

- Never hardcode fee values.
- Preserve fee history forever.
- Store effective dates.
- Past transactions must always show the historical amount charged.
- Future registrations and renewals use the active fee.

### Membership Identifiers

Membership numbers must be unique and permanent.

Format:

```text
TRUST-000001
TRUST-000002
```

Membership numbers must never be recycled, even after soft deletion.

## Public Website

Required pages:

- Home
- About Us
- Membership Benefits
- Events
- Gallery
- Terms & Conditions
- Privacy Policy
- Refund & Cancellation Policy
- Contact Us
- Become a Member

Requirements:

- SEO friendly.
- Mobile first.
- Accessible.
- Fast loading.
- Dynamic gallery and event content.
- No hardcoded gallery assets in production.
- Footer links to About Us, Membership Benefits, Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, and Contact Us.
- About Us must cover trust history, mission, vision, objectives, community activities, trustees or committee, registration info, and contact info.
- Registration must require explicit acceptance of Terms & Conditions and Privacy Policy before payment.
- Payment screens must show fee, validity, and refund policy before the user proceeds.

## Member Portal

Member capabilities:

- View membership details.
- View family details.
- View expiry date.
- View payment history.
- Renew membership.
- Download receipts.
- View notifications.

Restrictions:

- Members cannot delete membership records.
- Members cannot delete family records.
- Members cannot access other families.
- Members cannot access admin features.
- Suspended members cannot log in.

## Admin Panel

Admin capabilities:

- Create, edit, delete, search, and filter members.
- Manage family records.
- Add and remove family members.
- View registrations, renewals, payments, and receipts.
- Update membership and renewal fees.
- View fee history.
- Create, edit, publish, archive, and delete events.
- Upload, delete, and organize gallery photos and albums.
- Update website content and trust settings.
- Generate active member, expiring member, birthday, payment, and renewal reports.

## Notifications

Phase 1 channels:

- Website notifications.
- Email notifications.

Examples:

- Registration success.
- Renewal confirmation.
- Renewal reminder.
- Membership expiring.
- Event announcements.

Future-ready channels:

- SMS.
- WhatsApp.

## Reporting

Required reports:

- Active members.
- Expiring members.
- Renewal reports.
- Birthday reports.
- Payment reports.

Reports should support filters where appropriate and should not require engineering support to generate.

## Success Criteria

- Members can register online.
- Members can renew online.
- Trust no longer depends on door-to-door fee collection.
- Admin can manage all member records digitally.
- Reports are generated quickly.
- System supports growth from 800 to 5,000+ members without redesign.

## Production Readiness Gate

Implementation must not begin until the complete documentation set is reviewed and approved:

- Product Requirements Document.
- Technical Architecture.
- Security Architecture.
- Database Design.
- API Specification with DTOs, validation rules, standard filtering, and error matrices.
- Frontend Specification with exact authentication, session expiry, logout, authorization, payment, and acceptance behavior.
- Deployment Plan with backup and restore commands.
- Disaster Recovery Plan with RTO `4 hours` and RPO `1 hour`.
- Monitoring and Alerting Plan with thresholds and log retention.
- Acceptance Test Suite covering authentication, membership, renewals, events, gallery, notifications, reports, and admin panel.

## Measurable Production Targets

- Frontend Largest Contentful Paint under `2.5 seconds`.
- Backend 95th percentile API response under `300 ms`.
- Indexed database query under `50 ms`.
- Authentication login under `2 seconds` after provider callback or 2FA verification.
- Membership renewal order flow under `5 seconds` excluding external Razorpay user interaction.
