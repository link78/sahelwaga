# Deploy to Railway

This guide deploys the portal to [Railway](https://railway.com/) as **three
services in one project**:

| Service    | Source                | Notes                                   |
| ---------- | --------------------- | --------------------------------------- |
| `postgres` | Railway Postgres plugin | Managed database, provides `DATABASE_URL` |
| `api`      | `apps/api/Dockerfile` | Express + Prisma API                    |
| `web`      | `apps/web/Dockerfile` | Next.js front end                       |

Both app images are built from the **monorepo root** (they need the pnpm
workspace). The repo ships per-service config-as-code:

- [`apps/api/railway.json`](../../apps/api/railway.json)
- [`apps/web/railway.json`](../../apps/web/railway.json)

The API binds to the `PORT` Railway injects (falling back to `API_PORT`), and
the web `start` script binds to `PORT` as well — no extra wiring needed.

---

## 1. Create the project and database

1. Create a new Railway project (empty).
2. **+ New → Database → Add PostgreSQL.** Railway exposes a `DATABASE_URL`
   reference variable for it.

## 2. Add the API service

1. **+ New → GitHub Repo →** select this repository.
2. In the service **Settings**:
   - **Root Directory:** `/` (the repo root — the Docker build needs the whole
     workspace).
   - **Config-as-code / Railway config file:** `apps/api/railway.json`
     (this selects the Dockerfile, start command, and `/health/ready`
     health check).
3. Add the environment variables below, then deploy. The container runs
   `prisma db push` on boot to sync the schema to the database.

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
   it must be available to the Docker build. Set it as a service variable and
   also pass it as a Docker **build arg** (Settings → Build → Build Args, or via
   the variable being exposed to the build):

### Web variables

| Variable              | Value                                                |
| --------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | the API public URL, e.g. `https://<api>.up.railway.app` |
| `NODE_ENV`            | `production`                                          |
| `NEXTAUTH_SECRET`     | long random string (≥ 32 chars)                      |

> The web `Dockerfile` declares `ARG NEXT_PUBLIC_API_URL`. Ensure the value is
> present at build time; otherwise the browser will fall back to
> `window.location.hostname:4000` and fail to reach the API.

## 4. Generate public domains

For both `api` and `web`: **Settings → Networking → Generate Domain.** Then go
back and make sure:

- `web` → `NEXT_PUBLIC_API_URL` points at the **api** domain (and redeploy web
  so the new value is baked in).
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

- **Schema sync.** The images run `prisma db push` because the repo has no
  committed migration history. It is additive and never drops data silently. If
  you later adopt Prisma migrations, switch the start command to
  `prisma migrate deploy`.
- **Health checks.** `api` is gated on `/health/ready` (verifies DB
  connectivity); `web` on `/en`.
- **Cross-site cookies.** Because the API and web run on different Railway
  subdomains, auth cookies must be `SameSite=none; Secure` — hence
  `AUTH_COOKIE_SAMESITE=none`, `AUTH_COOKIE_SECURE=true`, and `TRUST_PROXY=1`.
- **Redis / S3 / SMTP.** Not required to boot. Add managed equivalents and the
  matching env vars (`REDIS_URL`, `S3_*`, `SMTP_*`) when you wire up those
  features.
- **Local Docker parity.** Build the same images locally with:
  ```bash
  docker build -f apps/api/Dockerfile -t sahelwaga-api .
  docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 -t sahelwaga-web .
  ```
