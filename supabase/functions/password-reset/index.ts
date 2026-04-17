import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERIC_RESPONSE = {
  success: true,
  message: "If this email exists, a reset link has been sent.",
};

const RATE_LIMIT_SECONDS = 60;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const PRODUCTION_DOMAIN = "https://www.amanamarkets.org";
    const RESET_URL = `${PRODUCTION_DOMAIN}/reset-password`;

    const body = await req.json().catch(() => ({}));
    const email = (body?.email ?? "").toString().trim().toLowerCase();

    // Sanitize: ignore any client-supplied redirect that points to disallowed
    // domains (vercel.app, lovable.app, or any other host). Always force the
    // production reset URL.
    const rawRedirect: string | undefined = body?.redirectTo;
    let redirectTo = RESET_URL;
    try {
      if (rawRedirect) {
        const u = new URL(rawRedirect);
        if (
          u.hostname === "www.amanamarkets.org" &&
          u.pathname === "/reset-password"
        ) {
          redirectTo = RESET_URL;
        }
      }
    } catch {
      redirectTo = RESET_URL;
    }

    // Always validate input but never reveal existence
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify(GENERIC_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Rate limit: 1 request per 60s per email OR per IP, using activity_logs
    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { data: recent } = await admin
      .from("activity_logs")
      .select("id, description")
      .eq("action", "password_reset_requested")
      .gte("created_at", since)
      .or(`description.ilike.%${email}%,description.ilike.%ip:${ip}%`)
      .limit(1);

    if (recent && recent.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many requests. Please wait a minute before trying again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Look up profile (do not reveal whether it exists)
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, email, account_status")
      .eq("email", email)
      .maybeSingle();

    // Always log the attempt (with email + ip for rate limiting)
    await admin.from("activity_logs").insert({
      user_id: profile?.user_id ?? null,
      action: "password_reset_requested",
      description: `Password reset requested for ${email} ip:${ip}`,
      entity_type: "auth",
      entity_id: profile?.user_id ?? null,
    });

    // Only send if profile exists and account is not locked/pending
    if (profile && profile.account_status === "active") {
      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: RESET_URL,
      });

      if (error) {
        console.error("resetPasswordForEmail error:", error);
        // Still return generic to avoid leaking
      }
    }

    return new Response(JSON.stringify(GENERIC_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("password-reset error:", error);
    // Even on error, return generic message
    return new Response(JSON.stringify(GENERIC_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
