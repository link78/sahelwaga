# Backup & restore

The MedSupply portal is stateful on Postgres only. S3 (MinIO in dev) is
versioned at the bucket level, so document blobs are recoverable
independently. This runbook covers Postgres.

## Backup schedule

| Type | Cadence | Retention | Location |
| ---- | ------- | --------- | -------- |
| WAL stream | continuous | 7 days | Managed PG / object storage |
| Logical (`pg_dump`) | hourly | 24 h | Object storage |
| Logical (`pg_dump`) | daily | 30 days | Object storage |
| Logical (`pg_dump`) | weekly | 1 year | Object storage |

## Ad-hoc backup

```bash
DATABASE_URL='postgresql://<user>:<pass>@<host>:5432/sahelwaga'
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=sahelwaga-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Upload the dump to the encrypted backup bucket.

## Restore (point-in-time)

> Restoring a backup is **destructive** for the target database. Always
> restore into a staging instance first. Only restore over production with
> a SEV1 declared and the incident commander's explicit sign-off.

1. Provision a clean Postgres 16 instance.
2. Create the empty database: `createdb -h <host> sahelwaga`.
3. Restore the latest dump:
   ```bash
   pg_restore \
     --dbname='postgresql://<user>:<pass>@<host>/sahelwaga' \
     --no-owner --no-acl \
     --jobs=4 \
     sahelwaga-<timestamp>.dump
   ```
4. Run any migrations created since the backup:
   ```bash
   DATABASE_URL=<restored> pnpm --filter @sahelwaga/db exec prisma migrate deploy
   ```
5. Point the API at the restored DB (`DATABASE_URL`), restart it, and verify:
   - `/health/ready` returns `200 ready`.
   - `/dashboard/stats` returns sensible counts (signed-in as admin).

## Restore drill

Run the drill **monthly** in staging:

1. Take a fresh dump of production.
2. Restore into the staging DB following the steps above.
3. Run the e2e suite against the restored environment:
   ```bash
   E2E_WEB_URL=https://staging.sahel.example.com \
   E2E_API_URL=https://api-staging.sahel.example.com \
   pnpm e2e
   ```
4. Record the drill in `docs/postmortems/drills.md` with the duration
   (target: < 60 min end-to-end).

## What is NOT backed up

- JWT secrets (rotate via secret manager — losing them invalidates active
  sessions, which is acceptable).
- In-memory metrics counters (`/health/metrics` resets on restart by design).
