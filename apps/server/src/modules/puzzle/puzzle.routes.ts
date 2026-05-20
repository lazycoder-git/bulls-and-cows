import { FastifyPluginAsync } from 'fastify';
import { PuzzleService } from './puzzle.service.js';
import { prisma } from '../../utils/prisma.js';

export const puzzleRoutes: FastifyPluginAsync = async (server) => {

  // ── Get today's daily puzzle metadata (public) ──────────────────────────────
  server.get('/daily', async (request, reply) => {
    try {
      const puzzle = await PuzzleService.getDailyPuzzle();
      return reply.send({ success: true, puzzle });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve daily puzzle' });
    }
  });

  // ── Submit a daily puzzle solve (auth required) ─────────────────────────────
  server.post('/solve', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { puzzleId, attempts, timeTaken } = request.body as {
        puzzleId: string;
        attempts: number;
        timeTaken: number;
      };
      const userId = (request.user as any).id;

      const result = await PuzzleService.submitSolve(userId, puzzleId, attempts, timeTaken);

      // Update daily streak on the user record
      await updateDailyStreak(userId);

      return reply.send({ success: true, solve: result });
    } catch (error: any) {
      server.log.error(error);
      return reply.status(400).send({ success: false, error: error.message || 'Solve submission failed' });
    }
  });

  // ── Get user's daily puzzle streak (auth required) ──────────────────────────
  server.get('/streak', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyStreak: true, bestStreak: true },
      });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Check if user solved today's puzzle
      const today = new Date().toISOString().split('T')[0];
      const todayPuzzle = await prisma.dailyPuzzle.findUnique({ where: { date: today } });
      let solvedToday = false;
      if (todayPuzzle) {
        const solve = await prisma.puzzleSolve.findUnique({
          where: { userId_puzzleId: { userId, puzzleId: todayPuzzle.id } },
        });
        solvedToday = !!solve;
      }

      return reply.send({
        success: true,
        streak: user.dailyStreak,
        bestStreak: user.bestStreak,
        solvedToday,
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch streak' });
    }
  });
};

// ── Helper: update streak on solve ─────────────────────────────────────────────

async function updateDailyStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if user solved yesterday's puzzle
  const yesterdayPuzzle = await prisma.dailyPuzzle.findUnique({ where: { date: yesterdayStr } });
  let solvedYesterday = false;
  if (yesterdayPuzzle) {
    const solve = await prisma.puzzleSolve.findUnique({
      where: { userId_puzzleId: { userId, puzzleId: yesterdayPuzzle.id } },
    });
    solvedYesterday = !!solve;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyStreak: true, bestStreak: true },
  });
  if (!user) return;

  const newStreak = solvedYesterday ? user.dailyStreak + 1 : 1;
  const newBest = Math.max(newStreak, user.bestStreak);

  await prisma.user.update({
    where: { id: userId },
    data: { dailyStreak: newStreak, bestStreak: newBest },
  });
}
