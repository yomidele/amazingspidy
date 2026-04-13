import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SetupAdminRequest {
  email: string;
  password: string;
  fullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, fullName }: SetupAdminRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists: keep account, sync password/metadata so credentials stay valid
      userId = existingUser.id;

      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          full_name: fullName || existingUser.user_metadata?.full_name || "Administrator",
          role: "admin",
        },
      });

      if (updateUserError) {
        console.error("Error updating existing user:", updateUserError);
        return new Response(
          JSON.stringify({ error: updateUserError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Updated existing user credentials:", userId);
    } else {
      // Create new user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName || "Administrator",
          role: "admin",
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);
    }

    // Check if admin role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!existingRole) {
      // Add admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Error adding admin role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to assign admin role: " + roleError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Admin role assigned to user:", userId);
    } else {
      console.log("User already has admin role");
    }

    // Ensure profile exists and is active
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: userId,
          full_name: fullName || "Administrator",
          email: email,
          account_status: "active",
        });

      if (profileError && !profileError.message.includes("duplicate")) {
        console.error("Error creating profile:", profileError);
      }
    } else {
      // Ensure admin account is always active
      await supabaseAdmin
        .from("profiles")
        .update({ account_status: "active", failed_login_attempts: 0 })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account is ready",
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in setup-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
