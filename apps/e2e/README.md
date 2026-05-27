# Playwright E2E

End-to-end smoke tests for the Sahel Pharma portal.

## Local run

```bash
# Bring up the stack and seed demo data
pnpm docker:up
pnpm db:migrate
pnpm db:seed

# Run API + web in another terminal
pnpm dev

# Install browsers once (downloads Chromium)
pnpm --filter @sahelwaga/e2e install:browsers

# Execute the suite
pnpm --filter @sahelwaga/e2e test
```

The suite assumes the web app is reachable at `http://localhost:3000` and the
API at `http://localhost:4000`. Override via `E2E_WEB_URL` / `E2E_API_URL`.

## Coverage

| Spec | What it asserts |
| ---- | --------------- |
| `marketing.spec.ts` | Locale redirect, EN/FR home, public catalog, contact form |
| `auth.spec.ts` | Seeded admin can sign in and reach the dashboard |
| `api-health.spec.ts` | `/health`, `/health/live`, `/health/ready`, `/health/metrics` and `x-request-id` propagation |

## CI

The `e2e.yml` GitHub Actions workflow brings up Postgres, runs migrations +
seed, boots the API and web app in the background, then executes
`pnpm --filter @sahelwaga/e2e test`. Reports are uploaded as an artefact on
failure.
