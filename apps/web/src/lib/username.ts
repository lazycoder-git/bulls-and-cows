import { validateUsername as sharedValidateUsername } from "@traffic/shared";

export type UsernameError =
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "bad_start_end"
  | "consecutive_specials"
  | "profanity"
  | "taken"
  | "ok";

export interface UsernameValidation {
  valid: boolean;
  error: UsernameError;
  message: string;
}

// ─── Main validator ───────────────────────────────────────────────────────────

export function validateUsername(raw: string): UsernameValidation {
  const result = sharedValidateUsername(raw);
  
  let error: UsernameError = "ok";
  if (!result.isValid) {
    if (result.rules.validLength === false) {
      error = raw.trim().length < 3 ? "too_short" : "too_long";
    } else if (result.rules.startsWithLetter === false) {
      error = "bad_start_end";
    } else if (result.rules.notReserved === false || result.rules.notOffensive === false) {
      error = "profanity";
    } else {
      error = "invalid_chars";
    }
  }

  return {
    valid: result.isValid,
    error,
    message: result.message || "Looks good!"
  };
}


// ─── Server-backed uniqueness check ──────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Check username availability against the real DB.
 * Returns true if the username is available (not taken).
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/api/users/check?username=${encodeURIComponent(username)}`
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.available;
  } catch {
    // If server is down, fall back to localStorage check
    return !isUsernameTaken(username);
  }
}

/**
 * Persist username to the server DB.
 * Requires the backend JWT token.
 */
export async function setUsernameOnServer(
  backendToken: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.error ?? `Server error ${res.status}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Could not reach server. Please try again.' };
  }
}

// ─── localStorage fallback (used as cache) ────────────────────────────────────

const STORE_KEY = "bnc:usernames";

function getStoredUsernames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}

export function isUsernameTaken(username: string): boolean {
  const db = getStoredUsernames();
  return Object.values(db).some((u) => u.toLowerCase() === username.toLowerCase());
}

export function registerUsername(userId: string, username: string): void {
  const db = getStoredUsernames();
  db[userId] = username;
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

export function getUsernameForUser(userId: string): string | null {
  const db = getStoredUsernames();
  return db[userId] ?? null;
}

/** localStorage key for the current user's own username */
export const OWN_USERNAME_KEY = "bnc:myUsername";

export function getMyUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OWN_USERNAME_KEY);
}

export function saveMyUsername(username: string): void {
  localStorage.setItem(OWN_USERNAME_KEY, username);
}
