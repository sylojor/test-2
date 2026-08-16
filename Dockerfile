# ============================================
# Dockerfile — BlivoAI Demo
# Apple-inspired design, PostgreSQL, Next.js standalone
# ============================================

FROM node:20-alpine AS base

# --- Install stage ---
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
COPY prisma ./prisma
RUN npm install

# --- Build stage ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client + build
RUN npx prisma generate && npx next build

# Copy static + public inside standalone
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl git python3 make g++

# Copy standalone build
COPY --from=builder /app/.next/standalone ./

# Copy static and public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma (needed at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
# Copy all other needed runtime modules
COPY --from=builder /app/node_modules ./node_modules

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create storage directories
RUN mkdir -p /app/data /app/data/uploads /app/data/branding /app/uploads

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# PORT can be overridden by env var (e.g. PORT=3001 for demo)

ENTRYPOINT ["./docker-entrypoint.sh"]
