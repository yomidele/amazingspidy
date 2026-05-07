import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Actions:
//  - "approve":  payload { action, requestId, password }  → creates user + adds to group via approve_membership_request RPC
//  - "reject":   payload { action, requestId, note? }
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return j({ error: "Unauthorized" }, 401);
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await admin.from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return j({ error: "Forbidden" }, 403);

    const body = await req.json();
    if (body.action === "reject") {
      const { error } = await userClient.rpc("reject_membership_request", {
        _request_id: body.requestId, _note: body.note ?? null,
      });
      if (error) return j({ error: error.message }, 400);
      return j({ success: true });
    }

    if (body.action === "approve") {
      const { requestId, password } = body;
      if (!requestId || !password) return j({ error: "requestId and password required" }, 400);

      const { data: reqRow, error: reqErr } = await admin
        .from("membership_requests").select("*").eq("id", requestId).maybeSingle();
      if (reqErr || !reqRow) return j({ error: "Request not found" }, 404);
      if (reqRow.status !== "pending") return j({ error: "Already " + reqRow.status }, 400);

      let userId = reqRow.user_id as string | null;
      if (!userId) {
        const list = await admin.auth.admin.listUsers();
        const existing = list.data?.users?.find((u) => u.email === reqRow.email);
        if (existing) {
          userId = existing.id;
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: reqRow.email, password, email_confirm: true,
            user_metadata: { full_name: reqRow.full_name, role: "contributor" },
          });
          if (createErr || !created?.user) return j({ error: createErr?.message || "Create failed" }, 400);
          userId = created.user.id;
          await admin.from("profiles").update({
            account_status: "active", failed_login_attempts: 0,
            full_name: reqRow.full_name, phone: reqRow.phone, must_change_password: true,
          }).eq("user_id", userId);
          await admin.from("user_roles").insert({ user_id: userId, role: "contributor" });
        }
      }

      const { error: rpcErr } = await userClient.rpc("approve_membership_request", {
        _request_id: requestId, _user_id: userId,
      });
      if (rpcErr) return j({ error: rpcErr.message }, 400);

      return j({ success: true, userId });
    }

    return j({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("approve-membership-request error", err);
    return j({ error: err.message || "Error" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
