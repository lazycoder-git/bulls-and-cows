/**
 * BnC AI Solver — Knuth-inspired minimax Bulls & Cows solver
 * Maintains a shrinking candidates pool; picks the guess that
 * eliminates the most possibilities in the worst case.
 */

import { evaluateGuess } from './game-engine';


/** Build the complete pool of valid secrets once */
export function getAllValidSecrets(): string[] {
  const pool: string[] = [];
  for (let n = 1023; n <= 9876; n++) {
    const s = String(n);
    if (new Set(s).size === 4) pool.push(s);
  }
  return pool; // 4536 entries
}

/** Filter candidates consistent with a guess result */
export function filterCandidates(
  candidates: string[],
  guess: string,
  bulls: number,
  cows: number,
): string[] {
  return candidates.filter((c) => {
    const r = evaluateGuess(c, guess);
    return r.bulls === bulls && r.cows === cows;
  });
}

export interface AIGuessResult {
  guess: string;
  candidatesRemaining: number;
}

/**
 * Pick the best AI guess from the remaining candidate pool.
 * Strategy: if ≤2 candidates remain, guess directly.
 * Otherwise, use a minimax-lite: pick the guess whose worst-case
 * partition is smallest (from a sample to stay fast in-browser).
 */
export function getAIGuess(
  candidates: string[],
  usedGuesses: string[],
): AIGuessResult {
  if (candidates.length === 0) {
    return { guess: '1234', candidatesRemaining: 0 };
  }

  // First guess: always start with '1235' (optimal opening)
  if (usedGuesses.length === 0) {
    return { guess: '1235', candidatesRemaining: candidates.length };
  }

  // If very few candidates remain, just pick the first
  if (candidates.length <= 2) {
    return { guess: candidates[0], candidatesRemaining: candidates.length };
  }

  // Minimax: evaluate top N candidates for speed
  const evalSet = candidates.length <= 20
    ? candidates
    : candidates.slice(0, 20);

  let bestGuess = candidates[0];
  let bestWorstCase = Infinity;

  for (const guess of evalSet) {
    if (usedGuesses.includes(guess)) continue;

    // Score by worst-case partition size
    const partitions = new Map<string, number>();
    for (const c of candidates) {
      const r = evaluateGuess(c, guess);
      const key = `${r.bulls}${r.cows}`;
      partitions.set(key, (partitions.get(key) ?? 0) + 1);
    }
    const worstCase = Math.max(...partitions.values());
    if (worstCase < bestWorstCase) {
      bestWorstCase = worstCase;
      bestGuess = guess;
    }
  }

  return { guess: bestGuess, candidatesRemaining: candidates.length };
}

/** Full AI turn: returns the guess and updated candidate pool */
export class AISolver {
  private candidates: string[];
  private history: string[] = [];

  constructor() {
    this.candidates = getAllValidSecrets();
  }

  get remainingCount() { return this.candidates.length; }

  nextGuess(): string {
    const { guess } = getAIGuess(this.candidates, this.history);
    this.history.push(guess);
    return guess;
  }

  recordResult(guess: string, bulls: number, cows: number) {
    this.candidates = filterCandidates(this.candidates, guess, bulls, cows);
  }

  reset() {
    this.candidates = getAllValidSecrets();
    this.history = [];
  }
}
