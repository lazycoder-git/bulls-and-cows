"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Trophy, Users, Clock, Calendar, ChevronRight,
  Zap, Star, Crown, Lock, CheckCircle2, CircleDot, Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import SignInPrompt from "@/components/SignInPrompt";
import { api, ApiError } from "@/lib/api";
import type { TournamentStatus } from "@traffic/shared";

/* ── Types ── */
interface TournamentEntry {
  id: string;
  name: string;
  status: TournamentStatus;
  format: "round-robin" | "single-elimination";
  participants: number;
  maxParticipants: number;
  prizeElo: number;
  startsAt: number;
  isRegistered?: boolean;
}

interface BracketMatch {
  id: string;
  round: number;
  player1?: string;
  player2?: string;
  winner?: string;
  score1?: number;
  score2?: number;
}

interface TournamentDetail extends TournamentEntry {
  matches?: BracketMatch[];
}

/* ── Helpers ── */
function formatTime(ts: number) {
  const diff = ts - Date.now();
  if (diff < 0) return "Ongoing";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)  return `${h}h ${m}m`;
  return `${m}m`;
}

function statusStyles(status: TournamentStatus): { label: string; color: string; bg: string; icon: React.ReactNode } {
  return {
    lobby:    { label: "Upcoming",  color: "#81b64c", bg: "rgba(129,182,76,0.12)",  icon: <Clock size={11} /> },
    active:   { label: "Live",      color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: <CircleDot size={11} style={{ animation: "pulse 1.2s ease-in-out infinite" }} /> },
    finished: { label: "Finished",  color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: <CheckCircle2 size={11} /> },
  }[status];
}

/* ── Main Page ── */
export default function TournamentsPage() {
  const { data: session }           = useSession();
  const [mounted, setMounted]       = useState(false);
  const [tab, setTab]               = useState<"browse" | "bracket">("browse");
  const [filter, setFilter]         = useState<"all" | "lobby" | "active" | "finished">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAuth, setShowAuth]     = useState(false);

  // Real data state
  const [tournaments, setTournaments]         = useState<TournamentEntry[]>([]);
  const [tournamentDetail, setTournamentDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [detailLoading, setDetailLoading]     = useState(false);
  const [registeringId, setRegisteringId]     = useState<string | null>(null);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch tournament list
  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    const statusParam = filter !== "all" ? `?status=${filter}` : "";
    api.get<{ tournaments: TournamentEntry[] }>(`/api/tournaments${statusParam}`)
      .then((d) => setTournaments(d.tournaments ?? []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, [mounted, filter]);

  // Fetch tournament detail when selected
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setTournamentDetail(null);
    api.get<{ tournament: TournamentDetail }>(`/api/tournaments/${selectedId}`)
      .then((d) => setTournamentDetail(d.tournament))
      .catch(() => setTournamentDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const requireAuth = (action: () => void) => {
    if (!session) { setShowAuth(true); } else { action(); }
  };

  const handleRegister = useCallback(async (id: string) => {
    if (!session) { setShowAuth(true); return; }
    setRegisteringId(id);
    setError(null);
    const backendToken = (session as any)?.backendToken as string | undefined;
    try {
      await api.post(`/api/tournaments/${id}/register`, {}, backendToken);
      // Optimistically mark as registered in UI
      setTournaments((prev) =>
        prev.map((t) => t.id === id ? { ...t, isRegistered: true, participants: t.participants + 1 } : t)
      );
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setRegisteringId(null);
    }
  }, [session]);

  const activeTournament = tournaments.find((t) => t.status === "active");

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
      {showAuth && <SignInPrompt reason="Sign in to join Tournaments" onClose={() => setShowAuth(false)} />}
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes livePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.4); } 50% { box-shadow: 0 0 0 6px rgba(248,113,113,0); } }
      `}</style>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Swords style={{ color: "#f59e0b" }} size={28} />
          <h1 className="text-4xl font-bold">Tournaments</h1>
        </div>
        <p className="text-gray-400">Compete in scheduled events. Win big ELO bonuses.</p>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#f87171", fontWeight: 600 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* ── Banner: Live tournament ── */}
      {activeTournament && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            background: "linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(245,158,11,0.08) 100%)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 12, padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, marginBottom: 24, flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171", animation: "livePulse 1.8s ease-in-out infinite", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🔴 {activeTournament.name} is LIVE!</div>
              <div style={{ fontSize: 12, color: "#b0a999", marginTop: 2 }}>
                In progress · {activeTournament.participants} players
              </div>
            </div>
          </div>
          <button
            onClick={() => { setTab("bracket"); setSelectedId(activeTournament.id); }}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "8px 20px" }}
          >
            Watch Bracket →
          </button>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
        {([["browse", "Browse Events"], ["bracket", "Live Bracket"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 24px", border: "none",
              borderBottom: tab === key ? "2px solid #81b64c" : "2px solid transparent",
              background: "none", color: tab === key ? "white" : "#7a7570",
              fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {(["all", "lobby", "active", "finished"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "5px 16px", borderRadius: 99, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                    background: filter === f ? "rgba(129,182,76,0.15)" : "rgba(255,255,255,0.05)",
                    color: filter === f ? "#81b64c" : "#7a7570",
                    outline: filter === f ? "1px solid rgba(129,182,76,0.4)" : "1px solid transparent",
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Tournament Cards */}
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "64px 0", color: "#595653" }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : tournaments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#595653" }}>
                <Swords size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No tournaments yet</p>
                <p style={{ fontSize: 13 }}>
                  {filter === "all"
                    ? "There are no scheduled tournaments at the moment. Check back soon!"
                    : `No ${filter} tournaments right now.`}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tournaments.map((t, i) => {
                  const s = statusStyles(t.status);
                  const pct = Math.round((t.participants / t.maxParticipants) * 100);
                  const isRegistering = registeringId === t.id;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      style={{
                        background: "#262421", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, padding: "18px 20px",
                        display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
                        transition: "border-color 0.15s",
                      }}
                      whileHover={{ borderColor: "rgba(129,182,76,0.25)" }}
                    >
                      {/* Icon */}
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: t.status === "active" ? "rgba(248,113,113,0.12)" : t.status === "lobby" ? "rgba(129,182,76,0.1)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {t.status === "finished" ? <Trophy size={22} style={{ color: "#f59e0b" }} /> : t.status === "active" ? <Swords size={22} style={{ color: "#f87171" }} /> : <Calendar size={22} style={{ color: "#81b64c" }} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: s.color, background: s.bg }}>
                            {s.icon} {s.label}
                          </span>
                          {t.isRegistered && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: "#81b64c", background: "rgba(129,182,76,0.1)", border: "1px solid rgba(129,182,76,0.2)" }}>
                              <CheckCircle2 size={10} /> Registered
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#7a7570", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Star size={11} style={{ color: "#f59e0b" }} />
                            {t.format === "round-robin" ? "Round Robin" : "Single Elimination"}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Zap size={11} style={{ color: "#81b64c" }} />
                            +{t.prizeElo} ELO prize
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />
                            {t.status === "lobby" ? `Starts in ${formatTime(t.startsAt)}` : t.status === "active" ? "In progress" : "Ended"}
                          </span>
                        </div>

                        {/* Participants bar */}
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#f59e0b" : "#81b64c", borderRadius: 2, transition: "width 0.4s ease" }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#7a7570", whiteSpace: "nowrap" }}>
                            <Users size={10} style={{ display: "inline", marginRight: 3 }} />
                            {t.participants}/{t.maxParticipants}
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ flexShrink: 0 }}>
                        {t.status === "lobby" && !t.isRegistered && (
                          <button
                            onClick={() => handleRegister(t.id)}
                            disabled={isRegistering}
                            className="btn btn-primary"
                            style={{ fontSize: 13, padding: "9px 22px", gap: 8, display: "flex", alignItems: "center" }}
                          >
                            {isRegistering
                              ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Joining…</>
                              : <><ChevronRight size={15} /> Register</>}
                          </button>
                        )}
                        {t.status === "lobby" && t.isRegistered && (
                          <button
                            disabled
                            style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: "rgba(129,182,76,0.1)", color: "#81b64c", fontSize: 13, fontWeight: 700, cursor: "default" }}
                          >
                            ✓ Registered
                          </button>
                        )}
                        {t.status === "active" && (
                          <button
                            onClick={() => { setTab("bracket"); setSelectedId(t.id); }}
                            style={{ padding: "9px 22px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                          >
                            <CircleDot size={13} /> View Live
                          </button>
                        )}
                        {t.status === "finished" && (
                          <button
                            onClick={() => { setTab("bracket"); setSelectedId(t.id); }}
                            style={{ padding: "9px 22px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#b0a999", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <Trophy size={13} /> Results
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === "bracket" && (
          <motion.div key="bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Tournament selector pills */}
            {tournaments.filter((t) => t.status !== "lobby").length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {tournaments.filter((t) => t.status !== "lobby").map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    style={{
                      padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                      background: selectedId === t.id ? "rgba(129,182,76,0.15)" : "rgba(255,255,255,0.05)",
                      color: selectedId === t.id ? "#81b64c" : "#7a7570",
                      outline: selectedId === t.id ? "1px solid rgba(129,182,76,0.4)" : "1px solid transparent",
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {!selectedId ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: "#595653" }}>
                <Trophy size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  {tournaments.filter((t) => t.status !== "lobby").length === 0
                    ? "No active or completed tournaments yet"
                    : "Select a tournament to view its bracket"}
                </p>
              </div>
            ) : detailLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
                <Loader2 size={28} style={{ color: "#595653", animation: "spin 1s linear infinite" }} />
              </div>
            ) : !tournamentDetail?.matches || tournamentDetail.matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: "#595653" }}>
                <CircleDot size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
                <p style={{ fontSize: 14, fontWeight: 600 }}>Bracket not yet generated</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Matches will appear here once the tournament starts.</p>
              </div>
            ) : (
              <BracketView matches={tournamentDetail.matches} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Bracket View ── */
function BracketView({ matches }: { matches: BracketMatch[] }) {
  const maxRound = Math.max(...matches.map((m) => m.round), 0);
  const rounds   = Array.from({ length: maxRound }, (_, i) => i + 1);

  const roundLabels: Record<number, string> = {
    1: maxRound >= 3 ? "Quarter-Finals" : maxRound === 2 ? "Semi-Finals" : "Final",
    2: maxRound >= 3 ? "Semi-Finals" : "Final",
    3: "Final",
    4: "Final",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 0, minWidth: 480 }}>
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          return (
            <div key={round} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ textAlign: "center", padding: "8px 0 20px", fontSize: 11, fontWeight: 800, color: "#81b64c", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {roundLabels[round] ?? `Round ${round}`}
              </div>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1, padding: "0 12px", gap: 16 }}>
                {roundMatches.map((match) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: "#262421", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}
                  >
                    {[
                      { name: match.player1, score: match.score1, isWinner: match.winner === match.player1 },
                      { name: match.player2, score: match.score2, isWinner: match.winner === match.player2 },
                    ].map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 12px",
                          background: p.isWinner ? "rgba(129,182,76,0.08)" : "transparent",
                          borderBottom: idx === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {p.isWinner && <Crown size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />}
                          <span style={{ fontSize: 12, fontWeight: p.isWinner ? 800 : 500, color: p.name ? (p.isWinner ? "white" : "#b0a999") : "#595653" }}>
                            {p.name ?? "TBD"}
                          </span>
                        </div>
                        {p.score !== undefined && (
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: p.isWinner ? "#81b64c" : "#7a7570" }}>
                            {p.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
