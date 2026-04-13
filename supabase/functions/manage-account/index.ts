import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Forbidden — admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, user_id } = await req.json();

    if (!action || !user_id) {
      return new Response(
        JSON.stringify({ error: "action and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, any> = {};
    let logAction = "";
    let logDescription = "";

    switch (action) {
      case "approve":
        updateData = { account_status: "active", failed_login_attempts: 0 };
        logAction = "account_approved";
        logDescription = "Account approved by admin";
        break;
      case "unlock":
        updateData = { account_status: "active", failed_login_attempts: 0, locked_at: null };
        logAction = "account_unlocked";
        logDescription = "Account unlocked by admin";
        break;
      case "lock":
        updateData = { account_status: "locked", locked_at: new Date().toISOString() };
        logAction = "account_locked_admin";
        logDescription = "Account manually locked by admin";
        break;
      case "suspend":
        updateData = { account_status: "pending" };
        logAction = "account_suspended";
        logDescription = "Account suspended by admin";
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: approve, unlock, lock, suspend" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("user_id", user_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await supabaseAdmin.from("activity_logs").insert({
      user_id: caller.id,
      action: logAction,
      description: `${logDescription} for user ${user_id}`,
      entity_type: "account",
      entity_id: user_id,
    });

    // Send notification to the user
    const notificationMap: Record<string, { title: string; message: string; type: string }> = {
      approve: {
        title: "Account Approved",
        message: "Your account has been approved. You can now log in and access all features.",
        type: "success",
      },
      unlock: {
        title: "Account Unlocked",
        message: "Your account has been unlocked. You can now log in again.",
        type: "info",
      },
      lock: {
        title: "Account Locked",
        message: "Your account has been locked by an administrator. Please contact support for assistance.",
        type: "warning",
      },
      suspend: {
        title: "Account Suspended",
        message: "Your account has been suspended by an administrator. Please contact support for more information.",
        type: "warning",
      },
    };

    const notification = notificationMap[action];
    if (notification) {
      await supabaseAdmin.from("notifications").insert({
        user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Account ${action} completed` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in manage-account:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
