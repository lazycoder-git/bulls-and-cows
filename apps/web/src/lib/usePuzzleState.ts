/**
 * usePuzzleState — localStorage-backed streak & completion tracking
 * Works without a live database, persists across sessions.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyState {
  date: string;           // YYYY-MM-DD
  completed: boolean;
  guessCount: number;     // how many guesses it took
  streak: number;         // consecutive days completed
  longestStreak: number;
}

interface OneshotState {
  seenCount: number;      // index into the pool
  streak: number;         // consecutive correct oneshots
  longestStreak: number;
  totalPlayed: number;
  totalCorrect: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Default states ───────────────────────────────────────────────────────────

const defaultDaily = (): DailyState => ({
  date: '',
  completed: false,
  guessCount: 0,
  streak: 0,
  longestStreak: 0,
});

const defaultOneshot = (): OneshotState => ({
  seenCount: 0,
  streak: 0,
  longestStreak: 0,
  totalPlayed: 0,
  totalCorrect: 0,
});

// ─── Daily Puzzle Hook ────────────────────────────────────────────────────────

export function useDailyState() {
  const [state, setState] = useState<DailyState>(defaultDaily);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = load<DailyState>('bnc:daily', defaultDaily());
    const todayStr = today();

    // Reset if it's a new day
    if (stored.date !== todayStr) {
      // Check if streak should continue (completed yesterday)
      const wasYesterday = stored.date === yesterday() && stored.completed;
      setState({
        date: todayStr,
        completed: false,
        guessCount: 0,
        streak: stored.streak, // keep streak alive until we know today's result
        longestStreak: stored.longestStreak,
      });
    } else {
      setState(stored);
    }
    setMounted(true);
  }, []);

  const markCompleted = useCallback((guessCount: number) => {
    setState((prev) => {
      const newStreak = prev.streak + 1;
      const newState: DailyState = {
        ...prev,
        completed: true,
        guessCount,
        streak: newStreak,
        longestStreak: Math.max(newStreak, prev.longestStreak),
      };
      save('bnc:daily', newState);
      return newState;
    });
  }, []);

  const markFailed = useCallback(() => {
    setState((prev) => {
      const newState: DailyState = {
        ...prev,
        completed: true,
        guessCount: -1, // failed
        streak: 0,      // streak broken
      };
      save('bnc:daily', newState);
      return newState;
    });
  }, []);

  return { state, mounted, markCompleted, markFailed };
}

// ─── OneShot Hook ─────────────────────────────────────────────────────────────

export function useOneshotState() {
  const [state, setState] = useState<OneshotState>(defaultOneshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(load<OneshotState>('bnc:oneshot', defaultOneshot()));
    setMounted(true);
  }, []);

  const advance = useCallback((correct: boolean) => {
    setState((prev) => {
      const newStreak = correct ? prev.streak + 1 : 0;
      const newState: OneshotState = {
        seenCount: prev.seenCount + 1,
        streak: newStreak,
        longestStreak: Math.max(newStreak, prev.longestStreak),
        totalPlayed: prev.totalPlayed + 1,
        totalCorrect: correct ? prev.totalCorrect + 1 : prev.totalCorrect,
      };
      save('bnc:oneshot', newState);
      return newState;
    });
  }, []);

  return { state, mounted, advance };
}

// ─── Game History ─────────────────────────────────────────────────────────────

export interface GameHistoryEntry {
  id: string;
  type: 'daily' | 'oneshot' | 'solo' | 'casual' | 'rated';
  date: string;
  result: 'win' | 'loss' | 'pending';
  guessCount: number;
  secret?: string; // revealed after game
  opponentName?: string;
  eloChange?: number;
}

export function useGameHistory() {
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(load<GameHistoryEntry[]>('bnc:history', []));
  }, []);

  const addEntry = useCallback((entry: GameHistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 50); // keep last 50
      save('bnc:history', updated);
      return updated;
    });
  }, []);

  return { history, addEntry };
}
