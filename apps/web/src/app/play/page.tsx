"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, Loader2, Trophy, Zap, Swords, Puzzle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { socketService } from "@/lib/socket";
import { api } from "@/lib/api";
import SignInPrompt from "@/components/SignInPrompt";
import Link from "next/link";

type Mode = "casual" | "rated" | "tournament";

export default function PlayLobby() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [queuing, setQueuing]       = useState(false);
  const [mode, setMode]             = useState<Mode>("casual");
  const [queueTime, setQueueTime]   = useState(0);
  const [mounted, setMounted]       = useState(false);
  const [showAuth, setShowAuth]     = useState(false);
  const [soloLoading, setSoloLoading] = useState(false);
  const socketInitRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Queue timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!queuing) { setQueueTime(0); return; }
    const interval = setInterval(() => setQueueTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [queuing]);

  // ── Socket connection (with auth token) ───────────────────────────────────────
  useEffect(() => {
    if (!mounted || socketInitRef.current) return;
    const backendToken = (session as any)?.backendToken as string | undefined;
    const socket = socketService.connect(backendToken);
    socketInitRef.current = true;

    socket.on("match:found", (data) => {
      setQueuing(false);
      router.push(`/game/${data.gameId}`);
    });
    socket.on("error", () => setQueuing(false));

    return () => {
      socket.off("match:found");
      socket.off("error");
    };
  }, [mounted, session, router]);

  // ── Solo game — calls real API ─────────────────────────────────────────────
  const startSoloGame = async () => {
    if (!session) { setShowAuth(true); return; }
    setSoloLoading(true);
    try {
      const backendToken = (session as any).backendToken as string | undefined;
      const data = await api.post<{ game: { id: string } }>(
        "/api/games/solo",
        {},
        backendToken
      );
      router.push(`/game/${data.game.id}`);
    } catch {
      // Fallback: generate a local solo-only game (no DB tracking)
      const localId = `solo-${Math.random().toString(36).slice(2, 8)}`;
      router.push(`/game/${localId}`);
    } finally {
      setSoloLoading(false);
    }
  };

  // ── Matchmaking queue ──────────────────────────────────────────────────────
  const joinQueue = (m: Mode) => {
    if (!session) { setShowAuth(true); return; }
    setMode(m);
    setQueuing(true);
    const socket = socketService.getSocket();
    if (socket?.connected) socket.emit("queue:join", m === "rated");
  };

  const cancelQueue = () => {
    setQueuing(false);
    socketService.getSocket()?.emit("queue:leave");
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flex: 1, height: "100vh", overflow: "hidden" }}>
      {showAuth && <SignInPrompt reason="Sign in to start playing" onClose={() => setShowAuth(false)} />}

      {/* ── Left: Big game visual ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: "#1a1a1a" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 360, height: 360,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6, margin: "0 auto 32px",
          }}>
            {DEMO_CELLS.map((cell, i) => (
              <div
                key={i}
                style={{
                  background: cell.filled ? "#2e2c2a" : "#262421",
                  border: `1px solid ${cell.filled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: cell.filled ? 28 : 20, fontWeight: 800, fontFamily: "monospace",
                  color: cell.bull ? "#e05252" : cell.cow ? "#e0a752" : "#4a4845",
                  aspectRatio: "1",
                }}
              >
                {cell.value ?? "·"}
              </div>
            ))}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Bulls &amp; Cows</h1>
          <p style={{ color: "#7a7570", fontSize: 14, maxWidth: 300, margin: "0 auto" }}>
            Crack the 4-digit code. Right digit right place = 🐂 Bull. Right digit wrong place = 🐄 Cow.
          </p>
        </div>
      </div>

      {/* ── Right: Control panel ── */}
      <div style={{
        width: 280, flexShrink: 0, background: "#262421",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["New Game", "Modes", "History"].map((tab, i) => (
            <button
              key={tab}
              style={{
                flex: 1, padding: "12px 0",
                background: i === 0 ? "rgba(255,255,255,0.04)" : "none", border: "none",
                borderBottom: i === 0 ? "2px solid #81b64c" : "2px solid transparent",
                color: i === 0 ? "white" : "#7a7570", fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "color 0.12s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence mode="wait">
            {queuing ? (
              <motion.div
                key="queuing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
              >
                <Loader2 size={36} style={{ color: "#81b64c", animation: "spin 1s linear infinite" }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Finding opponent...</div>
                  <div style={{ color: "#7a7570", fontSize: 13 }}>{fmt(queueTime)}</div>
                </div>
                <button
                  onClick={cancelQueue}
                  className="btn btn-outline"
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Cancel
                </button>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </motion.div>
            ) : (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {/* Solo — calls real API */}
                <button
                  onClick={startSoloGame}
                  disabled={soloLoading}
                  className="btn btn-primary"
                  style={{ width: "100%", fontSize: 15, padding: "12px 0", gap: 8 }}
                >
                  {soloLoading
                    ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    : <User size={18} />}
                  {soloLoading ? "Starting..." : "Play Solo"}
                </button>

                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                <ModeBtn
                  icon={<Users size={16} />}
                  label="Casual Match"
                  sublabel="Unranked — no ELO change"
                  onClick={() => joinQueue("casual")}
                />
                <ModeBtn
                  icon={<Swords size={16} />}
                  label="Ranked Match"
                  sublabel="ELO at stake"
                  onClick={() => joinQueue("rated")}
                />

                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                <LinkBtn icon={<Puzzle size={16} />} label="Daily Puzzle"    href="/puzzles/daily" />
                <LinkBtn icon={<Trophy size={16} />} label="Leaderboard"    href="/leaderboard" />
                <LinkBtn icon={<Star size={16} />}   label="OneShot Practice" href="/puzzles/oneshot" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */
function ModeBtn({ icon, label, sublabel, onClick }: { icon: React.ReactNode; label: string; sublabel: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        padding: "10px 12px", background: "#2c2b29", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6, color: "white", cursor: "pointer", textAlign: "left", transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#333230"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2c2b29"; }}
    >
      <span style={{ color: "#81b64c", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#7a7570", marginTop: 1 }}>{sublabel}</div>
      </div>
    </button>
  );
}

function LinkBtn({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        padding: "10px 12px", background: "#2c2b29", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6, color: "#b0a999", cursor: "pointer", textDecoration: "none",
        transition: "background 0.1s, color 0.1s", fontSize: 13, fontWeight: 600,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#333230";
        (e.currentTarget as HTMLElement).style.color = "white";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#2c2b29";
        (e.currentTarget as HTMLElement).style.color = "#b0a999";
      }}
    >
      <span style={{ color: "#81b64c", flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  );
}

/* Demo cells for the visual left panel */
const DEMO_CELLS: { value?: string; bull?: boolean; cow?: boolean; filled?: boolean }[] = [
  { value: "5", bull: true, filled: true },
  { value: "3", filled: true },
  { value: "8", cow: true, filled: true },
  { value: "1", filled: true },
  { value: "2", filled: true },
  { value: "7", bull: true, filled: true },
  { value: "4", filled: true },
  { value: "9", cow: true, filled: true },
  { filled: false }, { filled: false }, { filled: false }, { filled: false },
  { filled: false }, { filled: false }, { filled: false }, { filled: false },
];
