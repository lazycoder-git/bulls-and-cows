# ── Stage 1: Prune workspace with Turborepo ───────────────────────────────
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@traffic/server --docker

# ── Stage 2: Install dependencies & build ─────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Generate Prisma client
RUN pnpm --filter @traffic/server exec prisma generate

# Build shared package first, then server
RUN pnpm turbo run build --filter=@traffic/server...

# ── Stage 3: Production runner ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

# Copy only what's needed to run
COPY --from=builder --chown=fastify:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=fastify:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=fastify:nodejs /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

WORKDIR /app/apps/server

USER fastify

EXPOSE 4000

# Run Prisma migrations then start server
CMD ["sh", "-c", "node ../../node_modules/.bin/prisma migrate deploy && node dist/index.js"]
