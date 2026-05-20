"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, Swords } from "lucide-react";

interface SignInPromptProps {
  /** What the user was trying to do — shown in the modal headline */
  reason?: string;
  /** Called when the modal is dismissed */
  onClose?: () => void;
  /** Whether to show as fullscreen overlay (default) or inline card */
  mode?: "overlay" | "inline";
}

export default function SignInPrompt({ reason, onClose, mode = "overlay" }: SignInPromptProps) {
  const router = useRouter();

  const handleSignIn = () => {
    onClose?.();
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(window.location.pathname));
  };

  const card = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 24 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "linear-gradient(160deg, #1e1c1a 0%, #221f1b 100%)",
        border: "1px solid rgba(129,182,76,0.18)",
        borderRadius: 24,
        padding: "40px 36px 32px",
        width: "min(420px, 92vw)",
        position: "relative",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(129,182,76,0.06)",
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, color: "#7a7570", cursor: "pointer", padding: "5px 6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
        >
          <X size={15} />
        </button>
      )}

      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%", marginBottom: 22,
        background: "linear-gradient(135deg, #81b64c, #5fb840)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 28px rgba(129,182,76,0.35)",
      }}>
        <Swords size={26} color="#1a1a13" strokeWidth={2.5} />
      </div>

      <h2 style={{
        fontSize: 22, fontWeight: 900, marginBottom: 10,
        letterSpacing: "-0.03em", lineHeight: 1.25,
      }}>
        {reason ?? "Sign in to start playing"}
      </h2>
      <p style={{ fontSize: 13.5, color: "#7a7570", lineHeight: 1.7, marginBottom: 28 }}>
        Create a free account to track your ELO, streaks, and game history. It only takes a second.
      </p>

      {/* Sign In button */}
      <button
        id="signin-prompt-btn"
        onClick={handleSignIn}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px 20px", borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, #81b64c, #5fb840)",
          color: "#1a1a13",
          fontSize: 15, fontWeight: 800, cursor: "pointer",
          transition: "all 0.15s", marginBottom: 12,
          boxShadow: "0 4px 20px rgba(129,182,76,0.35)",
          letterSpacing: "-0.01em",
        }}
      >
        <LogIn size={17} strokeWidth={2.5} />
        Sign In / Create Account
      </button>

      <p style={{ fontSize: 11.5, color: "#4a4845", textAlign: "center", lineHeight: 1.6 }}>
        Free forever · No credit card needed
      </p>
    </motion.div>
  );

  if (mode === "inline") return card;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {card}
      </motion.div>
    </AnimatePresence>
  );
}
