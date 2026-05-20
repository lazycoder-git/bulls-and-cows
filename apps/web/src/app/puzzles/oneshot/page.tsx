"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getOneshotSecret, generatePuzzleClues, evaluateGuess } from "@traffic/shared";
import { useOneshotState } from "@/lib/usePuzzleState";
import { Zap, RotateCcw, CheckCircle2, XCircle, ChevronLeft, Flame } from "lucide-react";
import Link from "next/link";

function Pill({ value, label, isBull }: { value: number; label: string; isBull: boolean }) {
  const active = value > 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
      background: active ? (isBull ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)") : "rgba(255,255,255,0.05)",
      color: active ? (isBull ? "#f87171" : "#fbbf24") : "#595653",
      border: `1px solid ${active ? (isBull ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)") : "rgba(255,255,255,0.07)"}`,
    }}>
      <span style={{ fontSize: 13 }}>{value}</span>
      <span style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </span>
  );
}

export default function OneshotPage() {
  const { state, mounted, advance } = useOneshotState();
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [input, setInput] = useState("");
  const [sessionSeen, setSessionSeen] = useState(0); // puzzles seen this session

  // Derive current puzzle from seenCount + session offset
  const puzzleIndex = mounted ? state.seenCount + sessionSeen : 0;
  const secret = getOneshotSecret(puzzleIndex);
  const clues = generatePuzzleClues(secret, 5);

  const handleDigit = (d: string) => {
    if (result) return;
    setInput((p) => p.includes(d) || p.length >= 4 ? p : p + d);
  };

  const handleDelete = () => { if (!result) setInput((p) => p.slice(0, -1)); };

  const handleSubmit = useCallback(() => {
    if (result || input.length !== 4) return;
    const isCorrect = input === secret;
    setResult(isCorrect ? "correct" : "wrong");
    advance(isCorrect);
  }, [result, input, secret, advance]);

  const handleNext = useCallback(() => {
    setSessionSeen((s) => s + 1);
    setInput("");
    setResult(null);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 28px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexShrink: 0 }}>
        <Link href="/puzzles" style={{ display: "flex", alignItems: "center", gap: 6, color: "#7a7570", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={20} style={{ color: "#81b64c" }} />
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>OneShot</h1>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: "rgba(129,182,76,0.12)", color: "#81b64c", border: "1px solid rgba(129,182,76,0.2)" }}>
              1 GUESS ONLY
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#7a7570", margin: "2px 0 0" }}>5 clues · one shot · {state.totalPlayed} solved</p>
        </div>
        {/* Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: state.streak > 0 ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)", border: state.streak > 0 ? "1px solid rgba(249,115,22,0.25)" : "1px solid rgba(255,255,255,0.08)" }}>
          <Flame size={13} style={{ color: state.streak > 0 ? "#f97316" : "#595653" }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: state.streak > 0 ? "#f97316" : "#595653" }}>{state.streak}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
        {/* Clues panel */}
        <motion.div
          key={`clues-${puzzleIndex}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ flex: 1, background: "#262421", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#81b64c", textTransform: "uppercase", letterSpacing: "0.1em" }}>Clues</span>
            <div style={{ display: "flex", gap: 20, fontSize: 10, fontWeight: 700, color: "#595653", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <span>🐂 Bulls</span>
              <span>🐄 Cows</span>
            </div>
          </div>
          {clues.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 18px",
                borderBottom: i < clues.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent",
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.2em", color: "white" }}>{c.guess}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <Pill value={c.bulls} label="B" isBull />
                <Pill value={c.cows} label="C" isBull={false} />
              </div>
            </motion.div>
          ))}
          <div style={{ padding: "10px 18px", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 18 }}>
            <span style={{ fontSize: 10, color: "#595653" }}>🐂 right digit, right place</span>
            <span style={{ fontSize: 10, color: "#595653" }}>🐄 right digit, wrong place</span>
          </div>
        </motion.div>

        {/* Input panel */}
        <div style={{ width: 268, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Digit cells */}
          <div style={{ background: "#262421", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "14px 14px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#595653", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Your one guess</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 6 }}>
              {Array.from({ length: 4 }).map((_, i) => {
                const ch = input[i];
                const isNext = i === input.length;
                return (
                  <div key={i} style={{
                    aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 8,
                    border: `2px solid ${result === "correct" ? "#4ade80" : result === "wrong" ? "#f87171" : isNext ? "#81b64c" : ch ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                    background: result === "correct" ? "rgba(74,222,128,0.08)" : result === "wrong" ? "rgba(248,113,113,0.08)" : ch ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "white",
                    transition: "all 0.1s",
                  }}>{ch ?? ""}</div>
                );
              })}
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: result === "correct" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                  border: `1px solid ${result === "correct" ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                  borderRadius: 12, padding: 16, textAlign: "center",
                }}
              >
                {result === "correct" ? (
                  <>
                    <CheckCircle2 size={28} style={{ color: "#4ade80", margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#4ade80" }}>Cracked it! 🎯</div>
                    {state.streak > 0 && <div style={{ fontSize: 11, color: "#f97316", marginTop: 4 }}>🔥 {state.streak} in a row!</div>}
                  </>
                ) : (
                  <>
                    <XCircle size={28} style={{ color: "#f87171", margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#f87171" }}>Not quite!</div>
                    <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.2em", color: "white", margin: "6px 0 2px" }}>{secret}</div>
                    <div style={{ fontSize: 10, color: "#7a7570" }}>That was the answer</div>
                  </>
                )}
                <button
                  onClick={handleNext}
                  style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: "#81b64c", color: "#1a1a13", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <RotateCcw size={12} /> Next Puzzle
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Numpad */}
          {!result && (
            <div style={{ background: "#262421", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                {["1","2","3","4","5","6","7","8","9"].map((d) => {
                  const used = input.includes(d);
                  return (
                    <button key={d} onClick={() => handleDigit(d)} disabled={used} style={{
                      aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
                      background: used ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
                      color: used ? "#3a3835" : "white", fontSize: 17, fontWeight: 700,
                      cursor: used ? "not-allowed" : "pointer", transition: "all 0.08s",
                    }}>{d}</button>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 5 }}>
                <button onClick={handleDelete} style={{ padding: "10px 0", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⌫</button>
                <button onClick={() => handleDigit("0")} disabled={input.includes("0")} style={{ padding: "10px 0", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: input.includes("0") ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)", color: input.includes("0") ? "#3a3835" : "white", fontSize: 17, fontWeight: 700, cursor: input.includes("0") ? "not-allowed" : "pointer" }}>0</button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={input.length !== 4}
                style={{ width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 8, border: "none", background: input.length === 4 ? "#81b64c" : "rgba(255,255,255,0.05)", color: input.length === 4 ? "#1a1a13" : "#3a3835", fontSize: 13, fontWeight: 800, cursor: input.length === 4 ? "pointer" : "not-allowed", transition: "all 0.13s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Zap size={14} /> Fire My Shot!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
