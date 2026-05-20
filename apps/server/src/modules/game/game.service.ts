import { prisma } from '../../utils/prisma.js';
import { redis, redisKeys } from '../../config/redis.js';
import { calculateElo } from '@traffic/shared';
import type { GameState, Move } from '@traffic/shared';
import { GameLogic } from './game.logic.js';
import { evaluateGuess, generateSecret } from '@traffic/shared';

const TURN_TIMEOUT_MS = 30_000; // 30s per turn

// ─── In-Memory pending timers (reset on restart — Redis stores truth) ─────────
const turnTimers = new Map<string, NodeJS.Timeout>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getGameState(gameId: string): Promise<GameState | null> {
  const raw = await redis.get(redisKeys.gameState(gameId));
  if (!raw) return null;
  return JSON.parse(raw) as GameState;
}

export async function saveGameState(state: GameState): Promise<void> {
  await redis.setex(redisKeys.gameState(state.id), 86400, JSON.stringify(state)); // 24h TTL
}

// ─── Create a new solo game ───────────────────────────────────────────────────

export async function createSoloGame(userId: string): Promise<GameState> {
  const secret = generateSecret();

  const dbGame = await prisma.game.create({
    data: {
      mode: 'solo',
      status: 'active',
      secretNumber: secret,
      hostId: userId,
      startedAt: new Date(),
      isRated: false,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true, avatar: true, rating: true },
  });

  const state: GameState = {
    id: dbGame.id,
    mode: 'solo',
    status: 'active',
    players: [{ id: user.id, username: user.username ?? 'Player', avatar: user.avatar ?? undefined, rating: user.rating }],
    moves: [],
    secretNumber: secret, // visible in solo
    startedAt: Date.now(),
  };

  await saveGameState(state);
  return state;
}

// ─── Process a guess ──────────────────────────────────────────────────────────

export interface GuessOutcome {
  state: GameState;
  move: Move;
  isGameOver: boolean;
  eloChange?: { playerA: { before: number; after: number; delta: number }; playerB: { before: number; after: number; delta: number } };
}

export async function processGuess(
  gameId: string,
  playerId: string,
  guess: string
): Promise<GuessOutcome> {
  const state = await getGameState(gameId);
  if (!state) throw new Error('Game not found');
  if (state.status !== 'active') throw new Error('Game is not active');

  // Multiplayer: validate turn
  if (state.mode === 'multiplayer' && state.currentTurn !== playerId) {
    throw new Error('Not your turn');
  }

  const secret = await getSecretForGame(gameId, state);
  const { bulls, cows, isWin } = evaluateGuess(secret, guess);

  const move: Move = {
    playerId,
    guess,
    bulls,
    cows,
    timestamp: Date.now(),
    turnNumber: state.moves.length + 1,
  };

  // Persist move to DB
  const dbMove = await prisma.move.create({
    data: {
      gameId,
      playerId,
      guess,
      bulls,
      cows,
      turnNumber: move.turnNumber,
    },
  });
  move.id = dbMove.id;

  state.moves.push(move);
  state.turnCount = state.moves.length;

  let isGameOver = false;
  let eloChange: GuessOutcome['eloChange'];

  if (isWin) {
    isGameOver = true;
    state.status = 'finished';
    state.winner = playerId;
    state.finishedAt = Date.now();
    state.secretNumber = secret;

    await finishGame(state, eloChange);
    clearTurnTimer(gameId);
  } else if (state.mode === 'multiplayer') {
    // Switch turns
    const otherPlayer = state.players.find((p) => p.id !== playerId);
    if (otherPlayer) state.currentTurn = otherPlayer.id;
    scheduleTurnTimer(gameId, state);
  }

  await saveGameState(state);
  return { state, move, isGameOver, eloChange };
}

// ─── Get the secret number ────────────────────────────────────────────────────

async function getSecretForGame(gameId: string, state: GameState): Promise<string> {
  if (state.secretNumber) return state.secretNumber;
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    select: { secretNumber: true },
  });
  return game.secretNumber;
}

// ─── Finish game & update DB ─────────────────────────────────────────────────

async function finishGame(
  state: GameState,
  eloChange?: GuessOutcome['eloChange']
): Promise<void> {
  const updates: Promise<unknown>[] = [
    prisma.game.update({
      where: { id: state.id },
      data: {
        status: 'finished',
        winnerId: state.winner,
        finishedAt: new Date(),
        turnCount: state.moves.length,
      },
    }),
  ];

  if (state.isRated && state.players.length === 2 && state.winner) {
    const [playerA, playerB] = state.players;
    const outcome = playerA.id === state.winner ? (1 as const) : (0 as const);

    const [dbA, dbB] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: playerA.id }, select: { rating: true, gamesPlayed: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: playerB.id }, select: { rating: true, gamesPlayed: true } }),
    ]);

    const result = calculateElo(dbA.rating, dbB.rating, outcome, dbA.gamesPlayed, dbB.gamesPlayed);
    eloChange = result;

    updates.push(
      prisma.user.update({
        where: { id: playerA.id },
        data: {
          rating: result.playerA.after,
          gamesPlayed: { increment: 1 },
          wins: playerA.id === state.winner ? { increment: 1 } : undefined,
          losses: playerA.id !== state.winner ? { increment: 1 } : undefined,
        },
      }),
      prisma.user.update({
        where: { id: playerB.id },
        data: {
          rating: result.playerB.after,
          gamesPlayed: { increment: 1 },
          wins: playerB.id === state.winner ? { increment: 1 } : undefined,
          losses: playerB.id !== state.winner ? { increment: 1 } : undefined,
        },
      }),
      prisma.ratingHistory.createMany({
        data: [
          { userId: playerA.id, rating: result.playerA.after, delta: result.playerA.delta, gameId: state.id },
          { userId: playerB.id, rating: result.playerB.after, delta: result.playerB.delta, gameId: state.id },
        ],
      })
    );
  } else if (state.players.length >= 1) {
    // Update solo / non-rated games played count
    for (const p of state.players) {
      updates.push(
        prisma.user.update({
          where: { id: p.id },
          data: {
            gamesPlayed: { increment: 1 },
            wins: p.id === state.winner ? { increment: 1 } : undefined,
            losses: p.id !== state.winner && state.winner ? { increment: 1 } : undefined,
          },
        })
      );
    }
  }

  await Promise.all(updates);
}

// ─── Turn timers ──────────────────────────────────────────────────────────────

export function scheduleTurnTimer(gameId: string, state: GameState): void {
  clearTurnTimer(gameId);
  if (!state.currentTurn) return;

  const deadline = Date.now() + TURN_TIMEOUT_MS;
  state.turnDeadline = deadline;

  const timer = setTimeout(async () => {
    try {
      const current = await getGameState(gameId);
      if (!current || current.status !== 'active') return;
      if (current.currentTurn === state.currentTurn) {
        // Player timed out — opponent wins
        const loser = current.currentTurn;
        const winner = current.players.find((p) => p.id !== loser)?.id;
        if (winner) {
          current.status = 'finished';
          current.winner = winner;
          current.finishedAt = Date.now();
          const dbGame = await prisma.game.findUnique({ where: { id: gameId }, select: { secretNumber: true } });
          current.secretNumber = dbGame?.secretNumber ?? '';
          await finishGame(current);
          await saveGameState(current);
          // The socket layer will pick this up via a separate mechanism
        }
      }
    } catch (err) {
      // silently ignore
    }
  }, TURN_TIMEOUT_MS);

  turnTimers.set(gameId, timer);
}

export function clearTurnTimer(gameId: string): void {
  const t = turnTimers.get(gameId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(gameId);
  }
}

// ─── Abandon a game ───────────────────────────────────────────────────────────

export async function abandonGame(gameId: string, byUserId: string): Promise<GameState> {
  const state = await getGameState(gameId);
  if (!state) throw new Error('Game not found');
  if (state.status !== 'active' && state.status !== 'waiting') throw new Error('Game already ended');

  const winner = state.players.find((p) => p.id !== byUserId)?.id;
  state.status = 'finished';
  state.winner = winner;
  state.finishedAt = Date.now();

  const dbGame = await prisma.game.findUnique({ where: { id: gameId }, select: { secretNumber: true } });
  state.secretNumber = dbGame?.secretNumber ?? '';

  await finishGame(state);
  await saveGameState(state);
  clearTurnTimer(gameId);

  return state;
}
