import { supabase } from "@/integrations/supabase/client";

/**
 * Sessions now always persist via Supabase's localStorage-backed auth client.
 * The "Remember me" checkbox is kept for UX continuity but no longer forces
 * a sign-out when the tab is closed — that was causing users to be logged
 * out on every tab reopen.
 */

const REMEMBER_KEY = "amana_remember_me";
const SESSION_FLAG = "amana_session_active";

export const setRememberMe = (remember: boolean) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    /* storage unavailable — ignore */
  }
};

/**
 * No-op for sign-out purposes. Kept for backwards compatibility with main.tsx.
 * Sessions persist across tab/browser restarts via Supabase auth storage.
 */
export const enforceRememberMeOnBoot = async () => {
  try {
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

// Re-export to keep accidental imports from breaking
export { supabase };
