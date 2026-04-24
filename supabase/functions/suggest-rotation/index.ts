// Planner-only AI: suggests a beneficiary rotation order. Does NOT write to DB.
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anon = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const sb = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await sb
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Admin access required");

    const { members, hint } = await req.json();
    if (!Array.isArray(members) || members.length < 2) {
      return new Response(JSON.stringify({ error: "Provide at least 2 members" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sys = `You are a rotation planner for a savings group. You ONLY suggest an order of members. You never execute anything. Return strict JSON via the tool call. Prefer alphabetical by full_name unless the admin's hint suggests otherwise.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Members:\n${JSON.stringify(members)}\n\nAdmin hint: ${hint || "(none)"}\n\nReturn an ordered list of user_ids.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_order",
            description: "Return the proposed beneficiary order as user_ids.",
            parameters: {
              type: "object",
              properties: {
                order: { type: "array", items: { type: "string" }, description: "Ordered list of user_id strings" },
                rationale: { type: "string" },
              },
              required: ["order"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_order" } },
      }),
    });

    if (!resp.ok) {
      const status = resp.status;
      const txt = await resp.text();
      console.error("AI gateway error:", status, txt);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let order: string[] = [];
    let rationale = "";
    if (call?.function?.arguments) {
      try {
        const args = JSON.parse(call.function.arguments);
        order = Array.isArray(args.order) ? args.order : [];
        rationale = args.rationale || "";
      } catch (_) {}
    }

    // Fallback: alphabetical
    if (!order.length) {
      order = [...members]
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""))
        .map((m: any) => m.user_id);
      rationale = "Fallback: alphabetical by name.";
    }

    // Filter to only valid IDs and dedupe
    const validIds = new Set(members.map((m: any) => m.user_id));
    const seen = new Set<string>();
    order = order.filter((id) => validIds.has(id) && !seen.has(id) && seen.add(id));
    // Append any missing members at the end
    for (const m of members) if (!seen.has(m.user_id)) order.push(m.user_id);

    return new Response(JSON.stringify({ order, rationale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-rotation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
