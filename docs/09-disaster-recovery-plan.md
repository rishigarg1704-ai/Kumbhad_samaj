# Disaster Recovery Plan

This document is mandatory before implementation. Production launch is not approved until restore procedures are tested in staging.

## Recovery Targets

- Recovery Time Objective: `4 hours`.
- Recovery Point Objective: `1 hour`.
- Maximum acceptable backup age for production restore: `1 hour` for database transaction data when feasible.
- Manual reconciliation is required for Razorpay payments that occur inside the data loss window.

## Disaster Roles

- Incident lead: coordinates decisions, timeline, and communication.
- Technical lead: performs restore and infrastructure actions.
- Data lead: verifies database integrity and payment reconciliation.
- Admin contact: communicates operational status to trust admins.

## Disaster Declaration Criteria

Declare a disaster when any of these conditions occur:

- Production server is unavailable for more than `15 minutes`.
- PostgreSQL data corruption is suspected.
- Production database is accidentally dropped or destructive migration runs.
- Payment webhook processing is broken for more than `15 minutes`.
- Backup system has failed and data integrity is at risk.
- Security incident requires server rebuild or credential rotation.

## Recovery Procedure

1. Declare incident and record start time.
2. Freeze deployments.
3. Stop or block writes if data integrity is uncertain.
4. Identify failure type: server, database, media, payment webhook, or security.
5. Select latest verified backup that satisfies RPO.
6. Restore in staging first if production data state is unclear.
7. Restore production using the relevant runbook.
8. Run health checks.
9. Verify login, public pages, admin dashboard, member dashboard, payment order creation, and webhook readiness.
10. Reconcile payments from Razorpay dashboard for the incident window.
11. Record recovery end time, data loss window, backup used, and manual actions.
12. Complete post-incident review within `48 hours`.

## Database Failure Runbook

Stop application writes:

```bash
docker compose stop backend
```

Create a safety backup before restore:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "/backups/postgres/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
```

Verify selected backup checksum:

```bash
sha256sum -c /backups/postgres/kumbhad_YYYYMMDD_HHMMSS.dump.sha256
```

Drop and recreate database:

```bash
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Restore database:

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < /backups/postgres/kumbhad_YYYYMMDD_HHMMSS.dump
```

Run migrations:

```bash
docker compose run --rm backend alembic upgrade head
```

Restart backend:

```bash
docker compose up -d backend
```

Verify health:

```bash
docker compose exec backend curl -fsS http://localhost:8000/api/v1/health
```

## Full Server Failure Runbook

1. Provision replacement VPS.
2. Install Docker and Docker Compose plugin.
3. Install Nginx and firewall tooling.
4. Restore `/srv/kumbhad` from full server snapshot.
5. Restore environment variables from secret management.
6. Restore uploaded media archive to `/srv/kumbhad/uploads`.
7. Restore PostgreSQL using the Database Failure Runbook.
8. Start all services:

```bash
docker compose up -d
```

9. Verify containers:

```bash
docker compose ps
```

10. Verify backend health:

```bash
curl -fsS https://example.org/api/v1/health
```

11. Update Cloudflare DNS origin if IP changed.
12. Confirm SSL, login, payment order creation, and webhook endpoint readiness.

## Payment Webhook Failure Runbook

1. Alert admin immediately.
2. Disable automatic membership activation only if webhook integrity is uncertain.
3. Check backend logs for webhook signature, idempotency, and transaction errors.
4. Check Razorpay dashboard for captured payments in the incident window.
5. Replay webhook events where Razorpay supports replay.
6. For unreplayed events, manually reconcile payment records against Razorpay evidence.
7. Write audit log entries for every manual reconciliation.
8. Notify affected admins after reconciliation completes.

## Media Restore Runbook

Verify archive:

```bash
tar -tzf /backups/media/media_YYYYMMDD_HHMMSS.tar.gz > /tmp/media_restore_manifest.txt
```

Restore archive:

```bash
tar -xzf /backups/media/media_YYYYMMDD_HHMMSS.tar.gz -C /
```

Fix ownership:

```bash
chown -R app:app /srv/kumbhad/uploads
```

Verify public gallery image loading after restore.

## Security Incident Rebuild Runbook

1. Remove compromised server from public traffic.
2. Preserve forensic snapshot when practical.
3. Rotate all application, database, OAuth, Razorpay, email, and JWT secrets.
4. Provision clean replacement server.
5. Restore from the latest known-clean backup.
6. Revoke all active sessions.
7. Force admin password and 2FA reset if admin compromise is suspected.
8. Review audit logs and payment logs.
9. Document root cause and prevention actions.

## Restore Test Schedule

- Test database restore before production launch.
- Test database restore monthly in staging.
- Test full server restore quarterly.
- Test payment reconciliation runbook before Razorpay production go-live.

## Recovery Verification Checklist

- Backend health check passes.
- Frontend loads over HTTPS.
- Member login works.
- Admin login and 2FA work.
- Member dashboard loads correct data.
- Admin dashboard loads correct data.
- Public events and gallery load.
- Payment order creation works in the correct environment.
- Razorpay webhook endpoint receives and verifies test webhook.
- Backup job resumes after recovery.
- Monitoring alerts return to green.

