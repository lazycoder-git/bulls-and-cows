"use client";

import { useState, useEffect } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no decision has been made yet
    const consent = getCookie("cookie_consent");
    if (!consent) {
      // 4 second delay — give the user time to orient themselves first
      const t = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => { setCookie("cookie_consent", "accepted", 365); setVisible(false); };
  const reject = () => { setCookie("cookie_consent", "rejected", 365); setVisible(false); };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        width: 320,
        background: "#2c2b29",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "16px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        animation: "slideUp 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>🍪 Cookies</span>
        <button
          onClick={reject}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", color: "#7a7570", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "white"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#7a7570"; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Message */}
      <p style={{ fontSize: 12, color: "#b0a999", margin: 0, lineHeight: 1.6 }}>
        We use cookies to improve your experience. Essential login cookies are always enabled.
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={reject}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            color: "#b0a999",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
        >
          Reject
        </button>
        <button
          onClick={accept}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "#81b64c",
            border: "none",
            borderRadius: 6,
            color: "#1a1a13",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#8dc455"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#81b64c"; }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
