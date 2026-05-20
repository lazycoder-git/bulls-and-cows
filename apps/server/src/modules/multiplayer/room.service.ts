import { nanoid } from 'nanoid';
import { redis, redisKeys } from '../../config/redis.js';
import { prisma } from '../../utils/prisma.js';
import { generateSecret } from '@traffic/shared';
import { saveGameState, scheduleTurnTimer } from '../game/game.service.js';
import type { Room, GameState, Player } from '@traffic/shared';
import type { Server } from 'socket.io';

// ─── Room service ─────────────────────────────────────────────────────────────

const ROOM_TTL = 3600; // 1 hour

export async function createRoom(host: Player, isRated = false): Promise<Room> {
  const code = nanoid(6).toUpperCase();

  const dbGame = await prisma.game.create({
    data: {
      mode: 'multiplayer',
      status: 'waiting',
      secretNumber: generateSecret(),
      hostId: host.id,
      roomCode: code,
      isRated,
    },
  });

  const room: Room = {
    code,
    hostId: host.id,
    players: [host],
    status: 'open',
    maxPlayers: 2,
    isRated,
    createdAt: Date.now(),
  };

  await redis.setex(redisKeys.room(code), ROOM_TTL, JSON.stringify({ ...room, gameId: dbGame.id }));
  return room;
}

export async function getRoom(code: string): Promise<(Room & { gameId: string }) | null> {
  const raw = await redis.get(redisKeys.room(code));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function joinRoom(code: string, joiner: Player): Promise<{ room: Room; gameId: string }> {
  const data = await getRoom(code);
  if (!data) throw new Error('Room not found');
  if (data.status !== 'open') throw new Error('Room is not open');
  if (data.players.find((p) => p.id === joiner.id)) throw new Error('Already in room');
  if (data.players.length >= data.maxPlayers) throw new Error('Room is full');

  data.players.push(joiner);
  data.status = data.players.length >= data.maxPlayers ? 'full' : 'open';

  await redis.setex(redisKeys.room(code), ROOM_TTL, JSON.stringify(data));
  return { room: data, gameId: data.gameId };
}

export async function startRoomGame(code: string, io: Server): Promise<GameState> {
  const data = await getRoom(code);
  if (!data) throw new Error('Room not found');
  if (data.players.length < 2) throw new Error('Need 2 players to start');

  const [playerA, playerB] = data.players;

  // Update DB game
  await prisma.game.update({
    where: { id: data.gameId },
    data: {
      status: 'active',
      guestId: playerB.id,
      startedAt: new Date(),
    },
  });

  const state: GameState = {
    id: data.gameId,
    mode: 'multiplayer',
    status: 'active',
    players: data.players,
    currentTurn: playerA.id,
    moves: [],
    startedAt: Date.now(),
    roomCode: code,
    isRated: data.isRated,
  } as GameState & { isRated: boolean };

  scheduleTurnTimer(data.gameId, state);
  await saveGameState(state);

  // Update room status
  data.status = 'playing';
  await redis.setex(redisKeys.room(code), ROOM_TTL, JSON.stringify(data));

  return state;
}

export async function deleteRoom(code: string): Promise<void> {
  await redis.del(redisKeys.room(code));
}
