import { FastifyPluginAsync } from 'fastify';
import { LeaderboardService } from './leaderboard.service.js';
import { prisma } from '../../utils/prisma.js';
import { getRankLabel } from '@traffic/shared';

const LEADERBOARD_KEY = 'bnc:leaderboard:global';

export const leaderboardRoutes: FastifyPluginAsync = async (server) => {
  // ── Get Global Rankings (public) ────────────────────────────────────────────
  server.get('/', async (request, reply) => {
    try {
      const topPlayers = await LeaderboardService.getTopPlayers(50);
      return reply.send({ success: true, leaderboard: topPlayers });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch leaderboard' });
    }
  });

  // ── Get current user's rank (auth required) ─────────────────────────────────
  server.get('/me', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      // Fetch user rating from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, rating: true, wins: true, losses: true, gamesPlayed: true },
      });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Get rank position from Redis sorted set
      const { redis } = await import('../../config/redis.js');
      const rankPos = await (redis as any).zrevrank(LEADERBOARD_KEY, userId);
      const totalPlayers = await (redis as any).zcard(LEADERBOARD_KEY);

      const rank = rankPos !== null ? rankPos + 1 : null; // 1-indexed
      const rankLabel = getRankLabel(user.rating);
      const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

      return reply.send({
        success: true,
        me: {
          userId: user.id,
          username: user.username ?? 'Player',
          rating: user.rating,
          rank,
          totalPlayers,
          wins: user.wins,
          losses: user.losses,
          winRate,
          rankLabel: rankLabel.label,
          rankColor: rankLabel.color,
        },
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch your rank' });
    }
  });

  // ── Admin: force full sync from Postgres → Redis ────────────────────────────
  server.post('/sync', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      await LeaderboardService.fullSyncFromDatabase();
      return reply.send({ success: true, message: 'Leaderboard successfully synchronized with database.' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ success: false, error: 'Database sync failed.' });
    }
  });
};
