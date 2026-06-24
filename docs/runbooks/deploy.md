# Deploy & rollback

## Release tags

Production deploys are cut from a signed Git tag of the form
`vX.Y.Z`. Pre-release tags use `vX.Y.Z-rcN`.

## Pre-flight checklist

- [ ] CI green for the target commit (`ci.yml` **and** `e2e.yml`).
- [ ] Database migrations in the release have been reviewed and tested
      against a copy of production.
- [ ] An on-call engineer is at a keyboard.
- [ ] Most recent backup is < 24 h old (see [`backup-restore.md`](./backup-restore.md)).

## Deploy steps

1. Tag the release:
   ```bash
   git tag -s vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
2. Apply Prisma migrations against production:
   ```bash
   DATABASE_URL=<prod> pnpm --filter @sahelwaga/db exec prisma migrate deploy
   ```
   Migrations are forward-only. Never edit a migration that has run in prod.
3. Roll out the release on Railway (one service at a time; API first, then
   web). For each service, deploy the tagged commit — Railway rebuilds it with
   Nixpacks from the monorepo (see [`railway.md`](./railway.md)):
   - Deploy the API service → wait for the deployment to go `Active` and
     `/health/ready` → `200`.
   - Deploy the web service → wait for the deployment to go `Active`.
4. Smoke test in production:
   - `curl https://<api>/health/live` reports the new `version`.
   - `curl https://<web>/en` renders the home page.
   - Sign in with a test account and load the dashboard.

## Rollback

Use this if a deploy regresses functionality and a fix-forward will take more
than ~30 minutes.

1. Identify the previous good tag `vX.Y.(Z-1)`.
2. **Schema compatibility check** — verify that all migrations that ran in
   the failing release are backwards compatible with the previous app
   version. If any are destructive (column drops, type changes, NOT NULL
   without default) you **must** restore from backup instead of rolling
   back. See [`backup-restore.md`](./backup-restore.md).
3. Re-deploy the previous good release on Railway:
   - In each service's **Deployments** tab, redeploy the deployment built from
     `vX.Y.(Z-1)` (or push/redeploy that tag). Roll back the API first, then
     the web service.
4. Verify `/health/live` reports the previous `version`.
5. Announce the rollback in the incident channel and open a follow-up
   ticket to fix-forward.

## Communications

- Schedule deploys outside Burkina Faso business hours (08:00–18:00 GMT)
  when possible.
- Post in `#sahel-deploys` immediately before and after each deploy with
  the version, the commit SHA, and the deploying engineer.
