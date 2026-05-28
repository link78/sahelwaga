# On-call

## Rotation

- Primary on-call: weekly, Monday 09:00 UTC → following Monday 09:00 UTC.
- Secondary on-call: shadows primary; takes over if primary doesn't ack
  within 10 minutes.
- Schedule is published in the team calendar and synced to the paging
  provider.

## Severities

| Sev | Definition | Response target | Examples |
| --- | ---------- | --------------- | -------- |
| SEV1 | Full outage or data integrity risk | Ack < 5 min, resolve ASAP | API down; DB corruption; security breach |
| SEV2 | Major degradation | Ack < 15 min, resolve same day | Login broken; orders cannot be created; > 5% 5xx |
| SEV3 | Minor degradation | Next business day | Slow dashboard; single non-critical worker stalled |
| SEV4 | Cosmetic | Backlog | Typo; broken icon; missing translation |

## Escalation

1. **Primary on-call** acknowledges in the paging tool.
2. If unable to resolve within 30 minutes or the impact widens, escalate to
   **secondary on-call**.
3. For SEV1 or anything touching data integrity, immediately page the
   **engineering manager** and the **DBA on-call**.
4. For security incidents (suspected breach, leaked secret) page the
   **security lead** and follow the security incident process — do **not**
   discuss details outside the security channel.

## Communications

- All incident comms happen in `#inc-YYYYMMDD-<slug>`.
- Status updates every 30 minutes for SEV1/SEV2 until resolved, even if the
  update is "still investigating".
- External status page (when present) is updated by the incident commander,
  not the responder.

## Handover

At the end of every shift the outgoing primary posts a handover summary in
`#sahel-oncall`:

- Open incidents and their state
- Pending follow-ups from the week
- Anything to watch for (planned deploys, customer escalations)

## Tooling

- Paging: <pagerduty/opsgenie URL>
- Logs: <log aggregator URL>
- Metrics dashboards: <grafana URL>
- Source-of-truth runbooks: this directory
