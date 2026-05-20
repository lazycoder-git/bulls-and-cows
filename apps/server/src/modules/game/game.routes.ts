import { FastifyInstance } from 'fastify';
import { prisma } from '../../utils/prisma.js';
import { createSoloGame, processGuess, abandonGame, getGameState } from './game.service.js';
import { createRoom, joinRoom, getRoom, startRoomGame } from '../multiplayer/room.service.js';
import { CreateRoomSchema, GuessSchema } from '../../utils/schemas.js';
import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@traffic/shared';

export async function gameRoutes(
  fastify: FastifyInstance,
  opts: { io: Server<ClientToServerEvents, ServerToClientEvents> }
) {
  const { io } = opts;

  fastify.addHook('preHandler', fastify.authenticate);

  // ── Solo game ────────────────────────────────────────────────────────────────
  fastify.post('/solo', async (req, reply) => {
    const state = await createSoloGame(req.user.id);
    return reply.code(201).send({ game: state });
  });

  // ── Get game state ────────────────────────────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const state = await getGameState(id);
    if (!state) return reply.code(404).send({ error: 'Game not found' });

    // Only participants can view
    if (!state.players.find((p) => p.id === req.user.id)) {
      return reply.code(403).send({ error: 'Not a participant' });
    }

    return reply.send({ game: state });
  });

  // ── Make a guess ─────────────────────────────────────────────────────────────
  fastify.post('/guess', async (req, reply) => {
    const body = GuessSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });

    const { gameId, guess } = body.data;

    try {
      const outcome = await processGuess(gameId, req.user.id, guess);
      const { state, move, isGameOver, eloChange } = outcome;

      // Emit to all players via socket
      for (const player of state.players) {
        io.to(`user:${player.id}`).emit('game:state', state);
        io.to(`user:${player.id}`).emit('game:move', move);
      }

      if (isGameOver) {
        const secret = state.secretNumber ?? '';
        for (const player of state.players) {
          io.to(`user:${player.id}`).emit('game:over', {
            winner: state.winner ?? null,
            secretNumber: secret,
            eloChange: eloChange
              ? player.id === state.players[0].id
                ? eloChange.playerA
                : eloChange.playerB
              : undefined,
          });
        }
      }

      return reply.send({ move, isGameOver, eloChange });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── Abandon game ─────────────────────────────────────────────────────────────
  fastify.post('/:id/abandon', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const state = await abandonGame(id, req.user.id);
      for (const player of state.players) {
        io.to(`user:${player.id}`).emit('game:over', {
          winner: state.winner ?? null,
          secretNumber: state.secretNumber ?? '',
        });
      }
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── Create room ───────────────────────────────────────────────────────────────
  fastify.post('/room', async (req, reply) => {
    const body = CreateRoomSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message });

    const user_host_raw = (await prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { id: true, username: true, image: true, rating: true, avatar: true } as any,
    })) as any;
    const user = user_host_raw as any;
    const host: Player = { 
      id: user.id, 
      username: user.username ?? 'Player', 
      avatar: user.avatar ?? user.image ?? undefined, 
      rating: user.rating 
    };
    const room = await createRoom(host, body.data.isRated);

    await prisma.activityLog.create({
      data: { type: 'room_create', userId: user.id, details: `Room ${room.code} created by ${user.username}` },
    });

    return reply.code(201).send({ room });
  });

  // ── Get room info ─────────────────────────────────────────────────────────────
  fastify.get('/room/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const room = await getRoom(code.toUpperCase());
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    const { gameId: _, ...safeRoom } = room;
    return reply.send({ room: safeRoom });
  });

  // ── Join room ─────────────────────────────────────────────────────────────────
  fastify.post('/room/:code/join', async (req, reply) => {
    const { code } = req.params as { code: string };
    const user_join_raw = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { id: true, username: true, image: true, rating: true, avatar: true } as any,
    });
    const user = user_join_raw as any;
    const joiner: Player = { 
      id: user.id, 
      username: user.username ?? 'Player', 
      avatar: user.avatar ?? user.image ?? undefined, 
      rating: user.rating 
    };

    try {
      const { room } = await joinRoom(code.toUpperCase(), joiner);

      // Notify host
      io.to(`user:${room.hostId}`).emit('room:update', room);

      // If full, auto-start
      if (room.players.length >= room.maxPlayers) {
        const state = await startRoomGame(code.toUpperCase(), io);
        for (const p of state.players) {
          io.to(`user:${p.id}`).emit('game:state', state);
        }
        return reply.send({ room, gameId: state.id });
      }

      return reply.send({ room });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });
}
