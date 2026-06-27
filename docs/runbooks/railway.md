# Deploy to Railway

This guide deploys the portal to [Railway](https://railway.com/) as **three
services in one project**:

| Service    | Source                | Notes                                   |
| ---------- | --------------------- | --------------------------------------- |
| `postgres` | Railway Postgres plugin | Managed database, provides `DATABASE_URL` |
| `api`      | `apps/api` (Nixpacks) | Express + Prisma API                    |
| `web`      | `apps/web` (Nixpacks) | Next.js front end                       |

Both apps are built by Railway's native **Nixpacks** builder from the
**monorepo root** (they need the pnpm workspace). The repo ships per-service
config-as-code:

- [`apps/api/railway.json`](../../apps/api/railway.json)
- [`apps/web/railway.json`](../../apps/web/railway.json)

The API binds to the `PORT` Railway injects (falling back to `API_PORT`), and
the web `start` script binds to `PORT` as well — no extra wiring needed. The
web app builds with Next.js [standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
(`output: 'standalone'`) so the production container ships a minimal,
self-contained server — this keeps memory low and avoids the out-of-memory
restarts that surface as a Railway **502 Bad Gateway** (no healthy upstream).
The `build` step's `postbuild` copies the static assets into the standalone
bundle, and `start` launches `.next/standalone/apps/web/server.js`.

---

## 1. Create the project and database

1. Create a new Railway project (empty).
2. **+ New → Database → Add PostgreSQL.** Railway exposes a `DATABASE_URL`
   reference variable for it.

## 2. Add the API service

1. **+ New → GitHub Repo →** select this repository.
2. In the service **Settings**:
   - **Root Directory:** `/` (the repo root — the build needs the whole
     workspace).
   - **Config-as-code / Railway config file:** `apps/api/railway.json`
     (this selects the Nixpacks build command, start command, and
     `/health/ready` health check).
3. Add the environment variables below, then deploy. The container runs
   `prisma migrate deploy` on boot to apply the committed migrations and create
   the schema.

### API variables

| Variable             | Value                                                      |
| -------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`       | Reference the Postgres service → `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV`           | `production`                                               |
| `JWT_ACCESS_SECRET`  | long random string (≥ 32 chars)                            |
| `JWT_REFRESH_SECRET` | long random string (≥ 32 chars), different from the above  |
| `CORS_ORIGINS`       | the web public URL, e.g. `https://<web>.up.railway.app`    |
| `TRUST_PROXY`        | `1` (Railway terminates TLS in front of the app)           |
| `AUTH_COOKIE_SECURE` | `true`                                                     |
| `AUTH_COOKIE_SAMESITE` | `none` (API and web are on different hostnames)          |
| `LOG_LEVEL`          | `info` (optional)                                          |

> Generate secrets with `openssl rand -hex 32`.

## 3. Add the web service

1. **+ New → GitHub Repo →** select this repository again (same repo, second
   service).
2. In the service **Settings**:
   - **Root Directory:** `/`
   - **Config-as-code / Railway config file:** `apps/web/railway.json`
3. `NEXT_PUBLIC_API_URL` is **baked into the browser bundle at build time**, so
   it must be available during the build. With Nixpacks, service variables are
   exposed to the build automatically — just set it as a service variable
   (below) before the first deploy:

### Web variables

| Variable              | Value                                                |
| --------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | the API public URL, e.g. `https://<api>.up.railway.app` |
| `API_INTERNAL_URL`    | API address reachable from the web server, e.g. `https://<api>.up.railway.app` or a `*.railway.internal` host |
| `NODE_ENV`            | `production`                                          |
| `NEXTAUTH_SECRET`     | long random string (≥ 32 chars)                      |

> Make sure `NEXT_PUBLIC_API_URL` is set **before** the build runs; otherwise
> the browser will fall back to `window.location.hostname:4000` and fail to
> reach the **authenticated** app (dashboard/portal). If you change it later,
> trigger a redeploy so the new value is baked in.
>
> The **public marketing endpoints** (`/public/products`, `/public/leads`) are
> served same-origin: the browser calls them on the web domain and the web
> server proxies to the API using `API_INTERNAL_URL` (resolved at **runtime**,
> no rebuild needed). So if the catalog page 404s on `/public/products`, set
> `API_INTERNAL_URL` on the **web** service to an address that reaches the API
> and restart — you do **not** need a separate API domain or a rebuild for the
> public pages.

## 4. Generate public domains

For both `api` and `web`: **Settings → Networking → Generate Domain.** Then go
back and make sure:

- `web` → `NEXT_PUBLIC_API_URL` points at the **api** domain (and redeploy web
  so the new value is baked in) for the authenticated app.
- `web` → `API_INTERNAL_URL` reaches the **api** service (used by SSR and the
  same-origin `/public/*` proxy).
- `api` → `CORS_ORIGINS` includes the **web** domain.

## 5. Seed demo data (optional, one-off)

The deploy only syncs the schema. To load the demo accounts/data, run the seed
once against the production database — from the Railway dashboard open the API
service shell (or `railway run`) and execute:

```bash
pnpm --filter @sahelwaga/db exec tsx prisma/seed.ts
```

This creates the demo users documented in the root `README.md`. **Change those
passwords (or skip seeding) for any internet-facing deployment.**

---

## Notes & troubleshooting

- **Schema migrations.** The API service runs `prisma migrate deploy` on boot
  to apply the committed migrations in
  `packages/db/prisma/migrations`. This lives in the API `start` script
  (`pnpm run db:migrate && tsx src/server.ts`), so the schema is created/updated
  on every boot regardless of whether the platform runs the `railway.json`
  `startCommand` or falls back to `pnpm start`. `migrate deploy` only applies
  pending migrations and never resets data. To evolve the schema, edit
  `schema.prisma` and create a new migration locally with
  `pnpm --filter @sahelwaga/db run migrate` (`prisma migrate dev`), then commit
  the generated migration folder.
- **Failed migrations (P3009).** `db:migrate` runs through
  `packages/db/scripts/migrate-deploy.ts`, a thin wrapper around
  `prisma migrate deploy`. If a previous deploy was interrupted (dropped DB
  connection, statement timeout, container killed mid-migration) Prisma records
  the migration as *failed* and every later boot aborts with
  `Error: P3009 — migrate found failed migrations`. Because our migrations are
  pure DDL that Postgres runs in a single transaction, an interrupted migration
  is fully rolled back (`applied_steps_count = 0`) and leaves no schema behind,
  so the wrapper marks it rolled-back (`prisma migrate resolve --rolled-back`)
  and retries the deploy automatically — the service self-heals on the next
  boot. If a failed migration applied one or more steps, the wrapper does **not**
  guess: it logs the migration name and exits so an operator can resolve it
  manually following <https://pris.ly/d/migrate-resolve>.
- **Health checks.** `api` is gated on `/health/ready` (verifies DB
  connectivity); `web` on `/en`.
- **Cross-site cookies.** Because the API and web run on different Railway
  subdomains, auth cookies must be `SameSite=none; Secure` — hence
  `AUTH_COOKIE_SAMESITE=none`, `AUTH_COOKIE_SECURE=true`, and `TRUST_PROXY=1`.
- **Redis / S3 / SMTP.** Not required to boot. Add managed equivalents and the
  matching env vars (`REDIS_URL`, `S3_*`, `SMTP_*`) when you wire up those
  features.
- **Build commands.** Each service's `railway.json` defines the Nixpacks
  `buildCommand` (Prisma client generation + workspace builds). Nixpacks runs
  `pnpm install` automatically beforehand.
