import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
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

    const { messages } = await req.json();

    // Get dashboard context for the AI
    const context = await getDashboardContext(supabase);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Amana, the AI planning assistant for the Amana Market admin dashboard. You answer questions and help the admin plan actions — but you NEVER execute actions. The admin uses dedicated UI panels (Members, Loans, Rotation Builder, Payments) to confirm and run anything.

You have access to the following real-time data:
${JSON.stringify(context, null, 2)}

RULES:
- You are READ-ONLY. Do NOT emit JSON action blocks, code fences with action payloads, or anything resembling a backend command. NEVER write \`\`\`action.
- If the admin asks you to "create", "delete", "approve", "reject", or "issue" something, do NOT pretend to do it. Reply with a short plan and tell them which panel to use:
  • Create monthly contribution / rotation → "Rotation" tab → Rotation Builder
  • Approve/reject loans → "Loans" tab
  • Delete users → "Members" tab → Delete
  • Record payments → "Payments" tab
- Keep replies concise, friendly, and human-readable. Use British Pounds (£).
- Never expose internal IDs (UUIDs, user_id, group_id, request_id). Always use names from the context.
- For data questions (totals, lists, status), answer directly from the context.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getDashboardContext(supabase: any) {
  const [
    membersRes, groupsRes, loansRes, loanRequestsRes,
    investmentsRes, investorPaymentsRes, contributionPaymentsRes,
    monthlyContribRes, profilesRes, membershipRes
  ] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, email, phone"),
    supabase.from("contribution_groups").select("id, name, contribution_amount, is_active"),
    supabase.from("loans").select("id, user_id, principal_amount, outstanding_balance, status"),
    supabase.from("loan_requests").select("id, borrower_id, amount, duration_months, purpose, status, group_id, created_at"),
    supabase.from("investments").select("id, investor_id, amount, interest_rate, duration_months, status, start_date"),
    supabase.from("investor_payments").select("id, investor_id, investment_id, amount_paid, payment_date"),
    supabase.from("contribution_payments").select("amount, status, user_id").eq("status", "paid"),
    supabase.from("monthly_contributions").select("id, group_id, month, year, beneficiary_user_id, is_finalized"),
    supabase.from("profiles").select("user_id, full_name"),
    supabase.from("group_memberships").select("user_id, group_id, is_active").eq("is_active", true),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of profilesRes.data || []) {
    profileMap[p.user_id] = p.full_name || "Unknown";
  }

  // Get roles for context
  const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
  const userRoles: Record<string, string[]> = {};
  for (const r of rolesData || []) {
    if (!userRoles[r.user_id]) userRoles[r.user_id] = [];
    userRoles[r.user_id].push(r.role);
  }

  const members = (membersRes.data || []).map((m: any) => ({
    ...m,
    full_name: m.full_name || "Unknown",
    roles: userRoles[m.user_id] || [],
  }));

  const totalContributions = (contributionPaymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalActiveLoans = (loansRes.data || []).filter((l: any) => l.status === "active").reduce((s: number, l: any) => s + Number(l.outstanding_balance), 0);

  const loanRequests = (loanRequestsRes.data || []).map((lr: any) => ({
    ...lr,
    borrower_name: profileMap[lr.borrower_id] || "Unknown",
  }));

  const investors = (investmentsRes.data || []).map((inv: any) => ({
    ...inv,
    investor_name: profileMap[inv.investor_id] || "Unknown",
    total_paid: (investorPaymentsRes.data || [])
      .filter((p: any) => p.investment_id === inv.id)
      .reduce((s: number, p: any) => s + Number(p.amount_paid), 0),
    expected_return: Number(inv.amount) * (1 + Number(inv.interest_rate) / 100),
  }));

  return {
    summary: {
      totalMembers: members.filter((m: any) => m.roles.includes("contributor")).length,
      totalInvestors: members.filter((m: any) => m.roles.includes("investor")).length,
      totalContributions,
      totalActiveLoans,
      pendingLoanRequests: loanRequests.filter((lr: any) => lr.status === "pending_admin" || lr.status === "awaiting_guarantor").length,
    },
    groups: groupsRes.data || [],
    members: members.slice(0, 50),
    loanRequests,
    investments: investors,
    recentContributionMonths: (monthlyContribRes.data || []).slice(0, 10),
    memberships: (membershipRes.data || []).slice(0, 100),
  };
}

// Note: action execution has been removed. The AI is planner-only.
// All admin actions are performed via dedicated UI panels (Rotation Builder, Loans, Members, Payments).

