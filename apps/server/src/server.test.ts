import './setup-test-env.js';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ── Mock Prisma globally ───────────────────────────────────────────────────
vi.mock('@prisma/client', () => {
  const mockUser = {
    findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'mocked-id' }),
    update: vi.fn().mockResolvedValue({ id: 'mocked-id' }),
    findFirst: vi.fn().mockResolvedValue(null),
  };
  const mockGame = {
    create: vi.fn(),
    findUnique: vi.fn(),
  };
  const mockActivityLog = {
    create: vi.fn(),
  };
  class PrismaClientMock {
    user = mockUser;
    game = mockGame;
    activityLog = mockActivityLog;
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { PrismaClient: PrismaClientMock };
});

// ── Mock Redis globally ────────────────────────────────────────────────────
vi.mock('ioredis', () => {
  // Helper to support both Promise and callback styles for Redis mock methods
  const mockRedisMethod = (resolvedValue: any) => {
    return vi.fn().mockImplementation((...args) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        cb(null, resolvedValue);
      }
      return Promise.resolve(resolvedValue);
    });
  };

  class RedisMock {
    status = 'ready';
    get = mockRedisMethod(null);
    setex = mockRedisMethod('OK');
    quit = mockRedisMethod('OK');
    defineCommand = vi.fn();
    rateLimit = mockRedisMethod([0, 1000]); // [currentCount, ttlMs]
    zadd = mockRedisMethod(1);
    zrange = mockRedisMethod([]);
    zrem = mockRedisMethod(1);
    sadd = mockRedisMethod(1);
    srem = mockRedisMethod(1);
    del = mockRedisMethod(1);

    on = vi.fn().mockImplementation(function(this: any, event: string, callback: () => void) {
      if (event === 'ready' || event === 'connect') {
        setTimeout(callback, 0);
      }
      return this;
    });

    once = vi.fn().mockImplementation(function(this: any, event: string, callback: () => void) {
      if (event === 'ready' || event === 'connect') {
        setTimeout(callback, 0);
      }
      return this;
    });
  }
  return { Redis: RedisMock };
});

// Now import bootstrap and the prisma singleton
import { bootstrap } from './index.js';
import { prisma } from './utils/prisma.js';

describe('Fastify Server API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await bootstrap();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('GET /health returns 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });

  test('POST /api/auth/token returns 400 if userId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/token',
      body: {},
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('userId is required');
  });

  test('POST /api/auth/token returns 404 if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/token',
      body: { userId: 'non-existent' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('User not found in system');
  });

  test('POST /api/auth/token returns JWT token if user exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'John Doe',
      username: 'johndoe',
      rating: 1200,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/token',
      body: { userId: 'user-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('token');
  });

  test('POST /api/auth/username returns 401 if unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/username',
      body: { username: 'newname' },
    });

    expect(res.statusCode).toBe(401);
  });
});
