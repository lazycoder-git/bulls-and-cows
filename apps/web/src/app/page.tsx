"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Brain, Users, Zap, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const SignInPrompt = dynamic(() => import("@/components/SignInPrompt"), { ssr: false });

export default function Home() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Show sign-in popup automatically for guests after a brief delay
  useEffect(() => {
    if (status === "unauthenticated") {
      const t = setTimeout(() => setShowSignIn(true), 1200);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!mounted) return null;

  const isGuest = status === "unauthenticated";

  const handlePlayClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setShowSignIn(true);
    }
  };

  return (
    <>
      {/* Sign-in popup for guests */}
      <AnimatePresence>
        {showSignIn && isGuest && (
          <SignInPrompt
            reason="Sign in to start playing 🎯"
            onClose={() => setShowSignIn(false)}
            mode="overlay"
          />
        )}
      </AnimatePresence>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#1a1a1a" }}>

        {/* ── Hero ── */}
        <section style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "64px 32px" }}>
          <div style={{ maxWidth: 760, textAlign: "center" }}>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: 20,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Crack the Code.{" "}
              <span style={{
                background: "linear-gradient(135deg, #81b64c 0%, #5fb840 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Dominate the Board.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={{ fontSize: 16, color: "#7a7570", marginBottom: 36, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}
            >
              The classic Bulls &amp; Cows game reimagined — competitive ELO rankings, daily puzzles, and real-time multiplayer.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
            >
              <Link
                href="/play"
                onClick={handlePlayClick}
                className="btn btn-primary"
                style={{ fontSize: 15, padding: "12px 28px" }}
              >
                <Users size={18} />
                Play Now
              </Link>
              <Link
                href="/puzzles/daily"
                onClick={handlePlayClick}
                className="btn btn-outline"
                style={{ fontSize: 15, padding: "12px 28px" }}
              >
                <Brain size={18} />
                Daily Puzzle
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding: "48px 32px 64px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="container">
            <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, marginBottom: 32, color: "#b0a999" }}>
              Everything you need to play
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  style={{
                    background: "#262421",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8,
                    padding: "20px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "rgba(129,182,76,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#81b64c",
                  }}>
                    {f.icon}
                  </div>
                  <Link href={f.href} onClick={isGuest ? handlePlayClick : undefined} style={{ textDecoration: "none" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "white" }}>{f.title}</h3>
                  </Link>
                  <p style={{ fontSize: 13, color: "#7a7570", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                  <Link
                    href={f.href}
                    onClick={isGuest ? handlePlayClick : undefined}
                    style={{ fontSize: 12, color: "#81b64c", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 600, marginTop: "auto" }}
                  >
                    {f.cta} <ArrowRight size={12} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const FEATURES = [
  {
    icon: <Trophy size={20} />,
    title: "Competitive Ladder",
    desc: "Battle players worldwide, earn ELO, and climb from Novice to Grandmaster with every match.",
    href: "/leaderboard",
    cta: "View Leaderboard",
  },
  {
    icon: <Brain size={20} />,
    title: "Daily Puzzles",
    desc: "A new secret code every day. All players — same puzzle. Compete for fewest guesses.",
    href: "/puzzles/daily",
    cta: "Today's Puzzle",
  },
  {
    icon: <Users size={20} />,
    title: "Private Rooms",
    desc: "Create a room and challenge your friends to casual or rated matches in private.",
    href: "/rooms",
    cta: "Create a Room",
  },
  {
    icon: <Zap size={20} />,
    title: "OneShot Practice",
    desc: "Unlimited random puzzles to sharpen your logic. No limits, instant play.",
    href: "/puzzles/oneshot",
    cta: "Start Practicing",
  },
];
