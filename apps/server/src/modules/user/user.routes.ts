import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { redis, redisKeys } from '../../config/redis.js';
import { UpdateProfileSchema } from '../../utils/schemas.js';
import { getRankLabel, validateUsername } from '@traffic/shared';

export async function userRoutes(fastify: FastifyInstance) {

  // ── Username availability check (public — no auth) ──────────────────────────
  fastify.get('/check', async (req, reply) => {
    const { username } = req.query as { username?: string };
    if (!username) {
      return reply.code(400).send({ error: 'username query param required' });
    }

    const validation = validateUsername(username);
    if (!validation.isValid) {
      return reply.code(400).send({ error: validation.message });
    }

    const existing = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });

    return reply.send({ available: !existing });
  });


  // ── All routes below require auth ───────────────────────────────────────────
  fastify.addHook('preHandler', fastify.authenticate);

  // ── Get current user ("me") ─────────────────────────────────────────────────
  fastify.get('/me', async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        image: true,
        rating: true,
        gamesPlayed: true,
        wins: true,
        losses: true,
        draws: true,
        dailyStreak: true,
        bestStreak: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    if (!user) return reply.code(404).send({ error: 'User not found' });

    const isOnline = await redis.sismember(redisKeys.userOnline(), user.id);
    const rank = getRankLabel(user.rating);
    const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

    return reply.send({
      user: {
        ...user,
        avatar: user.avatar ?? user.image ?? null,
        winRate,
        rank: rank.label,
        rankColor: rank.color,
        isOnline: !!isOnline,
        joinedAt: user.createdAt.toISOString(),
      },
    });
  });

  // ── Get user profile by ID ──────────────────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        image: true,
        rating: true,
        gamesPlayed: true,
        wins: true,
        losses: true,
        draws: true,
        dailyStreak: true,
        bestStreak: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    if (!user) return reply.code(404).send({ error: 'User not found' });

    const isOnline = await redis.sismember(redisKeys.userOnline(), id);
    const rank = getRankLabel(user.rating);
    const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

    return reply.send({
      user: {
        ...user,
        avatar: user.avatar ?? user.image ?? null,
        winRate,
        rank: rank.label,
        rankColor: rank.color,
        isOnline: !!isOnline,
        joinedAt: user.createdAt.toISOString(),
      },
    });
  });

  // ── Update profile ──────────────────────────────────────────────────────────
  fastify.patch('/me', async (req, reply) => {
    const body = UpdateProfileSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });

    const { avatar, username } = body.data;

    if (username) {
      const taken = await prisma.user.findFirst({
        where: { username, NOT: { id: req.user.id } },
      });
      if (taken) return reply.code(409).send({ error: 'Username already taken' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar, username },
      select: { id: true, username: true, email: true, avatar: true, rating: true },
    });

    return reply.send({ user: updated });
  });

  // ── Rating history ──────────────────────────────────────────────────────────
  fastify.get('/:id/rating-history', async (req, reply) => {
    const { id } = req.params as { id: string };
    const history = await prisma.ratingHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { rating: true, delta: true, gameId: true, createdAt: true },
    });

    return reply.send({ history });
  });

  // ── Game history ────────────────────────────────────────────────────────────
  fastify.get('/:id/games', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: {
          OR: [{ hostId: id }, { guestId: id }],
          status: 'finished',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          mode: true,
          status: true,
          winnerId: true,
          turnCount: true,
          isRated: true,
          createdAt: true,
          finishedAt: true,
          host: { select: { id: true, username: true, rating: true } },
          guest: { select: { id: true, username: true, rating: true } },
        },
      }),
      prisma.game.count({
        where: { OR: [{ hostId: id }, { guestId: id }], status: 'finished' },
      }),
    ]);

    return reply.send({ games, total, page: parseInt(page) });
  });
}
