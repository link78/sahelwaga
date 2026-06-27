# MedSupply Import & Distribution LLC Portal

B2B platform for **MedSupply Import & Distribution LLC** — connects WHO-GMP certified Indian
manufacturers with clinics, pharmacies and NGOs across Burkina Faso and the
broader Sahel region. Covers suppliers, products, purchase orders, imports,
clients, sales orders, stock, and a compliance-grade document library.

This repository implements the [build plan](#build-plan-status) outlined in
the project spec.

---

## Stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Monorepo    | pnpm workspaces                                       |
| Web         | Next.js 14 (App Router) + TypeScript + Tailwind       |
| API         | Node.js + Express + TypeScript                        |
| ORM / DB    | Prisma + PostgreSQL                                   |
| Validation  | Zod (shared schemas in `packages/shared`)             |
| Auth        | JWT (access + refresh)                                |
| Storage     | S3-compatible (MinIO in dev) — *wired in Phase 1*    |
| Jobs        | BullMQ + Redis — *wired in Phase 4*                  |
| Email       | SMTP / Mailhog in dev                                 |
| Logging     | pino                                                  |
| CI          | GitHub Actions (lint, typecheck, prisma validate)     |

---

## Repository layout

```
.
├── apps/
│   ├── api/                # Express + Prisma + JWT API
│   └── web/                # Next.js (marketing + dashboard)
├── packages/
│   ├── db/                 # Prisma schema, migrations, seed
│   └── shared/             # Zod schemas, RBAC matrix, types
├── docker-compose.yml      # Postgres + Redis + MinIO + Mailhog
├── .github/workflows/ci.yml
└── .env.example
```

---

## Local setup

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
# 1. Install deps
pnpm install

# 2. Copy env template
cp .env.example .env
# Edit .env if needed; defaults work with the docker-compose stack below.

# 3. Start Postgres / Redis / MinIO / Mailhog
pnpm docker:up

# 4. Generate Prisma client + run migrations + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run API and web in parallel
pnpm dev
```

- Web:        http://localhost:3000
- API:        http://localhost:4000
- Mailhog UI: http://localhost:8025
- MinIO UI:   http://localhost:9001 (minioadmin / minioadmin)

Demo credentials (after `db:seed`):

- **Admin** — `admin@sahelpharma.local` / `admin123!`
- **Ops (BF, FR)** — `ops@sahelpharma.local` / `ops123!`
- **Supplier portal** — `supplier@mumbai-pharma.local` / `portal123!`
- **Client portal** — `client@saint-camille.local` / `portal123!`

---

## Build plan status

The full plan spans seven phases (Phase 0–6); all are complete.

- [x] **Phase 0 — Foundations**
  - [x] Monorepo (pnpm workspaces, TS, ESLint/Prettier)
  - [x] Prisma schema covering every entity in the data model
  - [x] docker-compose for Postgres / Redis / MinIO / Mailhog
  - [x] Express API: env validation, logging, error handler, JWT auth, RBAC middleware
  - [x] Next.js: marketing home, login, role-aware dashboard shell
  - [x] CI workflow
- [x] **Phase 1 — Core back office**
  - [x] Suppliers (CRUD + soft-delete, used as the module template)
  - [x] Products (CRUD + soft-delete)
  - [x] Clients (CRUD + soft-delete)
  - [x] Documents (CRUD + polymorphic `DocumentLink` to supplier/product/client/PO/IB/SO)
  - [x] Dashboard KPIs (`/dashboard/stats`: active suppliers/products, open POs/SOs, in-transit shipments, expiring COA/STABILITY, low stock)
- [x] **Phase 2 — Order lifecycle**
  - [x] Purchase Orders (CRUD + status guard via state machine on `PATCH`)
  - [x] Import Batches (CRUD + `POST /:id/receive` → sets `qtyReceived`, creates `IMPORT_RECEIPT` stock movements, cascades parent PO → `RECEIVED`)
  - [x] Sales Orders (CRUD + `POST /:id/confirm` with on-hand availability check, `POST /:id/deliver` creates `SALES_DELIVERY` stock movements)
  - [x] Stock (locations CRUD, movements CRUD, aggregated `/levels` view)
  - [x] Status transitions enforced by shared state machines in `apps/api/src/lib/state-machines.ts`
- [x] **Phase 3 — Public site** (marketing pages incl. catalog, lead capture, FR/EN i18n)
  - [x] `next-intl` middleware + `[locale]` route group for EN/FR
  - [x] Public catalog (`GET /public/products`) driving the marketing `/products` page
  - [x] Lead capture form on `/contact` posting to rate-limited `POST /public/leads`
  - [x] Dashboard Leads inbox (`/dashboard/leads`) with status management
- [x] **Phase 4 — Compliance & automation** (expiry-scan worker, audit log UI, PDFs)
  - [x] `AuditLog` helper, emitted on PO/SO/IB lifecycle events and lead submissions
  - [x] Audit log API + dashboard view (`/dashboard/audit-logs`, ADMIN-only)
  - [x] Document expiry-scan worker (daily + on-demand `POST /compliance/expiry-scan/run`)
  - [x] Compliance dashboard surfacing expiry alerts (`/dashboard/compliance`)
  - [x] PDF generation for purchase orders and sales orders via `pdfkit`
- [x] **Phase 5 — External portals** (Supplier / Client)
  - [x] `/portal/me` API aggregating profile + KPIs for the signed-in portal user
  - [x] Document list & link creation scoped to the portal user's own supplier/client
  - [x] Web `/portal/supplier` (overview, PO list/detail with PDF, documents) and `/portal/client` (overview, SO list/detail with PDF, catalog, documents) with role-gated layout
  - [x] Login redirect: SUPPLIER_PORTAL/CLIENT_PORTAL routed into their portal; `/dashboard` redirects portal users out
  - [x] Seeded demo portal users (`supplier@mumbai-pharma.local`, `client@saint-camille.local`)
- [x] **Phase 6 — Hardening** (Playwright E2E, observability, runbooks)
  - [x] Request-ID middleware (echoes `x-request-id`, threaded into logs + error responses)
  - [x] Health endpoints: `/health`, `/health/live`, `/health/ready`, Prometheus-format `/health/metrics`
  - [x] In-process metrics for HTTP traffic, audit writes and the expiry-scan worker
  - [x] Playwright E2E workspace (`apps/e2e`) covering marketing site (EN/FR), admin login, public catalog, contact form and health endpoints
  - [x] `e2e.yml` GitHub Actions workflow (Postgres service + migrate/seed + API/web boot + Playwright)
  - [x] Operational runbooks under `docs/runbooks/` (incident response, deploy/rollback, backup/restore, expiry-scan, observability, on-call)

Extension points are marked with `Phase N+` comments throughout the code
(e.g. router mount points in `apps/api/src/app.ts`, navigation items in
`apps/web/src/app/dashboard/layout.tsx`).

---

## Data model overview

All entities from the plan are present in `packages/db/prisma/schema.prisma`:

- **Identity** — `User`, `AuditLog`
- **Suppliers** — `Supplier`, `SupplierContact`, `SupplierVetting`,
  `SupplierExportRecord`, `SupplierPriceTier`
- **Products** — `Product`, `ProductSupplier`, `ProductPricing`,
  `ClientPriceList`, `ClientPriceListItem`
- **Documents** — `Document`, `DocumentLink` (polymorphic)
- **Orders & imports** — `PurchaseOrder(Line)`, `ImportBatch(Line)`,
  `SalesOrder(Line)`
- **Clients** — `Client`, `ClientContact`
- **Inventory** — `StockLocation`, `StockMovement` (on-hand is derived)
- **Public** — `Lead`

Monetary fields use `Decimal(14,4)` with a sibling `Currency` enum
(`USD | EUR | XOF | INR`). Soft-delete via `deletedAt` on
`Supplier` / `Product` / `Client`.

---

## RBAC

The capability matrix lives in `packages/shared/src/roles.ts` and is enforced
on the API via the `requireCapability(module, action)` middleware. Roles:
`ADMIN`, `OPS`, `SALES`, `SUPPLIER_PORTAL`, `CLIENT_PORTAL`.

---

## Adding a new module (pattern)

The Suppliers module is the canonical example. To add e.g. Products:

1. Add Zod schemas in `packages/shared/src/schemas/product.ts` and export them.
2. Add an entry to the RBAC matrix in `packages/shared/src/roles.ts`.
3. Create `apps/api/src/modules/products/products.routes.ts` mirroring
   `suppliers.routes.ts` (list / get / create / update / soft-delete).
4. Mount the router in `apps/api/src/app.ts`.
5. Add a Next.js route under `apps/web/src/app/dashboard/products/` and a
   nav entry in `dashboard/layout.tsx`.

---

## Operations

- Operational runbooks live in [`docs/runbooks/`](./docs/runbooks/README.md).
- Deploy to an Ubuntu host (systemd + nginx): see
  [`docs/runbooks/ubuntu.md`](./docs/runbooks/ubuntu.md). The API runs from
  TypeScript source under `tsx`; the web app builds with Next.js standalone
  output and both run as systemd services behind nginx.
- API observability surfaces at `/health`, `/health/live`, `/health/ready`
  and `/health/metrics` (Prometheus text format). Every request gets an
  `x-request-id` header (auto-generated when missing) which is echoed on the
  response and included in structured logs + error payloads.

## End-to-end tests

Playwright smoke tests live in [`apps/e2e`](./apps/e2e/README.md):

```bash
pnpm e2e:install   # one-time: download Chromium
pnpm dev           # in another terminal
pnpm e2e           # run Playwright against localhost:3000 / :4000
```

CI runs the same suite via [`.github/workflows/e2e.yml`](./.github/workflows/e2e.yml).

## License

Proprietary — MedSupply Import & Distribution LLC.
