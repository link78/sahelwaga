# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# API service image (Express + Prisma).
#
# Build context MUST be the monorepo root so the pnpm workspace (packages/db,
# packages/shared) is available. On Railway set the service "Root Directory"
# to the repository root and the Dockerfile path to `apps/api/Dockerfile`.
# ---------------------------------------------------------------------------
FROM node:20-slim

# Prisma's query engine needs OpenSSL at build- and run-time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the whole workspace (the .dockerignore keeps node_modules/build output out)
COPY . .

# Install all workspace dependencies (lockfile may lag; CI uses the same flag).
RUN pnpm install --frozen-lockfile=false

# Generate the Prisma client and compile the shared package (consumed as JS).
# The API itself is run with `tsx` (see CMD) because the workspace ships
# `@sahelwaga/db` as TypeScript source, matching the dev runtime.
RUN pnpm --filter @sahelwaga/db exec prisma generate \
  && pnpm --filter @sahelwaga/shared build

ENV NODE_ENV=production
# Railway injects PORT; the API honours it (falling back to API_PORT/4000).
EXPOSE 4000

# Sync the schema to the database, then start the API. `prisma db push` is used
# because the project tracks the schema (no committed migration history); it is
# additive and will not drop data unless the schema removes columns.
CMD ["sh", "-c", "pnpm --filter @sahelwaga/db exec prisma db push --skip-generate && pnpm --filter @sahelwaga/api exec tsx src/server.ts"]
