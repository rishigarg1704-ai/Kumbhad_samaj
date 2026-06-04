# API Specification

This document is mandatory before implementation. Every endpoint must expose typed request and response DTOs, enforce validation, and return the standard error format.

## API Principles

- REST-style JSON APIs.
- Versioned routes using `/api/v1`.
- Strong request and response validation.
- Authentication and authorization enforced at route dependency level.
- Business logic handled in services, not routes.
- Structured success and error responses.
- Standard pagination, sorting, searching, filtering, and date filtering for list endpoints.
- No endpoint may return stack traces, secrets, JWTs, refresh tokens, password hashes, raw 2FA secrets, or payment card details.

## Standard Response Envelope

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Failure

```json
{
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "message": "Invalid request.",
  "details": []
}
```

## Standard Error Matrix

Every endpoint must document and support this exact payload shape. If a status is not expected in normal operation, the endpoint must still return this shape if the condition occurs.

| HTTP | Error Code | Exact Response Payload |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | `{"success":false,"error_code":"BAD_REQUEST","message":"Request could not be processed.","details":[]}` |
| 401 | `UNAUTHENTICATED` | `{"success":false,"error_code":"UNAUTHENTICATED","message":"Authentication is required.","details":[]}` |
| 403 | `FORBIDDEN` | `{"success":false,"error_code":"FORBIDDEN","message":"You do not have permission to perform this action.","details":[]}` |
| 404 | `NOT_FOUND` | `{"success":false,"error_code":"NOT_FOUND","message":"Requested resource was not found.","details":[]}` |
| 409 | `CONFLICT` | `{"success":false,"error_code":"CONFLICT","message":"Request conflicts with the current resource state.","details":[]}` |
| 422 | `VALIDATION_ERROR` | `{"success":false,"error_code":"VALIDATION_ERROR","message":"Validation failed.","details":[{"field":"field_name","message":"Validation message."}]}` |
| 429 | `RATE_LIMITED` | `{"success":false,"error_code":"RATE_LIMITED","message":"Too many requests. Please try again later.","details":[]}` |
| 500 | `INTERNAL_ERROR` | `{"success":false,"error_code":"INTERNAL_ERROR","message":"Something went wrong. Please try again later.","details":[]}` |

## Standard List Query Contract

Every list endpoint must support these query parameters unless the endpoint explicitly documents a narrower report-specific filter.

### Query Parameters

```text
page=1
page_size=20
sort_by=created_at
sort_order=asc
search=rajesh
status=active
membership_type=family
start_date=2026-01-01
end_date=2026-12-31
```

### Validation Rules

- `page` is required by default value, integer, min `1`, max `100000`.
- `page_size` is required by default value, integer, min `1`, max `100`.
- `sort_by` must be one of the endpoint allowlisted fields.
- `sort_order` must be `asc` or `desc`.
- `search` max length `100`, trimmed, case-insensitive.
- `status` must match the endpoint status enum.
- `membership_type` must be `family` for Phase 1.
- `start_date` and `end_date` must be ISO `YYYY-MM-DD`.
- `start_date` must be before or equal to `end_date`.

### Response Format

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 200,
      "total_pages": 10
    }
  }
}
```

## Shared DTOs

### FamilyMemberInput

```json
{
  "name": "string",
  "date_of_birth": "2026-01-31",
  "gender": "male",
  "relationship": "son"
}
```

Validation rules:

- `name` is required, min `2`, max `100`.
- `date_of_birth` is required, valid date, not in future.
- `gender` is required, one of `male`, `female`, `other`, `prefer_not_to_say`.
- `relationship` is required, min `2`, max `50`.

### PaymentStatusDTO

```json
{
  "payment_id": "uuid",
  "provider_order_id": "order_xxx",
  "provider_payment_id": "pay_xxx",
  "status": "pending",
  "amount": 1000.0,
  "currency": "INR"
}
```

Validation rules:

- `status` must be one of `pending`, `success`, `failed`, `refunded`.
- `currency` must be `INR` in Phase 1.

## Endpoint Contract Rules

Each endpoint below includes its request DTO, response DTO, validation rules, business validation, and error matrix. All endpoints use the Standard Error Matrix exactly.

## Authentication APIs

### Member Google OAuth Start

```http
GET /api/v1/auth/google/start
```

Request DTO:

```json
{
  "redirect_uri": "https://example.org/auth/callback"
}
```

Validation rules:

- `redirect_uri` is optional, valid HTTPS URL, max `500`.
- Redirect host must be allowlisted.

Response DTO:

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "opaque_state"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Member Google OAuth Callback

```http
GET /api/v1/auth/google/callback
```

Request DTO:

```json
{
  "code": "string",
  "state": "string"
}
```

Validation rules:

- `code` is required, min `10`, max `2048`.
- `state` is required, min `16`, max `512`.
- `state` must match an active OAuth request.
- Google token must validate server-side.
- Suspended users must be rejected.

Response DTO:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "token_type": "bearer",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "member@example.org",
      "full_name": "Rajesh Kumbhad",
      "role": "member"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Refresh Session

```http
POST /api/v1/auth/refresh
```

Request DTO:

```json
{}
```

Validation rules:

- Secure HTTP-only refresh cookie is required.
- Refresh token must be active, unexpired, and not revoked.
- Refresh token rotation must be atomic.

Response DTO:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "token_type": "bearer",
    "expires_in": 900
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Logout

```http
POST /api/v1/auth/logout
```

Request DTO:

```json
{}
```

Validation rules:

- Refresh cookie is optional.
- If present, revoke matching server session.
- Always clear refresh cookie in response.

Response DTO:

```json
{
  "success": true,
  "data": {
    "logged_out": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Admin Login

```http
POST /api/v1/admin/auth/login
```

Request DTO:

```json
{
  "email": "admin@example.org",
  "password": "string"
}
```

Validation rules:

- `email` is required, valid email, max `254`, lowercase normalized.
- `password` is required, min `12`, max `128`.
- Admin account must exist, be active, and have 2FA enabled.
- Failed attempts are rate limited and logged.

Response DTO:

```json
{
  "success": true,
  "data": {
    "two_factor_required": true,
    "challenge_id": "uuid"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Admin 2FA Verify

```http
POST /api/v1/admin/auth/2fa/verify
```

Request DTO:

```json
{
  "challenge_id": "uuid",
  "code": "123456"
}
```

Validation rules:

- `challenge_id` is required, valid UUID.
- `code` is required, exactly `6` digits, regex `^[0-9]{6}$`.
- Challenge must be active, unexpired, and linked to the admin login attempt.
- 2FA verification failures are rate limited and logged.

Response DTO:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "token_type": "bearer",
    "expires_in": 900,
    "admin": {
      "id": "uuid",
      "email": "admin@example.org",
      "full_name": "Admin User",
      "role": "admin"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

## Public Website APIs

### Get Public Settings

```http
GET /api/v1/public/settings
```

Request DTO:

```json
{}
```

Validation rules:

- No authentication required.
- Only public-safe setting keys may be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "trust_name": "Kumbhad Samaj Trust",
    "logo_url": "https://example.org/logo.png",
    "contact_details": {},
    "social_links": []
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Public Events

```http
GET /api/v1/public/events
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "event_date",
  "sort_order": "asc",
  "search": "samaj",
  "status": "published",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `event_date`, `published_at`, `title`, `created_at`.
- Public response must include only `published` events.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Annual Gathering",
        "slug": "annual-gathering",
        "event_date": "2026-05-01T10:00:00+05:30",
        "location": "Ahmedabad"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Public Event

```http
GET /api/v1/public/events/{slug}
```

Request DTO:

```json
{
  "slug": "annual-gathering"
}
```

Validation rules:

- `slug` is required, min `3`, max `120`, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Event must be `published`.

Response DTO:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Annual Gathering",
    "slug": "annual-gathering",
    "description": "Event details.",
    "event_date": "2026-05-01T10:00:00+05:30",
    "location": "Ahmedabad",
    "published_at": "2026-04-01T10:00:00+05:30"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Gallery Albums

```http
GET /api/v1/public/gallery/albums
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc",
  "search": "event",
  "status": "published"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `title`, `created_at`, `published_at`.
- Public response must include only `published` albums.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Community Event",
        "slug": "community-event",
        "description": "Album description.",
        "cover_photo_url": "https://example.org/photo.jpg"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Gallery Photos

```http
GET /api/v1/public/gallery/albums/{album_id}/photos
```

Request DTO:

```json
{
  "album_id": "uuid",
  "page": 1,
  "page_size": 20,
  "sort_by": "sort_order",
  "sort_order": "asc"
}
```

Validation rules:

- `album_id` is required, valid UUID.
- Uses Standard List Query Contract.
- `sort_by` allowlist: `sort_order`, `created_at`, `title`.
- Album must be `published`.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Stage Photo",
        "public_url": "https://example.org/gallery/stage.jpg",
        "sort_order": 1
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

## Membership Registration APIs

### Create Registration Draft

```http
POST /api/v1/memberships/register
```

Request DTO:

```json
{
  "head_name": "Rajesh Kumbhad",
  "phone": "+919876543210",
  "email": "member@example.org",
  "address": "Full postal address",
  "family_members": [
    {
      "name": "Family Member",
      "date_of_birth": "2010-01-31",
      "gender": "female",
      "relationship": "daughter"
    }
  ]
}
```

Validation rules:

- `head_name` is required, min `2`, max `100`.
- `phone` is required, regex `^\+?[1-9][0-9]{9,14}$`.
- `email` is required, valid email, max `254`, lowercase normalized.
- `address` is required, min `10`, max `500`.
- `family_members` is required, array, max `25`.
- Each `family_members` item uses `FamilyMemberInput`.
- Email must not already belong to an active member unless registration recovery is supported.
- Active membership fee must exist.

Response DTO:

```json
{
  "success": true,
  "data": {
    "membership_id": "uuid",
    "membership_number": "TRUST-000001",
    "status": "pending_payment",
    "payment": {
      "payment_id": "uuid",
      "provider_order_id": "order_xxx",
      "amount": 1000.0,
      "currency": "INR",
      "checkout_key_id": "rzp_live_xxx"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Registration Status

```http
GET /api/v1/memberships/register/{payment_id}/status
```

Request DTO:

```json
{
  "payment_id": "uuid"
}
```

Validation rules:

- `payment_id` is required, valid UUID.
- Payment must belong to a registration flow.

Response DTO:

```json
{
  "success": true,
  "data": {
    "payment": {
      "payment_id": "uuid",
      "status": "success",
      "amount": 1000.0,
      "currency": "INR"
    },
    "membership": {
      "membership_id": "uuid",
      "membership_number": "TRUST-000001",
      "status": "active",
      "expiry_date": "2027-06-03"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

## Member Portal APIs

All member portal APIs require member authentication.

### Get Current Member Profile

```http
GET /api/v1/member/me
```

Request DTO:

```json
{}
```

Validation rules:

- Valid member access token is required.
- Suspended users must receive `403`.

Response DTO:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "member@example.org",
    "full_name": "Rajesh Kumbhad",
    "profile_picture_url": "https://example.org/photo.jpg",
    "status": "active"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get My Membership

```http
GET /api/v1/member/membership
```

Request DTO:

```json
{}
```

Validation rules:

- Valid member access token is required.
- Only the authenticated member's family may be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "family": {
      "id": "uuid",
      "address": "Full postal address",
      "mobile_number": "+919876543210",
      "email": "member@example.org"
    },
    "membership": {
      "id": "uuid",
      "membership_number": "TRUST-000001",
      "status": "active",
      "start_date": "2026-06-03",
      "expiry_date": "2027-06-03"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get My Family Members

```http
GET /api/v1/member/family-members
```

Request DTO:

```json
{}
```

Validation rules:

- Valid member access token is required.
- Only non-deleted family members from the authenticated member's family may be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Family Member",
        "date_of_birth": "2010-01-31",
        "gender": "female",
        "relationship": "daughter"
      }
    ]
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List My Payments

```http
GET /api/v1/member/payments
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "paid_at",
  "sort_order": "desc",
  "status": "success",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `created_at`, `paid_at`, `amount`, `status`.
- Only authenticated member payments may be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "payment_type": "renewal",
        "status": "success",
        "amount": 500.0,
        "currency": "INR",
        "paid_at": "2026-06-03T10:00:00+05:30"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Download Receipt

```http
GET /api/v1/member/payments/{payment_id}/receipt
```

Request DTO:

```json
{
  "payment_id": "uuid"
}
```

Validation rules:

- `payment_id` is required, valid UUID.
- Payment must belong to authenticated member.
- Receipt is available only for `success` payments.

Response DTO:

```json
{
  "success": true,
  "data": {
    "receipt_id": "uuid",
    "receipt_number": "RCT-000001",
    "download_url": "https://example.org/api/v1/member/payments/uuid/receipt/file",
    "payment": {
      "id": "uuid",
      "amount": 500.0,
      "currency": "INR",
      "paid_at": "2026-06-03T10:00:00+05:30"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Create Renewal Order

```http
POST /api/v1/member/membership/renew
```

Request DTO:

```json
{
  "membership_id": "uuid"
}
```

Validation rules:

- `membership_id` is required, valid UUID.
- Membership must belong to authenticated member.
- Membership must be eligible for renewal.
- Active renewal fee must exist.
- Duplicate pending renewal order must be reused or rejected with `409`.

Response DTO:

```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "provider_order_id": "order_xxx",
    "amount": 500.0,
    "currency": "INR",
    "checkout_key_id": "rzp_live_xxx",
    "status": "pending"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List My Notifications

```http
GET /api/v1/member/notifications
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc",
  "status": "sent"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `created_at`, `sent_at`, `read_at`, `status`.
- Only authenticated member notifications may be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Renewal confirmed",
        "body": "Your membership renewal is confirmed.",
        "status": "sent",
        "read_at": null,
        "created_at": "2026-06-03T10:00:00+05:30"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Mark Notification Read

```http
PATCH /api/v1/member/notifications/{notification_id}/read
```

Request DTO:

```json
{
  "notification_id": "uuid"
}
```

Validation rules:

- `notification_id` is required, valid UUID.
- Notification must belong to authenticated member.
- Already-read notifications return success idempotently.

Response DTO:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "read",
    "read_at": "2026-06-03T10:00:00+05:30"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

## Razorpay Webhook APIs

### Razorpay Webhook

```http
POST /api/v1/webhooks/razorpay
```

Request DTO:

```json
{
  "event": "payment.captured",
  "payload": {},
  "created_at": 1780480800
}
```

Validation rules:

- `X-Razorpay-Signature` header is required.
- Signature must verify with Razorpay webhook secret.
- Event ID must be processed idempotently.
- Order ID, payment ID, amount, currency, and status must match internal payment record.
- Payment and membership updates must occur in one database transaction.

Response DTO:

```json
{
  "success": true,
  "data": {
    "processed": true,
    "idempotent": false
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

## Admin APIs

All admin APIs require admin authentication and authorization.

### List Members

```http
GET /api/v1/admin/members
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc",
  "search": "rajesh",
  "status": "active",
  "membership_type": "family",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `created_at`, `full_name`, `email`, `status`, `expiry_date`, `membership_number`.
- Search must cover name, email, phone, and membership number.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user_id": "uuid",
        "family_id": "uuid",
        "membership_id": "uuid",
        "full_name": "Rajesh Kumbhad",
        "email": "member@example.org",
        "mobile_number": "+919876543210",
        "membership_number": "TRUST-000001",
        "status": "active",
        "expiry_date": "2027-06-03"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Create Member

```http
POST /api/v1/admin/members
```

Request DTO:

```json
{
  "head_name": "Rajesh Kumbhad",
  "phone": "+919876543210",
  "email": "member@example.org",
  "address": "Full postal address",
  "membership_status": "active",
  "start_date": "2026-06-03",
  "expiry_date": "2027-06-03",
  "family_members": []
}
```

Validation rules:

- Uses Create Registration Draft field validation.
- `membership_status` is required, one of `pending_payment`, `active`, `expired`, `suspended`, `cancelled`.
- `start_date` and `expiry_date` are required when status is `active`.
- `expiry_date` must be after `start_date`.
- Admin permission `members:create` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "family_id": "uuid",
    "membership_id": "uuid",
    "membership_number": "TRUST-000001",
    "status": "active"
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Member

```http
GET /api/v1/admin/members/{member_id}
```

Request DTO:

```json
{
  "member_id": "uuid"
}
```

Validation rules:

- `member_id` is required, valid UUID.
- Admin permission `members:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "user": {},
    "family": {},
    "membership": {},
    "family_members": [],
    "payment_summary": {
      "total_paid": 1500.0,
      "last_payment_at": "2026-06-03T10:00:00+05:30"
    }
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Update Member

```http
PATCH /api/v1/admin/members/{member_id}
```

Request DTO:

```json
{
  "member_id": "uuid",
  "head_name": "Rajesh Kumbhad",
  "phone": "+919876543210",
  "email": "member@example.org",
  "address": "Full postal address",
  "status": "active"
}
```

Validation rules:

- `member_id` is required, valid UUID.
- At least one mutable field is required.
- Field validation matches create member rules.
- Admin permission `members:update` is required.
- Email uniqueness must be preserved.
- Audit log with old and new values is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "member_id": "uuid",
    "updated": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Delete Member

```http
DELETE /api/v1/admin/members/{member_id}
```

Request DTO:

```json
{
  "member_id": "uuid",
  "reason": "Duplicate record"
}
```

Validation rules:

- `member_id` is required, valid UUID.
- `reason` is required, min `5`, max `500`.
- Admin permission `members:delete` is required.
- Payment history must never be deleted.
- Soft delete only.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "member_id": "uuid",
    "deleted": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Add Family Member

```http
POST /api/v1/admin/families/{family_id}/members
```

Request DTO:

```json
{
  "family_id": "uuid",
  "name": "Family Member",
  "date_of_birth": "2010-01-31",
  "gender": "female",
  "relationship": "daughter"
}
```

Validation rules:

- `family_id` is required, valid UUID.
- Body uses `FamilyMemberInput`.
- Admin permission `families:update` is required.
- Family must exist and not be soft deleted.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "family_member_id": "uuid",
    "created": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Update Family Member

```http
PATCH /api/v1/admin/families/{family_id}/members/{family_member_id}
```

Request DTO:

```json
{
  "family_id": "uuid",
  "family_member_id": "uuid",
  "name": "Family Member",
  "date_of_birth": "2010-01-31",
  "gender": "female",
  "relationship": "daughter"
}
```

Validation rules:

- `family_id` and `family_member_id` are required, valid UUIDs.
- At least one mutable field is required.
- Field validation matches `FamilyMemberInput`.
- Family member must belong to family.
- Admin permission `families:update` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "family_member_id": "uuid",
    "updated": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Remove Family Member

```http
DELETE /api/v1/admin/families/{family_id}/members/{family_member_id}
```

Request DTO:

```json
{
  "family_id": "uuid",
  "family_member_id": "uuid",
  "reason": "No longer part of family record"
}
```

Validation rules:

- IDs are required, valid UUIDs.
- `reason` is required, min `5`, max `500`.
- Family member must belong to family.
- Soft delete only.
- Admin permission `families:update` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "family_member_id": "uuid",
    "deleted": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Active Fees

```http
GET /api/v1/admin/fees/active
```

Request DTO:

```json
{}
```

Validation rules:

- Admin permission `fees:read` is required.
- Exactly one active fee period must exist.

Response DTO:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "membership_fee_amount": 1000.0,
    "renewal_fee_amount": 500.0,
    "effective_from": "2026-01-01",
    "effective_to": null
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Fee History

```http
GET /api/v1/admin/fees/history
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "effective_from",
  "sort_order": "desc",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `effective_from`, `effective_to`, `created_at`.
- Admin permission `fees:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "membership_fee_amount": 1000.0,
        "renewal_fee_amount": 500.0,
        "effective_from": "2026-01-01",
        "effective_to": null
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Create Fee Change

```http
POST /api/v1/admin/fees
```

Request DTO:

```json
{
  "membership_fee_amount": 1000.0,
  "renewal_fee_amount": 500.0,
  "effective_from": "2026-07-01"
}
```

Validation rules:

- Amounts are required, numeric, min `0`, max `9999999999.99`, two decimal places.
- `effective_from` is required, ISO date, not before today unless admin has migration permission.
- Effective periods must not overlap.
- Past fee rows must not be mutated.
- Admin permission `fees:create` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "fee_history_id": "uuid",
    "created": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Payments

```http
GET /api/v1/admin/payments
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "paid_at",
  "sort_order": "desc",
  "search": "TRUST-000001",
  "status": "success",
  "payment_type": "renewal",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `payment_type` must be `registration` or `renewal`.
- `sort_by` allowlist: `created_at`, `paid_at`, `amount`, `status`, `payment_type`.
- Admin permission `payments:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "membership_number": "TRUST-000001",
        "payment_type": "renewal",
        "status": "success",
        "amount": 500.0,
        "currency": "INR",
        "paid_at": "2026-06-03T10:00:00+05:30"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Payment

```http
GET /api/v1/admin/payments/{payment_id}
```

Request DTO:

```json
{
  "payment_id": "uuid"
}
```

Validation rules:

- `payment_id` is required, valid UUID.
- Admin permission `payments:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "payment": {},
    "member": {},
    "membership": {},
    "status_transitions": []
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Events

```http
GET /api/v1/admin/events
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc",
  "search": "annual",
  "status": "draft",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `title`, `event_date`, `published_at`, `created_at`, `status`.
- Admin permission `events:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Annual Gathering",
        "slug": "annual-gathering",
        "status": "draft",
        "event_date": "2026-05-01T10:00:00+05:30"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Create Event

```http
POST /api/v1/admin/events
```

Request DTO:

```json
{
  "title": "Annual Gathering",
  "slug": "annual-gathering",
  "description": "Event details.",
  "event_date": "2026-05-01T10:00:00+05:30",
  "location": "Ahmedabad",
  "status": "draft"
}
```

Validation rules:

- `title` is required, min `3`, max `150`.
- `slug` is required, min `3`, max `120`, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, unique.
- `description` is required, min `10`, max `10000`.
- `event_date` is optional, valid timestamp.
- `location` is optional, max `200`.
- `status` is required, one of `draft`, `published`, `archived`.
- Admin permission `events:create` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "event_id": "uuid",
    "slug": "annual-gathering",
    "created": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Update Event

```http
PATCH /api/v1/admin/events/{event_id}
```

Request DTO:

```json
{
  "event_id": "uuid",
  "title": "Annual Gathering",
  "description": "Updated details.",
  "status": "published"
}
```

Validation rules:

- `event_id` is required, valid UUID.
- At least one mutable field is required.
- Field validation matches Create Event.
- Publishing requires `published_at` to be set by server.
- Admin permission `events:update` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "event_id": "uuid",
    "updated": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Delete Event

```http
DELETE /api/v1/admin/events/{event_id}
```

Request DTO:

```json
{
  "event_id": "uuid",
  "reason": "Duplicate event"
}
```

Validation rules:

- `event_id` is required, valid UUID.
- `reason` is required, min `5`, max `500`.
- Soft delete only.
- Admin permission `events:delete` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "event_id": "uuid",
    "deleted": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### List Albums

```http
GET /api/v1/admin/gallery/albums
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "created_at",
  "sort_order": "desc",
  "search": "event",
  "status": "published"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `title`, `created_at`, `status`.
- Admin permission `gallery:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Community Event",
        "slug": "community-event",
        "status": "published",
        "photo_count": 12
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Create Album

```http
POST /api/v1/admin/gallery/albums
```

Request DTO:

```json
{
  "title": "Community Event",
  "slug": "community-event",
  "description": "Album description.",
  "status": "draft"
}
```

Validation rules:

- `title` is required, min `3`, max `150`.
- `slug` is required, min `3`, max `120`, regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, unique.
- `description` is optional, max `1000`.
- `status` is required, one of `draft`, `published`, `archived`.
- Admin permission `gallery:create` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "album_id": "uuid",
    "slug": "community-event",
    "created": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Upload Photo

```http
POST /api/v1/admin/gallery/albums/{album_id}/photos
```

Request DTO:

```json
{
  "album_id": "uuid",
  "title": "Stage Photo",
  "file": "multipart-binary",
  "sort_order": 1
}
```

Validation rules:

- `album_id` is required, valid UUID.
- `title` is optional, max `150`.
- `file` is required multipart upload.
- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Max file size: `5 MB`.
- Image structure must validate server-side.
- Client filename must not be trusted.
- Admin permission `gallery:update` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "photo_id": "uuid",
    "public_url": "https://example.org/gallery/photo.jpg",
    "uploaded": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Delete Photo

```http
DELETE /api/v1/admin/gallery/photos/{photo_id}
```

Request DTO:

```json
{
  "photo_id": "uuid",
  "reason": "Wrong image uploaded"
}
```

Validation rules:

- `photo_id` is required, valid UUID.
- `reason` is required, min `5`, max `500`.
- Soft delete metadata.
- Physical file deletion must be controlled by storage lifecycle policy.
- Admin permission `gallery:update` is required.
- Audit log is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "photo_id": "uuid",
    "deleted": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Active Members Report

```http
GET /api/v1/admin/reports/active-members
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "membership_number",
  "sort_order": "asc",
  "search": "rajesh",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `sort_by` allowlist: `membership_number`, `full_name`, `expiry_date`, `created_at`.
- Admin permission `reports:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Expiring Members Report

```http
GET /api/v1/admin/reports/expiring-members
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "expiry_date",
  "sort_order": "asc",
  "start_date": "2026-06-01",
  "end_date": "2026-06-30"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `start_date` and `end_date` are required for this report.
- `sort_by` allowlist: `expiry_date`, `membership_number`, `full_name`.
- Admin permission `reports:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Birthday Report

```http
GET /api/v1/admin/reports/birthdays
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "date_of_birth",
  "sort_order": "asc",
  "month": 6,
  "search": "rajesh"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `month` is required, integer, min `1`, max `12`.
- `sort_by` allowlist: `date_of_birth`, `name`, `relationship`.
- Admin permission `reports:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Payment Report

```http
GET /api/v1/admin/reports/payments
```

Request DTO:

```json
{
  "page": 1,
  "page_size": 20,
  "sort_by": "paid_at",
  "sort_order": "desc",
  "status": "success",
  "payment_type": "renewal",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

Validation rules:

- Uses Standard List Query Contract.
- `payment_type` must be `registration` or `renewal`.
- `sort_by` allowlist: `paid_at`, `amount`, `payment_type`, `status`.
- Admin permission `reports:read` is required.

Response DTO:

```json
{
  "success": true,
  "data": {
    "items": [],
    "summary": {
      "total_amount": 0.0,
      "payment_count": 0
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 0,
      "total_pages": 0
    }
  }
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Get Settings

```http
GET /api/v1/admin/settings
```

Request DTO:

```json
{}
```

Validation rules:

- Admin permission `settings:read` is required.
- Secrets must never be returned.

Response DTO:

```json
{
  "success": true,
  "data": {
    "trust_name": "Kumbhad Samaj Trust",
    "contact_details": {},
    "social_links": [],
    "receipt_settings": {}
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

### Update Setting

```http
PATCH /api/v1/admin/settings/{key}
```

Request DTO:

```json
{
  "key": "trust_name",
  "value": "Kumbhad Samaj Trust"
}
```

Validation rules:

- `key` is required, min `2`, max `100`, regex `^[a-z0-9_]+$`.
- `value` is required and must match the key-specific schema.
- Secret-like values must use environment variables, not system settings.
- Admin permission `settings:update` is required.
- Critical settings changes require audit log.

Response DTO:

```json
{
  "success": true,
  "data": {
    "key": "trust_name",
    "updated": true
  },
  "meta": {}
}
```

Error matrix: Uses the Standard Error Matrix for 400, 401, 403, 404, 409, 422, 429, and 500.

