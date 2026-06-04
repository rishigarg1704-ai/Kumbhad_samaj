# Deployment Plan

This document is mandatory before implementation. Production deployment must be repeatable, observable, backed up, restorable, and approved before go-live.

## Deployment Goals

- Reliable Linux VPS deployment.
- Secure HTTPS traffic.
- Containerized services.
- Repeatable releases.
- Backup and restoration readiness.
- Monitoring for operational failures.
- Measurable performance targets.
- No production mock implementations.

## Target Infrastructure

```text
Cloudflare
  -> Nginx
  -> React frontend
  -> FastAPI backend
  -> PostgreSQL
```

## Components

- Cloudflare for DNS, TLS edge, caching where appropriate, and basic protection.
- Nginx for reverse proxy, HTTPS termination if needed, routing, static frontend serving, and security headers.
- FastAPI backend container.
- React frontend static build served by Nginx or a frontend container.
- PostgreSQL database container or managed PostgreSQL.
- Backup storage outside the application server.
- Monitoring, alerting, and error tracking tools.

## Environments

### Local Development

- Docker Compose for backend, frontend, and database.
- Local environment variables.
- Test database.
- Test Razorpay and Google OAuth credentials only.

### Staging

- Mirrors production as closely as practical.
- Used for release validation.
- Uses staging OAuth and Razorpay credentials.
- Runs migrations before production.
- Runs restore drills before launch.

### Production

- Real domain.
- Real Razorpay credentials.
- Production PostgreSQL.
- Production backups and monitoring.
- Admin 2FA mandatory.
- HTTPS mandatory.

## Environment Variables

Required categories:

- `APP_ENV`
- `APP_BASE_URL`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `EMAIL_API_KEY`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_DISABLED`
- `UPLOAD_STORAGE_PATH`
- `BACKUP_STORAGE_PATH`
- `SENTRY_DSN` or equivalent error tracker

Rules:

- Never commit secrets.
- Use different secrets per environment.
- Rotate secrets if exposed.
- Production secrets must not be copied to local development.
- Secret changes require deployment notes and rollback notes.

## Docker Compose Strategy

Services:

- `frontend`
- `backend`
- `postgres`
- `nginx`
- `backup`
- `monitoring-agent`

Backend requirements:

- Health check endpoint at `/api/v1/health`.
- Structured JSON logs.
- Environment-based configuration.
- Database migration command.
- Non-root container user where practical.

Database requirements:

- Persistent volume.
- Restricted credentials.
- Backup access.
- Connection limit configured.
- Extension usage documented before deployment.

Nginx requirements:

- Reverse proxy to backend.
- Serve frontend.
- Enforce request size limits.
- Security headers.
- HTTPS redirect.
- Access logs and error logs enabled.

## Release Process

1. Review and approve all mandatory documents.
2. Review code changes.
3. Run frontend tests.
4. Run backend unit and integration tests.
5. Run database migrations in staging.
6. Validate staging flows.
7. Confirm monitoring is green in staging.
8. Backup production database.
9. Deploy production containers.
10. Run migrations.
11. Verify health checks.
12. Verify login, public pages, payment order creation, and webhook endpoint readiness.
13. Watch logs and alerts for at least `30 minutes`.

Rollback requirements:

- Keep the previous container image tag available.
- Database migrations must document rollback strategy.
- If rollback is unsafe, document forward-fix procedure before release.

## Backup Strategy

### Daily

- PostgreSQL custom-format dump using `pg_dump -Fc`.
- Retention: `30` daily backups.
- Schedule: at least once every day.
- Store outside the application container.

### Weekly

- Full server snapshot.
- Retention: according to hosting capacity, minimum `8` weekly snapshots when practical.
- Snapshot must include application configuration, Nginx config, Docker Compose files, uploaded media, and backup scripts.

### Monthly

- Archive backup.
- Retention: `12` monthly backups.
- Archive must include PostgreSQL dump and uploaded media snapshot.

### Yearly

- Long-term archive.
- Retention: `5` yearly backups.

### Backup Commands

Database backup:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "/backups/postgres/kumbhad_$(date +%Y%m%d_%H%M%S).dump"
```

Backup checksum:

```bash
sha256sum /backups/postgres/kumbhad_YYYYMMDD_HHMMSS.dump > /backups/postgres/kumbhad_YYYYMMDD_HHMMSS.dump.sha256
```

Media archive:

```bash
tar -czf /backups/media/media_YYYYMMDD_HHMMSS.tar.gz /srv/kumbhad/uploads
```

Retention cleanup:

```bash
find /backups/postgres -name "kumbhad_*.dump" -mtime +30 -delete
```

## Restore Commands

Restore must be tested before production launch and after major infrastructure changes.

### Database Restore

Stop application writes:

```bash
docker compose stop backend
```

Create a pre-restore safety backup:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "/backups/postgres/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
```

Drop and recreate database:

```bash
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Restore selected backup:

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < /backups/postgres/kumbhad_YYYYMMDD_HHMMSS.dump
```

Run migrations:

```bash
docker compose run --rm backend alembic upgrade head
```

Restart services:

```bash
docker compose up -d backend
```

Verify:

```bash
docker compose exec backend curl -fsS http://localhost:8000/api/v1/health
```

### Full Server Restore

1. Provision replacement VPS with the approved Linux distribution.
2. Point DNS TTL lower before planned migrations when possible.
3. Install Docker, Docker Compose plugin, Nginx, firewall tooling, and monitoring agent.
4. Restore `/srv/kumbhad` from the latest verified server snapshot.
5. Restore environment files from secret management, not from git.
6. Restore uploaded media from the latest media archive.
7. Restore PostgreSQL using the Database Restore procedure.
8. Start containers with `docker compose up -d`.
9. Verify health check, login, public pages, member dashboard, admin dashboard, and payment webhook readiness.
10. Update DNS or Cloudflare origin to replacement VPS.
11. Record recovery start time, end time, backup used, data loss window, and verification results.

## Disaster Recovery Targets

- Recovery Time Objective: `4 hours`.
- Recovery Point Objective: `1 hour`.

Detailed disaster recovery procedures are defined in `docs/09-disaster-recovery-plan.md`.

## Monitoring and Alerting

Monitoring and alerting thresholds are defined in `docs/10-monitoring-alerting-plan.md`.

Minimum production alerts:

- Server down.
- Backend health check failing.
- Database down.
- Failed payment webhook.
- Backup failure.
- Repeated admin login failures.
- SSL certificate expiring.

## Observability

Observability policies are defined in `docs/10-monitoring-alerting-plan.md`.

Required logs:

- Application logs.
- Access logs.
- Audit logs.
- Error logs.
- Backup job logs.
- Payment webhook processing logs.

Logs must not include:

- Passwords.
- OTPs.
- JWTs.
- Refresh tokens.
- Payment card details.
- Razorpay secrets.
- Google OAuth secrets.

## Performance Requirements

Frontend:

- Largest Contentful Paint under `2.5 seconds`.
- Cumulative Layout Shift under `0.1`.
- Interaction to Next Paint under `200 ms`.

Backend:

- 95th percentile API response under `300 ms` for normal read endpoints.
- Health check response under `100 ms`.
- Webhook acknowledgement under `2 seconds` after signature verification and transaction completion.

Database:

- Indexed query under `50 ms` for common lookup and list filters at target scale.
- Admin list endpoints must remain paginated.
- Reports must use indexed filters or controlled background/export strategy.

Authentication:

- Login under `2 seconds` after OAuth or 2FA verification callback.
- Session refresh under `500 ms` at 95th percentile.

Membership Renewal:

- Renewal order creation under `2 seconds`.
- Renewal flow under `5 seconds` end-to-end excluding external Razorpay user interaction.

## Production Readiness Checklist

- PRD approved.
- Technical Architecture approved.
- Security Architecture approved.
- Database Design approved.
- API Specification approved.
- Frontend Specification approved.
- Deployment Plan approved.
- Disaster Recovery Plan approved.
- Monitoring and Alerting Plan approved.
- Acceptance Test Suite approved.
- HTTPS enabled.
- Security headers enabled.
- Admin 2FA enabled.
- Rate limiting enabled.
- Razorpay webhook signature verification tested.
- Database backups configured.
- Restore process tested.
- Monitoring alerts configured.
- Error tracking configured.
- No secrets committed.
- No mock production code.
- No hardcoded business values.
- Fee history works.
- Audit logs work.
- Soft deletes work.

