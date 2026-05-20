"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDailyState, useOneshotState } from "@/lib/usePuzzleState";
import { getRankLabel } from "@traffic/shared";
import { Flame, Trophy, BarChart2, Clock, LogOut, Swords, Calendar, Zap, User } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface UserProfile {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  avatar: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  dailyStreak: number;
  bestStreak: number;
  rank: string;
  rankColor: string;
}

interface GameRecord {
  id: string;
  mode: string;
  status: string;
  winnerId: string | null;
  turnCount: number;
  isRated: boolean;
  createdAt: string;
  finishedAt: string | null;
  host: { id: string; username: string | null; rating: number } | null;
  guest: { id: string; username: string | null; rating: number } | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { state: daily }          = useDailyState();
  const { state: oneshot }        = useOneshotState();
  const [mounted, setMounted]     = useState(false);

  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [games, setGames]         = useState<GameRecord[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!session) return;
    const userId       = (session.user as any)?.id as string | undefined;
    const backendToken = (session as any)?.backendToken as string | undefined;
    if (!userId || !backendToken) return;

    // Fetch real profile
    api.get<{ user: UserProfile }>(`/api/users/${userId}`, backendToken)
      .then((d) => setProfile(d.user))
      .catch(() => {}) // will show fallback
      .finally(() => setProfileLoading(false));

    // Fetch real game history
    api.get<{ games: GameRecord[] }>(`/api/users/${userId}/games`, backendToken)
      .then((d) => setGames(d.games))
      .catch(() => {});
  }, [session]);

  if (!mounted || status === "loading") return null;

  const user      = session?.user;
  const elo       = profile?.rating ?? 1200;
  const rank      = getRankLabel(elo);
  const initials  = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const hue       = (user?.email?.charCodeAt(0) ?? 0) * 37 % 360;
  const displayNm = profile?.username ?? user?.name?.split(" ")[0] ?? "Player";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px 64px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: user?.image ? "transparent" : `hsla(${hue},60%,30%,0.6)`,
            border: "3px solid rgba(129,182,76,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 900, color: "white", overflow: "hidden", flexShrink: 0,
          }}>
            {user?.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>{displayNm}</h1>
            <div style={{ fontSize: 13, color: "#7a7570", marginTop: 2 }}>{user?.email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: `${rank.color}18`, color: rank.color, border: `1px solid ${rank.color}30` }}>
                {rank.label}
              </span>
              <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: "white" }}>{elo} ELO</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { icon: <Trophy size={18} />,    label: "ELO Rating",    value: String(elo),                                      color: "#f59e0b" },
            { icon: <Flame size={18} />,     label: "Daily Streak",  value: `${profile?.dailyStreak ?? daily.streak}🔥`,      color: "#f97316" },
            { icon: <Zap size={18} />,       label: "OneShot Streak",value: `${oneshot.streak}⚡`,                             color: "#81b64c" },
            { icon: <BarChart2 size={18} />, label: "Games Played",  value: String((profile?.gamesPlayed) ?? (games.length || 0)), color: "#818cf8" },
            { icon: <Swords size={18} />,    label: "Win Rate",      value: profile ? `${profile.winRate}%` : "—",            color: "#4ade80" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#262421", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" }}>
              <div style={{ color: s.color, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: "white" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#595653", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Puzzle streak details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
          <StreakCard
            icon={<Calendar size={16} style={{ color: "#81b64c" }} />}
            title="Daily Puzzle"
            streak={profile?.dailyStreak ?? daily.streak}
            best={profile?.bestStreak ?? daily.longestStreak}
            subtext={daily.completed ? (daily.guessCount > 0 ? `Today: ${daily.guessCount} guesses ✓` : "Today: Failed") : "Not played yet today"}
            href="/puzzles/daily"
          />
          <StreakCard
            icon={<Zap size={16} style={{ color: "#81b64c" }} />}
            title="OneShot"
            streak={oneshot.streak}
            best={oneshot.longestStreak}
            subtext={`${oneshot.totalCorrect}/${oneshot.totalPlayed} correct`}
            href="/puzzles/oneshot"
          />
        </div>

        {/* Game history */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <Clock size={18} style={{ color: "#81b64c" }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Game History</h2>
          </div>

          {profileLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#595653", fontSize: 13 }}>Loading…</div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#595653" }}>
              <User size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>No games played yet</div>
              <Link href="/play" style={{ display: "inline-block", marginTop: 12, padding: "8px 20px", borderRadius: 8, background: "#81b64c", color: "#1a1a13", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                Play Now
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {games.map((g, i) => {
                const myId  = (session?.user as any)?.id as string | undefined;
                const won   = g.winnerId === myId;
                const lost  = g.winnerId && g.winnerId !== myId;
                const result = won ? "win" : lost ? "loss" : "draw";
                const opponent = g.host?.id === myId ? g.guest : g.host;
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 10,
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: result === "win" ? "#4ade80" : result === "loss" ? "#f87171" : "#f59e0b", flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#b0a999", textTransform: "capitalize", minWidth: 60 }}>{g.mode}</div>
                    <div style={{ fontSize: 12, color: "#595653", flex: 1 }}>
                      {opponent ? `vs ${opponent.username ?? "Unknown"}` : "Solo"} · {g.turnCount} moves
                    </div>
                    <div style={{ fontSize: 11, color: "#595653" }}>
                      {new Date(g.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: result === "win" ? "#4ade80" : result === "loss" ? "#f87171" : "#f59e0b" }}>
                      {result.toUpperCase()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StreakCard({ icon, title, streak, best, subtext, href }: {
  icon: React.ReactNode; title: string; streak: number; best: number; subtext: string; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{ background: "#262421", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, cursor: "pointer", transition: "border-color 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {icon}
          <span style={{ fontWeight: 800, fontSize: 14 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 900, color: streak > 0 ? "#f97316" : "#595653" }}>{streak}</span>
          <span style={{ fontSize: 12, color: "#595653" }}>current</span>
          <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#7a7570", marginLeft: 12 }}>{best}</span>
          <span style={{ fontSize: 12, color: "#595653" }}>best</span>
        </div>
        <div style={{ fontSize: 11, color: "#595653" }}>{subtext}</div>
        {streak > 0 && (
          <div style={{ display: "flex", marginTop: 8 }}>
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <Flame key={i} size={12} style={{ color: "#f97316", opacity: 0.6 + (i / 7) * 0.4 }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
