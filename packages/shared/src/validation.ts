// ─── Validation Utilities ───────────────────────────────────────────────────

const RESERVED_WORDS = new Set([
  "admin", "administrator", "moderator", "mod", "root", "system", "support",
  "staff", "official", "bnc", "bullsncows", "bullsandcows"
]);

const OFFENSIVE_WORDS = new Set([
  // Common profanity
  "ass","arse","asshole","bastard","bitch","bollocks","bullshit","cock","crap",
  "cum","cunt","damn","dick","dildo","fag","faggot","fuck","fucker","fucking",
  "jackass","jerk","motherfucker","nigga","nigger","piss","prick","pussy",
  "retard","shit","slut","twat","wank","wanker","whore",
  // Hate / slurs
  "chink","gook","kike","spic","wetback","cracker","dyke","tranny",
  // Sexual
  "anal","blowjob","boner","boobs","clitoris","erection","handjob","hardcore",
  "horny","masturbat","milf","nude","orgasm","penis","porn","rape","rimjob",
  "scrotum","semen","sex","sexy","titties","vagina","vibrator","xxx",
  // Violence
  "kill","murder","suicide","terrorist","bomber",
  // Evasions
  "a55","sh1t","f4ck","f_ck","b1tch","p0rn","pr0n",
  // Drugs
  "cocaine","heroin","meth","weed","420"
]);

const COMMON_PASSWORDS = new Set([
  "password", "password123", "12345678", "123456789", "qwerty", "admin", "admin123", "welcome", "letmein", "123456"
]);

function containsBlockedWord(name: string, wordList: Set<string>): boolean {
  const normalised = name
    .toLowerCase()
    .replace(/[._-]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b");

  for (const word of wordList) {
    if (normalised.includes(word)) return true;
  }
  return false;
}

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  // Repetitive characters
  if (/^(.)\1{7,}$/.test(password)) return true;
  // Sequential characters
  const sequences = ["12345678", "abcdefgh", "qwertyui", "asdfghjk", "zxcvbnm"];
  for (const seq of sequences) {
    if (seq.includes(lower) && lower.length >= 8) return true;
  }
  return false;
}

// ─── Username Validation ─────────────────────────────────────────────────────

export interface UsernameValidationResult {
  isValid: boolean;
  rules: {
    startsWithLetter: boolean;
    validChars: boolean;
    validLength: boolean;
    notReserved: boolean;
    notOffensive: boolean;
  };
  message?: string;
}

export function validateUsername(username: string): UsernameValidationResult {
  const name = username.trim();

  const startsWithLetter = /^[a-zA-Z]/.test(name);
  const validChars = /^[a-zA-Z0-9_]+$/.test(name);
  const validLength = name.length >= 3 && name.length <= 16;

  const notReserved = !containsBlockedWord(name, RESERVED_WORDS);
  const notOffensive = !containsBlockedWord(name, OFFENSIVE_WORDS);

  const isValid = startsWithLetter && validChars && validLength && notReserved && notOffensive;

  let message: string | undefined;
  if (!startsWithLetter) {
    message = "Username must start with a letter.";
  } else if (!validChars) {
    message = "Only letters, numbers, and underscore (_) are allowed.";
  } else if (!validLength) {
    message = name.length < 3 ? "Username must be at least 3 characters." : "Username must be 16 characters or fewer.";
  } else if (!notReserved) {
    message = "This username contains restricted words.";
  } else if (!notOffensive) {
    message = "This username contains offensive or suspicious content.";
  }

  return {
    isValid,
    rules: {
      startsWithLetter,
      validChars,
      validLength,
      notReserved,
      notOffensive
    },
    message
  };
}

// ─── Password Validation ─────────────────────────────────────────────────────

export interface PasswordValidationResult {
  isValid: boolean;
  rules: {
    minLength: boolean;
    containsLetters: boolean;
    containsNumbers: boolean;
    notCommon: boolean;
  };
  strength: 'weak' | 'moderate' | 'strong';
  message?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 8 && password.length <= 128;
  const containsLetters = /[a-zA-Z]/.test(password);
  const containsNumbers = /[0-9]/.test(password);
  const notCommon = !isCommonPassword(password);

  const isValid = minLength && containsLetters && containsNumbers && notCommon;

  let message: string | undefined;
  if (!minLength) {
    message = "Password must be at least 8 characters.";
  } else if (!containsLetters) {
    message = "Password must contain at least one letter.";
  } else if (!containsNumbers) {
    message = "Password must contain at least one number.";
  } else if (!notCommon) {
    message = "Password is too common or weak.";
  }

  // Calculate strength
  let strength: 'weak' | 'moderate' | 'strong' = 'weak';
  if (minLength && containsLetters && containsNumbers && notCommon) {
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);

    if (hasSpecial || (hasUpper && hasLower && password.length >= 10)) {
      strength = 'strong';
    } else {
      strength = 'moderate';
    }
  }

  return {
    isValid,
    rules: {
      minLength,
      containsLetters,
      containsNumbers,
      notCommon
    },
    strength,
    message
  };
}
