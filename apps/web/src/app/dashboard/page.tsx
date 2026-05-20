"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  Zap,
  History,
  TrendingUp,
  Star,
  Play,
  Puzzle,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

interface UserStats {
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  dailyStreak: number;
  bestStreak: number;
  winRate: number;
}

interface GameRecord {
  id: string;
  mode: string;
  winnerId: string | null;
  turnCount: number;
  createdAt: string;
  host: { id: string; username: string | null } | null;
  guest: { id: string; username: string | null } | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [mounted, setMounted]   = useState(false);
  const [stats, setStats]       = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!session) return;
    const userId       = (session.user as any)?.id as string | undefined;
    const backendToken = (session as any)?.backendToken as string | undefined;
    if (!userId || !backendToken) return;

    api.get<{ user: UserStats }>(`/api/users/${userId}`, backendToken)
      .then((d) => setStats(d.user))
      .catch(() => {});

    api.get<{ games: GameRecord[] }>(`/api/users/${userId}/games?limit=3`, backendToken)
      .then((d) => setRecentGames(d.games))
      .catch(() => {});
  }, [session]);

  if (!mounted) return null;

  const userId    = (session?.user as any)?.id as string | undefined;
  const firstName = session?.user?.name?.split(" ")[0] ?? "Player";

  const statCards = [
    { label: "ELO Rating",    value: stats ? String(stats.rating)                          : "—",   icon: <TrendingUp className="text-indigo-400" />, trend: stats ? `${stats.winRate}% Win Rate` : "Loading" },
    { label: "Wins",          value: stats ? String(stats.wins)                             : "—",   icon: <Trophy className="text-yellow-400" />,     trend: stats ? `${stats.gamesPlayed} games played` : "Loading" },
    { label: "Best Streak",   value: stats ? String(stats.bestStreak)                       : "—",   icon: <Zap className="text-orange-400" />,        trend: stats ? `Current: ${stats.dailyStreak}` : "Loading" },
    { label: "Daily Streak",  value: stats ? `${stats.dailyStreak}🔥`                       : "—",   icon: <Star className="text-purple-400" />,       trend: stats ? `Best: ${stats.bestStreak}` : "Loading" },
  ];

  const containers = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item       = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-10"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, <span className="gradient-text">{firstName}</span></h1>
          <p className="text-gray-400">Your tactical overview is ready.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/play" className="btn btn-primary flex items-center gap-2">
            <Play size={18} />
            Quick Game
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containers}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
      >
        {statCards.map((s, idx) => (
          <motion.div key={idx} variants={item} className="glass p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/5 rounded-xl">{s.icon}</div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-3xl font-bold mb-1 tracking-tight">{s.value}</div>
            <div className={`text-xs ${s.trend.includes('+') || s.trend.includes('Rate') ? 'text-green-400' : 'text-gray-500'}`}>
              {s.trend}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Games */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass rounded-3xl p-8 border border-white/5"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="text-indigo-400" />
              <h2 className="text-2xl font-bold">Recent Games</h2>
            </div>
            <Link href="/profile" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">View All</Link>
          </div>

          <div className="space-y-4">
            {recentGames.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No games yet. <Link href="/play" className="text-indigo-400 hover:underline">Play your first game!</Link>
              </div>
            ) : recentGames.map((game) => {
              const won       = game.winnerId === userId;
              const lost      = game.winnerId && game.winnerId !== userId;
              const result    = won ? "Win" : lost ? "Loss" : "Draw";
              const opponent  = game.host?.id === userId ? game.guest : game.host;
              return (
                <div key={game.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${result === 'Win' ? 'bg-green-500/20 text-green-400' : result === 'Loss' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {result[0]}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors uppercase tracking-wide">
                        {opponent?.username ?? "Solo"}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(game.createdAt).toLocaleDateString()} · {game.mode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{game.turnCount} moves</div>
                    <div className={`text-xs font-medium uppercase ${result === 'Win' ? 'text-green-400' : result === 'Loss' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {result}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Action Widgets */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Puzzle size={80} />
            </div>
            <h3 className="text-xl font-bold mb-2">Daily Puzzle</h3>
            <p className="text-sm text-gray-400 mb-6 font-medium">Test your logic with today's unique 4-digit code challenge.</p>
            <Link href="/puzzles/daily" className="btn btn-primary w-full justify-center">Solve Puzzle</Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={80} />
            </div>
            <h3 className="text-xl font-bold mb-2">Create a Room</h3>
            <p className="text-sm text-gray-400 mb-6 font-medium">Invite a friend to a private match with a room code.</p>
            <Link href="/rooms" className="btn btn-outline w-full justify-center border-pink-500/30 text-pink-400 hover:bg-pink-500/10">Open Rooms</Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
