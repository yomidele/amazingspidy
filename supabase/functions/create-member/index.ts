import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateMemberRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
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

    const { email, password, fullName, phone }: CreateMemberRequest = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with admin API - email is auto-confirmed, NO email is sent
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email - no confirmation email sent
      user_metadata: {
        full_name: fullName,
        role: "contributor",
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;
    console.log("Created new user:", userId);

    // Add contributor role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "contributor",
      });

    if (roleError && !roleError.message.includes("duplicate")) {
      console.error("Error adding contributor role:", roleError);
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: fullName,
        email: email,
        phone: phone || null,
      });

    if (profileError && !profileError.message.includes("duplicate")) {
      console.error("Error creating profile:", profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Member created successfully. No email was sent - please share credentials via WhatsApp.",
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-member function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
