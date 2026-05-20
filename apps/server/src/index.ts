import 'dotenv/config';

if (process.env.VITEST) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret12345678901234567890';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@traffic/shared';

import { logger } from './utils/logger.js';
import { redis } from './config/redis.js';
import { prisma } from './utils/prisma.js';
import { authenticate } from './plugins/auth.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { gameRoutes } from './modules/game/game.routes.js';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes.js';
import { puzzleRoutes } from './modules/puzzle/puzzle.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { tournamentRoutes } from './modules/tournament/tournament.routes.js';
import { setupSocketGateway } from './modules/multiplayer/socket.js';

// ── Validate critical environment variables at startup ─────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[startup] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET === 'supersecretkey12345678901234567890') {
  console.warn('[startup] WARNING: Using default JWT_SECRET. Change this before going to production!');
}

const PORT         = parseInt(process.env.PORT ?? '4000');
const HOST         = process.env.HOST ?? '0.0.0.0';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const IS_PROD      = process.env.NODE_ENV === 'production';

// Only allow explicitly listed origins — never a wildcard in prod
const ALLOWED_ORIGINS = IS_PROD
  ? [FRONTEND_URL]
  : [FRONTEND_URL, 'http://localhost:3000'];

export async function bootstrap() {
  // ── Fastify instance ────────────────────────────────────────────────────────
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
    // Hard limit on incoming request body size (10 KB is generous for our API)
    bodyLimit: 10 * 1024,  // 10 KB
    // Connection timeout
    connectionTimeout: 30_000,
    // Keep-alive timeout
    keepAliveTimeout: 5_000,
  });

  fastify.decorate('authenticate', authenticate);

  // ── Security headers (helmet) ────────────────────────────────────────────────
  await fastify.register(helmet, {
    // Allow WebSocket upgrade
    contentSecurityPolicy: false, // CSP managed by Next.js frontend
    crossOriginEmbedderPolicy: false,
    hsts: IS_PROD ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  });

  // ── CORS — strict origin whitelist ─────────────────────────────────────────
  await fastify.register(cors, {
    origin(origin, cb) {
      // Allow requests with no Origin header (server-to-server, curl health checks)
      if (!origin) { cb(null, true); return; }
      if (ALLOWED_ORIGINS.includes(origin)) { cb(null, true); return; }
      cb(new Error(`CORS: Origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 86400, // preflight cache 24h
  });

  // ── JWT ─────────────────────────────────────────────────────────────────────
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
  });

  // ── Global rate limit — 100 req/min per IP ──────────────────────────────────
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: redis as any,
    keyGenerator(req) {
      // Use the real IP even behind a proxy
      return req.ip ?? req.headers['x-forwarded-for']?.toString().split(',')[0] ?? 'unknown';
    },
    errorResponseBuilder(req, context) {
      return {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${context.after}.`,
        retryAfter: context.after,
      };
    },
  });

  // ── Request ID header ──────────────────────────────────────────────────────
  fastify.addHook('onRequest', (req, reply, done) => {
    const requestId = req.headers['x-request-id'] ?? crypto.randomUUID();
    reply.header('X-Request-ID', requestId);
    done();
  });

  // ── Strip leaking server info ──────────────────────────────────────────────
  fastify.addHook('onSend', (_req, reply, _payload, done) => {
    reply.removeHeader('X-Powered-By');
    reply.removeHeader('Server');
    done();
  });

  // ── Health check (public, no rate limit override needed) ──────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  }));

  // ── Online player count (public) ───────────────────────────────────────────
  fastify.get('/api/online', async () => {
    try {
      const count = await redis.scard('users:online');
      return { count };
    } catch {
      return { count: 0 };
    }
  });

  // ── Routes with per-route rate limits where needed ────────────────────────
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    fastify.server,
    {
      cors: {
        origin: ALLOWED_ORIGINS,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      // Prevent oversized payloads over the socket
      maxHttpBufferSize: 1e5, // 100 KB
      pingTimeout: 20_000,
      pingInterval: 25_000,
    }
  );

  // Auth routes — very tight limit: 10 req/min (blocks brute-force)
  await fastify.register(
    async (f) => {
      await f.register(rateLimit, { max: 10, timeWindow: '1 minute', redis: redis as any });
      await f.register(authRoutes);
    },
    { prefix: '/api/auth' }
  );

  // User routes — moderate: 60 req/min
  await fastify.register(
    async (f) => {
      await f.register(rateLimit, { max: 60, timeWindow: '1 minute', redis: redis as any });
      await f.register(userRoutes as any);
    },
    { prefix: '/api/users' }
  );

  await fastify.register(
    async (f) => gameRoutes(f, { io }),
    { prefix: '/api/games' }
  );

  await fastify.register(leaderboardRoutes, { prefix: '/api/leaderboard' });
  await fastify.register(puzzleRoutes,      { prefix: '/api/puzzle' });
  await fastify.register(adminRoutes,        { prefix: '/api/admin' });
  await fastify.register(tournamentRoutes,   { prefix: '/api/tournaments' });

  setupSocketGateway(fastify, io);

  // ── Global error handler — never leak stack traces ─────────────────────────
  fastify.setErrorHandler((error: any, req, reply) => {
    const statusCode = error.statusCode ?? 500;
    logger.error({ err: error, url: req.url, ip: req.ip }, 'Unhandled error');

    // In prod, hide internal error details
    const message = IS_PROD && statusCode === 500
      ? 'Internal Server Error'
      : error.message ?? 'Internal Server Error';

    reply.code(statusCode).send({ error: message });
  });

  // ── 404 handler ────────────────────────────────────────────────────────────
  fastify.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Not Found' });
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  try {
    if (!process.env.VITEST) {
      await fastify.listen({ port: PORT, host: HOST });
      logger.info({ port: PORT }, '🚀 Server is running');
      logger.info(`📡 WebSocket ready`);
    }
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    await fastify.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  if (!process.env.VITEST) {
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  }

  // Catch unhandled promise rejections (prevents silent crash)
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  return fastify;
}

if (!process.env.VITEST) {
  bootstrap();
}
