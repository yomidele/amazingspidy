import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tools the AI is allowed to PROPOSE. Execution still requires admin click.
const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_beneficiary",
      description: "Change the beneficiary member for an existing monthly contribution period in a group.",
      parameters: {
        type: "object",
        properties: {
          group_name: { type: "string", description: "Name of the contribution group" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          year: { type: "integer", minimum: 2024 },
          new_beneficiary_name: { type: "string", description: "Full name (or email) of the new beneficiary member" },
        },
        required: ["group_name", "month", "year", "new_beneficiary_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "advance_group_month",
      description: "Advance a contribution group to its next rotation month.",
      parameters: {
        type: "object",
        properties: { group_name: { type: "string" } },
        required: ["group_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_monthly_period",
      description: "Create a single new monthly contribution period for a group with a beneficiary.",
      parameters: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          year: { type: "integer", minimum: 2024 },
          beneficiary_name: { type: "string" },
        },
        required: ["group_name", "month", "year", "beneficiary_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_beneficiary_bank_details",
      description: "Update the beneficiary BANK DETAILS (bank name, account name, account number, sort code) for a monthly contribution period. Only updates the fields explicitly provided. Account number must be 6-10 digits. Sort code (optional) must be in XX-XX-XX format. Requires admin confirmation.",
      parameters: {
        type: "object",
        properties: {
          group_name: { type: "string", description: "Name of the contribution group" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          year: { type: "integer", minimum: 2024 },
          member_name: { type: "string", description: "Full name (or email) of the beneficiary member whose bank details are being updated" },
          bank_name: { type: "string", description: "New bank name (optional - only include if changing)" },
          account_name: { type: "string", description: "New account holder name (optional - can differ from member name)" },
          account_number: { type: "string", description: "New account number, 6-10 digits only (optional)" },
          sort_code: { type: "string", description: "New UK sort code in XX-XX-XX format (optional)" },
        },
        required: ["group_name", "month", "year", "member_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_contribution_finalized",
      description: "Mark a monthly contribution period as finalized (closed for payments).",
      parameters: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          year: { type: "integer", minimum: 2024 },
        },
        required: ["group_name", "month", "year"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const body = await req.json();

    // ===== EXECUTE MODE =====
    // Admin clicked "Confirm" on a previously proposed action.
    if (body.execute && body.proposal) {
      const result = await executeProposal(supabase, body.proposal, user.id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== PLAN MODE =====
    const { messages } = body;
    const context = await getDashboardContext(supabase);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Amana, a strict and precise AI co-pilot for the Amana Market admin. The caller has already been verified as ADMIN by the system.

You have TWO modes of response:
1. **Conversational answer** — for questions about data ("how much was contributed?", "who is the beneficiary in May?"). Just reply in plain markdown.
2. **Action proposal** — when the admin asks you to DO something, call the appropriate tool. Do NOT also write JSON code blocks. The system will render a confirm card; the admin must click "Confirm & run" before anything executes.

🔐 STRICT RULES FOR BENEFICIARY BANK DETAIL UPDATES (update_beneficiary_bank_details):
- ONLY propose this tool when the admin gives a CLEAR, DIRECT instruction (e.g. "update beneficiary bank details for John Doe in May 2026", "change John's account number to 0123456789").
- If the request is unclear or missing critical fields (member name, group, month/year), DO NOT call the tool. Ask for clarification first.
- NEVER guess or auto-fill missing bank details. If the admin says "update the account number" but doesn't give one, ASK for it.
- Account number must be numeric, 6–10 digits.
- Sort code (if provided) must be in XX-XX-XX format.
- Only include the bank fields the admin explicitly mentioned in the args — do not pad with empty values. The system will only overwrite fields you provide.
- The confirm card IS the confirmation step. Don't ask the admin to type "CONFIRM" — they click the button.

You can ONLY propose actions for tools you have. For anything else (deleting users, approving loans, recording payments, creating rotations), point to the right panel:
- Create rotations → Rotation Builder panel
- Approve/reject loans → Loans tab
- Record payments → Payments tab
- Create/delete members → Members tab

Use British Pounds (£). Never expose UUIDs — use names from the context.

REAL-TIME DASHBOARD DATA:
${JSON.stringify(context, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResp.json();
    const choice = aiData.choices?.[0];
    const msg = choice?.message;
    const toolCall = msg?.tool_calls?.[0];

    let proposal: any = null;
    let reply: string = msg?.content || "";

    if (toolCall?.function?.name) {
      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        proposal = {
          tool: toolCall.function.name,
          args,
          summary: summarizeProposal(toolCall.function.name, args),
        };
        if (!reply) {
          reply = `I'd like to **${proposal.summary}**. Review and confirm below.`;
        }
      } catch (e) {
        console.error("Tool call parse error:", e);
      }
    }

    if (!reply && !proposal) reply = "I didn't catch that — could you rephrase?";

    return new Response(JSON.stringify({ reply, proposal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function summarizeProposal(tool: string, args: any): string {
  const monthName = (m: number) =>
    new Date(2000, m - 1, 1).toLocaleString("en-GB", { month: "long" });
  switch (tool) {
    case "update_beneficiary":
      return `change ${monthName(args.month)} ${args.year} beneficiary in "${args.group_name}" to ${args.new_beneficiary_name}`;
    case "advance_group_month":
      return `advance group "${args.group_name}" to its next month`;
    case "create_monthly_period":
      return `create ${monthName(args.month)} ${args.year} period in "${args.group_name}" with ${args.beneficiary_name} as beneficiary`;
    case "mark_contribution_finalized":
      return `finalize ${monthName(args.month)} ${args.year} in "${args.group_name}"`;
    default:
      return tool;
  }
}

// ===== Helpers =====
async function findGroup(supabase: any, name: string) {
  const { data } = await supabase
    .from("contribution_groups")
    .select("id, name, contribution_amount")
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function findMember(supabase: any, name: string, groupId?: string) {
  let q = supabase.from("profiles").select("user_id, full_name, email").or(`full_name.ilike.%${name}%,email.ilike.%${name}%`);
  const { data } = await q.limit(5);
  if (!data?.length) return null;
  if (!groupId) return data[0];
  // Prefer one in the group
  const { data: members } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .in("user_id", data.map((d: any) => d.user_id));
  const inGroup = data.find((d: any) => members?.some((m: any) => m.user_id === d.user_id));
  return inGroup || data[0];
}

async function executeProposal(supabase: any, proposal: any, adminId: string): Promise<{ success: boolean; message: string }> {
  const { tool, args } = proposal;
  try {
    if (tool === "update_beneficiary") {
      const grp = await findGroup(supabase, args.group_name);
      if (!grp) return { success: false, message: `Group "${args.group_name}" not found.` };
      const member = await findMember(supabase, args.new_beneficiary_name, grp.id);
      if (!member) return { success: false, message: `Member "${args.new_beneficiary_name}" not found.` };
      const { data: mc, error: e1 } = await supabase
        .from("monthly_contributions")
        .select("id")
        .eq("group_id", grp.id)
        .eq("month", args.month)
        .eq("year", args.year)
        .maybeSingle();
      if (e1 || !mc) return { success: false, message: `No period for ${args.month}/${args.year} in "${grp.name}".` };
      const { error } = await supabase
        .from("monthly_contributions")
        .update({ beneficiary_user_id: member.user_id })
        .eq("id", mc.id);
      if (error) return { success: false, message: error.message };
      await supabase.from("activity_logs").insert({
        action: "ai_update_beneficiary",
        description: `Admin updated beneficiary for ${args.month}/${args.year} in ${grp.name} to ${member.full_name || member.email} (via AI assistant)`,
        entity_type: "monthly_contribution",
        entity_id: mc.id,
        user_id: adminId,
      });
      return { success: true, message: `✅ Beneficiary updated to ${member.full_name || member.email} for ${args.month}/${args.year}.` };
    }

    if (tool === "advance_group_month") {
      const grp = await findGroup(supabase, args.group_name);
      if (!grp) return { success: false, message: `Group "${args.group_name}" not found.` };
      const { data, error } = await supabase.rpc("advance_group_month", { _group_id: grp.id });
      if (error) return { success: false, message: error.message };
      if (!data?.success) return { success: false, message: data?.reason || "Could not advance month." };
      return { success: true, message: `✅ ${grp.name} advanced to month ${data.current_month} (${data.period}).` };
    }

    if (tool === "create_monthly_period") {
      const grp = await findGroup(supabase, args.group_name);
      if (!grp) return { success: false, message: `Group "${args.group_name}" not found.` };
      const member = await findMember(supabase, args.beneficiary_name, grp.id);
      if (!member) return { success: false, message: `Member "${args.beneficiary_name}" not found.` };
      const { count } = await supabase
        .from("group_memberships")
        .select("*", { count: "exact", head: true })
        .eq("group_id", grp.id)
        .eq("is_active", true);
      const totalExpected = (count || 0) * Number(grp.contribution_amount);
      const { data, error } = await supabase
        .from("monthly_contributions")
        .insert({
          group_id: grp.id,
          month: args.month,
          year: args.year,
          beneficiary_user_id: member.user_id,
          total_expected: totalExpected,
        })
        .select("id")
        .single();
      if (error) return { success: false, message: error.message.includes("unique") ? `Period ${args.month}/${args.year} already exists for this group.` : error.message };
      await supabase.from("activity_logs").insert({
        action: "ai_create_period",
        description: `Admin created period ${args.month}/${args.year} in ${grp.name} for ${member.full_name || member.email} (via AI assistant)`,
        entity_type: "monthly_contribution",
        entity_id: data.id,
        user_id: adminId,
      });
      return { success: true, message: `✅ Created ${args.month}/${args.year} period for ${member.full_name || member.email}.` };
    }

    if (tool === "mark_contribution_finalized") {
      const grp = await findGroup(supabase, args.group_name);
      if (!grp) return { success: false, message: `Group "${args.group_name}" not found.` };
      const { error } = await supabase
        .from("monthly_contributions")
        .update({ is_finalized: true })
        .eq("group_id", grp.id)
        .eq("month", args.month)
        .eq("year", args.year);
      if (error) return { success: false, message: error.message };
      return { success: true, message: `✅ ${args.month}/${args.year} finalized.` };
    }

    return { success: false, message: `Unknown action: ${tool}` };
  } catch (e: any) {
    console.error("Execute error:", e);
    return { success: false, message: e?.message || "Execution failed." };
  }
}

async function getDashboardContext(supabase: any) {
  const [groupsRes, profilesRes, mcRes, loansRes, loanReqRes] = await Promise.all([
    supabase.from("contribution_groups").select("id, name, contribution_amount, current_month, total_months, is_active").eq("is_active", true),
    supabase.from("profiles").select("user_id, full_name, email"),
    supabase.from("monthly_contributions").select("group_id, month, year, beneficiary_user_id, total_collected, total_expected, is_finalized").order("year", { ascending: false }).order("month", { ascending: false }).limit(40),
    supabase.from("loans").select("id, user_id, outstanding_balance, status").eq("status", "active"),
    supabase.from("loan_requests").select("id, status").in("status", ["pending", "awaiting_guarantor", "pending_admin"]),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of profilesRes.data || []) profileMap[p.user_id] = p.full_name || p.email || "Unknown";

  const groupMap: Record<string, string> = {};
  for (const g of groupsRes.data || []) groupMap[g.id] = g.name;

  return {
    groups: (groupsRes.data || []).map((g: any) => ({
      name: g.name,
      contribution_amount: g.contribution_amount,
      current_month: g.current_month,
      total_months: g.total_months,
    })),
    recent_periods: (mcRes.data || []).map((mc: any) => ({
      group: groupMap[mc.group_id] || "Unknown",
      month: mc.month,
      year: mc.year,
      beneficiary: mc.beneficiary_user_id ? profileMap[mc.beneficiary_user_id] : null,
      collected: mc.total_collected,
      expected: mc.total_expected,
      finalized: mc.is_finalized,
    })),
    members: (profilesRes.data || []).slice(0, 100).map((p: any) => ({ name: p.full_name, email: p.email })),
    active_loans_count: loansRes.data?.length || 0,
    pending_loan_requests: loanReqRes.data?.length || 0,
  };
}
