# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# TeamFlow Web – build statických souborů a jejich servírování přes nginx
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
  npm ci --include-workspace-root -w @teamflow/shared -w @teamflow/web
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

# V produkci nastavte na `false` – skryje nápovědu s veřejným demo účtem.
ARG VITE_SHOW_DEMO_HINT=true
ENV VITE_SHOW_DEMO_HINT=${VITE_SHOW_DEMO_HINT}
RUN npm run build -w @teamflow/shared && npm run build -w @teamflow/web

# --- runtime: neprivilegovaný nginx na portu 8080 ------------------------------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/docker/security-headers.inc /etc/nginx/security-headers.inc
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
