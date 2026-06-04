# Monitoring and Alerting Plan

This document is mandatory before implementation. Monitoring must be active in staging before production launch and active in production before real users are onboarded.

## Monitoring Goals

- Detect outages quickly.
- Detect payment and backup failures immediately.
- Track application errors and slow endpoints.
- Preserve audit logs for business-critical actions.
- Support disaster recovery verification.

## Alert Thresholds

| Metric | Warning | Critical | Alert Timing |
| --- | --- | --- | --- |
| CPU usage | `70%` for `10 minutes` | `90%` for `5 minutes` | Warning and critical |
| Memory usage | `75%` for `10 minutes` | `90%` for `5 minutes` | Warning and critical |
| Disk usage | `80%` | `90%` | Warning and critical |
| Database connections | `70%` of max | `90%` of max | Warning and critical |
| Backend health check | 1 failed check | 3 failed checks | Critical after 3 |
| Failed payment webhook | Any failure | Any failure | Immediately |
| Backup failure | Any failure | Any failure | Immediately |
| SSL expiry | `30 days` | `7 days` | Warning and critical |
| Admin failed logins | 5 failures in 10 minutes | 10 failures in 10 minutes | Warning and critical |
| API 5xx rate | `1%` for 10 minutes | `5%` for 5 minutes | Warning and critical |
| API p95 latency | `300 ms` for 10 minutes | `1000 ms` for 5 minutes | Warning and critical |

## Performance Targets

Frontend:

- Largest Contentful Paint under `2.5 seconds`.
- Cumulative Layout Shift under `0.1`.
- Interaction to Next Paint under `200 ms`.

Backend:

- 95th percentile API response under `300 ms`.
- Health check response under `100 ms`.
- Session refresh under `500 ms`.

Database:

- Indexed query under `50 ms`.
- Slow query alert for queries over `500 ms`.
- Report queries must use indexed filters or controlled export strategy.

Authentication:

- Login under `2 seconds` after provider callback or 2FA verification.

Membership Renewal:

- Renewal order creation under `2 seconds`.
- Renewal flow under `5 seconds` excluding external Razorpay user interaction.

## Observability Requirements

### Application Logs

Contents:

- Request ID.
- Timestamp.
- Environment.
- Service name.
- Route name.
- Status code.
- Latency.
- Authenticated actor ID where safe.
- Error code.

Retention:

- Production application logs retained for `90 days`.

Rotation strategy:

- Rotate daily or at `100 MB`, whichever comes first.
- Compress rotated logs.

Storage strategy:

- Store locally for short-term debugging.
- Ship to centralized logging or durable object storage for retention.

### Access Logs

Contents:

- IP address.
- Method.
- Path.
- Status code.
- Response time.
- User agent.
- Request ID.

Retention:

- Retain for `90 days`.

Rotation strategy:

- Rotate daily.
- Compress rotated logs.

Storage strategy:

- Nginx local logs plus centralized storage.

### Audit Logs

Contents:

- Actor user ID.
- Actor admin ID.
- Actor role.
- Action.
- Resource type.
- Resource ID.
- Old value.
- New value.
- IP address.
- User agent.
- Timestamp.

Retention:

- Retain indefinitely unless legal policy requires a defined retention period.

Rotation strategy:

- Audit logs are database records and must not be log-rotated out of the database.
- Database backups preserve audit logs.

Storage strategy:

- Store in PostgreSQL `audit_logs`.
- Optional export to append-only storage for tamper resistance.

### Error Logs

Contents:

- Request ID.
- Error code.
- Exception class.
- Sanitized message.
- Stack trace in server logs only.
- Environment.
- Release version.

Retention:

- Retain for `180 days`.

Rotation strategy:

- Rotate daily or at `100 MB`.

Storage strategy:

- Error tracking service plus local compressed logs.

## Sensitive Data Logging Rules

Never log:

- Passwords.
- OTPs.
- JWTs.
- Refresh tokens.
- Razorpay secrets.
- Google OAuth secrets.
- Payment card details.
- Raw authorization headers.

Mask where needed:

- Email addresses.
- Phone numbers.
- IP addresses when exported outside operational systems.

## Health Checks

Backend health endpoint:

```http
GET /api/v1/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "ok"
  },
  "meta": {}
}
```

Health check frequency:

- Production: every `1 minute`.
- Staging: every `5 minutes`.

## Alert Channels

- Critical alerts: phone, SMS, or high-priority chat notification.
- Warning alerts: email or normal-priority chat notification.
- Payment and backup alerts: immediate critical notification.

## Alert Response Expectations

- Critical production alerts acknowledged within `15 minutes`.
- Payment webhook failures investigated immediately.
- Backup failures investigated same day.
- SSL expiry critical alert resolved before `7 days`.

## Dashboards

Required dashboard panels:

- Uptime.
- API p95 latency.
- API 5xx rate.
- CPU usage.
- Memory usage.
- Disk usage.
- Database connections.
- Failed payment webhooks.
- Backup job status.
- Admin failed login count.

## Monitoring Readiness Checklist

- Health checks configured.
- Error tracking configured.
- Application logs structured.
- Nginx access logs enabled.
- Audit logs implemented.
- Backup logs enabled.
- Alert thresholds configured.
- Critical alert channel tested.
- SSL expiry alert tested.
- Payment webhook failure alert tested.
- Backup failure alert tested.

