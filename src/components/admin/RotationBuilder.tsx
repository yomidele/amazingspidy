import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, X, Loader2, RefreshCw, Calendar, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  contribution_amount: number;
}

interface Member {
  user_id: string;
  full_name: string | null;
  email: string | null;
  // last-known bank details (from any prior monthly_contributions row where they were beneficiary)
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
}

const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString("en-GB", { month: "long" });

const RotationBuilder = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth() + 2); // next month
  const [startYear, setStartYear] = useState<number>(
    new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  );
  const [aiHint, setAiHint] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [existingMonths, setExistingMonths] = useState<Set<string>>(new Set()); // "YYYY-MM"
  const [stage, setStage] = useState<"build" | "preview" | "done">("build");
  const [doneSummary, setDoneSummary] = useState<{ created: number; period: string } | null>(null);
  // Inline per-month overrides: index in plan -> user_id (replaces sequential assignment for that slot only)
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  // Load groups
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contribution_groups")
        .select("id, name, contribution_amount")
        .eq("is_active", true)
        .order("name");
      setGroups(data || []);
      if (data?.[0]) setGroupId(data[0].id);
    })();
  }, []);

  // Load members + existing months when group changes
  useEffect(() => {
    if (!groupId) return;
    (async () => {
      setLoadingMembers(true);

      const [memberRes, mcRes] = await Promise.all([
        supabase
          .from("group_memberships")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("is_active", true),
        supabase
          .from("monthly_contributions")
          .select("month, year, beneficiary_user_id, beneficiary_bank_name, beneficiary_account_name, beneficiary_account_number, beneficiary_sort_code")
          .eq("group_id", groupId),
      ]);

      // Fetch profiles separately (no FK between group_memberships.user_id and profiles.user_id)
      const memberIds = (memberRes.data || []).map((r: any) => r.user_id);
      let profilesById = new Map<string, { user_id: string; full_name: string | null; email: string | null }>();
      if (memberIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", memberIds);
        for (const p of profs || []) profilesById.set(p.user_id, p as any);
      }

      // Debug aid
      console.log("[RotationBuilder] group:", groupId, "memberships:", memberRes.data?.length, "profiles:", profilesById.size);

      // Build last-known bank cache from monthly_contributions (most recent first)
      const bankByUser = new Map<string, any>();
      const sortedMc = [...(mcRes.data || [])].sort((a: any, b: any) =>
        (b.year - a.year) || (b.month - a.month)
      );
      for (const mc of sortedMc) {
        if (mc.beneficiary_user_id && !bankByUser.has(mc.beneficiary_user_id) && mc.beneficiary_account_number) {
          bankByUser.set(mc.beneficiary_user_id, {
            bank_name: mc.beneficiary_bank_name,
            account_name: mc.beneficiary_account_name,
            account_number: mc.beneficiary_account_number,
            sort_code: mc.beneficiary_sort_code,
          });
        }
      }

      const ms: Member[] = (memberRes.data || [])
        .map((row: any) => {
          const p = profilesById.get(row.user_id);
          if (!p) return null;
          const bank = bankByUser.get(p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            ...(bank || {}),
          } as Member;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || "")) as Member[];

      setMembers(ms);
      const existing = new Set<string>();
      for (const mc of mcRes.data || []) {
        existing.add(`${mc.year}-${String(mc.month).padStart(2, "0")}`);
      }
      setExistingMonths(existing);
      // Default selection: all
      setSelected(Object.fromEntries(ms.map((m) => [m.user_id, true])));
      setOrder(ms.map((m) => m.user_id));
      setStage("build");
      setOverrides({});
      setLoadingMembers(false);
    })();
  }, [groupId]);

  const selectedOrder = useMemo(() => order.filter((id) => selected[id]), [order, selected]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m])), [members]);

  // Plan = list of {month, year, user_id}, with optional per-slot overrides
  const plan = useMemo(() => {
    const out: { month: number; year: number; user_id: string }[] = [];
    let m = startMonth, y = startYear;
    selectedOrder.forEach((uid, i) => {
      out.push({ month: m, year: y, user_id: overrides[i] || uid });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    });
    return out;
  }, [selectedOrder, startMonth, startYear, overrides]);

  // Validation
  const validation = useMemo(() => {
    const issues: { type: "warning" | "error"; msg: string }[] = [];
    const missingBank = selectedOrder.filter((id) => !memberById[id]?.account_number);
    if (missingBank.length) {
      issues.push({
        type: "warning",
        msg: `${missingBank.length} member${missingBank.length === 1 ? "" : "s"} have no bank details on file: ${missingBank.map((id) => memberById[id]?.full_name || "Unknown").join(", ")}`,
      });
    }
    const dupes = plan.filter((p) => existingMonths.has(`${p.year}-${String(p.month).padStart(2, "0")}`));
    if (dupes.length) {
      issues.push({
        type: "error",
        msg: `${dupes.length} period${dupes.length === 1 ? "" : "s"} already exist for this group: ${dupes.map((d) => `${monthName(d.month)} ${d.year}`).join(", ")}`,
      });
    }
    if (selectedOrder.length < 2) {
      issues.push({ type: "error", msg: "Select at least 2 members." });
    }
    return issues;
  }, [plan, selectedOrder, memberById, existingMonths]);

  const hasErrors = validation.some((v) => v.type === "error");

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const aiSuggest = async () => {
    if (selectedOrder.length < 2) {
      toast.error("Pick at least 2 members first");
      return;
    }
    setAiLoading(true);
    try {
      const payload = selectedOrder.map((id) => ({
        user_id: id,
        full_name: memberById[id]?.full_name || "",
      }));
      const { data, error } = await supabase.functions.invoke("suggest-rotation", {
        body: { members: payload, hint: aiHint },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const proposed: string[] = data?.order || [];
      // Reorder selected members per AI; keep unselected where they were
      const set = new Set(proposed);
      const newOrder = [
        ...proposed,
        ...order.filter((id) => !set.has(id)),
      ];
      setOrder(newOrder);
      toast.success("AI rotation suggestion applied");
    } catch (e: any) {
      toast.error(e.message || "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const confirmCreate = async () => {
    if (hasErrors) return;
    setConfirming(true);
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) { setConfirming(false); return; }

    try {
      const memberCount = selectedOrder.length;
      const totalExpected = memberCount * Number(grp.contribution_amount);

      const rows = plan.map((p) => {
        const bank = memberById[p.user_id];
        return {
          group_id: groupId,
          month: p.month,
          year: p.year,
          beneficiary_user_id: p.user_id,
          beneficiary_bank_name: bank?.bank_name || null,
          beneficiary_account_name: bank?.account_name || null,
          beneficiary_account_number: bank?.account_number || null,
          beneficiary_sort_code: bank?.sort_code || null,
          total_expected: totalExpected,
        };
      });

      const { error } = await supabase.from("monthly_contributions").insert(rows);
      if (error) {
        // Friendly errors
        const m = error.message || "";
        if (m.includes("duplicate") || m.includes("unique")) {
          toast.error("One of the months already exists. Edit start month or remove duplicates.");
        } else if (m.includes("Account number")) {
          toast.error("A member's account number is invalid (must be 6–10 digits).");
        } else if (m.includes("Sort code")) {
          toast.error("A member's sort code is invalid (must be XX-XX-XX).");
        } else {
          toast.error(`Could not create cycle: ${m}`);
        }
        setConfirming(false);
        return;
      }

      const first = plan[0], last = plan[plan.length - 1];
      const period = `${monthName(first.month)} ${first.year} – ${monthName(last.month)} ${last.year}`;
      setDoneSummary({ created: rows.length, period });
      setStage("done");
      toast.success(`Rotation created (${rows.length} months)`);
    } catch (e: any) {
      toast.error(e.message || "Unknown error");
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStage("build");
    setDoneSummary(null);
    // refresh existing months so the just-created ones show as taken
    if (groupId) {
      supabase.from("monthly_contributions").select("month, year").eq("group_id", groupId).then(({ data }) => {
        const e = new Set<string>();
        for (const r of data || []) e.add(`${r.year}-${String(r.month).padStart(2, "0")}`);
        setExistingMonths(e);
      });
    }
  };

  if (stage === "done" && doneSummary) {
    return (
      <Card className="border-green-500/40 bg-green-500/5">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
          <h3 className="text-lg font-bold">Contribution cycle created successfully</h3>
          <p className="text-sm text-muted-foreground">
            Cycle: <b>{doneSummary.period}</b> · Members: <b>{doneSummary.created}</b>
          </p>
          <Button onClick={reset}>Build another rotation</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4 text-contribution" />
          Create rotation
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pick a group, choose members & start month, then preview before confirming. AI can suggest an order — you stay in control.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Group + start */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Pick a group" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name} (£{g.contribution_amount})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start month</Label>
            <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start year</Label>
            <Input
              type="number" min={2024} max={2100}
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>
        </div>

        {/* Members picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Members ({selectedOrder.length} selected)</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(Object.fromEntries(members.map((m) => [m.user_id, true])))}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected({})}>Clear</Button>
            </div>
          </div>

          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No active members found in this group.</p>
              <p className="text-[11px] text-muted-foreground">Add members from the Member Management page, then return here.</p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
              {order.map((uid, idx) => {
                const m = memberById[uid];
                if (!m) return null;
                const isSel = !!selected[uid];
                const hasBank = !!m.account_number;
                return (
                  <div key={uid} className="flex items-center gap-3 p-2.5 hover:bg-muted/40">
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [uid]: !!v }))}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.full_name || m.email}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {hasBank ? `${m.bank_name || "Bank"} · ${m.account_number}` : "⚠ no bank details on file"}
                      </p>
                    </div>
                    {!hasBank && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">No bank</Badge>}
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, 1)} disabled={idx === order.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI suggest */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-contribution" />
            <p className="text-sm font-semibold">AI rotation suggestion</p>
            <Badge variant="secondary" className="text-[10px]">Planner only</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            AI proposes an order; nothing is created until you click <b>Confirm</b>.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Optional hint (e.g. 'oldest members first')"
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
            />
            <Button onClick={aiSuggest} disabled={aiLoading || selectedOrder.length < 2}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Suggest order
            </Button>
          </div>
        </div>

        {/* Validation */}
        {validation.length > 0 && (
          <div className="space-y-1">
            {validation.map((v, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs rounded-md p-2 border ${
                  v.type === "error"
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{v.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs">Preview ({plan.length} months)</Label>
          {plan.length === 0 ? (
            <p className="text-xs text-muted-foreground">Select members to see the preview.</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                Tip: change the dropdown on any row to swap that month's beneficiary without rebuilding the order.
              </p>
              <div className="rounded-lg border divide-y max-h-96 overflow-y-auto">
                {plan.map((p, i) => {
                  const m = memberById[p.user_id];
                  const dupKey = `${p.year}-${String(p.month).padStart(2, "0")}`;
                  const dup = existingMonths.has(dupKey);
                  const isOverridden = overrides[i] !== undefined;
                  return (
                    <div key={i} className={`flex items-center gap-2 p-2.5 text-sm ${dup ? "bg-destructive/5" : ""}`}>
                      <Badge variant="outline" className="w-7 justify-center flex-shrink-0">{i + 1}</Badge>
                      <div className="w-24 flex-shrink-0">
                        <p className="font-medium text-xs">{monthName(p.month).slice(0, 3)} {p.year}</p>
                        {m?.account_number ? (
                          <p className="text-[10px] text-muted-foreground truncate">{m.account_number}</p>
                        ) : (
                          <p className="text-[10px] text-amber-600">no bank</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Select
                          value={p.user_id}
                          onValueChange={(v) => setOverrides((prev) => ({ ...prev, [i]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((mem) => (
                              <SelectItem key={mem.user_id} value={mem.user_id} className="text-xs">
                                {mem.full_name || mem.email}{!mem.account_number && " ⚠"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {isOverridden && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          title="Reset this month"
                          onClick={() => setOverrides((prev) => {
                            const next = { ...prev };
                            delete next[i];
                            return next;
                          })}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {dup && <Badge variant="destructive" className="text-[10px] flex-shrink-0">Exists</Badge>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t">
          {(hasErrors || plan.length === 0) && (
            <div className="flex items-start gap-2 text-xs rounded-md p-2 border border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <b>Confirm is disabled.</b>{" "}
                {plan.length === 0
                  ? "Select at least 2 members to build a cycle."
                  : validation.find((v) => v.type === "error")?.msg ||
                    "Resolve the errors above to continue."}
                {validation.some((v) => v.msg.toLowerCase().includes("already exist")) && (
                  <> — change the <b>Start month/year</b> above to a period that doesn't already exist for this group.</>
                )}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => { setOrder(members.map((m) => m.user_id)); setOverrides({}); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Reset order
            </Button>
            <Button
              onClick={confirmCreate}
              disabled={confirming || hasErrors || plan.length === 0}
              title={
                hasErrors
                  ? validation.find((v) => v.type === "error")?.msg
                  : plan.length === 0
                  ? "Select members first"
                  : "Create the rotation cycle"
              }
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Confirm & create cycle
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RotationBuilder;
