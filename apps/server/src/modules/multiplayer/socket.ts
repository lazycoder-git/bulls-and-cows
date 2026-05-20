import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@traffic/shared';
import { prisma } from '../../utils/prisma.js';
import { redis, redisKeys } from '../../config/redis.js';
import { joinQueue, leaveQueue, tryMatch } from './matchmaking.js';
import { processGuess, getGameState, abandonGame } from '../game/game.service.js';
import { joinRoom, getRoom } from './room.service.js';
import { logger } from '../../utils/logger.js';
import jwt from 'jsonwebtoken';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Match-making poll interval
const MM_POLL_MS = 2000;

async function broadcastOnlineCount(io: AppServer, redis: any): Promise<void> {
  try {
    const count = await redis.scard('users:online');
    io.emit('online:count', count);
  } catch {
    // non-fatal
  }
}


export function setupSocketGateway(fastify: any, io: AppServer): void {
  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('No token'));

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        username: string;
        email: string;
      };

      (socket as any).userId = payload.id;
      (socket as any).username = payload.username;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', async (socket: AppSocket) => {
    const userId = (socket as any).userId as string;
    const username = (socket as any).username as string;

    logger.info({ userId, username }, 'Socket connected');

    // Join personal room
    socket.join(`user:${userId}`);

    // Mark online
    await redis.sadd(redisKeys.userOnline(), userId);
    await redis.setex(`socket:${userId}`, 600, socket.id);
    await broadcastOnlineCount(io, redis);


    // ── Queue ────────────────────────────────────────────────────────────────
    socket.on('queue:join', async (isRated: boolean) => {
      try {
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { rating: true },
        });

        await joinQueue(userId, user.rating, isRated);
        logger.info({ userId, isRated }, 'Joined queue');

        // Immediately try a match
        const match = await tryMatch(io, isRated);
        if (match) {
          const { gameId, players } = match;
          const state = await getGameState(gameId);
          if (state) {
            for (const pid of players) {
              const opponent = state.players.find((p: Player) => p.id !== pid)!;
              io.to(`user:${pid}`).emit('match:found', { gameId, opponent });
              io.to(`user:${pid}`).emit('game:state', state);
            }
          }
        }
      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    socket.on('queue:leave', async () => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { rating: true } });
      if (user) {
        await leaveQueue(userId, true);
        await leaveQueue(userId, false);
      }
    });

    // ── Room ─────────────────────────────────────────────────────────────────
    socket.on('room:join', async (code: string) => {
      try {
        const room = await getRoom(code.toUpperCase());
        if (!room) return socket.emit('error', 'Room not found');

        socket.join(`room:${code}`);
        socket.emit('room:update', room);
      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    socket.on('room:leave', async (code: string) => {
      socket.leave(`room:${code}`);
    });

    // ── Guess ─────────────────────────────────────────────────────────────────
    socket.on('game:guess', async ({ gameId, guess }) => {
      try {
        const outcome = await processGuess(gameId, userId, guess);
        const { state, move, isGameOver, eloChange } = outcome;

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
        } else if (state.mode === 'multiplayer' && state.currentTurn && state.turnDeadline) {
          for (const player of state.players) {
            io.to(`user:${player.id}`).emit('game:timer', {
              deadline: state.turnDeadline,
              turnPlayerId: state.currentTurn,
            });
          }
        }
      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info({ userId }, 'Socket disconnected');
      await redis.srem(redisKeys.userOnline(), userId);
      await redis.del(`socket:${userId}`);
      await broadcastOnlineCount(io, redis);


      // Leave queues on disconnect
      await leaveQueue(userId, true);
      await leaveQueue(userId, false);

      // Update lastSeen
      await (prisma.user as any)
        .update({ where: { id: userId }, data: { lastSeen: new Date() } })
        .catch(() => {});
    });
  });

  // ── Matchmaking background poll ────────────────────────────────────────────
  const mmInterval = setInterval(async () => {
    for (const isRated of [true, false]) {
      const match = await tryMatch(io, isRated).catch(() => null);
      if (match) {
        const { gameId, players } = match;
        const state = await getGameState(gameId).catch(() => null);
        if (state) {
          for (const pid of players) {
            const opponent = state.players.find((p) => p.id !== pid)!;
            io.to(`user:${pid}`).emit('match:found', { gameId, opponent });
            io.to(`user:${pid}`).emit('game:state', state);
          }
        }
      }
    }
  }, MM_POLL_MS);

  fastify.addHook('onClose', async () => {
    clearInterval(mmInterval);
    io.close();
  });
}
