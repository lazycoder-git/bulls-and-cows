"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDailySecret, getDailyPuzzleId, evaluateGuess, validateGuess } from "@traffic/shared";
import { useDailyState } from "@/lib/usePuzzleState";
import { Flame, Calendar, ChevronLeft, CheckCircle2, XCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

const DIGITS = ["1","2","3","4","5","6","7","8","9","0"];
const MAX_GUESSES = 8;

export default function DailyPuzzlePage() {
  const { data: session } = useSession();
  const todayStr = new Date().toISOString().split("T")[0];
  const secret   = getDailySecret(todayStr);
  // Start with client-side puzzle ID; may be overwritten by server response
  const [puzzleId, setPuzzleId] = useState(getDailyPuzzleId(todayStr));
  const startTime = useRef(Date.now());

  const { state, mounted, markCompleted, markFailed } = useDailyState();
  const [guesses, setGuesses] = useState<{ guess: string; bulls: number; cows: number }[]>([]);
  const [input, setInput]     = useState("");
  const [shake, setShake]     = useState(false);
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);

  // Fetch real puzzleId from server
  useEffect(() => {
    api.get<{ success: boolean; puzzle: { puzzleId: string; date: string } }>("/api/puzzle/daily")
      .then((d) => { if (d.success && d.puzzle?.puzzleId) setPuzzleId(d.puzzle.puzzleId); })
      .catch(() => {}); // silently fall back to client-side puzzle ID
  }, []);

  // Restore today's session if already played
  useEffect(() => {
    if (!mounted) return;
    if (state.completed) setGameOver(state.guessCount === -1 ? "lose" : "win");
  }, [mounted, state]);

  // Submit solve to server when game ends
  const submitSolveToServer = useCallback(async (attempts: number, won: boolean) => {
    const backendToken = (session as any)?.backendToken as string | undefined;
    if (!backendToken || !puzzleId) return;
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    try {
      await api.post("/api/puzzle/solve", { puzzleId, attempts: won ? attempts : -1, timeTaken }, backendToken);
    } catch {
      // Failure is non-critical — local state already tracks it
    }
  }, [session, puzzleId]);

  const handleDigit = (d: string) => {
    if (gameOver) return;
    setInput((p) => p.includes(d) || p.length >= 4 ? p : p + d);
  };

  const handleDelete = () => setInput((p) => p.slice(0, -1));

  const handleSubmit = useCallback(() => {
    if (gameOver || input.length !== 4) return;
    const { valid, error } = validateGuess(input);
    if (!valid) { setShake(true); setTimeout(() => setShake(false), 500); return; }

    const { bulls, cows } = evaluateGuess(secret, input);
    const next = [...guesses, { guess: input, bulls, cows }];
    setGuesses(next);
    setInput("");

    if (bulls === 4) {
      setGameOver("win");
      markCompleted(next.length);
      submitSolveToServer(next.length, true);
    } else if (next.length >= MAX_GUESSES) {
      setGameOver("lose");
      markFailed();
      submitSolveToServer(next.length, false);
    }
  }, [gameOver, input, guesses, secret, markCompleted, markFailed, submitSolveToServer]);

  if (!mounted) return null;

  const displayDate = new Date(todayStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <Link href="/puzzles" style={{ display: "flex", alignItems: "center", gap: 6, color: "#7a7570", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "color 0.12s" }}>
          <ChevronLeft size={16} /> Puzzles
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={15} style={{ color: "#81b64c" }} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>{displayDate}</span>
        </div>
        {/* Streak badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: state.streak > 0 ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)", border: state.streak > 0 ? "1px solid rgba(249,115,22,0.25)" : "1px solid rgba(255,255,255,0.08)" }}>
          <Flame size={14} style={{ color: state.streak > 0 ? "#f97316" : "#595653" }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: state.streak > 0 ? "#f97316" : "#595653" }}>{state.streak}</span>
          <span style={{ fontSize: 11, color: "#595653" }}>streak</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "24px 16px", overflowY: "auto", gap: 20 }}>

        {/* Guess grid */}
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from({ length: MAX_GUESSES }).map((_, row) => {
            const g = guesses[row];
            const isActive = !gameOver && row === guesses.length;
            return (
              <motion.div
                key={row}
                animate={isActive && shake ? { x: [-6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.3 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}
              >
                {Array.from({ length: 4 }).map((_, col) => {
                  const ch = g ? g.guess[col] : isActive ? input[col] : "";
                  const isBull = g && g.guess[col] === secret[col];
                  const isCow  = g && !isBull && secret.includes(g.guess[col]);
                  return (
                    <motion.div
                      key={col}
                      initial={g ? { scale: 0.85, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: col * 0.06 }}
                      style={{
                        aspectRatio: "1",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 10,
                        border: `2px solid ${g ? (isBull ? "#81b64c" : isCow ? "#f59e0b" : "rgba(255,255,255,0.12)") : isActive && col === input.length ? "#81b64c" : ch ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                        background: g ? (isBull ? "rgba(129,182,76,0.12)" : isCow ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)") : ch ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                        fontSize: 22,
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: "white",
                        transition: "all 0.12s",
                      }}
                    >
                      {ch}
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>

        {/* Bulls / Cows legend */}
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#595653" }}>
          <span><span style={{ color: "#81b64c", fontWeight: 700 }}>■</span> Bull = right digit, right place</span>
          <span><span style={{ color: "#f59e0b", fontWeight: 700 }}>■</span> Cow = right digit, wrong place</span>
        </div>

        {/* Game over panel */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                width: "100%", maxWidth: 380,
                background: gameOver === "win" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                border: `1px solid ${gameOver === "win" ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                borderRadius: 16, padding: 24, textAlign: "center",
              }}
            >
              {gameOver === "win" ? (
                <>
                  <CheckCircle2 size={36} style={{ color: "#4ade80", margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#4ade80" }}>Solved! 🎉</div>
                  <div style={{ fontSize: 13, color: "#7a7570", margin: "6px 0 10px" }}>
                    You cracked today's puzzle in <strong style={{ color: "white" }}>{guesses.length}</strong> guesses
                  </div>
                  {state.streak > 1 && (
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
                      <Flame size={14} style={{ color: "#f97316" }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#f97316" }}>{state.streak}-day streak! 🔥</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <XCircle size={36} style={{ color: "#f87171", margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#f87171" }}>Out of guesses</div>
                  <div style={{ fontSize: 13, color: "#7a7570", margin: "6px 0 6px" }}>The secret was</div>
                  <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 900, letterSpacing: "0.2em", color: "white" }}>{secret}</div>
                  <div style={{ fontSize: 12, color: "#595653", marginTop: 8 }}>Come back tomorrow to rebuild your streak!</div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Already completed today */}
        {state.completed && guesses.length === 0 && (
          <div style={{ width: "100%", maxWidth: 380, background: "rgba(129,182,76,0.06)", border: "1px solid rgba(129,182,76,0.15)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <Lock size={28} style={{ color: "#81b64c", margin: "0 auto 10px" }} />
            <div style={{ fontWeight: 800, fontSize: 16 }}>You've already played today!</div>
            <div style={{ fontSize: 13, color: "#7a7570", marginTop: 6 }}>
              {state.guessCount > 0 ? `You solved it in ${state.guessCount} guesses.` : "Better luck tomorrow!"}
            </div>
            {state.streak > 0 && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Flame size={14} style={{ color: "#f97316" }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#f97316" }}>{state.streak}-day streak</span>
              </div>
            )}
          </div>
        )}

        {/* Numpad */}
        {!state.completed && !gameOver && (
          <div style={{ width: "100%", maxWidth: 320 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 6 }}>
              {DIGITS.map((d) => {
                const used = guesses.some((g) => g.guess.includes(d));
                const active = input.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => handleDigit(d)}
                    disabled={active}
                    style={{
                      padding: "12px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                      background: used && !active ? "rgba(255,255,255,0.02)" : active ? "rgba(129,182,76,0.15)" : "rgba(255,255,255,0.06)",
                      color: used && !active ? "#3a3835" : active ? "#81b64c" : "white",
                      fontSize: 16, fontWeight: 700, cursor: active ? "not-allowed" : "pointer",
                      borderColor: active ? "rgba(129,182,76,0.4)" : "rgba(255,255,255,0.1)",
                      transition: "all 0.1s",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6 }}>
              <button onClick={handleDelete} style={{ padding: "12px 0", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>⌫</button>
              <button onClick={handleSubmit} disabled={input.length !== 4} style={{ padding: "12px 0", borderRadius: 8, border: "none", background: input.length === 4 ? "#81b64c" : "rgba(255,255,255,0.05)", color: input.length === 4 ? "#1a1a13" : "#3a3835", fontSize: 14, fontWeight: 800, cursor: input.length === 4 ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                Guess →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
