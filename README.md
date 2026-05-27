# Sahel Pharma Group Portal

B2B platform for **Sahel Pharma Group** — connects WHO-GMP certified Indian
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

---

## Build plan status

The full plan is six phases. Phases 0–1 are complete; Phase 2 covers the order
lifecycle and stock side-effects.

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
- [ ] **Phase 3 — Public site** (marketing pages incl. catalog, lead capture, FR/EN i18n)
- [ ] **Phase 4 — Compliance & automation** (expiry-scan worker, audit log UI, PDFs)
- [ ] **Phase 5 — External portals** (Supplier / Client)
- [ ] **Phase 6 — Hardening** (Playwright E2E, observability, runbooks)

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

## License

Proprietary — Sahel Pharma Group.
