import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

// Upstash uses rediss:// (TLS) — ioredis needs tls option enabled explicitly
const isTLS = process.env.REDIS_URL.startsWith('rediss://');

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false, // Upstash doesn't support OBJECT command used by ready check
  retryStrategy: (times) => Math.min(times * 50, 2000),
  tls: isTLS ? {} : undefined,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('[Redis] error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] connected');
});


// ─── Key helpers ──────────────────────────────────────────────────────────────

export const redisKeys = {
  game: (id: string) => `game:${id}`,
  gameState: (id: string) => `game:state:${id}`,
  room: (code: string) => `room:${code}`,
  queue: (rated: boolean) => `queue:${rated ? 'rated' : 'casual'}`,
  userSocket: (userId: string) => `user:socket:${userId}`,
  userOnline: () => `users:online`,
  rateLimit: (ip: string, route: string) => `rl:${route}:${ip}`,
  dailyPuzzle: (date: string) => `puzzle:daily:${date}`,
  leaderboard: () => `leaderboard`,
};
