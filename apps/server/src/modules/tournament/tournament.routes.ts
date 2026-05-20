import { FastifyInstance } from 'fastify';
import { TournamentService } from './tournament.service.js';
import { z } from 'zod';

const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(50),
  format: z.enum(['round-robin', 'single-elimination']).optional().default('round-robin'),
});

export async function tournamentRoutes(fastify: FastifyInstance) {
  // ── Create a new tournament (Admin or automated) ──────────────────────────
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = CreateTournamentSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });

    // In a real app, maybe only admins can do this.
    const tournament = await TournamentService.createTournament(body.data.name, body.data.format);
    return reply.code(201).send({ tournament });
  });

  // ── Register for a tournament ─────────────────────────────────────────────
  fastify.post('/:id/register', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    try {
      const participant = await TournamentService.registerParticipant(id, userId);
      return reply.send({ participant });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── Start a tournament ────────────────────────────────────────────────────
  fastify.post('/:id/start', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const result = await TournamentService.startTournament(id);
      return reply.send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── Get tournament state ──────────────────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const state = await TournamentService.getTournamentState(id);
    if (!state) return reply.code(404).send({ error: 'Tournament not found' });
    return reply.send({ tournament: state });
  });

  // ── List tournaments ─────────────────────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const { status } = req.query as { status?: string };
    const tournaments = await (fastify as any).prisma.tournament.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return reply.send({ tournaments });
  });
}
