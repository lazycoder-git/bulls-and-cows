"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  validateUsername, 
  validatePassword,
  UsernameValidationResult,
  PasswordValidationResult
} from "@traffic/shared";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AtSign, 
  ArrowRight, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from "lucide-react";

/* ── Animated background cells for left branding panel ── */
const DEMO_SEQUENCE = [
  { guess: "1 2 3 5", bulls: 0, cows: 2 },
  { guess: "4 7 3 6", bulls: 1, cows: 1 },
  { guess: "8 7 2 6", bulls: 2, cows: 0 },
  { guess: "8 7 0 9", bulls: 3, cows: 0 },
  { guess: "8 7 0 6", bulls: 4, cows: 0 },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function ChecklistItem({ label, isMet, isTouched }: { label: string; isMet: boolean; isTouched: boolean }) {
  const iconColor = isMet ? "#4ade80" : isTouched ? "#f87171" : "#595653";
  const textColor = isMet ? "#e5e7eb" : isTouched ? "#f87171" : "#7a7570";
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: textColor, lineHeight: 1.6 }}>
      {isMet ? (
        <CheckCircle2 size={13} style={{ color: iconColor, flexShrink: 0 }} />
      ) : (
        <XCircle size={13} style={{ color: iconColor, flexShrink: 0 }} />
      )}
      <span>{label}</span>
    </div>
  );
}

function StrengthBar({ strength }: { strength: 'weak' | 'moderate' | 'strong' }) {
  const colors = {
    weak: "#ef4444",
    moderate: "#fbbf24",
    strong: "#4ade80",
  };
  const widths = {
    weak: "33%",
    moderate: "66%",
    strong: "100%",
  };
  const label = {
    weak: "Weak",
    moderate: "Moderate",
    strong: "Strong",
  };
  
  return (
    <div style={{ marginTop: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#7a7570" }}>Password Strength:</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors[strength] }}>{label[strength]}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: widths[strength],
          background: colors[strength],
          transition: "all-out 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function SignInContent() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get("callbackUrl") ?? "/play";
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(0);

  // Sign In Form State
  const [signinIdentifier, setSigninIdentifier] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);

  // Sign Up Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  
  // Validation Results & Touched flags
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidationResult>(validateUsername(""));
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult>(validatePassword(""));
  const [isUsernameTouched, setIsUsernameTouched] = useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);
  const [isEmailTouched, setIsEmailTouched] = useState(false);

  // Async Uniqueness Check State
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Demo sequence effect
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % DEMO_SEQUENCE.length), 1400);
    return () => clearInterval(t);
  }, []);

  // Debounced API check for username availability
  const checkAvailability = useCallback(async (name: string) => {
    if (!name || name.length < 3 || name.length > 16) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/check?username=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameAvailable(data.available);
      } else {
        setUsernameAvailable(false);
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  // Run username validation and trigger availability checks
  useEffect(() => {
    const result = validateUsername(username);
    setUsernameValidation(result);

    if (username.length === 0) {
      setUsernameAvailable(null);
      return;
    }

    if (result.isValid) {
      const delayDebounce = setTimeout(() => {
        checkAvailability(username);
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setUsernameAvailable(null);
    }
  }, [username, checkAvailability]);

  // Run password validation
  useEffect(() => {
    setPasswordValidation(validatePassword(password));
  }, [password]);


  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signinIdentifier || !signinPassword || loading) return;

    setLoading(true);
    setSigninError(null);

    try {
      const result = await signIn("credentials", {
        usernameOrEmail: signinIdentifier,
        password: signinPassword,
        redirect: false,
      });

      if (result?.error) {
        setSigninError("Invalid username/email or password.");
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setSigninError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check client-side validation first
    const uv = validateUsername(username);
    const pv = validatePassword(password);
    const ev = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!uv.isValid || !pv.isValid || !ev || usernameAvailable === false || loading) {
      setIsUsernameTouched(true);
      setIsPasswordTouched(true);
      setIsEmailTouched(true);
      return;
    }

    setLoading(true);
    setSignupError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSignupError(data.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Auto login on success
      const result = await signIn("credentials", {
        usernameOrEmail: username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setSignupError("Account created! Please sign in using your credentials.");
        setActiveTab("signin");
        setSigninIdentifier(username);
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setSignupError("Could not connect to the server. Please try again.");
      setLoading(false);
    }
  };

  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const canSignUp = 
    usernameValidation.isValid && 
    passwordValidation.isValid && 
    isEmailValid &&
    usernameAvailable === true && 
    !usernameChecking &&
    !loading;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1814",
      display: "flex",
      overflow: "hidden",
    }}>
      {/* ── Left: Branding / Demo ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 48px",
        position: "relative",
        background: "linear-gradient(160deg, #1e1c1a 0%, #221f1c 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        {/* Subtle grid bg */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#81b64c 1px, transparent 1px), linear-gradient(90deg, #81b64c 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }} />

        {/* Glow orb */}
        <div style={{
          position: "absolute", top: "20%", left: "30%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,182,76,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 440 }}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 40 }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg, #81b64c, #5fb840)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 900, color: "#1a1a13",
              boxShadow: "0 8px 32px rgba(129,182,76,0.35)",
            }}>B</div>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>
              Bulls &amp; <span style={{ color: "#81b64c" }}>Cows</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1.15, marginBottom: 16, letterSpacing: "-0.04em" }}
          >
            Crack the Code.<br />
            <span style={{ background: "linear-gradient(90deg, #81b64c, #a8d96a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Dominate the Board.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ fontSize: 15, color: "#7a7570", lineHeight: 1.7, marginBottom: 40 }}
          >
            The classic number-deduction game — reimagined with ELO rankings, daily puzzles, private rooms, and live tournaments.
          </motion.p>

          {/* Live demo board */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: "#262421",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", display: "inline-block" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#595653", marginLeft: 6 }}>Live Match · 1200 ELO</span>
            </div>
            {DEMO_SEQUENCE.slice(0, step + 1).map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 20px",
                  borderBottom: i < step ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: row.bulls === 4 ? "rgba(129,182,76,0.08)" : "transparent",
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.18em", color: row.bulls === 4 ? "#81b64c" : "white" }}>
                  {row.guess}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: row.bulls > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", color: row.bulls > 0 ? "#f87171" : "#595653" }}>
                    {row.bulls}B
                  </span>
                  <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: row.cows > 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", color: row.cows > 0 ? "#fbbf24" : "#595653" }}>
                    {row.cows}C
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}
          >
            {["ELO Rankings", "Daily Puzzles", "Private Rooms", "Live Tournaments", "AI Practice"].map((f) => (
              <span key={f} style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: "rgba(129,182,76,0.08)", color: "#81b64c",
                border: "1px solid rgba(129,182,76,0.2)",
              }}>{f}</span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right: Authentication Container ── */}
      <div style={{
        width: 480,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px 48px",
        background: "#1a1814",
        borderLeft: "1px solid rgba(255,255,255,0.02)",
        overflowY: "auto"
      }}>
        <div style={{ width: "100%", maxWidth: 380, margin: "0 auto" }}>
          
          {/* Logo & Welcome for mobile or header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 6 }}>
              {activeTab === "signin" ? "Sign in to play" : "Create your account"}
            </h2>
            <p style={{ fontSize: 13, color: "#7a7570", lineHeight: 1.5 }}>
              {activeTab === "signin" 
                ? "Enter your details to track ELO ratings, daily streaks, and custom rooms." 
                : "Choose a unique username and strong password to get started."}
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.03)",
            padding: 4,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 24
          }}>
            <button
              onClick={() => { setActiveTab('signin'); setSignupError(null); }}
              style={{
                flex: 1,
                padding: "10px 0",
                background: activeTab === 'signin' ? "#262421" : "transparent",
                color: activeTab === 'signin' ? "#81b64c" : "#7a7570",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setSigninError(null); }}
              style={{
                flex: 1,
                padding: "10px 0",
                background: activeTab === 'signup' ? "#262421" : "transparent",
                color: activeTab === 'signup' ? "#81b64c" : "#7a7570",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Create Account
            </button>
          </div>

          {/* Forms switcher */}
          <AnimatePresence mode="wait">
            {activeTab === 'signin' ? (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSignInSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Input: Username or Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e" }}>Username or Email</label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "11px 14px",
                  }}>
                    <AtSign size={16} style={{ color: "#7a7570" }} />
                    <input
                      type="text"
                      required
                      placeholder="yourname or email@domain.com"
                      value={signinIdentifier}
                      onChange={(e) => setSigninIdentifier(e.target.value)}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "white",
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>

                {/* Input: Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e" }}>Password</label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "11px 14px",
                  }}>
                    <Lock size={16} style={{ color: "#7a7570" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={signinPassword}
                      onChange={(e) => setSigninPassword(e.target.value)}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "white",
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: "none", border: "none", color: "#7a7570", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {signinError && (
                  <div style={{
                    fontSize: 12,
                    color: "#f87171",
                    background: "rgba(248,113,113,0.07)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontWeight: 600
                  }}>
                    ❌ {signinError}
                  </div>
                )}

                {/* Submit Sign In */}
                <button
                  type="submit"
                  disabled={loading || !signinIdentifier || !signinPassword}
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: loading ? "rgba(255,255,255,0.05)" : "#81b64c",
                    color: loading ? "#595653" : "#1a1a13",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: (loading || !signinIdentifier || !signinPassword) ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8
                  }}
                >
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Sign In"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSignUpSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Input: Username */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e" }}>Username</label>
                    {isUsernameTouched && !usernameValidation.isValid && (
                      <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>Invalid username</span>
                    )}
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${
                      !username ? "rgba(255,255,255,0.08)"
                      : usernameValidation.isValid && usernameAvailable === true ? "rgba(129,182,76,0.5)"
                      : (isUsernameTouched || usernameValidation.message || usernameAvailable === false) ? "rgba(248,113,113,0.45)"
                      : "rgba(255,255,255,0.08)"
                    }`,
                    borderRadius: 10,
                    padding: "11px 14px",
                    transition: "border-color 0.15s"
                  }}>
                    <AtSign size={16} style={{ color: "#7a7570" }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. player1"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.replace(/\s/g, ""));
                        setIsUsernameTouched(true);
                        setSignupError(null);
                      }}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "white",
                        fontSize: 14,
                        fontFamily: "monospace"
                      }}
                    />
                    {usernameChecking && <Loader2 size={14} style={{ color: "#7a7570", animation: "spin 1s linear infinite" }} />}
                  </div>

                  {/* Username Real-time Checklist */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7a7570", marginBottom: 2 }}>Username Requirements</div>
                    <ChecklistItem 
                      label="Starts with a letter" 
                      isMet={usernameValidation.rules.startsWithLetter} 
                      isTouched={isUsernameTouched && !usernameValidation.rules.startsWithLetter} 
                    />
                    <ChecklistItem 
                      label="Valid characters only (A-Z, a-z, 0-9, _)" 
                      isMet={usernameValidation.rules.validChars} 
                      isTouched={isUsernameTouched && !usernameValidation.rules.validChars} 
                    />
                    <ChecklistItem 
                      label="Length between 3–16 characters" 
                      isMet={usernameValidation.rules.validLength} 
                      isTouched={isUsernameTouched && !usernameValidation.rules.validLength} 
                    />
                    <ChecklistItem 
                      label="Username available" 
                      isMet={usernameValidation.isValid && usernameAvailable === true} 
                      isTouched={isUsernameTouched && (usernameAvailable === false || (!usernameChecking && username.length >= 3 && usernameAvailable === null))} 
                    />
                  </div>
                </div>

                {/* Input: Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e" }}>Email Address</label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      !email ? "rgba(255,255,255,0.08)"
                      : isEmailValid ? "rgba(129,182,76,0.3)"
                      : isEmailTouched ? "rgba(248,113,113,0.4)"
                      : "rgba(255,255,255,0.08)"
                    }`,
                    borderRadius: 10,
                    padding: "11px 14px",
                  }}>
                    <Mail size={16} style={{ color: "#7a7570" }} />
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSignupError(null);
                      }}
                      onBlur={() => setIsEmailTouched(true)}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "white",
                        fontSize: 14,
                      }}
                    />
                  </div>
                  {isEmailTouched && !isEmailValid && email.length > 0 && (
                    <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>Please enter a valid email address.</span>
                  )}
                </div>

                {/* Input: Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e" }}>Password</label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${
                      !password ? "rgba(255,255,255,0.08)"
                      : passwordValidation.isValid ? "rgba(129,182,76,0.5)"
                      : isPasswordTouched ? "rgba(248,113,113,0.45)"
                      : "rgba(255,255,255,0.08)"
                    }`,
                    borderRadius: 10,
                    padding: "11px 14px",
                    transition: "border-color 0.15s"
                  }}>
                    <Lock size={16} style={{ color: "#7a7570" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setIsPasswordTouched(true);
                        setSignupError(null);
                      }}
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "white",
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: "none", border: "none", color: "#7a7570", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <StrengthBar strength={passwordValidation.strength} />
                  )}

                  {/* Password Requirements Checklist */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7a7570", marginBottom: 2 }}>Password Requirements</div>
                    <ChecklistItem 
                      label="Minimum 8 characters" 
                      isMet={passwordValidation.rules.minLength} 
                      isTouched={isPasswordTouched && !passwordValidation.rules.minLength} 
                    />
                    <ChecklistItem 
                      label="Contains letters" 
                      isMet={passwordValidation.rules.containsLetters} 
                      isTouched={isPasswordTouched && !passwordValidation.rules.containsLetters} 
                    />
                    <ChecklistItem 
                      label="Contains numbers" 
                      isMet={passwordValidation.rules.containsNumbers} 
                      isTouched={isPasswordTouched && !passwordValidation.rules.containsNumbers} 
                    />
                    <ChecklistItem 
                      label="Not a common or weak password" 
                      isMet={passwordValidation.rules.notCommon} 
                      isTouched={isPasswordTouched && !passwordValidation.rules.notCommon} 
                    />
                  </div>
                </div>

                {signupError && (
                  <div style={{
                    fontSize: 12,
                    color: "#f87171",
                    background: "rgba(248,113,113,0.07)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontWeight: 600
                  }}>
                    ❌ {signupError}
                  </div>
                )}

                {/* Submit Sign Up */}
                <button
                  type="submit"
                  disabled={!canSignUp}
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: !canSignUp ? "rgba(255,255,255,0.05)" : "#81b64c",
                    color: !canSignUp ? "#3a3835" : "#1a1a13",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: !canSignUp ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8
                  }}
                >
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Register"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>


          <p style={{ fontSize: 12, color: "#595653", lineHeight: 1.7, textAlign: "center", marginTop: 24 }}>
            By signing in you agree to our{" "}
            <span style={{ color: "#81b64c", cursor: "pointer" }}>Terms of Service</span>
            {" "}and{" "}
            <span style={{ color: "#81b64c", cursor: "pointer" }}>Privacy Policy</span>.
          </p>

          {/* Decorative rank badges */}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 8 }}>
            {[
              { label: "Novice", color: "#9ca3af" },
              { label: "Skilled", color: "#60a5fa" },
              { label: "Expert", color: "#a78bfa" },
              { label: "Master", color: "#f59e0b" },
              { label: "Elite", color: "#f87171" },
            ].map((r) => (
              <span key={r.label} style={{
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30`,
              }}>{r.label}</span>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
