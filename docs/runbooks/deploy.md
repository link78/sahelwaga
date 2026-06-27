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
3. Roll out the release on the Ubuntu host (API first, then web). For the full
   build + systemd setup see [`ubuntu.md`](./ubuntu.md):
   - On the host, check out the tagged commit and reinstall/rebuild:
     `git fetch --tags && git checkout vX.Y.Z && pnpm install --frozen-lockfile`,
     then `pnpm --filter @sahelwaga/db exec prisma generate` and
     `pnpm --filter @sahelwaga/web build`.
   - `sudo systemctl restart sahelwaga-api` → wait until
     `/health/ready` → `200`.
   - `sudo systemctl restart sahelwaga-web` → wait until `/en` → `200`.
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
3. Re-deploy the previous good release on the Ubuntu host:
   - Check out the previous good tag and rebuild
     (`git checkout vX.Y.(Z-1) && pnpm install --frozen-lockfile`, then
     `pnpm --filter @sahelwaga/db exec prisma generate` and
     `pnpm --filter @sahelwaga/web build`). Restart the API first
     (`sudo systemctl restart sahelwaga-api`), then the web service
     (`sudo systemctl restart sahelwaga-web`).
4. Verify `/health/live` reports the previous `version`.
5. Announce the rollback in the incident channel and open a follow-up
   ticket to fix-forward.

## Communications

- Schedule deploys outside Burkina Faso business hours (08:00–18:00 GMT)
  when possible.
- Post in `#sahel-deploys` immediately before and after each deploy with
  the version, the commit SHA, and the deploying engineer.
