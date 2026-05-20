"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Flame, Star, Zap } from "lucide-react";
import Link from "next/link";
import { generateSecret } from "@traffic/shared";

export default function PuzzlesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Star className="text-purple-400" size={28} />
          <h1 className="text-4xl font-bold">Puzzles</h1>
        </div>
        <p className="text-gray-400">Daily challenge and unlimited practice modes.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Daily Puzzle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-7 border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-all"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar size={80} className="text-purple-400" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full font-semibold uppercase tracking-wide">
              Daily
            </span>
            <span className="text-xs text-gray-500">{today}</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">Today's Puzzle</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            A new secret code every day. All players worldwide solve the same puzzle. Compete for the fewest guesses!
          </p>

          <div className="flex items-center gap-4 mb-6">
            <StatChip icon={<Flame size={14} className="text-orange-400" />} label="2,847 Solves" />
            <StatChip icon={<Zap size={14} className="text-yellow-400" />} label="Avg 6 Guesses" />
          </div>

          <Link
            href="/puzzles/daily"
            className="btn btn-primary w-full justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
          >
            <Calendar size={18} />
            Start Today's Puzzle
          </Link>
        </motion.div>

        {/* OneShot Practice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-7 border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={80} className="text-indigo-400" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full font-semibold uppercase tracking-wide">
              Unlimited
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-2">OneShot Practice</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Play as many puzzles as you want. A new random code is generated each time. Perfect for sharpening your logic.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <StatChip icon={<Star size={14} className="text-indigo-400" />} label="No Limits" />
            <StatChip icon={<Zap size={14} className="text-indigo-400" />} label="Instant Play" />
          </div>

          <Link href="/puzzles/oneshot" className="btn btn-primary w-full justify-center">
            <Zap size={18} />
            Play OneShot
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
      {icon}
      {label}
    </div>
  );
}
