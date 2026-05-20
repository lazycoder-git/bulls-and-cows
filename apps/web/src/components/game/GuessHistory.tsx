"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Move } from "@traffic/shared";

interface GuessHistoryProps {
  moves: Move[];
  myPlayerId?: string;
}

export function GuessHistory({ moves, myPlayerId }: GuessHistoryProps) {
  if (moves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-5xl mb-4 opacity-20">🎯</div>
        <p className="text-gray-500 text-sm font-medium">
          No guesses yet. Make your first move!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {[...moves].reverse().map((move, i) => {
          const isMyMove = myPlayerId ? move.playerId === myPlayerId : true;
          const isWin = move.bulls === 4;
          const attempt = moves.length - i;

          return (
            <motion.div
              key={`${move.turnNumber}-${move.guess}`}
              initial={{ opacity: 0, x: isMyMove ? -20 : 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isWin
                  ? "bg-green-500/10 border-green-500/30"
                  : isMyMove
                  ? "bg-white/5 border-white/8"
                  : "bg-indigo-500/5 border-indigo-500/20"
              }`}
            >
              {/* Attempt number + guess */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-6 text-center font-mono">
                  #{attempt}
                </span>
                <span className="font-mono font-bold text-xl tracking-[0.3em] text-white">
                  {move.guess}
                </span>
              </div>

              {/* Result pills */}
              <div className="flex items-center gap-3">
                <ResultPill value={move.bulls} label="B" color="bull" />
                <ResultPill value={move.cows} label="C" color="cow" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ResultPill({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "bull" | "cow";
}) {
  const isBull = color === "bull";
  const active = value > 0;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
        active
          ? isBull
            ? "bg-red-500/20 text-red-400 border border-red-500/30"
            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "bg-white/5 text-gray-600 border border-white/5"
      }`}
    >
      <span className="text-base leading-none">{value}</span>
      <span className="text-xs opacity-80 uppercase tracking-wide">{label}</span>
    </div>
  );
}
