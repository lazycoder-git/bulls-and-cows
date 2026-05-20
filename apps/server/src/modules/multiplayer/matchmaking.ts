import { redis, redisKeys } from '../../config/redis.js';
import { prisma } from '../../utils/prisma.js';
import { generateSecret } from '@traffic/shared';
import { saveGameState, scheduleTurnTimer } from '../game/game.service.js';
import type { MatchmakingTicket, GameState, Player } from '@traffic/shared';
import type { Server } from 'socket.io';

const QUEUE_RATING_WINDOW = 200; // ±200 ELO initially
const QUEUE_MAX_WAIT_MS = 30_000; // expand window after 30s

// ─── Matchmaking ──────────────────────────────────────────────────────────────

export async function joinQueue(userId: string, rating: number, isRated: boolean): Promise<void> {
  const ticket: MatchmakingTicket = {
    userId,
    rating,
    queuedAt: Date.now(),
    isRated,
  };

  const key = redisKeys.queue(isRated);
  await redis.zadd(key, rating, JSON.stringify(ticket));
}

export async function leaveQueue(userId: string, isRated: boolean): Promise<void> {
  const key = redisKeys.queue(isRated);
  const members = await redis.zrange(key, 0, -1);

  for (const m of members) {
    const ticket: MatchmakingTicket = JSON.parse(m);
    if (ticket.userId === userId) {
      await redis.zrem(key, m);
      break;
    }
  }
}

export async function tryMatch(
  io: Server,
  isRated: boolean
): Promise<{ gameId: string; players: [string, string] } | null> {
  const key = redisKeys.queue(isRated);
  const members = await redis.zrange(key, 0, -1, 'WITHSCORES');

  const tickets: MatchmakingTicket[] = [];
  for (let i = 0; i < members.length; i += 2) {
    tickets.push(JSON.parse(members[i]));
  }

  if (tickets.length < 2) return null;

  // Sort by queue time; find first pair within rating window
  const now = Date.now();
  for (let i = 0; i < tickets.length; i++) {
    for (let j = i + 1; j < tickets.length; j++) {
      const a = tickets[i];
      const b = tickets[j];
      const waited = Math.max(now - a.queuedAt, now - b.queuedAt);
      const window = waited > QUEUE_MAX_WAIT_MS ? Infinity : QUEUE_RATING_WINDOW;

      if (Math.abs(a.rating - b.rating) <= window) {
        // Remove both from queue
        await Promise.all([
          leaveQueue(a.userId, isRated),
          leaveQueue(b.userId, isRated),
        ]);

        // Create game
        const secret = generateSecret();
        const dbGame = await prisma.game.create({
          data: {
            mode: 'multiplayer',
            status: 'active',
            secretNumber: secret,
            hostId: a.userId,
            guestId: b.userId,
            isRated,
            startedAt: new Date(),
          },
        });

        const [userA_raw, userB_raw] = await Promise.all([
          prisma.user.findUniqueOrThrow({
            where: { id: a.userId },
            select: { id: true, username: true, image: true, rating: true, avatar: true } as any,
          }),
          prisma.user.findUniqueOrThrow({
            where: { id: b.userId },
            select: { id: true, username: true, image: true, rating: true, avatar: true } as any,
          }),
        ]);

        const userA = userA_raw as any;
        const userB = userB_raw as any;

        const playerAObj: Player = { 
          id: userA.id, 
          username: userA.username ?? 'Player A', 
          avatar: ((userA as any).avatar || userA.image) ?? undefined, 
          rating: userA.rating 
        };
        const playerBObj: Player = { 
          id: userB.id, 
          username: userB.username ?? 'Player B', 
          avatar: ((userB as any).avatar || userB.image) ?? undefined, 
          rating: userB.rating 
        };

        const state: GameState = {
          id: dbGame.id,
          mode: 'multiplayer',
          status: 'active',
          players: [playerAObj, playerBObj],
          currentTurn: playerAObj.id,
          moves: [],
          startedAt: Date.now(),
        };

        scheduleTurnTimer(dbGame.id, state);
        await saveGameState(state);

        return { gameId: dbGame.id, players: [a.userId, b.userId] };
      }
    }
  }

  return null;
}
