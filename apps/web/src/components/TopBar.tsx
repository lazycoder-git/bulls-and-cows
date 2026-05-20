"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getMyUsername } from "@/lib/username";
import { LogIn, UserPlus, ChevronDown, LogOut, User } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function OnlineBadge() {
  const [count, setCount] = useState<number | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/online`);
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // server may be down
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15_000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchCount]);

  if (count === null) return null;

  return (
    <div
      title={`${count} player${count !== 1 ? "s" : ""} online`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 99,
        background: "rgba(129,182,76,0.08)",
        border: "1px solid rgba(129,182,76,0.18)",
        fontSize: 12,
        fontWeight: 700,
        color: "#81b64c",
        letterSpacing: "-0.01em",
        userSelect: "none",
      }}
    >
      {/* Pulsing green dot */}
      <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#81b64c",
            display: "block",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "#81b64c",
            animation: "onlinePulse 2s ease-out infinite",
          }}
        />
      </span>
      {count.toLocaleString()} online
    </div>
  );
}

export default function TopBar() {
  const { data: session, status } = useSession();
  const [mounted, setMounted]     = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [username, setUsername]   = useState<string | null>(null);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setUsername(getMyUsername());
  }, []);

  // Hide topbar on fullscreen auth pages
  const hideOn = ["/auth/signin", "/auth/username"];
  if (!mounted || hideOn.some((p) => pathname?.startsWith(p))) return null;

  const user = session?.user;
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const hue = (user?.email?.charCodeAt(0) ?? 0) * 37 % 360;
  const displayName = username ?? user?.name?.split(" ")[0] ?? "Player";

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      height: 52,
      background: "rgba(26,24,20,0.88)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      flexShrink: 0,
    }}>
      {/* Online count — left side */}
      <OnlineBadge />

      {/* Auth controls — right side */}
      {status === "loading" ? (
        <div style={{ width: 80, height: 30, borderRadius: 99, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease infinite" }} />
      ) : user ? (
        /* ── Signed-in state ── */
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 99, padding: "5px 12px 5px 6px",
              cursor: "pointer", color: "white", transition: "background 0.12s",
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: user.image ? "transparent" : `hsla(${hue},60%,30%,0.7)`,
              border: "2px solid rgba(129,182,76,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, overflow: "hidden",
            }}>
              {user.image
                ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{displayName}</span>
            <ChevronDown size={13} style={{ color: "#7a7570", transform: menuOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 99,
                background: "#1e1c1a", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, minWidth: 180, overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: "#595653", marginTop: 2 }}>{user.email}</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", color: "#b0a999", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.1s", textAlign: "left" }}
                >
                  <User size={14} /> My Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                  style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.1s", textAlign: "left" }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Signed-out state ── */
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/auth/signin"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 99,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#d4cfc9", fontSize: 13, fontWeight: 700, textDecoration: "none",
              transition: "all 0.12s",
            }}
          >
            <LogIn size={14} />
            Log In
          </Link>
          <Link
            href="/auth/signin"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 18px", borderRadius: 99,
              background: "#81b64c", border: "none",
              color: "#1a1a13", fontSize: 13, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 2px 12px rgba(129,182,76,0.3)",
              transition: "all 0.12s",
            }}
          >
            <UserPlus size={14} />
            Sign Up
          </Link>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes onlinePulse {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
