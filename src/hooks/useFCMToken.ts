import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fcmToken?: string;
    handleNotificationTap?: (data: any) => void;
  }
}

/**
 * Captures the FCM token injected by the Flutter WebView host
 * (via `window.fcmToken` + `fcmTokenReady` event) and upserts it
 * into the `device_tokens` table for the currently authenticated user.
 */
export const useFCMToken = (userId: string | null | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const saveToken = async (token?: string) => {
      const fcm = token || window.fcmToken;
      if (!fcm) return;
      try {
        const { error } = await supabase
          .from("device_tokens" as any)
          .upsert(
            {
              user_id: userId,
              fcm_token: fcm,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        if (error) console.error("Failed to save FCM token:", error);
      } catch (e) {
        console.error("FCM token save error:", e);
      }
    };

    // If token is already present, save immediately
    if (window.fcmToken) saveToken(window.fcmToken);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const token = typeof detail === "string" ? detail : detail?.token;
      saveToken(token);
    };

    window.addEventListener("fcmTokenReady", handler);
    return () => window.removeEventListener("fcmTokenReady", handler);
  }, [userId]);
};
