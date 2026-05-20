/**
 * BnC Puzzle Engine
 * - Deterministic daily secret (same for all users on same calendar day)
 * - Non-repeating OneShot pool with index tracking
 * - Seeded with a fast xorshift PRNG for zero-dependency client usage
 */

import { getAllValidSecrets } from './ai-solver';

// ─── Seeded PRNG (xorshift32) ────────────────────────────────────────────────

function xorshift32(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Hash a string to a uint32 (djb2) */
function strHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Fisher-Yates shuffle using a seeded PRNG */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rand = xorshift32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Daily Puzzle ────────────────────────────────────────────────────────────

/**
 * Returns the deterministic secret for a given calendar date.
 * Uses date string as seed — same result for all users on that day.
 * Cycles through the full 4536-entry pool across days without repeating for ~12 years.
 */
export function getDailySecret(dateStr?: string): string {
  const date = dateStr ?? new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const pool = getAllValidSecrets();
  // Use epoch day count so the index advances each day
  const epoch = new Date(date).getTime() / 86_400_000; // days since epoch
  const shuffled = seededShuffle(pool, strHash('bnc-daily-v1'));
  return shuffled[Math.abs(Math.floor(epoch)) % shuffled.length] as string;
}

/** Get the puzzle ID string for a given date (used for tracking) */
export function getDailyPuzzleId(dateStr?: string): string {
  return `daily-${dateStr ?? new Date().toISOString().split('T')[0]}`;
}

// ─── OneShot Puzzle Pool ─────────────────────────────────────────────────────

/** Lazily-generated, seeded ordered pool for OneShot puzzles */
let _oneshotPool: string[] | null = null;

function getOneshotPool(): string[] {
  if (!_oneshotPool) {
    const pool = getAllValidSecrets();
    _oneshotPool = seededShuffle(pool, strHash('bnc-oneshot-v1'));
  }
  return _oneshotPool;
}

/**
 * Get OneShot puzzle at a given index (wraps around full pool).
 * Pass the current "seen count" from localStorage to get the next fresh puzzle.
 */
export function getOneshotSecret(seenCount: number): string {
  const pool = getOneshotPool();
  return pool[seenCount % pool.length] as string;
}

/** Total number of unique OneShot puzzles before cycling */
export const ONESHOT_POOL_SIZE = 4536;

// ─── Clue Generation ────────────────────────────────────────────────────────

import { evaluateGuess } from './game-engine';

export interface PuzzleClue {
  guess: string;
  bulls: number;
  cows: number;
}

/**
 * Generate N diverse clue moves for a given secret.
 * Clues are drawn from a seeded shuffle of the pool to stay deterministic.
 * Ensures clues never accidentally solve the puzzle (no 4-bull clue).
 */
export function generatePuzzleClues(secret: string, count = 5): PuzzleClue[] {
  const pool = getAllValidSecrets().filter((s: string) => s !== secret);
  // Seed the clue shuffle with the secret itself for uniqueness
  const shuffled = seededShuffle(pool, strHash(secret));
  const clues: PuzzleClue[] = [];

  for (const guess of shuffled) {
    if (clues.length >= count) break;
    const { bulls, cows } = evaluateGuess(secret, guess);
    if (bulls === 4) continue; // skip accidental win
    // Prefer clues with some information (not all 0,0)
    if (bulls === 0 && cows === 0 && clues.length < count - 2) continue;
    clues.push({ guess, bulls, cows });
  }

  // Fallback: fill remaining with anything non-zero
  if (clues.length < count) {
    for (const guess of shuffled) {
      if (clues.length >= count) break;
      if (clues.some((c) => c.guess === guess)) continue;
      const { bulls, cows } = evaluateGuess(secret, guess);
      if (bulls < 4) clues.push({ guess, bulls, cows });
    }
  }

  return clues.slice(0, count);
}
