import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { redis, redisKeys } from '../../config/redis.js';
import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@traffic/shared';

// Admin routes — protected by a separate secret header
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'change_me';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req, reply) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== ADMIN_SECRET) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  });

  // ── Stats overview ───────────────────────────────────────────────────────────
  fastify.get('/stats', async (_req, reply) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [
      totalUsers,
      activeToday,
      activeWeek,
      totalGames,
      gamesToday,
      soloGames,
      multiplayerGames,
      puzzlesToday,
      onlineCount,
    ] = await Promise.all([
      (prisma.user as any).count(),
      (prisma.user as any).count({ where: { lastSeen: { gte: todayStart } } }),
      (prisma.user as any).count({ where: { lastSeen: { gte: weekStart } } }),
      prisma.game.count(),
      prisma.game.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.game.count({ where: { mode: 'solo' } }),
      prisma.game.count({ where: { mode: 'multiplayer' } }),
      prisma.puzzleSolve.count({ where: { createdAt: { gte: todayStart }, solved: true } }),
      redis.scard(redisKeys.userOnline()),
    ]);

    const avgDuration = await prisma.game.aggregate({
      _avg: { turnCount: true },
      where: { status: 'finished' },
    });

    return reply.send({
      totalUsers,
      activeUsersToday: activeToday,
      activeUsersThisWeek: activeWeek,
      totalGames,
      gamesPlayedToday: gamesToday,
      activeSessions: onlineCount,
      soloGames,
      multiplayerGames,
      puzzlesSolvedToday: puzzlesToday,
      avgGameDuration: Math.round(avgDuration._avg.turnCount ?? 0),
    });
  });

  // ── Recent activity ──────────────────────────────────────────────────────────
  fastify.get('/activity', async (req, reply) => {
    const { limit = '50' } = req.query as { limit?: string };

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: { user: { select: { username: true } } },
    });

    return reply.send({
      logs: logs.map((l: any) => ({
        id: l.id,
        type: l.type,
        userId: l.userId,
        username: l.user?.username,
        details: l.details,
        timestamp: l.createdAt.getTime(),
      })),
    });
  });

  // ── User management ──────────────────────────────────────────────────────────
  fastify.get('/users', async (req, reply) => {
    const { page = '1', q = '' } = req.query as { page?: string; q?: string };
    const skip = (parseInt(page) - 1) * 20;

    const [users, total] = await Promise.all([
      (prisma.user as any).findMany({
        where: q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take: 20,
        select: {
          id: true,
          username: true,
          email: true,
          rating: true,
          gamesPlayed: true,
          wins: true,
          createdAt: true,
          lastSeen: true,
        },
      }),
      prisma.user.count({ where: q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {} }),
    ]);

    const onlineSet = await redis.smembers(redisKeys.userOnline());
    const onlineIds = new Set(onlineSet);

    return reply.send({
      users: users.map((u: any) => ({
        ...u,
        isOnline: onlineIds.has(u.id),
        joinedAt: u.createdAt.toISOString(),
        lastSeen: u.lastSeen?.toISOString(),
      })),
      total,
      page: parseInt(page),
    });
  });
}
