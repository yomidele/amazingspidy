import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "amana_remember_me";
const SESSION_FLAG = "amana_session_active";

/**
 * Call after a successful login with the user's "Remember me" choice.
 * - remember=true  → session persists across browser restarts (long-lived).
 * - remember=false → session is cleared the next time the browser is fully closed and reopened.
 */
export const setRememberMe = (remember: boolean) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    /* storage unavailable — ignore */
  }
};

/**
 * Runs once at app boot. If the previous login was NOT "remember me" AND this is a
 * fresh browser session (sessionStorage was wiped by the browser close), sign the
 * user out so they have to log in again.
 */
export const enforceRememberMeOnBoot = async () => {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY);
    const sessionActive = sessionStorage.getItem(SESSION_FLAG);

    if (remember === "0" && !sessionActive) {
      await supabase.auth.signOut();
      localStorage.removeItem(REMEMBER_KEY);
    }

    // Mark this browser session as active so subsequent tab navigations don't trigger sign-out.
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    /* ignore */
  }
};

export const clearRememberMe = () => {
  try {
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(SESSION_FLAG);
  } catch {
    /* ignore */
  }
};
