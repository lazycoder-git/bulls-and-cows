"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  validateUsername,
  checkUsernameAvailability,
  setUsernameOnServer,
  registerUsername,
  saveMyUsername,
  getMyUsername,
} from "@/lib/username";
import { CheckCircle2, XCircle, Loader2, AtSign, ArrowRight } from "lucide-react";

function UsernameContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [value, setValue]       = useState("");
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // If already has a username, skip this page
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    const existing = getMyUsername();
    if (existing) router.replace(callbackUrl);
  }, [session, status, callbackUrl, router]);

  const validate = useCallback(async (raw: string) => {
    if (!raw) { setFeedback(null); return; }
    const result = validateUsername(raw);
    if (!result.valid) { setFeedback({ ok: false, msg: result.message }); return; }

    // Real server availability check
    setChecking(true);
    const available = await checkUsernameAvailability(raw);
    setChecking(false);
    setFeedback(
      available
        ? { ok: true, msg: "✓ Username is available!" }
        : { ok: false, msg: "That username is already taken. Try another!" }
    );
  }, []);

  // Debounce: wait 500ms after typing before hitting the server
  useEffect(() => {
    if (!value) { setFeedback(null); setChecking(false); return; }
    const timer = setTimeout(() => { validate(value); }, 500);
    return () => clearTimeout(timer);
  }, [value, validate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setValue(v);
    setFeedback(null);
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback?.ok || !session?.user) return;

    setSubmitted(true);
    setServerError(null);

    const backendToken = (session as any).backendToken as string | undefined;
    const userId = (session.user as any).id ?? session.user.email ?? "anon";

    // 1. Save to server DB if we have a backend token
    if (backendToken) {
      const result = await setUsernameOnServer(backendToken, value);
      if (!result.success) {
        setSubmitted(false);
        setServerError(result.error ?? "Failed to save username. Please try again.");
        return;
      }
    }

    // 2. Cache locally
    registerUsername(userId, value);
    saveMyUsername(value);

    // 3. Redirect
    setTimeout(() => router.replace(callbackUrl), 700);
  };

  if (status === "loading" || !session) return null;

  const canSubmit = feedback?.ok && !checking && !submitted;

  return (
    <div style={{
      minHeight: "100vh", background: "#1a1814",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: 420,
          background: "#1e1c1a",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, marginBottom: 24,
          background: "linear-gradient(135deg, #81b64c, #5fb840)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#1a1a13",
          boxShadow: "0 8px 24px rgba(129,182,76,0.35)",
        }}>B</div>

        <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.03em" }}>
          Pick your username
        </h1>
        <p style={{ fontSize: 13, color: "#7a7570", margin: "0 0 28px", lineHeight: 1.65 }}>
          This is your permanent identity on BnC. Choose wisely — it shows on the leaderboard and in matches.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Input */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.05)",
            border: `1.5px solid ${
              !value ? "rgba(255,255,255,0.1)"
              : feedback?.ok ? "rgba(129,182,76,0.5)"
              : feedback ? "rgba(248,113,113,0.45)"
              : "rgba(255,255,255,0.1)"
            }`,
            borderRadius: 10, padding: "12px 14px",
            transition: "border-color 0.15s",
            marginBottom: 8,
          }}>
            <AtSign size={16} style={{ color: "#595653", flexShrink: 0 }} />
            <input
              autoFocus
              value={value}
              onChange={handleChange}
              maxLength={20}
              placeholder="yourname"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "white", fontSize: 16, fontWeight: 600,
                fontFamily: "monospace",
              }}
            />
            {checking && <Loader2 size={15} style={{ color: "#595653", animation: "spin 1s linear infinite", flexShrink: 0 }} />}
            {!checking && feedback?.ok  && <CheckCircle2 size={15} style={{ color: "#4ade80", flexShrink: 0 }} />}
            {!checking && feedback && !feedback.ok && <XCircle size={15} style={{ color: "#f87171", flexShrink: 0 }} />}
          </div>

          {/* Char count + feedback */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <AnimatePresence mode="wait">
              {feedback && (
                <motion.span
                  key={feedback.msg}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 12, color: feedback.ok ? "#4ade80" : "#f87171", fontWeight: 600 }}
                >
                  {feedback.msg}
                </motion.span>
              )}
              {!feedback && value.length === 0 && (
                <span style={{ fontSize: 12, color: "#595653" }}>Start typing your username</span>
              )}
            </AnimatePresence>
            <span style={{ fontSize: 11, color: "#595653", marginLeft: "auto" }}>{value.length}/20</span>
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 8, padding: "10px 12px", marginBottom: 14,
              fontSize: 12, color: "#f87171", fontWeight: 600,
            }}>
              {serverError}
            </div>
          )}

          {/* Rules */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, padding: "10px 12px", marginBottom: 20,
          }}>
            {[
              "3–20 characters",
              "Lowercase letters, numbers",
              "Allowed specials:  .  _  -",
              "Must start and end with a letter/number",
              "Must be unique — no two players share one",
            ].map((r) => (
              <div key={r} style={{ fontSize: 11, color: "#595653", lineHeight: 1.8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#81b64c", fontSize: 9 }}>●</span> {r}
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
              background: canSubmit ? "#81b64c" : "rgba(255,255,255,0.06)",
              color: canSubmit ? "#1a1a13" : "#3a3835",
              fontSize: 14, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {submitted ? (
              <><CheckCircle2 size={16} /> All set!</>
            ) : (
              <>Confirm Username <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function UsernamePage() {
  return (
    <Suspense>
      <UsernameContent />
    </Suspense>
  );
}
