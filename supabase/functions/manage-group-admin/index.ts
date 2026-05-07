import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Actions:
//  - "create": create a brand-new auth user and assign them as group_admin for a group
//      payload: { action, fullName, email, password, phone?, groupId }
//  - "promote": promote an existing user_id to group_admin for a group
//      payload: { action, userId, groupId }
//  - "remove": remove group_admin role + assignment for user
//      payload: { action, userId }
//  - "reset_password": set new temporary password
//      payload: { action, userId, newPassword }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — super admin only" }, 403);

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const { fullName, email, password, phone, groupId } = body;
      if (!fullName || !email || !password || !groupId) {
        return json({ error: "fullName, email, password, groupId required" }, 400);
      }
      const list = await admin.auth.admin.listUsers();
      if (list.data?.users?.find((u) => u.email === email)) {
        return json({ error: "A user with this email already exists" }, 400);
      }
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: fullName, role: "group_admin" },
      });
      if (createErr || !newUser?.user) return json({ error: createErr?.message || "Failed to create user" }, 400);

      const uid = newUser.user.id;
      await admin.from("profiles").update({
        account_status: "active", failed_login_attempts: 0,
        full_name: fullName, phone: phone || null, must_change_password: true,
      }).eq("user_id", uid);
      await admin.from("user_roles").insert({ user_id: uid, role: "group_admin" });
      const { error: assignErr } = await admin.from("group_admin_assignments")
        .insert({ user_id: uid, group_id: groupId, assigned_by: user.id });
      if (assignErr) return json({ error: assignErr.message }, 400);

      await admin.from("activity_logs").insert({
        user_id: user.id, action: "group_admin_created",
        description: `Created group admin ${fullName} for group ${groupId}`,
        entity_type: "group_admin_assignment", entity_id: uid,
      });
      return json({ success: true, userId: uid });
    }

    if (action === "promote") {
      const { userId, groupId } = body;
      if (!userId || !groupId) return json({ error: "userId, groupId required" }, 400);
      await admin.from("user_roles").upsert({ user_id: userId, role: "group_admin" }, { onConflict: "user_id,role" });
      const { error } = await admin.from("group_admin_assignments")
        .upsert({ user_id: userId, group_id: groupId, assigned_by: user.id }, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 400);
      await admin.from("activity_logs").insert({
        user_id: user.id, action: "group_admin_assigned",
        description: `Assigned user ${userId} as group admin of ${groupId}`,
        entity_type: "group_admin_assignment", entity_id: userId,
      });
      return json({ success: true });
    }

    if (action === "remove") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);
      await admin.from("group_admin_assignments").delete().eq("user_id", userId);
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "group_admin");
      await admin.from("activity_logs").insert({
        user_id: user.id, action: "group_admin_removed",
        description: `Removed group admin role from ${userId}`,
        entity_type: "group_admin_assignment", entity_id: userId,
      });
      return json({ success: true });
    }

    if (action === "reset_password") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) return json({ error: "userId, newPassword required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").update({
        must_change_password: true, failed_login_attempts: 0, account_status: "active",
      }).eq("user_id", userId);
      await admin.from("activity_logs").insert({
        user_id: user.id, action: "group_admin_password_reset",
        description: `Reset password for group admin ${userId}`,
        entity_type: "auth", entity_id: userId,
      });
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("manage-group-admin error", err);
    return json({ error: err.message || "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
