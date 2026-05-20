/**
 * Core Bulls & Cows logic engine.
 * Stateless utility functions for fast, deterministic evaluation.
 */
export class GameLogic {
  /**
   * Generates a random 4 digit string with unique digits.
   */
  static generateSecret(): string {
    const digits: number[] = [];
    while (digits.length < 4) {
      const d = Math.floor(Math.random() * 10);
      if (!digits.includes(d)) {
        digits.push(d);
      }
    }
    return digits.join('');
  }

  /**
   * Validates if a guess is exactly 4 unique digits.
   */
  static isValidGuess(guess: string): boolean {
    if (!/^\d{4}$/.test(guess)) return false;
    const uniqueDigits = new Set(guess.split(''));
    return uniqueDigits.size === 4;
  }

  /**
   * Core Evaluation Engine.
   * Returns { bulls, cows }
   * Bull = correct digit, correct position.
   * Cow = correct digit, wrong position.
   */
  static evaluateGuess(secret: string, guess: string) {
    let bulls = 0;
    let cows = 0;

    for (let i = 0; i < 4; i++) {
        if (guess[i] === secret[i]) {
            bulls++;
        } else if (secret.includes(guess[i])) {
            cows++;
        }
    }

    return { bulls, cows };
  }
}
