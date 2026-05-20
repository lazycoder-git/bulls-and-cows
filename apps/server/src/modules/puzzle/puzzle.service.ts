import { prisma } from '../../utils/prisma.js';

export class PuzzleService {
  /**
   * Fetches the puzzle for the current UTC date.
   */
  static async getDailyPuzzle() {
    const today = new Date().toISOString().split('T')[0];
    
    let puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: today } });

    if (!puzzle) {
      // Generate a new 4-digit unique puzzle
      const secret = this.generateSecretNumber();
      puzzle = await prisma.dailyPuzzle.create({
        data: {
          date: today,
          secretNumber: secret
        }
      });
    }

    return { puzzleId: puzzle.id, date: puzzle.date };
  }

  /**
   * Verifies a puzzle solve attempt.
   */
  static async submitSolve(userId: string, puzzleId: string, attempts: number, timeTakenSeconds: number) {
    const puzzle = await prisma.dailyPuzzle.findUnique({ where: { id: puzzleId } });
    if (!puzzle) throw new Error("Puzzle not found");

    // Has user already solved it?
    const existing = await prisma.puzzleSolve.findUnique({
      where: { userId_puzzleId: { userId, puzzleId } }
    });

    if (existing) {
      throw new Error("You have already solved this puzzle today.");
    }

    // Record the solve
    const solve = await prisma.puzzleSolve.create({
      data: {
        userId,
        puzzleId,
        attempts,
        timeTaken: timeTakenSeconds,
        solved: true
      }
    });

    // Update aggregate puzzle stats
    await prisma.dailyPuzzle.update({
      where: { id: puzzleId },
      data: {
        totalSolves: { increment: 1 },
        totalTries: { increment: attempts }
      }
    });

    return solve;
  }

  /**
   * Generates a 4-digit number with unique digits.
   */
  private static generateSecretNumber(): string {
    const digits: number[] = [];
    while (digits.length < 4) {
      const d = Math.floor(Math.random() * 10);
      if (!digits.includes(d)) {
        // Optional rule: first digit can't be 0.
        if (digits.length === 0 && d === 0) continue;
        digits.push(d);
      }
    }
    return digits.join('');
  }
}
