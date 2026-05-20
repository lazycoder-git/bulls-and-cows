import { redis } from '../../config/redis.js';
import { prisma } from '../../utils/prisma.js';

const LEADERBOARD_KEY = 'bnc:leaderboard:global';

export class LeaderboardService {
  /**
   * Syncs a user's rating into the Redis Sorted Set.
   * Call this whenever a player's ELO changes.
   */
  static async updatePlayerRating(userId: string, rating: number) {
    await redis.zadd(LEADERBOARD_KEY, rating, userId);
  }

  /**
   * Gets the top N players from the Redis leaderboard.
   * Defaults to top 50. Fast O(log(N)+M) retrieval.
   */
  static async getTopPlayers(limit: number = 50) {
    // Get top user IDs and their scores
    const results = await redis.zrevrange(LEADERBOARD_KEY, 0, limit - 1, 'WITHSCORES');
    
    if (results.length === 0) {
      return [];
    }

    const players = [];
    const userIds = [];
    
    // Redis returns [member1, score1, member2, score2, ...]
    for (let i = 0; i < results.length; i += 2) {
      userIds.push(results[i]);
      players.push({
        userId: results[i],
        rating: parseInt(results[i + 1], 10),
        rank: (i / 2) + 1
      });
    }

    // Hydrate with user profile data from DB (caching could be added here later)
    const dbUsers = await (prisma.user as any).findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true }
    });

    // Merge Redis stats with DB profiles
    return players.map(p => {
      const profile = dbUsers.find((u: any) => u.id === p.userId);
      return {
        ...p,
        username: profile?.username || 'Unknown Player',
        image: profile?.image || profile?.avatar,
      };
    });
  }

  /**
   * Deep-sync: Grabs all users from Postgres and overwrites the Redis set.
   * Used for disaster recovery or periodic syncs.
   */
  static async fullSyncFromDatabase() {
    const users = await prisma.user.findMany({
      select: { id: true, rating: true }
    });

    if (users.length === 0) return;

    const pipeline = redis.pipeline();
    pipeline.del(LEADERBOARD_KEY);
    
    for (const u of users) {
      pipeline.zadd(LEADERBOARD_KEY, u.rating, u.id);
    }
    
    await pipeline.exec();
    console.log(`[Leaderboard] Successfully synced ${users.length} users to Redis.`);
  }
}
