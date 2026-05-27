# Observability

## Logs

The API uses `pino` with structured JSON output (`apps/api/src/lib/logger.ts`).
Each HTTP request emits a single log line containing:

| Field | Source |
| ----- | ------ |
| `requestId` | `x-request-id` header (echoed back to clients) |
| `userId` | JWT subject (when authenticated) |
| `role` | JWT role claim |
| `req.method`, `req.url`, `res.statusCode` | `pino-http` defaults |
| `responseTime` | `pino-http` default |

To trace a failing client request end-to-end, grab the `x-request-id` header
from the failed response (returned on every response and included in error
JSON payloads) and grep your log aggregator:

```bash
journalctl -u sahel-api | jq -c 'select(.requestId == "<id>")'
```

## Health endpoints

| Endpoint | Purpose | Probes |
| -------- | ------- | ------ |
| `GET /health` | Backwards-compatible aggregate probe (DB ping). Returns `503` if DB is unreachable. | Legacy / external monitors |
| `GET /health/live` | Process is up and the event loop is responsive. Returns `version` and `uptime_seconds`. | k8s `livenessProbe` |
| `GET /health/ready` | API + DB both healthy. Returns `503 not_ready` if DB ping fails. | k8s `readinessProbe`, load balancer |
| `GET /health/metrics` | Prometheus text-format metrics. | Prometheus scraper |

## Metrics

The `/health/metrics` endpoint is a minimal in-process registry
(`apps/api/src/lib/metrics.ts`). The following series are exposed:

| Metric | Type | Labels |
| ------ | ---- | ------ |
| `http_requests_total` | counter | `method`, `route`, `status_class` |
| `http_errors_total` | counter | `method`, `route` |
| `audit_entries_total` | counter | `entity`, `action` |
| `audit_write_failures_total` | counter | `entity`, `action` |
| `expiry_scan_runs_total` | counter | `trigger` (`scheduled` \| `manual`) |
| `process_start_time_seconds` | gauge | — |

Counters reset to zero on process restart by design — derive rates and
totals from your time-series store.

### Suggested Prometheus alerts

```yaml
- alert: SahelApiHigh5xxRate
  expr: |
    sum(rate(http_errors_total[5m])) /
    sum(rate(http_requests_total[5m])) > 0.02
  for: 10m
  labels: { severity: page }
  annotations:
    summary: ">2% 5xx rate on sahel-api"

- alert: SahelApiDown
  expr: up{job="sahel-api"} == 0
  for: 2m
  labels: { severity: page }

- alert: SahelExpiryScanStalled
  expr: increase(expiry_scan_runs_total[36h]) == 0
  for: 1h
  labels: { severity: ticket }
  annotations:
    summary: "Expiry-scan worker hasn't run in 36h"
```

## Tracing

Distributed tracing is not in scope for Phase 6. The `x-request-id` header
is the correlation primitive — propagate it from upstream (web → API) and
log it on every span you add later.
