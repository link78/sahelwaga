# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Web service image (Next.js 14).
#
# Build context MUST be the monorepo root so the pnpm workspace
# (packages/shared) is available. On Railway set the service "Root Directory"
# to the repository root and the Dockerfile path to `apps/web/Dockerfile`.
# ---------------------------------------------------------------------------
FROM node:20-slim

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the whole workspace (the .dockerignore keeps node_modules/build output out)
COPY . .

RUN pnpm install --frozen-lockfile=false

# `NEXT_PUBLIC_API_URL` is inlined into the browser bundle at build time, so it
# must be present during `next build`. Railway exposes service variables to the
# build; pass it through as a build arg (e.g. https://<api-service>.up.railway.app).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter @sahelwaga/shared build \
  && pnpm --filter @sahelwaga/web build

ENV NODE_ENV=production
# Railway injects PORT; the start script binds to it (falling back to 3000).
EXPOSE 3000

CMD ["pnpm", "--filter", "@sahelwaga/web", "start"]
