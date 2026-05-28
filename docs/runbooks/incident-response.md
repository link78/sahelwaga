# Incident response

Use this runbook when production is degraded or down.

## 1. Acknowledge

1. Page the primary on-call (see [`oncall.md`](./oncall.md)).
2. Open an incident channel `#inc-YYYYMMDD-<slug>` in chat.
3. Post the **first responder template**:
   - Symptom (what is broken)
   - First detected at (UTC)
   - Suspected component (API, web, DB, worker)
   - Initial severity (`SEV1`–`SEV4`)

## 2. Triage signals

Check in this order — most outages are caught at the top of the list.

| Signal | Where |
| ------ | ----- |
| Web up? | `curl -fsSL https://<web-host>/` |
| API up? | `curl -fsSL https://<api-host>/health/live` |
| DB reachable? | `curl -fsSL https://<api-host>/health/ready` (status `not_ready` ⇒ DB) |
| Error rate | `http_errors_total` counter in `/health/metrics` |
| Request volume | `http_requests_total` counter in `/health/metrics` |
| Audit writes failing? | `audit_write_failures_total` counter |
| Expiry scan stuck? | `expiry_scan_runs_total` counter not advancing daily |

Grab the `x-request-id` header from any failing customer request and grep API
logs: `journalctl -u sahel-api | grep <request-id>` (or your equivalent log
aggregator query).

## 3. Common scenarios

### 3a. `/health/ready` returns `503`

The API cannot reach Postgres.

1. Check the DB host: `pg_isready -h <host> -p 5432`.
2. Check connection saturation: `SELECT count(*) FROM pg_stat_activity;` — if
   near `max_connections`, a runaway client is leaking pools.
3. Restart the API pod/container last — Prisma will reconnect on next
   request. **Do not** restart the DB primary without DB-team sign-off.

### 3b. 5xx spike from a single endpoint

1. Inspect logs filtered by `route` and `requestId`.
2. If a recent deploy is suspected, run the rollback section of
   [`deploy.md`](./deploy.md).
3. If the failure is data-driven (e.g. one PO causing a state-machine
   exception), capture the PO id from the log and open a follow-up ticket.

### 3c. Worker not running (`expiry_scan_runs_total` flat)

1. Confirm the API container is alive — the worker runs in-process.
2. Trigger a manual run:
   `curl -XPOST -H 'Authorization: Bearer <admin-jwt>' https://<api>/compliance/expiry-scan/run`
3. Check audit logs for any `EXPIRY_ALERT` entries written in the last hour.

### 3d. Authentication is rejecting valid tokens

1. Verify the API has the expected `JWT_ACCESS_SECRET` (env mismatch is the
   #1 cause after a key rotation).
2. Check the token expiry — `JWT_ACCESS_TTL` defaults to 15 minutes; clients
   must refresh.

## 4. Resolve

1. Apply the fix (rollback, config change, restart).
2. Confirm `/health/ready` is `200 ready` and `http_errors_total` plateaus.
3. Post an "all clear" message in the incident channel.

## 5. Post-mortem

Within 48 hours of any `SEV1` or `SEV2`:

- Timeline (UTC)
- Root cause
- Impact (users affected, duration)
- What went well / what to improve
- Action items with owners and due dates

File the doc under `docs/postmortems/<date>-<slug>.md`.
