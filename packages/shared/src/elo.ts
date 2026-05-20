// ─── ELO Rating System ────────────────────────────────────────────────────────

const K_FACTOR_NEW = 40;    // < 30 games
const K_FACTOR_MID = 20;    // 30–100 games
const K_FACTOR_STABLE = 10; // 100+ games

function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return K_FACTOR_NEW;
  if (gamesPlayed < 100) return K_FACTOR_MID;
  return K_FACTOR_STABLE;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface EloResult {
  playerA: { before: number; after: number; delta: number };
  playerB: { before: number; after: number; delta: number };
}

/**
 * Calculate new ELO ratings after a game.
 * @param ratingA - Current rating of player A
 * @param ratingB - Current rating of player B
 * @param outcome - 1 = A wins, 0 = B wins, 0.5 = draw
 * @param gamesA - Total games played by A
 * @param gamesB - Total games played by B
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  outcome: 1 | 0 | 0.5,
  gamesA: number = 0,
  gamesB: number = 0
): EloResult {
  const ea = expectedScore(ratingA, ratingB);
  const eb = expectedScore(ratingB, ratingA);

  const ka = kFactor(gamesA);
  const kb = kFactor(gamesB);

  const sa = outcome;           // A's score
  const sb = 1 - outcome;      // B's score (adjusted for draw)

  const newA = Math.round(ratingA + ka * (sa - ea));
  const newB = Math.round(ratingB + kb * (sb - eb));

  return {
    playerA: { before: ratingA, after: newA, delta: newA - ratingA },
    playerB: { before: ratingB, after: newB, delta: newB - ratingB },
  };
}

/**
 * Get the display rank label for a given ELO rating.
 */
export function getRankLabel(rating: number): { label: string; color: string } {
  if (rating < 800)  return { label: 'Novice',       color: '#9ca3af' };
  if (rating < 1000) return { label: 'Apprentice',   color: '#6ee7b7' };
  if (rating < 1200) return { label: 'Competitor',   color: '#60a5fa' };
  if (rating < 1400) return { label: 'Expert',       color: '#a78bfa' };
  if (rating < 1600) return { label: 'Master',       color: '#f59e0b' };
  if (rating < 1800) return { label: 'Grandmaster',  color: '#f97316' };
  return                      { label: 'Legend',      color: '#ef4444' };
}
