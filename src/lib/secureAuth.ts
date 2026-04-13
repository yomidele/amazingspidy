import { supabase } from "@/integrations/supabase/client";

interface SecureLoginResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}

export const secureLogin = async (email: string, password: string): Promise<SecureLoginResult> => {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/secure-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Login failed" };
    }

    // Set the session from the edge function response
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return { success: true, user: data.user, session: data.session };
  } catch (error: any) {
    return { success: false, error: "Network error. Please try again." };
  }
};
