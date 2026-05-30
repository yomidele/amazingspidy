import { supabase } from "@/integrations/supabase/client";

/**
 * "Remember me" preference storage.
 *
 * IMPORTANT: This module MUST NOT touch Supabase's own auth keys (`sb-*`).
 * The Supabase client is configured with `persistSession: true` and
 * `storage: localStorage`, and it manages its own token lifecycle. Any
 * manual deletion of those keys causes users to be silently signed out
 * on tab reopen — which is the bug we are fixing.
 *
 * For now, the checkbox stores the user's preference under our own key.
 * Sessions persist across tab close in all cases (Supabase default).
 */

const REMEMBER_KEY = "amana_remember_me";

/** Default for "amana_remember_me" — used by SUPABASE_AUTH_KEY constant below. */
export const SUPABASE_AUTH_KEY = "sb-wwtkejyxzllucfsksypn-auth-token";
export const TEST_USER = { id: "test-user-id", email: "test@example.com" };

const safeLocal = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};

export const setRememberMe = (remember: boolean) => {
  const ls = safeLocal();
  try {
    ls?.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* storage unavailable — ignore */
  }
};

export const getRememberMe = (): boolean => {
  const ls = safeLocal();
  try {
    return ls?.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
};

/**
 * Runs at boot. Intentionally a no-op on Supabase auth storage — we never
 * touch `sb-*` keys. Kept as an async function for compatibility with
 * existing call sites in `main.tsx`.
 */
export const enforceRememberMeOnBoot = async () => {
  // No-op by design. See module docstring.
};

export const clearRememberMe = () => {
  const ls = safeLocal();
  try {
    ls?.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
};

export { supabase };
