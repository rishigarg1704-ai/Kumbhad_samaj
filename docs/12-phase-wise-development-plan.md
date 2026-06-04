# Phase-wise Development Plan

This document breaks the project into a practical build order.

## Permanent Rule

- Do not use shortcuts, demo-only logic, or placeholder production behavior in any phase.
- Implement documented behavior fully, or stop and mark the gap explicitly before proceeding.

## Phase 0: Planning

- Finalize product requirements.
- Finalize legal and trust pages.
- Finalize frontend design direction.
- Finalize acceptance criteria.

## Phase 1: Foundation

- Set up repository structure.
- Configure frontend, backend, database, and routing.
- Add logging, validation, and base layouts.

## Phase 2: Authentication

- Build member Google OAuth.
- Build admin login and 2FA.
- Build session refresh and logout.
- Add route guards.

## Phase 3: Membership Core

- Build registration flow.
- Build family records.
- Build membership status logic.
- Build membership number generation.

## Phase 4: Payments

- Integrate Razorpay order creation.
- Verify webhooks.
- Handle pending, success, and failed states.
- Generate receipts.

## Phase 5: Public Website

- Build Home.
- Build About Us.
- Build Membership Benefits.
- Build Terms, Privacy, Refund, and Contact pages.
- Build Events, Gallery, and Become a Member pages.

## Phase 6: Member Portal

- Build dashboard.
- Build membership and family pages.
- Build payment history and renewal pages.
- Build notifications and receipts.

## Phase 7: Admin Panel

- Build members, families, payments, fees, events, gallery, content, reports, settings, and audit logs.

## Phase 8: Trust Content

- Add real trust story.
- Add committee and registration details.
- Add contact details and footer links.
- Add consent tracking for registration.

## Phase 9: Testing

- Run acceptance tests.
- Run security checks.
- Run mobile and payment checks.
- Run backup and recovery checks.

## Phase 10: Deployment

- Configure production settings.
- Enable monitoring and alerts.
- Verify backups and restore.
- Go live only after all checks pass.
