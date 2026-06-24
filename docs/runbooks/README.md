# Runbooks

Operational playbooks for the MedSupply portal. Each runbook is short,
opinionated, and assumes you have:

- Production SSH / cloud console access
- Production access to the [Railway](https://railway.com/) project (API, web,
  and Postgres services)
- Access to the Postgres primary
- Credentials for the demo `admin@sahelpharma.local` account (test envs only)

## Index

| Runbook | When to use |
| ------- | ----------- |
| [incident-response.md](./incident-response.md) | API/web is down, error rates spike, or DB connectivity fails |
| [deploy.md](./deploy.md) | Routine deploy of a tagged release or rollback to a previous tag |
| [railway.md](./railway.md) | Deploy the API + web + Postgres to Railway (railway.com) |
| [backup-restore.md](./backup-restore.md) | Take an ad-hoc backup, restore from one, or test the restore drill |
| [expiry-scan.md](./expiry-scan.md) | Diagnose missing compliance alerts or trigger an on-demand scan |
| [observability.md](./observability.md) | Where to find logs, metrics, health endpoints, and request IDs |
| [oncall.md](./oncall.md) | On-call rotation, escalation paths, and severity definitions |

## Conventions

- Severities follow `SEV1` (full outage) → `SEV4` (cosmetic). See
  [`oncall.md`](./oncall.md).
- Every incident report includes the `x-request-id` header(s) involved so the
  responder can grep API logs.
- Audit log entries are append-only — never `DELETE` from `audit_log` to
  "clean up". Use database-level archive instead.
