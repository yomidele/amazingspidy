import { supabase } from "@/integrations/supabase/client";

/**
 * "Remember me" persistence control.
 *
 * The Supabase client is configured with localStorage so sessions persist
 * across tab/browser restarts by default. When the user unchecks "Remember
 * me", we still need the session to survive a page reload (so the app
 * works), but it must NOT survive a full tab close + reopen.
 *
 * Strategy:
 *  - On login, store the user's choice in localStorage (REMEMBER_KEY).
 *  - Set a sessionStorage flag (SESSION_FLAG) — this flag is wiped when
 *    the browser tab is fully closed, but survives reloads.
 *  - On app boot, if REMEMBER_KEY === "0" AND the sessionStorage flag is
 *    missing, we know this is a fresh tab from a non-remembered login →
 *    synchronously clear the Supabase auth token from localStorage BEFORE
 *    the client reads it. No async signOut() (which caused the previous
 *    "logged out on every reopen" bug).
 *  - In all other cases (remember=true, or flag still present, or no
 *    preference recorded), leave the session intact.
 */

const REMEMBER_KEY = "amana_remember_me";
const SESSION_FLAG = "amana_session_active";

/** Matches Supabase's default auth storage key: `sb-<projectRef>-auth-token` */
const SUPABASE_AUTH_KEY_RE = /^sb-.*-auth-token$/;

const safeLocal = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};
const safeSession = () => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
};

export const setRememberMe = (remember: boolean) => {
  const ls = safeLocal();
  const ss = safeSession();
  try {
    ls?.setItem(REMEMBER_KEY, remember ? "1" : "0");
    ss?.setItem(SESSION_FLAG, "1");
  } catch {
    /* storage unavailable — ignore */
  }
};

/**
 * Runs synchronously at boot, before the React tree (and therefore before
 * Supabase's getSession() call) reads storage. If the user logged in with
 * "Remember me" unchecked AND the tab was fully closed since (sessionStorage
 * flag is gone), purge the Supabase auth token so the user starts logged out.
 */
export const enforceRememberMeOnBoot = async () => {
  const ls = safeLocal();
  const ss = safeSession();
  if (!ls) return;

  const remember = ls.getItem(REMEMBER_KEY);
  const sessionActive = ss?.getItem(SESSION_FLAG) === "1";

  if (remember === "0" && !sessionActive) {
    // Fresh tab after a non-persistent login → clear stored session.
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && SUPABASE_AUTH_KEY_RE.test(key)) toRemove.push(key);
      }
      toRemove.forEach((k) => ls.removeItem(k));
      ls.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  }

  // Mark this tab as active so reloads within the same tab don't trip the
  // purge above.
  try {
    ss?.setItem(SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
};

export const clearRememberMe = () => {
  const ls = safeLocal();
  const ss = safeSession();
  try {
    ls?.removeItem(REMEMBER_KEY);
    ss?.removeItem(SESSION_FLAG);
  } catch {
    /* ignore */
  }
};

// Re-export to keep accidental imports from breaking
export { supabase };
