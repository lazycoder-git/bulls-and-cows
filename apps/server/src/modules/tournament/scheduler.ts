/**
 * Tournament Scheduler Utility
 * Implements a standard Round-Robin pairing algorithm.
 */
export class TournamentScheduler {
  /**
   * Generates Round-Robin pairings for an array of participant IDs.
   * If there is an odd number of players, a 'BYE' (dummy) is added.
   * Returns an array of rounds, where each round contains an array of matches [PlayerA, PlayerB]
   */
  static generateRoundRobin(participants: string[]): Array<Array<[string, string]>> {
    const players = [...participants];
    
    if (players.length % 2 !== 0) {
      players.push('BYE');
    }

    const numPlayers = players.length;
    const numRounds = numPlayers - 1;
    const halfSize = numPlayers / 2;

    const rounds = [];

    // Player array indices that we'll rotate. The first index stays fixed.
    const indices = players.map((_, i) => i);

    for (let round = 0; round < numRounds; round++) {
      const matchings: Array<[string, string]> = [];

      for (let i = 0; i < halfSize; i++) {
        const p1 = players[indices[i]];
        const p2 = players[indices[numPlayers - 1 - i]];

        if (p1 !== 'BYE' && p2 !== 'BYE') {
          matchings.push([p1, p2]);
        }
      }

      rounds.push(matchings);

      // Rotate array (excluding the first fixed element)
      indices.splice(1, 0, indices.pop() as number);
    }

    return rounds;
  }
}
