// ─── Shared Types ─────────────────────────────────────────────────────────────

export type GameMode = 'solo' | 'multiplayer' | 'puzzle_daily' | 'puzzle_oneshot' | 'tournament';
export type GameStatus = 'waiting' | 'active' | 'finished' | 'abandoned';
export type RoomStatus = 'open' | 'full' | 'playing' | 'done';
export type TournamentStatus = 'lobby' | 'active' | 'finished';

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  rating: number;
}

export interface Move {
  id?: string;
  playerId: string;
  guess: string;
  bulls: number;
  cows: number;
  timestamp: number;
  turnNumber: number;
}

export interface GameState {
  id: string;
  mode: GameMode;
  status: GameStatus;
  players: Player[];
  currentTurn?: string; // playerId
  secretNumber?: string; // only revealed on end / for solo
  moves: Move[];
  winner?: string;
  startedAt?: number;
  finishedAt?: number;
  turnDeadline?: number; // unix ms when current turn expires
  roomCode?: string;
  turnCount?: number;
  isRated?: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  maxPlayers: number;
  isRated: boolean;
  createdAt: number;
}

export interface MatchmakingTicket {
  userId: string;
  rating: number;
  queuedAt: number;
  isRated: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  gamesPlayed: number;
}

export interface DailyPuzzle {
  id: string;
  date: string; // YYYY-MM-DD
  totalSolves: number;
  averageAttempts: number;
}

export interface PuzzleResult {
  solved: boolean;
  attempts: number;
  streak: number;
  timeTaken?: number;
}

export interface EloChange {
  before: number;
  after: number;
  delta: number;
}

export interface UserStats {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  avgGuessesPerGame: number;
  puzzlesSolved: number;
  dailyStreak: number;
  joinedAt: string;
}

// ─── Socket Event Types ────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:move': (move: Move) => void;
  'game:over': (result: { winner: string | null; secretNumber: string; eloChange?: EloChange }) => void;
  'game:timer': (data: { deadline: number; turnPlayerId: string }) => void;
  'room:update': (room: Room) => void;
  'match:found': (data: { gameId: string; opponent: Player }) => void;
  'queue:position': (position: number) => void;
  'online:count': (count: number) => void;
  error: (msg: string) => void;
}

export interface ClientToServerEvents {
  'game:guess': (data: { gameId: string; guess: string }) => void;
  'room:join': (code: string) => void;
  'room:leave': (code: string) => void;
  'queue:join': (isRated: boolean) => void;
  'queue:leave': () => void;
}

// ─── Admin Types ───────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  totalGames: number;
  gamesPlayedToday: number;
  activeSessions: number;
  soloGames: number;
  multiplayerGames: number;
  puzzlesSolvedToday: number;
  avgGameDuration: number;
}

export interface ActivityLog {
  id: string;
  type: 'game_start' | 'game_end' | 'user_join' | 'user_login' | 'puzzle_solve' | 'room_create';
  userId?: string;
  username?: string;
  details: string;
  timestamp: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  joinedAt: string;
  lastSeen?: string;
  isOnline: boolean;
}
