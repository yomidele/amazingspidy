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

    const { messages, action } = await req.json();

    // If this is an action execution request
    if (action) {
      const result = await executeAction(supabase, action, user.id);
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get dashboard context for the AI
    const context = await getDashboardContext(supabase);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Amana, the AI assistant for the Amana Market admin dashboard. You help administrators manage their platform efficiently.

You have access to the following real-time data:
${JSON.stringify(context, null, 2)}

You can help the admin with these tasks by responding with a JSON action block when they ask you to perform an action:

AVAILABLE ACTIONS (respond with JSON wrapped in \`\`\`action ... \`\`\` block):

1. Create monthly contribution:
\`\`\`action
{"type":"create_contribution_month","group_id":"...","month":1-12,"year":2024-2030,"beneficiary_user_id":"...","beneficiary_bank_name":"...","beneficiary_account_number":"..."}
\`\`\`

2. Delete a user (contributor/investor):
\`\`\`action
{"type":"delete_user","user_id":"...","user_name":"..."}
\`\`\`

3. Approve a loan request:
\`\`\`action
{"type":"approve_loan","request_id":"..."}
\`\`\`

4. Reject a loan request:
\`\`\`action
{"type":"reject_loan","request_id":"...","reason":"..."}
\`\`\`

5. Delete a loan request:
\`\`\`action
{"type":"delete_loan_request","request_id":"..."}
\`\`\`

RULES:
- When asked to create a monthly contribution, ask for: which group, which month/year, beneficiary details (name, bank, account number). Use the context data to match names to IDs.
- When checking investment balances, use the context data to provide accurate figures.
- When asked about loan applications, list them from the context data.
- Always confirm before executing destructive actions (delete).
- Be concise, professional, and helpful.
- If the admin says something casual, respond naturally.
- Address the admin as "Admin" or by name if known.
- You know everything about the platform: contributions, loans, investors, members.
- When listing members or investors, use the data from context.
- For creating contribution months, you MUST ask for the group, beneficiary, month and year if not provided.
- Use British Pounds (£) for currency.`;

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

async function executeAction(supabase: any, action: any, adminUserId: string) {
  switch (action.type) {
    case "create_contribution_month": {
      const { group_id, month, year, beneficiary_user_id, beneficiary_bank_name, beneficiary_account_number } = action;

      // Count active members in group
      const { data: members } = await supabase
        .from("group_memberships")
        .select("user_id")
        .eq("group_id", group_id)
        .eq("is_active", true);

      const { data: group } = await supabase
        .from("contribution_groups")
        .select("contribution_amount")
        .eq("id", group_id)
        .single();

      const totalExpected = (members?.length || 0) * (group?.contribution_amount || 0);

      const { data, error } = await supabase.from("monthly_contributions").insert({
        group_id,
        month,
        year,
        beneficiary_user_id: beneficiary_user_id || null,
        beneficiary_bank_name: beneficiary_bank_name || null,
        beneficiary_account_number: beneficiary_account_number || null,
        total_expected: totalExpected,
      }).select().single();

      if (error) throw error;
      return { success: true, message: `Monthly contribution created for ${month}/${year}. Total expected: £${totalExpected}` };
    }

    case "approve_loan": {
      const { request_id } = action;
      const { data: lr } = await supabase.from("loan_requests").select("*").eq("id", request_id).single();
      if (!lr) throw new Error("Loan request not found");

      await supabase.from("loan_requests").update({ status: "approved" }).eq("id", request_id);

      const { data: loan } = await supabase.from("loans").insert({
        user_id: lr.borrower_id,
        group_id: lr.group_id,
        principal_amount: lr.amount,
        outstanding_balance: lr.amount,
        monthly_repayment: Math.ceil((lr.amount / lr.duration_months) * 100) / 100,
        status: "active",
      }).select("id").single();

      // Notify borrower
      await supabase.from("notifications").insert({
        user_id: lr.borrower_id,
        title: "Loan Approved ✅",
        message: `Your loan of £${lr.amount.toLocaleString()} has been approved!`,
        type: "success",
      });

      return { success: true, message: `Loan of £${lr.amount} approved and issued.` };
    }

    case "reject_loan": {
      const { request_id, reason } = action;
      await supabase.from("loan_requests").update({ status: "rejected", admin_notes: reason }).eq("id", request_id);
      return { success: true, message: "Loan request rejected." };
    }

    case "delete_loan_request": {
      const { request_id } = action;
      await supabase.from("loan_guarantors").delete().eq("loan_request_id", request_id);
      await supabase.from("loan_signatures").delete().eq("loan_request_id", request_id);
      await supabase.from("loan_requests").delete().eq("id", request_id);
      return { success: true, message: "Loan request deleted. User can now apply again." };
    }

    case "delete_user": {
      // Call the existing delete-member edge function logic
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const resp = await fetch(`${supabaseUrl}/functions/v1/delete-member`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberId: action.user_id }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to delete user: ${errText}`);
      }

      return { success: true, message: `User ${action.user_name || ""} has been deleted.` };
    }

    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
