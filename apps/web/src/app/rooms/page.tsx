"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Globe, Copy, Check, ArrowRight,
  Swords, Crown, Clock, Zap, X, Hash, Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import SignInPrompt from "@/components/SignInPrompt";
import { api } from "@/lib/api";
import { socketService } from "@/lib/socket";
import type { Room, RoomStatus } from "@traffic/shared";

/* ── No mocks — data comes from real API ── */

/* ── Util ── */
function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

function statusBadge(status: RoomStatus) {
  const map: Record<RoomStatus, { label: string; color: string; bg: string }> = {
    open:    { label: "Open",    color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    full:    { label: "Full",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    playing: { label: "Playing", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
    done:    { label: "Done",    color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

/* ── Main Page ── */
export default function RoomsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [showAuth, setShowAuth]     = useState(false);
  const [filter, setFilter]     = useState<"all" | "open" | "rated">("all");
  const [copied, setCopied]     = useState<string | null>(null);
  const [rooms, setRooms]       = useState<(Room & { hostName?: string })[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Fetch open rooms from server
  useEffect(() => {
    if (!mounted) return;
    const backendToken = (session as any)?.backendToken as string | undefined;
    // The leaderboard / rooms list could be a dedicated endpoint;
    // for now we'll show an empty list if no endpoint exists yet
    setRoomsLoading(false);
  }, [mounted, session]);

  // Socket: redirect when game starts (room:update → 'playing')
  useEffect(() => {
    if (!mounted || !session) return;
    const backendToken = (session as any)?.backendToken as string | undefined;
    const socket = socketService.connect(backendToken);

    socket.on("room:update", (room: Room) => {
      setRooms((prev) => prev.map((r) => r.code === room.code ? { ...r, ...room } : r));
    });

    socket.on("game:state", (state: any) => {
      if (state?.id) router.push(`/game/${state.id}`);
    });

    return () => {
      socket.off("room:update");
      socket.off("game:state");
    };
  }, [mounted, session, router]);

  const requireAuth = (action: () => void) => {
    if (!session) { setShowAuth(true); } else { action(); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  };

  const filtered = rooms.filter((r) => {
    if (filter === "open")  return r.status === "open";
    if (filter === "rated") return r.isRated && r.status === "open";
    return true;
  });

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
      {showAuth && <SignInPrompt reason="Sign in to use Rooms" onClose={() => setShowAuth(false)} />}

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users style={{ color: "#818cf8" }} size={28} />
              <h1 className="text-4xl font-bold">Private Rooms</h1>
            </div>
            <p className="text-gray-400">Create or join a room to challenge a friend.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => requireAuth(() => setShowJoin(true))}
              className="btn btn-outline"
              style={{ gap: 8, display: "flex", alignItems: "center" }}
            >
              <Hash size={16} /> Join by Code
            </button>
            <button
              onClick={() => requireAuth(() => setShowCreate(true))}
              className="btn btn-primary"
              style={{ gap: 8, display: "flex", alignItems: "center" }}
            >
              <Plus size={18} /> Create Room
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Filter Tabs ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-1 mb-6">
        {(["all", "open", "rated"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 18px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
              background: filter === f ? "rgba(129,182,76,0.15)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#81b64c" : "#7a7570",
              borderBottom: filter === f ? "2px solid #81b64c" : "2px solid transparent",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#595653", alignSelf: "center" }}>
          {filtered.length} room{filtered.length !== 1 ? "s" : ""}
        </span>
      </motion.div>

      {/* ── Rooms Grid ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}
      >
        <AnimatePresence>
          {filtered.map((room, i) => (
            <motion.div
              key={room.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: "#262421",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "20px 20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                transition: "border-color 0.15s",
              }}
              whileHover={{ borderColor: "rgba(129,182,76,0.3)" }}
            >
              {/* Room header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.08em", color: "white" }}>
                      #{room.code}
                    </span>
                    {room.isRated
                      ? <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", padding: "1px 7px", borderRadius: 99 }}>RATED</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: "#7a7570", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 7px", borderRadius: 99 }}>CASUAL</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: "#7a7570", display: "flex", alignItems: "center", gap: 5 }}>
                    <Crown size={11} style={{ color: "#f59e0b" }} />
                    {room.hostName}
                    <span style={{ margin: "0 2px" }}>·</span>
                    <Clock size={11} />
                    {ago(room.createdAt)}
                  </div>
                </div>
                {statusBadge(room.status)}
              </div>

              {/* Players */}
              <div style={{ display: "flex", gap: 8 }}>
                {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                  const p = room.players[idx];
                  return p ? (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 10px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `hsla(${(p.id.charCodeAt(1) ?? 60) * 37 % 360},60%,30%,0.6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {p.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{p.username}</div>
                        <div style={{ fontSize: 10, color: "#7a7570" }}>{p.rating} ELO</div>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "7px 10px", border: "1px dashed rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, color: "#595653" }}>Empty slot</span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => copyCode(room.code)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "#b0a999", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {copied === room.code ? <Check size={13} style={{ color: "#81b64c" }} /> : <Copy size={13} />}
                  {copied === room.code ? "Copied!" : "Copy Code"}
                </button>
                {room.status === "open" && (
                  <Link
                    href={`/rooms/${room.code}`}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "7px 0" }}
                  >
                    <ArrowRight size={15} /> Join Room
                  </Link>
                )}
                {room.status === "playing" && (
                  <button
                    disabled
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "7px 0", borderRadius: 6, border: "none",
                      background: "rgba(129,140,248,0.1)", color: "#818cf8", fontSize: 13, fontWeight: 700, cursor: "not-allowed",
                    }}
                  >
                    <Swords size={14} /> In Progress
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px 0", color: "#595653" }}
          >
            <Users size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>No rooms found</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Be the first — create a room!</p>
          </motion.div>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            session={session}
            onClose={() => setShowCreate(false)}
            onCreated={(room) => {
              setRooms((prev) => [room, ...prev]);
              setShowCreate(false);
            }}
          />
        )}
        {showJoin && (
          <JoinByCodeModal
            session={session}
            onClose={() => setShowJoin(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Create Room Modal ── */
function CreateRoomModal({
  session, onClose, onCreated,
}: {
  session: any;
  onClose: () => void;
  onCreated: (room: any) => void;
}) {
  const router  = useRouter();
  const [rated, setRated]       = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const backendToken = session?.backendToken as string | undefined;
    try {
      const data = await api.post<{ room: any }>("/api/games/room", { isRated: rated }, backendToken);
      const { room } = data;
      // Join the socket room to receive updates
      const socket = socketService.getSocket();
      if (socket?.connected) socket.emit("room:join", room.code);
      onCreated(room);
      // Show the room code to copy — redirect to a waiting page or stay on rooms
      router.push(`/rooms/${room.code}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create room");
      setCreating(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        style={{ background: "#262421", borderRadius: 16, padding: 32, width: "min(440px, 90vw)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Create Room</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7a7570", cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: rated ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)", borderRadius: 10, border: `1px solid ${rated ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Swords size={18} style={{ color: rated ? "#f59e0b" : "#7a7570" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Rated Match</div>
                <div style={{ fontSize: 11, color: "#7a7570", marginTop: 1 }}>ELO changes after the game</div>
              </div>
            </div>
            <div
              onClick={() => setRated((r) => !r)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: rated ? "#f59e0b" : "rgba(255,255,255,0.12)",
                position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: rated ? 21 : 3, width: 16, height: 16, borderRadius: "50%",
                background: "white", transition: "left 0.2s",
              }} />
            </div>
          </label>

          <div style={{ padding: "12px 16px", background: "rgba(129,182,76,0.06)", borderRadius: 10, border: "1px solid rgba(129,182,76,0.15)", fontSize: 12, color: "#7a7570", lineHeight: 1.6 }}>
            <Globe size={13} style={{ display: "inline", marginRight: 6, color: "#81b64c" }} />
            Your room code will be generated automatically. Share it with a friend to invite them.
          </div>

          <button
            onClick={handleCreate}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "13px 0" }}
          >
            {creating ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Creating…
              </span>
            ) : (
              <><Plus size={18} /> Create Room</>
            )}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </Overlay>
  );
}

/* ── Join by Code Modal ── */
function JoinByCodeModal({
  session, onClose,
}: {
  session: any;
  onClose: () => void;
}) {
  const router    = useRouter();
  const [code, setCode]     = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError(null);
    const backendToken = session?.backendToken as string | undefined;
    try {
      const data = await api.post<{ room: any; gameId?: string }>(
        `/api/games/room/${code.trim().toUpperCase()}/join`,
        {},
        backendToken
      );
      // Join the socket room
      const socket = socketService.getSocket();
      if (socket?.connected) socket.emit("room:join", code.trim().toUpperCase());

      if (data.gameId) {
        // Room was full — game started immediately
        router.push(`/game/${data.gameId}`);
      } else {
        router.push(`/rooms/${code.trim().toUpperCase()}`);
      }
    } catch (err: any) {
      setError(err.message ?? "Room not found or full");
      setJoining(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        style={{ background: "#262421", borderRadius: 16, padding: 32, width: "min(400px, 90vw)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Join by Code</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#7a7570", cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="Enter room code (e.g. ALPHA)"
            className="input-base"
            style={{ textAlign: "center", fontFamily: "monospace", fontSize: 18, fontWeight: 800, letterSpacing: "0.15em" }}
          />
          {error && (
            <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600, textAlign: "center" }}>{error}</div>
          )}
          <button
            onClick={handleJoin}
            disabled={code.trim().length < 2 || joining}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 0" }}
          >
            {joining
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Joining…</>
              : <><ArrowRight size={18} /> Join Room</>}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </Overlay>
  );
}

/* ── Overlay wrapper ── */
function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </motion.div>
  );
}
