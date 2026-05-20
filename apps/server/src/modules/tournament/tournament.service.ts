import { prisma } from '../../utils/prisma.js';
import { TournamentScheduler } from './scheduler.js';

export class TournamentService {
  /**
   * Creates a new tournament.
   */
  static async createTournament(name: string, format: string = 'round-robin') {
    return await (prisma as any).tournament.create({
      data: {
        name,
        format,
        status: 'pending'
      }
    });
  }

  /**
   * Registers a user for a pending tournament.
   */
  static async registerParticipant(tournamentId: string, userId: string) {
    const tournament = await (prisma as any).tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== 'pending') {
      throw new Error('Tournament is not available for registration');
    }

    return await (prisma as any).tournamentParticipant.create({
      data: { tournamentId, userId }
    });
  }

  /**
   * Starts a tournament by finalizing participants and generating the schedule.
   */
  static async startTournament(tournamentId: string) {
    const participants = await (prisma as any).tournamentParticipant.findMany({
      where: { tournamentId }
    });

    if (participants.length < 2) {
      throw new Error('Not enough participants to start the tournament');
    }

    // 1. Mark tournament as active
    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: { status: 'active' }
    });

    // 2. Generate the match schedule
    const userIds = participants.map((p: any) => p.userId);
    const rounds = TournamentScheduler.generateRoundRobin(userIds);

    // 3. Create the Match entities in PostgreSQL
    const createdMatches = [];
    let roundNum = 1;

    for (const matchings of rounds) {
      for (const [p1, p2] of matchings) {
        // Create an underlying game for each match
        const game = await prisma.game.create({
          data: {
            mode: 'tournament',
            status: 'waiting',
            secretNumber: 'WAIT', // Initialized later by the host or randomly assigned
            hostId: p1,
            guestId: p2,
            isRated: true,
          }
        });

        // Link the Game to the TournamentMatch
        const match = await (prisma as any).tournamentMatch.create({
          data: {
            tournamentId,
            gameId: game.id,
            round: roundNum
          }
        });
        createdMatches.push(match);
      }
      roundNum++;
    }

    return { success: true, totalRounds: rounds.length, matchCount: createdMatches.length };
  }

  /**
   * Retrieves the full bracket/schedule for a tournament.
   */
  static async getTournamentState(tournamentId: string) {
    return await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: { include: { user: { select: { id: true, username: true, name: true } } } },
        matches: { include: { game: { select: { id: true, status: true, winnerId: true, hostId: true, guestId: true } } } }
      }
    });
  }
}
