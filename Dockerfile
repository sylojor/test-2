# ============================================
# Dockerfile — BlivoAI Production
# Multi-stage build, non-root runtime, tini PID 1
# ============================================

FROM node:20-slim AS base

# --- Install stage ---
FROM base AS deps
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- Build stage ---
FROM base AS builder
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# --- Production runtime ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl tini wget && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Copy standalone build output (includes traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy full node_modules from builder for Prisma CLI + app runtime deps
# (standalone output only traces ~13 packages; app needs bcryptjs, jsonwebtoken, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema + migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown nextjs:nodejs ./docker-entrypoint.sh

# Storage directories
RUN mkdir -p /app/data /app/data/uploads /app/data/branding /app/uploads && \
    chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/ || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["./docker-entrypoint.sh"]
