# Expiry-scan worker

The expiry-scan worker writes `EXPIRY_ALERT` audit-log entries for compliance
documents whose `expiryDate` is within the alert window (default 30 days).
It runs in-process inside the API container:

- Once 60 seconds after API start (so startup is non-blocking).
- Then on a 24-hour interval (`startExpiryScanScheduler`).

Source: `apps/api/src/workers/expiry-scan.ts`.

## Tracked document types

`COA`, `STABILITY`, `IMPORT_PERMIT`, `WHO_GMP`, `LICENSE`.

## Verification checklist

- `expiry_scan_runs_total` in `/health/metrics` increments at least once per
  day per API replica.
- The compliance dashboard (`/dashboard/compliance`) lists at least the
  documents with `expiryDate < now() + 30 days`.

## On-demand run

```bash
curl -XPOST \
  -H "Authorization: Bearer <admin-jwt>" \
  https://<api>/compliance/expiry-scan/run
```

Response payload:

```json
{
  "scannedAt": "2026-05-27T21:00:00.000Z",
  "windowDays": 30,
  "alertsCreated": 3,
  "expiredCount": 1,
  "expiringCount": 9
}
```

`alertsCreated` is **deduped** — documents that already have an
`EXPIRY_ALERT` audit entry within the past `windowDays` are skipped.

## Common issues

### "Expected alerts are missing"

1. Confirm the document is one of the tracked types.
2. Confirm `expiryDate` is set and falls inside the window.
3. Check audit log for a recent `EXPIRY_ALERT` on the same document — the
   deduper may already have fired.
4. Trigger an on-demand run as above and re-check.

### "Worker crashed and the schedule stopped"

The worker is wrapped in `.catch()` blocks; an exception will be logged but
will not stop the schedule. If you suspect the interval is dead:

1. Restart the API container.
2. Verify `expiry_scan_runs_total` increments after the next 60-second
   warm-up.

### "Audit table is growing"

Each scan can write multiple alerts. Within a single 30-day window the
deduper caps each document at one alert. Long-term archival is out of scope
for this worker — coordinate with the DBA on retention policy.
