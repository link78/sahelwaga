# Deploy to a Linux (Ubuntu) server

This guide deploys the portal to a single **Ubuntu** host (22.04 / 24.04 LTS)
running the two Node apps under **systemd**, behind an **nginx** reverse proxy
that terminates TLS:

| Component  | Source                | Notes                                   |
| ---------- | --------------------- | --------------------------------------- |
| `postgres` | PostgreSQL 16         | Managed DB or local `postgresql` package; provides `DATABASE_URL` |
| `api`      | `apps/api`            | Express + Prisma API, systemd service on `127.0.0.1:4000` |
| `web`      | `apps/web`            | Next.js front end, systemd service on `127.0.0.1:3000` |
| `nginx`    | nginx                 | TLS termination + reverse proxy on `:443` |

Both apps are built from the **monorepo root** (they need the pnpm workspace).
The API runs from TypeScript source under `tsx` (no compiled `dist`), and the
web app builds with Next.js [standalone output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
(`output: 'standalone'`) so the production server ships a minimal, self-contained
bundle. This keeps memory low and avoids the out-of-memory restarts that surface
as a **502 Bad Gateway** (no healthy upstream) from nginx.

The API binds to `PORT` (falling back to `API_PORT`, default `4000`) on
`API_HOST` (default `0.0.0.0`); the web `start` script binds to `PORT`
(default `3000`). Both listen on loopback and nginx fronts them.

---

## 1. Provision the host

Install the runtime prerequisites:

```bash
sudo apt-get update
sudo apt-get install -y curl git nginx postgresql

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm 9 (matches packageManager in package.json)
sudo corepack enable
sudo corepack prepare pnpm@9.0.0 --activate
```

Create a dedicated service user and clone the repo:

```bash
sudo useradd --system --create-home --shell /bin/bash sahelwaga
sudo -u sahelwaga git clone https://github.com/link78/sahelwaga.git /home/sahelwaga/app
```

## 2. Create the database

Either point `DATABASE_URL` at a managed Postgres, or create one locally:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER sahelwaga WITH PASSWORD 'change-me';
CREATE DATABASE sahelwaga OWNER sahelwaga;
SQL
```

This yields `DATABASE_URL=******localhost:5432/sahelwaga`.

## 3. Configure environment

Copy the example file and fill in production values:

```bash
cd /home/sahelwaga/app
sudo -u sahelwaga cp .env.example .env
sudo -u sahelwaga $EDITOR .env
```

The apps read a single root `.env`. Minimum production variables:

### API variables

| Variable               | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://sahelwaga:…@localhost:5432/sahelwaga`         |
| `NODE_ENV`             | `production`                                                |
| `JWT_ACCESS_SECRET`    | long random string (≥ 32 chars)                             |
| `JWT_REFRESH_SECRET`   | long random string (≥ 32 chars), different from the above   |
| `CORS_ORIGINS`         | the web public URL, e.g. `https://portal.example.com`       |
| `TRUST_PROXY`          | `1` (nginx terminates TLS in front of the app)              |
| `AUTH_COOKIE_SECURE`   | `true`                                                      |
| `AUTH_COOKIE_SAMESITE` | `lax` (single domain) or `none` (API on a separate domain)  |

> Generate secrets with `openssl rand -hex 32`.

### Web variables

| Variable              | Value                                                         |
| --------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | externally reachable API URL (baked into the browser bundle at build time) |
| `API_INTERNAL_URL`    | API address reachable from the web server, e.g. `http://127.0.0.1:4000` (resolved at runtime) |
| `NODE_ENV`            | `production`                                                  |
| `NEXTAUTH_SECRET`     | long random string (≥ 32 chars)                              |

> `NEXT_PUBLIC_API_URL` is **baked into the browser bundle at build time**, so
> it must be set **before** `pnpm --filter @sahelwaga/web build` runs and only
> matters for the **authenticated** app (dashboard/portal). If you change it,
> rebuild the web app.
>
> The **public marketing endpoints** (`/public/products`, `/public/leads`) are
> served same-origin: the browser calls them on the web domain and the web
> server proxies to the API using `API_INTERNAL_URL` (resolved at **runtime**,
> no rebuild needed). So if the catalog page 404s on `/public/products`, set
> `API_INTERNAL_URL` to an address that reaches the API (e.g.
> `http://127.0.0.1:4000`) and restart the **web** service — you do **not** need
> a separate API domain or a rebuild for the public pages.

## 4. Install dependencies and build

```bash
cd /home/sahelwaga/app
sudo -u sahelwaga pnpm install --frozen-lockfile

# API: generate the Prisma client (the API runs from source under tsx)
sudo -u sahelwaga pnpm --filter @sahelwaga/db exec prisma generate

# Web: produce the standalone bundle (postbuild copies static assets in)
sudo -u sahelwaga pnpm --filter @sahelwaga/web build
```

## 5. Create systemd services

`/etc/systemd/system/sahelwaga-api.service`:

```ini
[Unit]
Description=Sahelwaga API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=sahelwaga
WorkingDirectory=/home/sahelwaga/app
Environment=NODE_ENV=production
Environment=PORT=4000
ExecStart=/usr/bin/pnpm --filter @sahelwaga/api start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/sahelwaga-web.service`:

```ini
[Unit]
Description=Sahelwaga Web
After=network.target sahelwaga-api.service
Wants=sahelwaga-api.service

[Service]
Type=simple
User=sahelwaga
WorkingDirectory=/home/sahelwaga/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/pnpm --filter @sahelwaga/web start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The API `start` script runs `prisma migrate deploy` on boot (`pnpm run
db:migrate && tsx src/server.ts`), so the schema is created/updated every time
the service starts. Enable and start the services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sahelwaga-api sahelwaga-web
sudo systemctl status sahelwaga-api sahelwaga-web
```

> If `pnpm` is not at `/usr/bin/pnpm`, use the path from `which pnpm`.

## 6. Configure nginx

Serve everything on a single domain and proxy to the web app (which in turn
proxies the public API surface). `/etc/nginx/sites-available/sahelwaga`:

```nginx
server {
    listen 80;
    server_name portal.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain TLS (Let's Encrypt upgrades this block to `:443`):

```bash
sudo ln -s /etc/nginx/sites-available/sahelwaga /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d portal.example.com
```

> If you expose the **API** on its own domain (e.g. `api.example.com`) instead
> of proxying it through the web app, add a second `server` block that
> `proxy_pass`es to `http://127.0.0.1:4000`, point `NEXT_PUBLIC_API_URL` and
> `CORS_ORIGINS` accordingly, and set `AUTH_COOKIE_SAMESITE=none` because the
> auth cookies are then cross-site.

## 7. Seed demo data (optional, one-off)

The deploy only syncs the schema. To load the demo accounts/data, run the seed
once against the production database:

```bash
cd /home/sahelwaga/app
sudo -u sahelwaga pnpm --filter @sahelwaga/db exec tsx prisma/seed.ts
```

This creates the demo users documented in the root `README.md`. **Change those
passwords (or skip seeding) for any internet-facing deployment.**

---

## Notes & troubleshooting

- **Schema migrations.** The API service runs `prisma migrate deploy` on boot
  to apply the committed migrations in `packages/db/prisma/migrations`. This
  lives in the API `start` script (`pnpm run db:migrate && tsx src/server.ts`),
  so the schema is created/updated on every restart. `migrate deploy` only
  applies pending migrations and never resets data. To evolve the schema, edit
  `schema.prisma` and create a new migration locally with
  `pnpm --filter @sahelwaga/db run migrate` (`prisma migrate dev`), then commit
  the generated migration folder.
- **Failed migrations (P3009).** `db:migrate` runs through
  `packages/db/scripts/migrate-deploy.ts`, a thin wrapper around
  `prisma migrate deploy`. If a previous deploy was interrupted (dropped DB
  connection, statement timeout, process killed mid-migration) Prisma records
  the migration as *failed* and every later boot aborts with
  `Error: P3009 — migrate found failed migrations`. Because our migrations are
  pure DDL that Postgres runs in a single transaction, an interrupted migration
  is fully rolled back (`applied_steps_count = 0`) and leaves no schema behind,
  so the wrapper marks it rolled-back (`prisma migrate resolve --rolled-back`)
  and retries the deploy automatically — the service self-heals on the next
  restart. If a failed migration applied one or more steps, the wrapper does
  **not** guess: it logs the migration name and exits so an operator can resolve
  it manually following <https://pris.ly/d/migrate-resolve>.
- **`/public/products` 404.** The public marketing endpoints are proxied
  same-origin by the web app to `API_INTERNAL_URL` at runtime. A 404 means the
  web service cannot reach the API: confirm `API_INTERNAL_URL` (e.g.
  `http://127.0.0.1:4000`) and that `sahelwaga-api` is `active (running)`, then
  `sudo systemctl restart sahelwaga-web`.
- **Health checks.** The API exposes `/health/ready` (verifies DB connectivity)
  and `/health/live`; the web app serves `/en`. Point any external monitor at
  these.
- **Logs.** `journalctl -u sahelwaga-api -f` and `journalctl -u sahelwaga-web -f`.
- **Trust proxy.** Because nginx terminates TLS in front of the apps, set
  `TRUST_PROXY=1` so the API honours `X-Forwarded-*` headers and issues secure
  cookies correctly.
- **Redis / S3 / SMTP.** Not required to boot. Add managed equivalents and the
  matching env vars (`REDIS_URL`, `S3_*`, `SMTP_*`) when you wire up those
  features.
