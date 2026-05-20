"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CornerDownLeft, ShieldAlert, Trophy, RefreshCcw, ArrowLeft, Clock } from "lucide-react";
import { evaluateGuess, validateGuess } from "@traffic/shared";
import type { Move, Player, GameState } from "@traffic/shared";
import Link from "next/link";
import { GuessHistory } from "./GuessHistory";

interface GameBoardProps {
  /** For solo/offline mode: provide a secret. */
  secret?: string;
  /** For multiplayer: provide the full game state from the server. */
  gameState?: GameState;
  /** The current player's ID. */
  myPlayerId?: string;
  /** Called when a guess is submitted (multiplayer). */
  onGuess?: (guess: string) => void;
  /** Called when user clicks "New Game". */
  onRestart?: () => void;
  /** Back link target. */
  backHref?: string;
}

interface LocalMove extends Move {}

export function GameBoard({
  secret,
  gameState,
  myPlayerId,
  onGuess,
  onRestart,
  backHref = "/play",
}: GameBoardProps) {
  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");
  const [localMoves, setLocalMoves] = useState<LocalMove[]>([]);
  const [localGameOver, setLocalGameOver] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived state
  const isSolo = !gameState;
  const moves: Move[] = isSolo ? localMoves : (gameState?.moves ?? []);
  const isGameOver = isSolo ? localGameOver : gameState?.status === "finished";
  const winner = isSolo
    ? localGameOver && localMoves[localMoves.length - 1]?.bulls === 4
      ? myPlayerId ?? "you"
      : null
    : gameState?.winner ?? null;
  const isMyTurn = !isSolo
    ? gameState?.currentTurn === myPlayerId
    : true;

  // Find opponent in multiplayer
  const opponent = gameState?.players?.find((p) => p.id !== myPlayerId);
  const me = gameState?.players?.find((p) => p.id === myPlayerId);

  useEffect(() => {
    if (!isGameOver && isMyTurn) {
      inputRef.current?.focus();
    }
  }, [isGameOver, isMyTurn]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (guess.length !== 4) {
        setError("Enter exactly 4 digits.");
        triggerShake();
        return;
      }

      const { valid, error: validErr } = validateGuess(guess);
      if (!valid) {
        setError(validErr ?? "Invalid guess.");
        triggerShake();
        return;
      }

      if (isSolo && secret) {
        // Local evaluation
        const result = evaluateGuess(secret, guess);
        const newMove: LocalMove = {
          playerId: myPlayerId ?? "local",
          guess,
          bulls: result.bulls,
          cows: result.cows,
          timestamp: Date.now(),
          turnNumber: localMoves.length + 1,
        };
        setLocalMoves((prev) => [...prev, newMove]);
        if (result.isWin) setLocalGameOver(true);
      } else if (onGuess) {
        onGuess(guess);
      }

      setGuess("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [guess, isSolo, secret, localMoves.length, myPlayerId, onGuess]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Player panels */}
        <div className="flex items-center gap-4">
          {me && (
            <PlayerBadge player={me} isActive={isMyTurn} label="You" side="left" />
          )}
          {!isSolo && (
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">
              VS
            </div>
          )}
          {opponent && (
            <PlayerBadge player={opponent} isActive={!isMyTurn} label="Opponent" side="right" />
          )}
        </div>

        {/* Attempt counter */}
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Attempts</div>
          <div className="text-2xl font-bold font-mono text-white">{moves.length}</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* Input panel */}
        <div className="lg:w-80 flex-shrink-0">
          <motion.div
            className="glass rounded-2xl p-6 border border-white/5 h-full flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AnimatePresence mode="wait">
              {isGameOver ? (
                <GameOverPanel
                  key="over"
                  won={winner === (myPlayerId ?? "you") || winner === "you"}
                  attempts={moves.length}
                  secret={secret ?? gameState?.secretNumber}
                  onRestart={onRestart}
                  backHref={backHref}
                />
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4 flex-1"
                >
                  <div>
                    <h2 className="font-bold text-lg mb-1">Your Guess</h2>
                    <p className="text-xs text-gray-500">
                      {isMyTurn
                        ? "Enter a 4-digit number with unique digits."
                        : "Waiting for opponent's move..."}
                    </p>
                  </div>

                  {/* Digit display */}
                  <DigitDisplay guess={guess} shake={shake} />

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={guess}
                      onChange={(e) =>
                        setGuess(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      onKeyDown={handleKeyDown}
                      disabled={!isMyTurn || isGameOver}
                      className="sr-only"
                      autoComplete="off"
                      aria-label="Guess input"
                    />

                    {/* Click-to-type digits */}
                    <NumberPad
                      onDigit={(d) =>
                        setGuess((g) => (g.length < 4 ? g + d : g))
                      }
                      onDelete={() => setGuess((g) => g.slice(0, -1))}
                      disabled={!isMyTurn || isGameOver}
                    />

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 text-red-400 text-xs font-medium"
                        >
                          <ShieldAlert size={14} />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={guess.length !== 4 || !isMyTurn || isGameOver}
                      className="btn btn-primary w-full justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:translate-y-0"
                    >
                      <CornerDownLeft size={18} />
                      Submit Guess
                    </button>
                  </form>

                  {/* Hints */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex justify-around text-center">
                      <HintBadge label="🐂 Bull" desc="Right digit, right place" color="text-red-400" />
                      <div className="w-px bg-white/5" />
                      <HintBadge label="🐄 Cow" desc="Right digit, wrong place" color="text-amber-400" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* History panel */}
        <motion.div
          className="flex-1 glass rounded-2xl p-6 border border-white/5 overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4">
            Move History
          </h3>
          <GuessHistory moves={moves} myPlayerId={myPlayerId} />
        </motion.div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function DigitDisplay({ guess, shake }: { guess: string; shake: boolean }) {
  const digits = guess.padEnd(4, " ").split("");
  return (
    <motion.div
      animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex gap-2 justify-center"
    >
      {digits.map((d, i) => (
        <div
          key={i}
          className={`w-14 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold font-mono transition-all ${
            d !== " "
              ? "bg-indigo-500/20 border-indigo-500/50 text-white scale-105"
              : "bg-white/5 border-white/10 text-gray-700"
          }`}
        >
          {d !== " " ? d : "·"}
        </div>
      ))}
    </motion.div>
  );
}

function NumberPad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["⌫", "0", ""]];
  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.flat().map((key, i) => {
        if (key === "") return <div key={i} />;
        const isDelete = key === "⌫";
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => (isDelete ? onDelete() : onDigit(key))}
            className={`h-11 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-30 ${
              isDelete
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-white/5 hover:bg-white/10 border border-white/8 text-white"
            }`}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

function PlayerBadge({
  player,
  isActive,
  label,
  side,
}: {
  player: Player;
  isActive: boolean;
  label: string;
  side: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
          isActive ? "border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "border-white/10"
        }`}
        style={{ background: "rgba(99,102,241,0.15)" }}
      >
        {(player.username?.[0] ?? "?").toUpperCase()}
      </div>
      <div className={side === "right" ? "text-right" : ""}>
        <div className="text-xs font-bold text-white leading-tight">{player.username}</div>
        <div className="text-xs text-gray-500">{player.rating} ELO</div>
      </div>
    </div>
  );
}

function HintBadge({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xs font-bold ${color} mb-0.5`}>{label}</div>
      <div className="text-xs text-gray-600 leading-tight">{desc}</div>
    </div>
  );
}

function GameOverPanel({
  won,
  attempts,
  secret,
  onRestart,
  backHref,
}: {
  won: boolean;
  attempts: number;
  secret?: string;
  onRestart?: () => void;
  backHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 py-4 text-center"
    >
      <div className="text-6xl">{won ? "🏆" : "💀"}</div>
      <div>
        <h2 className={`text-2xl font-bold mb-1 ${won ? "gradient-text" : "text-red-400"}`}>
          {won ? "Code Cracked!" : "Game Over"}
        </h2>
        <p className="text-gray-400 text-sm">
          {won
            ? `You solved it in ${attempts} attempt${attempts !== 1 ? "s" : ""}!`
            : "Better luck next time."}
        </p>
        {secret && (
          <div className="mt-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10 inline-block">
            <div className="text-xs text-gray-500 mb-1">Secret was</div>
            <div className="font-mono text-2xl font-bold tracking-[0.3em] text-white">{secret}</div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 w-full">
        {onRestart && (
          <button onClick={onRestart} className="btn btn-primary w-full justify-center">
            <RefreshCcw size={16} />
            Play Again
          </button>
        )}
        <Link href={backHref} className="btn btn-outline w-full justify-center">
          <ArrowLeft size={16} />
          Back to Lobby
        </Link>
      </div>
    </motion.div>
  );
}
