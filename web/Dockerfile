# syntax=docker/dockerfile:1.7
# Posture & Maturity Dashboard — production container.
#
# Multi-stage: build with dev tooling, ship a slim runtime.
# Debian-slim (glibc) is deliberate — the native modules we depend on
# (better-sqlite3, sharp, onnxruntime-node) all ship prebuilt glibc binaries.
# Alpine/musl requires recompilation and routinely breaks on upgrades.

# ---------- Stage 1: deps ----------
FROM node:22-bookworm-slim AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user.
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app

# Runtime artifacts only — no dev source, no Python toolchain.
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/lib/db/schema.sql ./lib/db/schema.sql
# PDF fonts. `lib/pdf/fonts.ts` reads these via `process.cwd()+assets/fonts/...`
# at request time (every PDF endpoint calls `ensureFontsRegistered()`).
# Next does NOT bundle them — `@react-pdf/renderer`'s `Font.register({ src })`
# wants real disk paths — so they must be copied to the runtime image
# explicitly. Missing them was the cause of "internal server error" on
# every PDF download in v2.5.0–v2.5.6 Azure deployments. Fixed in v2.5.7.
COPY --from=builder --chown=app:app /app/assets ./assets

# DATA_DIR holds the SQLite file + DATA_DIR/branding/logo.png. Mount a
# persistent volume here so customer data survives container restarts.
RUN mkdir -p /data && chown -R app:app /data
ENV DATA_DIR=/data

USER app
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8787/api/auth/me >/dev/null || exit 1

# Bind 0.0.0.0 inside the container; any reverse proxy (Cloudflare, ACA
# ingress, Nginx) terminates TLS in front.
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "8787"]
