import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized logout function. Performs the actual sign-out and
 * redirects to the home page. All logout triggers in the app should
 * route through `confirmLogout` (see `useLogoutConfirm`) so the user
 * is always asked before this runs.
 */
export const logoutUser = async (redirectTo: string = "/") => {
  try {
    await supabase.auth.signOut();
  } finally {
    // Hard redirect to ensure all in-memory state is cleared.
    window.location.href = redirectTo;
  }
};
