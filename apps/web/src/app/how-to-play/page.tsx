"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle, Brain, Zap, Trophy, Users, Target, CheckCircle2,
  XCircle, BookOpen, Swords, Lightbulb,
} from "lucide-react";
import Link from "next/link";

const SECTION_DELAY = 0.07;

export default function HowToPlayPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 48px 64px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 800 }}>

      {/* ── Title ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <HelpCircle size={28} style={{ color: "#81b64c" }} />
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
            How to Play
          </h1>
        </div>
        <p style={{ color: "#7a7570", fontSize: 15, margin: 0 }}>
          Master Bulls &amp; Cows — the ultimate code-cracking challenge.
        </p>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: 760 }}>

        {/* ── Section: The Basics ── */}
        <Section delay={SECTION_DELAY * 1} icon={<BookOpen size={22} style={{ color: "#81b64c" }} />} title="The Basics">
          <p style={bodyText}>
            The game generates a secret <strong style={{ color: "white" }}>4-digit number</strong> with all
            unique digits (e.g. <Code>5 2 7 4</Code>). Your goal is to guess it by submitting 4-digit guesses
            and using the feedback clues to narrow down the answer.
          </p>
          <InfoBox color="#81b64c">
            Think of it like Wordle, but with numbers and no colour encoding — just Bulls and Cows.
          </InfoBox>
        </Section>

        {/* ── Section: Bulls & Cows Explained ── */}
        <Section delay={SECTION_DELAY * 2} icon={<Target size={22} style={{ color: "#f87171" }} />} title="Bulls & Cows">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ResultCard
              emoji="🐂"
              label="Bull"
              color="#f87171"
              bg="rgba(239,68,68,0.08)"
              border="rgba(239,68,68,0.2)"
              desc="Correct digit in the CORRECT position."
            />
            <ResultCard
              emoji="🐄"
              label="Cow"
              color="#fbbf24"
              bg="rgba(245,158,11,0.08)"
              border="rgba(245,158,11,0.2)"
              desc="Correct digit in the WRONG position."
            />
          </div>

          {/* Worked example */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#595653", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Example — Secret: <Code>5 2 7 4</Code></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { guess: "5 1 9 3", bulls: 1, cows: 0, note: "5 is in the right place → 1 Bull" },
                { guess: "9 7 5 2", bulls: 0, cows: 3, note: "7, 5, 2 exist but wrong positions → 3 Cows" },
                { guess: "5 2 4 7", bulls: 2, cows: 2, note: "5 and 2 correct; 7 and 4 wrong positions" },
                { guess: "5 2 7 4", bulls: 4, cows: 0, note: "All correct — you win! 🎉" },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  style={{
                    display: "flex", alignItems: "center",
                    background: row.bulls === 4 ? "rgba(129,182,76,0.06)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${row.bulls === 4 ? "rgba(129,182,76,0.2)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 10, padding: "10px 16px", flexWrap: "wrap", gap: 12,
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", color: "white", flexShrink: 0 }}>
                    {row.guess}
                  </span>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Pill value={row.bulls} label="B" isBull />
                    <Pill value={row.cows}  label="C" isBull={false} />
                  </div>
                  <span style={{ fontSize: 12, color: "#7a7570", flex: 1 }}>{row.note}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Section: Game Modes ── */}
        <Section delay={SECTION_DELAY * 3} icon={<Brain size={22} style={{ color: "#818cf8" }} />} title="Game Modes">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: <Users size={18} />, name: "Casual Match", color: "#818cf8", desc: "Play against another player in real-time. No ELO at stake — just fun.", href: "/play" },
              { icon: <Swords size={18} />, name: "Ranked Match", color: "#f59e0b", desc: "Compete for ELO. Wins boost your rating, losses reduce it.", href: "/play" },
              { icon: <Zap size={18} />,   name: "OneShot",       color: "#81b64c", desc: "5 clue moves are given. You get ONE guess to crack the code.", href: "/puzzles/oneshot" },
              { icon: <BookOpen size={18} />, name: "Daily Puzzle", color: "#a78bfa", desc: "Same puzzle for all players worldwide. Compete for fewest guesses.", href: "/puzzles/daily" },
              { icon: <Trophy size={18} />, name: "Tournaments",  color: "#f87171", desc: "Scheduled competitive events with big ELO prize pools.", href: "/tournaments" },
              { icon: <Users size={18} />, name: "Rooms",         color: "#34d399", desc: "Create a private room and challenge a specific friend.", href: "/rooms" },
            ].map((m, i) => (
              <Link key={m.name} href={m.href} style={{ textDecoration: "none" }}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  style={{
                    background: "#262421", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
                    padding: "16px", height: "100%", transition: "border-color 0.15s",
                  }}
                  whileHover={{ borderColor: `${m.color}44` }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: m.color, marginBottom: 10 }}>
                    {m.icon}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "white", marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#7a7570", lineHeight: 1.6 }}>{m.desc}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Section: Rules ── */}
        <Section delay={SECTION_DELAY * 4} icon={<CheckCircle2 size={22} style={{ color: "#4ade80" }} />} title="Rules">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "The secret is always a 4-digit number with all unique digits.",
              "The first digit is never 0 (e.g. 0472 is not a valid secret).",
              "Your guesses must also use 4 unique digits.",
              "In multiplayer, both players guess the same secret simultaneously.",
              "The player who reaches 4 Bulls first wins.",
              "In Ranked mode, ELO changes are based on the difference in your ratings.",
              "OneShot gives you 5 clues and exactly one guess — no more.",
              "Daily Puzzle is the same for everyone — results are global.",
            ].map((rule, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span style={{ color: "#81b64c", fontWeight: 800, fontSize: 12, width: 18, flexShrink: 0, paddingTop: 1 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: "#b0a999", lineHeight: 1.6 }}>{rule}</span>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── Section: Strategy Tips ── */}
        <Section delay={SECTION_DELAY * 5} icon={<Lightbulb size={22} style={{ color: "#f59e0b" }} />} title="Strategy Tips">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { tip: "Start with a spread guess", detail: 'Use digits spread across different ranges, like "1357" — maximises information from your first guess.' },
              { tip: "Track eliminated digits", detail: "If a digit gives 0 Bulls and 0 Cows, eliminate it from all future guesses immediately." },
              { tip: "Use positional info", detail: "If you get 1 Bull, try moving that digit to other positions while keeping the rest different." },
              { tip: "Count possibilities", detail: "After each guess, mentally count how many valid secrets remain — it drops fast with Bulls." },
              { tip: "OneShot strategy", detail: "Use all 5 clues to eliminate digits. Look for digits that never appear in any clue — they're in the secret." },
              { tip: "Tournament pacing", detail: "In tournaments, speed matters. A quick 3-guess solution beats a slow 2-guess one if turns overlap." },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 10, padding: "14px 16px" }}
              >
                <div style={{ fontWeight: 800, fontSize: 13, color: "#fbbf24", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lightbulb size={13} /> {t.tip}
                </div>
                <div style={{ fontSize: 12, color: "#7a7570", lineHeight: 1.65 }}>{t.detail}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <Link href="/play" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, background: "#81b64c", color: "#1a1a13", fontWeight: 800, fontSize: 14, textDecoration: "none", transition: "all 0.15s" }}>
            <Brain size={18} /> Play Now
          </Link>
          <Link href="/puzzles/oneshot" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#d4cfc9", fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.15s" }}>
            <Zap size={18} /> Try OneShot
          </Link>
        </motion.div>

      </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ delay, icon, title, children }: { delay: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {icon}
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95em", padding: "1px 6px", background: "rgba(129,182,76,0.1)", border: "1px solid rgba(129,182,76,0.2)", borderRadius: 4, color: "#81b64c" }}>
      {children}
    </code>
  );
}

function InfoBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, padding: "12px 16px", background: `${color}0d`, border: `1px solid ${color}25`, borderRadius: 10, fontSize: 13, color: "#b0a999", lineHeight: 1.65 }}>
      💡 {children}
    </div>
  );
}

function ResultCard({ emoji, label, color, bg, border, desc }: { emoji: string; label: string; color: string; bg: string; border: string; desc: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 16px" }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#7a7570", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function Pill({ value, label, isBull }: { value: number; label: string; isBull: boolean }) {
  const active = value > 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
      background: active ? (isBull ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)") : "rgba(255,255,255,0.05)",
      color: active ? (isBull ? "#f87171" : "#fbbf24") : "#595653",
    }}>
      {value}<span style={{ fontSize: 10, textTransform: "uppercase" }}>{label}</span>
    </span>
  );
}

const bodyText: React.CSSProperties = {
  fontSize: 14, color: "#b0a999", lineHeight: 1.75, margin: 0,
};
