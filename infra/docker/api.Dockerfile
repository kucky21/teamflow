# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# TeamFlow API – vícefázový build (build → produkční závislosti → runtime)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
WORKDIR /app
# OpenSSL potřebuje Prisma schema engine (migrace), certifikáty pro TLS spojení.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Manifesty všech workspaců – npm ci ověřuje lockfile proti celému monorepu.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# --- build ------------------------------------------------------------------
FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm \
  npm ci --include-workspace-root -w @teamflow/shared -w @teamflow/api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @teamflow/shared && npm run build -w @teamflow/api

# --- produkční závislosti -----------------------------------------------------
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev -w @teamflow/shared -w @teamflow/api

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --chmod=755 infra/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

USER node
WORKDIR /app/apps/api
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
