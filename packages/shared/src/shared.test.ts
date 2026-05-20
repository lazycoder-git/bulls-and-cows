import { describe, test, expect } from 'vitest';
import {
  generateSecret,
  evaluateGuess,
  validateGuess,
  countPossibleSecrets,
  formatResult
} from './game-engine';
import { calculateElo, getRankLabel } from './elo';
import { getAllValidSecrets, filterCandidates, getAIGuess, AISolver } from './ai-solver';
import { getDailySecret, getDailyPuzzleId, getOneshotSecret, generatePuzzleClues } from './puzzle-engine';
import { validateUsername, validatePassword } from './validation';


describe('Game Engine', () => {
  test('generateSecret returns a valid 4-digit secret with unique digits and first non-zero', () => {
    for (let i = 0; i < 50; i++) {
      const secret = generateSecret();
      expect(secret).toMatch(/^[1-9]\d{3}$/);
      const digits = secret.split('');
      expect(new Set(digits).size).toBe(4);
    }
  });

  test('evaluateGuess calculates bulls and cows correctly', () => {
    // Secret: 1234
    // Guess: 1234 -> 4 Bulls, 0 Cows
    expect(evaluateGuess('1234', '1234')).toEqual({ bulls: 4, cows: 0, isWin: true });
    
    // Guess: 4321 -> 0 Bulls, 4 Cows
    expect(evaluateGuess('1234', '4321')).toEqual({ bulls: 0, cows: 4, isWin: false });

    // Guess: 1324 -> 2 Bulls (1, 4), 2 Cows (3, 2)
    expect(evaluateGuess('1234', '1324')).toEqual({ bulls: 2, cows: 2, isWin: false });

    // Guess: 5678 -> 0 Bulls, 0 Cows
    expect(evaluateGuess('1234', '5678')).toEqual({ bulls: 0, cows: 0, isWin: false });
  });

  test('validateGuess validates correctly', () => {
    expect(validateGuess('1234')).toEqual({ valid: true });
    expect(validateGuess('123')).toEqual({ valid: false, error: 'Guess must be exactly 4 digits.' });
    expect(validateGuess('12345')).toEqual({ valid: false, error: 'Guess must be exactly 4 digits.' });
    expect(validateGuess('1224')).toEqual({ valid: false, error: 'All 4 digits must be unique.' });
    expect(validateGuess('abcd')).toEqual({ valid: false, error: 'Guess must be exactly 4 digits.' });
  });

  test('formatResult displays results correctly', () => {
    expect(formatResult(4, 0)).toBe('🎉 Perfect! 4 Bulls!');
    expect(formatResult(1, 2)).toBe('1 Bull, 2 Cows');
    expect(formatResult(0, 1)).toBe('0 Bulls, 1 Cow');
  });
});

describe('ELO System', () => {
  test('calculateElo updates rating correctly for new player', () => {
    const result = calculateElo(1200, 1200, 1, 0, 0); // A wins, both new (K=40)
    expect(result.playerA.after).toBeGreaterThan(1200);
    expect(result.playerB.after).toBeLessThan(1200);
    expect(result.playerA.delta).toBe(result.playerA.after - 1200);
    expect(result.playerB.delta).toBe(result.playerB.after - 1200);
  });

  test('calculateElo uses different K factor for experienced player', () => {
    const resultNew = calculateElo(1200, 1200, 1, 10, 10);
    const resultExperienced = calculateElo(1200, 1200, 1, 150, 150);
    expect(Math.abs(resultNew.playerA.delta)).toBeGreaterThan(Math.abs(resultExperienced.playerA.delta));
  });

  test('getRankLabel returns appropriate ranks', () => {
    expect(getRankLabel(700).label).toBe('Novice');
    expect(getRankLabel(900).label).toBe('Apprentice');
    expect(getRankLabel(1100).label).toBe('Competitor');
    expect(getRankLabel(1300).label).toBe('Expert');
    expect(getRankLabel(1500).label).toBe('Master');
    expect(getRankLabel(1700).label).toBe('Grandmaster');
    expect(getRankLabel(1900).label).toBe('Legend');
  });
});

describe('AI Solver', () => {
  test('getAllValidSecrets returns exactly 4536 secrets', () => {
    const secrets = getAllValidSecrets();
    expect(secrets.length).toBe(4536);
  });

  test('filterCandidates filters consistent candidate secrets', () => {
    const candidates = ['1234', '4321', '5678', '9012'];
    const result = filterCandidates(candidates, '1234', 0, 4);
    expect(result).toEqual(['4321']);
  });

  test('AISolver solves secret in reasonable attempts', () => {
    const solver = new AISolver();
    const secret = '4321';
    let attempts = 0;
    let guess = '';
    
    while (guess !== secret && attempts < 10) {
      guess = solver.nextGuess();
      attempts++;
      const result = evaluateGuess(secret, guess);
      solver.recordResult(guess, result.bulls, result.cows);
    }
    
    expect(guess).toBe(secret);
    expect(attempts).toBeLessThanOrEqual(8); // Usually takes 5-7 turns
  });
});

describe('Puzzle Engine', () => {
  test('getDailySecret is deterministic for the same date', () => {
    const secret1 = getDailySecret('2026-05-19');
    const secret2 = getDailySecret('2026-05-19');
    expect(secret1).toBe(secret2);

    const secret3 = getDailySecret('2026-05-20');
    expect(secret1).not.toBe(secret3);
  });

  test('getDailyPuzzleId format is correct', () => {
    expect(getDailyPuzzleId('2026-05-19')).toBe('daily-2026-05-19');
  });

  test('getOneshotSecret returns unique puzzle based on seen count', () => {
    const secret1 = getOneshotSecret(0);
    const secret2 = getOneshotSecret(1);
    expect(secret1).not.toBe(secret2);
  });

  test('generatePuzzleClues returns specified count of clues without solving', () => {
    const secret = '1234';
    const clues = generatePuzzleClues(secret, 5);
    expect(clues.length).toBe(5);
    for (const clue of clues) {
      expect(clue.guess).not.toBe(secret);
      expect(clue.bulls).toBeLessThan(4);
    }
  });
});

describe('Validation Utilities', () => {
  describe('Username Validation', () => {
    test('accepts valid usernames', () => {
      const result = validateUsername('bhuvan07');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    test('rejects starts with number', () => {
      const result = validateUsername('12bhuvan');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Username must start with a letter.');
    });

    test('rejects invalid characters', () => {
      const result = validateUsername('bhuvan!!!!');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Only letters, numbers, and underscore (_) are allowed.');
    });

    test('rejects too short username', () => {
      const result = validateUsername('bh');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Username must be at least 3 characters.');
    });

    test('rejects reserved words', () => {
      const result = validateUsername('admin_support');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('This username contains restricted words.');
    });

    test('rejects offensive words', () => {
      const result = validateUsername('bhuvan_shit');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('This username contains offensive or suspicious content.');
    });
  });

  describe('Password Validation', () => {
    test('rejects too short password', () => {
      const result = validatePassword('abc');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters.');
    });

    test('rejects common/weak password', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is too common or weak.');
    });

    test('rejects password without numbers', () => {
      const result = validatePassword('onlyletters');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must contain at least one number.');
    });

    test('rejects password without letters', () => {
      const result = validatePassword('12345678');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must contain at least one letter.');
    });

    test('accepts strong password and calculates strength', () => {
      const result = validatePassword('SecurePass2026!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.message).toBeUndefined();
    });

    test('accepts moderate password and calculates strength', () => {
      const result = validatePassword('moderatepass123');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('moderate');
    });
  });
});


