import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FAILED_ATTEMPTS = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check profile status BEFORE attempting login
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, account_status, failed_login_attempts, locked_at")
      .eq("email", email);

    const profile = profiles?.[0];

    if (profile) {
      // Check if account is locked
      if (profile.account_status === "locked") {
        // Log the failed attempt
        await supabaseAdmin.from("activity_logs").insert({
          user_id: profile.user_id,
          action: "login_blocked_locked",
          description: `Login attempt blocked — account is locked`,
          entity_type: "auth",
          entity_id: profile.user_id,
        });

        return new Response(
          JSON.stringify({ error: "Account locked. Please contact your administrator to unlock your account." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if account is pending approval
      if (profile.account_status === "pending") {
        // Log the attempt
        await supabaseAdmin.from("activity_logs").insert({
          user_id: profile.user_id,
          action: "login_blocked_pending",
          description: `Login attempt blocked — account awaiting approval`,
          entity_type: "auth",
          entity_id: profile.user_id,
        });

        return new Response(
          JSON.stringify({ error: "Your account is awaiting approval. You will be notified once it has been activated." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Attempt sign-in using a temporary client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Increment failed login attempts if profile exists
      if (profile) {
        const newAttempts = (profile.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

        await supabaseAdmin
          .from("profiles")
          .update({
            failed_login_attempts: newAttempts,
            ...(shouldLock ? { account_status: "locked", locked_at: new Date().toISOString() } : {}),
          })
          .eq("user_id", profile.user_id);

        // Log the failed attempt
        await supabaseAdmin.from("activity_logs").insert({
          user_id: profile.user_id,
          action: shouldLock ? "account_locked" : "login_failed",
          description: shouldLock
            ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts`
            : `Failed login attempt (${newAttempts}/${MAX_FAILED_ATTEMPTS})`,
          entity_type: "auth",
          entity_id: profile.user_id,
        });

        if (shouldLock) {
          return new Response(
            JSON.stringify({ error: "Account locked due to too many failed attempts. Please contact your administrator." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Invalid login credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Successful login — reset failed attempts
    if (profile && profile.failed_login_attempts > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ failed_login_attempts: 0 })
        .eq("user_id", profile.user_id);
    }

    // Log successful login
    await supabaseAdmin.from("activity_logs").insert({
      user_id: signInData.user.id,
      action: "login_success",
      description: `Successful login`,
      entity_type: "auth",
      entity_id: signInData.user.id,
    });

    // Return session tokens to the client
    return new Response(
      JSON.stringify({
        success: true,
        session: signInData.session,
        user: signInData.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in secure-login:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
