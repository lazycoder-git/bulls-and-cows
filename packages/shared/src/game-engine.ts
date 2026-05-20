// ─── Cow & Bull Game Engine ────────────────────────────────────────────────────
// Pure TypeScript — zero dependencies, runs on both server and client

/**
 * Generate a random 4-digit number with all unique digits.
 * First digit is never 0.
 */
export function generateSecret(): string {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const result: string[] = [];

  // First digit: 1-9
  const firstIdx = Math.floor(Math.random() * 9) + 1;
  result.push(digits[firstIdx]);
  digits.splice(firstIdx, 1);

  // Remaining 3 digits: any remaining
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * digits.length);
    result.push(digits[idx]);
    digits.splice(idx, 1);
  }

  return result.join('');
}

export interface GuessResult {
  bulls: number;
  cows: number;
  isWin: boolean;
}

/**
 * Evaluate a guess against a secret number.
 * Bulls = correct digit in correct position.
 * Cows  = correct digit in wrong position.
 */
export function evaluateGuess(secret: string, guess: string): GuessResult {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows, isWin: bulls === 4 };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a guess string: 4 digits, all unique, first non-zero (optional strictness).
 */
export function validateGuess(guess: string): ValidationResult {
  if (!/^\d{4}$/.test(guess)) {
    return { valid: false, error: 'Guess must be exactly 4 digits.' };
  }

  const chars = guess.split('');
  if (new Set(chars).size !== 4) {
    return { valid: false, error: 'All 4 digits must be unique.' };
  }

  return { valid: true };
}

/**
 * Calculate the minimum number of guesses needed in best-play scenarios.
 * Used for puzzle scoring and hints.
 */
export function countPossibleSecrets(guesses: Array<{ guess: string; bulls: number; cows: number }>): number {
  let count = 0;

  for (let n = 1023; n <= 9876; n++) {
    const s = String(n);
    const digits = s.split('');
    if (new Set(digits).size !== 4) continue;

    let valid = true;
    for (const { guess, bulls, cows } of guesses) {
      const result = evaluateGuess(s, guess);
      if (result.bulls !== bulls || result.cows !== cows) {
        valid = false;
        break;
      }
    }

    if (valid) count++;
  }

  return count;
}

/**
 * Format bulls/cows into human-readable label.
 */
export function formatResult(bulls: number, cows: number): string {
  const b = bulls === 1 ? '1 Bull' : `${bulls} Bulls`;
  const c = cows === 1 ? '1 Cow' : `${cows} Cows`;
  if (bulls === 4) return '🎉 Perfect! 4 Bulls!';
  return `${b}, ${c}`;
}
