"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Search, X, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { getRankLabel } from "@traffic/shared";
import { api } from "@/lib/api";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  gamesPlayed?: number;
  image?: string;
}

interface MyRank {
  rank: number | null;
  totalPlayers: number;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  rankLabel: string;
  rankColor: string;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [mounted, setMounted]   = useState(false);
  const [query, setQuery]       = useState("");
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank]     = useState<MyRank | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const backendToken = (session as any)?.backendToken as string | undefined;

    // Fetch global leaderboard
    api.get<{ success: boolean; leaderboard: LeaderboardEntry[] }>("/api/leaderboard")
      .then((d) => {
        if (d.success) setEntries(d.leaderboard);
      })
      .catch(() => {}) // silently show empty
      .finally(() => setLoading(false));

    // Fetch my rank if signed in
    if (backendToken) {
      api.get<{ success: boolean; me: MyRank }>("/api/leaderboard/me", backendToken)
        .then((d) => { if (d.success) setMyRank(d.me); })
        .catch(() => {});
    }
  }, [mounted, session]);

  const q        = query.trim().toLowerCase();
  const filtered = useMemo(() =>
    q ? entries.filter((e) => e.username.toLowerCase().includes(q)) : entries,
  [q, entries]);

  const user = session?.user;
  if (!mounted) return null;

  return (
    <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Trophy size={26} style={{ color: "#f59e0b" }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>Leaderboard</h1>
        </div>
        <p style={{ color: "#7a7570", margin: 0, fontSize: 14 }}>Top players ranked by ELO rating.</p>
      </motion.div>

      {/* ── Your Rank card (only when signed in) ── */}
      {user && myRank && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "linear-gradient(135deg, rgba(129,182,76,0.08), rgba(129,182,76,0.04))",
            border: "1px solid rgba(129,182,76,0.25)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `hsla(${(user.email?.charCodeAt(0) ?? 0) * 37 % 360},60%,30%,0.6)`, border: "2px solid rgba(129,182,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            {user.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : (user.name?.[0] ?? "?")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontWeight: 800, color: "white" }}>{user.name?.split(" ")[0] ?? "You"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(129,182,76,0.15)", color: "#81b64c" }}>Your Rank</span>
            </div>
            <div style={{ fontSize: 12, color: "#7a7570" }}>{myRank.rankLabel} · {myRank.rating} ELO</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 900, color: "#81b64c" }}>
              {myRank.rank ? `#${myRank.rank}` : "Unranked"}
            </div>
            <div style={{ fontSize: 11, color: "#595653" }}>Global rank</div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, color: "#4ade80" }}>{myRank.wins}</div>
              <div style={{ color: "#595653" }}>Wins</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, color: "#f87171" }}>{myRank.losses}</div>
              <div style={{ color: "#595653" }}>Losses</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, color: "white" }}>{myRank.winRate}%</div>
              <div style={{ color: "#595653" }}>Win Rate</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Podium (top 3, only when not searching and data loaded) */}
      {!q && filtered.length >= 3 && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, marginBottom: 40 }}>
          {[filtered[1], filtered[0], filtered[2]].map((entry, idx) => {
            const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights: Record<number, number> = { 1: 110, 2: 80, 3: 64 };
            const colors: Record<number, { bg: string; border: string; text: string }> = {
              1: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)",    text: "#f59e0b" },
              2: { bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.25)", text: "#9ca3af" },
              3: { bg: "rgba(180,83,9,0.10)",    border: "rgba(180,83,9,0.25)",    text: "#b45309" },
            };
            const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
            return (
              <motion.div key={entry.userId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 20 }}>{medals[pos]}</div>
                <div style={{ fontWeight: 800, fontSize: 12, color: "white" }}>{entry.username}</div>
                <div style={{ fontSize: 11, color: "#7a7570", fontFamily: "monospace", fontWeight: 700 }}>{entry.rating}</div>
                <div style={{ width: 72, height: heights[pos], borderRadius: "8px 8px 0 0", background: colors[pos].bg, border: `1px solid ${colors[pos].border}`, borderBottom: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 16, color: colors[pos].text }}>#{pos}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#262421", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "10px 14px", transition: "border-color 0.15s" }}>
          <Search size={16} style={{ color: "#595653", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 14, fontWeight: 500 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#595653", cursor: "pointer", padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
        {query && (
          <div style={{ fontSize: 12, color: "#595653", marginTop: 6, paddingLeft: 4 }}>
            {filtered.length > 0 ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"` : `No players found for "${query}"`}
          </div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: "#262421", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "3rem 1fr 7rem 7rem 6rem", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 800, color: "#595653", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <div>#</div><div>Player</div><div style={{ textAlign: "right" }}>Rating</div><div style={{ textAlign: "right" }}>W / L</div><div style={{ textAlign: "right" }}>Win Rate</div>
        </div>

        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#595653" }}>
            <div style={{ fontSize: 14 }}>Loading rankings…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#595653" }}>
            <User size={28} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>{q ? "No players match your search" : "No ranked players yet. Play some games!"}</div>
          </div>
        ) : filtered.map((entry, i) => {
          const rankLabel = getRankLabel(entry.rating);
          const myUserId  = (session?.user as any)?.id;
          const isMe      = user && entry.userId === myUserId;
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.02 * i }}
              style={{
                display: "grid", gridTemplateColumns: "3rem 1fr 7rem 7rem 6rem", gap: 12, alignItems: "center",
                padding: "13px 20px",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: isMe ? "rgba(129,182,76,0.06)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#7a7570", fontSize: 13 }}>
                {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : `#${entry.rank}`}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, background: `hsla(${entry.userId.charCodeAt(0) * 37 % 360},55%,28%,0.6)`, border: isMe ? "2px solid rgba(129,182,76,0.5)" : "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  {entry.image
                    ? <img src={entry.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : entry.username[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: isMe ? "#81b64c" : "white", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.username}{isMe && " (you)"}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: rankLabel.color }}>{rankLabel.label}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "white" }}>{entry.rating}</div>
              <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 13 }}>
                <span style={{ color: "#4ade80" }}>{entry.wins ?? "—"}</span>
                <span style={{ color: "#595653" }}> / </span>
                <span style={{ color: "#f87171" }}>{entry.losses ?? "—"}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                {entry.winRate !== undefined
                  ? <span style={{ fontWeight: 800, fontSize: 13, color: entry.winRate >= 70 ? "#4ade80" : entry.winRate >= 50 ? "#f59e0b" : "#f87171" }}>{entry.winRate}%</span>
                  : <span style={{ color: "#595653" }}>—</span>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
