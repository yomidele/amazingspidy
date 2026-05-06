// Daily job: auto-advance groups in 'auto' mode AND send unpaid-contribution reminders.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: groups, error } = await supabase
    .from("contribution_groups")
    .select("id, name")
    .eq("is_active", true)
    .eq("progression_mode", "auto");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const g of groups || []) {
    const { data, error: rpcErr } = await supabase.rpc("advance_group_month", { _group_id: g.id });
    results.push({ group: g.name, result: data, error: rpcErr?.message });
  }

  // Always run beneficiary-missing check + unpaid reminders
  const { data: missing } = await supabase.rpc("check_missing_beneficiaries");
  const { data: reminders } = await supabase.rpc("send_unpaid_reminders");

  return new Response(JSON.stringify({
    processed: results.length, results, missing_beneficiaries: missing, reminders,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
