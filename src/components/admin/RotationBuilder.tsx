import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, X, Loader2, RefreshCw, Calendar, Users, Lock, ArrowLeftRight,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
}

// Existing monthly_contributions row, keyed by "YYYY-MM"
interface ExistingPeriod {
  id: string;
  month: number;
  year: number;
  beneficiary_user_id: string | null;
  is_finalized: boolean;
}

const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString("en-GB", { month: "long" });

const maskAccount = (a?: string | null) => {
  if (!a) return "—";
  const s = String(a);
  if (s.length <= 4) return s;
  return `••••${s.slice(-4)}`;
};

const RotationBuilder = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth() + 2);
  const [startYear, setStartYear] = useState<number>(
    new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  );
  const [aiHint, setAiHint] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // existing periods (full object) by "YYYY-MM"
  const [existingByKey, setExistingByKey] = useState<Map<string, ExistingPeriod>>(new Map());
  const [stage, setStage] = useState<"build" | "done">("build");
  const [doneSummary, setDoneSummary] = useState<{ created: number; updated: number; period: string } | null>(null);
  // Per-slot overrides: index in plan -> user_id
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  // Last swap feedback (highlights both rows)
  const [lastSwap, setLastSwap] = useState<{ a: number; b: number; name: string; period: string } | null>(null);
  const swapTimer = useRef<number | null>(null);
  // Confirm-swap dialog state
  const [pendingSwap, setPendingSwap] = useState<null | {
    fromIdx: number; toIdx: number;
    incoming: Member; outgoing: Member;
    fromPeriod: string; toPeriod: string;
  }>(null);

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
          .select("id, month, year, beneficiary_user_id, beneficiary_bank_name, beneficiary_account_name, beneficiary_account_number, beneficiary_sort_code, is_finalized")
          .eq("group_id", groupId),
      ]);

      const memberIds = (memberRes.data || []).map((r: any) => r.user_id);
      let profilesById = new Map<string, { user_id: string; full_name: string | null; email: string | null }>();
      if (memberIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", memberIds);
        for (const p of profs || []) profilesById.set(p.user_id, p as any);
      }

      // Last-known bank cache
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
      const map = new Map<string, ExistingPeriod>();
      for (const mc of mcRes.data || []) {
        const key = `${mc.year}-${String(mc.month).padStart(2, "0")}`;
        map.set(key, {
          id: mc.id,
          month: mc.month,
          year: mc.year,
          beneficiary_user_id: mc.beneficiary_user_id,
          is_finalized: !!mc.is_finalized,
        });
      }
      setExistingByKey(map);
      setSelected(Object.fromEntries(ms.map((m) => [m.user_id, true])));
      setOrder(ms.map((m) => m.user_id));
      setStage("build");
      setOverrides({});
      setLastSwap(null);
      setLoadingMembers(false);
    })();
  }, [groupId]);

  const selectedOrder = useMemo(() => order.filter((id) => selected[id]), [order, selected]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m])), [members]);

  // Base plan: month/year sequence + default user_id from selectedOrder, with overrides applied per slot.
  // For slots that match an EXISTING period, the default user_id becomes that period's beneficiary (edit mode).
  const plan = useMemo(() => {
    const out: { month: number; year: number; user_id: string; existing?: ExistingPeriod }[] = [];
    let m = startMonth, y = startYear;
    selectedOrder.forEach((uid, i) => {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const existing = existingByKey.get(key);
      // Default value priority: explicit override > existing beneficiary > sequential pick
      const defaultUid = overrides[i] !== undefined
        ? overrides[i]
        : (existing?.beneficiary_user_id || uid);
      out.push({ month: m, year: y, user_id: defaultUid, existing });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    });
    return out;
  }, [selectedOrder, startMonth, startYear, overrides, existingByKey]);

  // Detect duplicate user_ids inside the plan (should never happen after smart swap, but guard)
  const planDuplicates = useMemo(() => {
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    plan.forEach((p) => {
      const c = (seen.get(p.user_id) || 0) + 1;
      seen.set(p.user_id, c);
      if (c > 1) dups.add(p.user_id);
    });
    return dups;
  }, [plan]);

  // Counts for the action button
  const editStats = useMemo(() => {
    let toUpdate = 0, toInsert = 0, locked = 0;
    plan.forEach((p) => {
      if (p.existing?.is_finalized) locked++;
      else if (p.existing) toUpdate++;
      else toInsert++;
    });
    return { toUpdate, toInsert, locked };
  }, [plan]);

  const isEditMode = editStats.toUpdate > 0;

  // Validation
  const validation = useMemo(() => {
    const issues: { type: "warning" | "error"; msg: string }[] = [];
    const missingBank = plan.filter((p) => !memberById[p.user_id]?.account_number);
    if (missingBank.length) {
      issues.push({
        type: "warning",
        msg: `${missingBank.length} member${missingBank.length === 1 ? "" : "s"} have no bank details on file: ${missingBank.map((p) => memberById[p.user_id]?.full_name || "Unknown").join(", ")}`,
      });
    }
    if (planDuplicates.size > 0) {
      issues.push({
        type: "error",
        msg: `Duplicate beneficiary detected — each member can only appear once per cycle.`,
      });
    }
    if (selectedOrder.length < 2) {
      issues.push({ type: "error", msg: "Select at least 2 members." });
    }
    return issues;
  }, [plan, planDuplicates, selectedOrder, memberById]);

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

  // ────────────────────────────────────────────────────────────────────
  // SMART SWAP: when admin assigns member X to slot i, if X already
  // occupies slot j, swap them. Always operates on memberId (primary key).
  // Locked (paid) rows can't be swapped into or out of.
  // ────────────────────────────────────────────────────────────────────
  const applySwap = (fromIdx: number, newUserId: string) => {
    const fromSlot = plan[fromIdx];
    if (!fromSlot) return;
    if (fromSlot.existing?.is_finalized) {
      toast.error("This period is already paid and cannot be changed.");
      return;
    }
    if (fromSlot.user_id === newUserId) return;

    // Find if newUserId is already in another slot
    const toIdx = plan.findIndex((p, i) => i !== fromIdx && p.user_id === newUserId);

    if (toIdx === -1) {
      // No conflict — just override this slot
      setOverrides((prev) => ({ ...prev, [fromIdx]: newUserId }));
      return;
    }

    // Conflict — locked target can't be swapped
    if (plan[toIdx].existing?.is_finalized) {
      toast.error(`${memberById[newUserId]?.full_name || "Member"} is locked in a paid period and cannot be swapped.`);
      return;
    }

    // Stage confirmation modal
    const incoming = memberById[newUserId];
    const outgoing = memberById[fromSlot.user_id];
    if (!incoming || !outgoing) return;

    setPendingSwap({
      fromIdx,
      toIdx,
      incoming,
      outgoing,
      fromPeriod: `${monthName(fromSlot.month)} ${fromSlot.year}`,
      toPeriod: `${monthName(plan[toIdx].month)} ${plan[toIdx].year}`,
    });
  };

  const commitSwap = () => {
    if (!pendingSwap) return;
    const { fromIdx, toIdx, incoming, outgoing, fromPeriod, toPeriod } = pendingSwap;
    setOverrides((prev) => ({
      ...prev,
      [fromIdx]: incoming.user_id,
      [toIdx]: outgoing.user_id,
    }));
    setLastSwap({
      a: fromIdx,
      b: toIdx,
      name: incoming.full_name || incoming.email || "Member",
      period: toPeriod,
    });
    if (swapTimer.current) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => setLastSwap(null), 4000);
    toast.success(`Swapped: ${incoming.full_name} ↔ ${outgoing.full_name} (${fromPeriod} ⇄ ${toPeriod})`);
    setPendingSwap(null);
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
      const set = new Set(proposed);
      const newOrder = [
        ...proposed,
        ...order.filter((id) => !set.has(id)),
      ];
      setOrder(newOrder);
      setOverrides({});
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
      const memberCount = plan.length;
      const totalExpected = memberCount * Number(grp.contribution_amount);

      // Build full beneficiary objects (FULL OBJECT SWAP — bank details follow memberId)
      const buildRow = (p: typeof plan[number]) => {
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
      };

      // Split into INSERT (new periods) and UPDATE (existing, non-paid)
      const inserts: any[] = [];
      const updates: { id: string; row: any }[] = [];
      let skippedLocked = 0;

      for (const p of plan) {
        const row = buildRow(p);
        if (p.existing?.is_finalized) {
          skippedLocked++;
          continue; // never touch paid periods
        }
        if (p.existing) {
          updates.push({ id: p.existing.id, row });
        } else {
          inserts.push(row);
        }
      }

      // Insert new periods
      if (inserts.length) {
        const { error } = await supabase.from("monthly_contributions").insert(inserts);
        if (error) throw error;
      }

      // Update existing (non-paid) periods one by one
      for (const u of updates) {
        const { error } = await supabase
          .from("monthly_contributions")
          .update(u.row)
          .eq("id", u.id);
        if (error) throw error;
      }

      const first = plan[0], last = plan[plan.length - 1];
      const period = `${monthName(first.month)} ${first.year} – ${monthName(last.month)} ${last.year}`;
      setDoneSummary({ created: inserts.length, updated: updates.length, period });
      setStage("done");
      const parts = [];
      if (inserts.length) parts.push(`${inserts.length} created`);
      if (updates.length) parts.push(`${updates.length} updated`);
      if (skippedLocked) parts.push(`${skippedLocked} locked (paid) skipped`);
      toast.success(`Rotation saved — ${parts.join(", ")}`);
    } catch (e: any) {
      const m = e?.message || "";
      if (m.includes("Account number")) {
        toast.error("A member's account number is invalid (must be 6–10 digits).");
      } else if (m.includes("Sort code")) {
        toast.error("A member's sort code is invalid (must be XX-XX-XX).");
      } else {
        toast.error(`Could not save cycle: ${m || "Unknown error"}`);
      }
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStage("build");
    setDoneSummary(null);
    setOverrides({});
    setLastSwap(null);
    if (groupId) {
      supabase
        .from("monthly_contributions")
        .select("id, month, year, beneficiary_user_id, is_finalized")
        .eq("group_id", groupId)
        .then(({ data }) => {
          const map = new Map<string, ExistingPeriod>();
          for (const r of data || []) {
            const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
            map.set(key, {
              id: r.id,
              month: r.month,
              year: r.year,
              beneficiary_user_id: r.beneficiary_user_id,
              is_finalized: !!r.is_finalized,
            });
          }
          setExistingByKey(map);
        });
    }
  };

  if (stage === "done" && doneSummary) {
    return (
      <Card className="border-green-500/40 bg-green-500/5">
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
          <h3 className="text-lg font-bold">Rotation cycle saved</h3>
          <p className="text-sm text-muted-foreground">
            Cycle: <b>{doneSummary.period}</b>
            {doneSummary.created > 0 && <> · Created: <b>{doneSummary.created}</b></>}
            {doneSummary.updated > 0 && <> · Updated: <b>{doneSummary.updated}</b></>}
          </p>
          <Button onClick={reset}>Continue editing</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-contribution" />
            Rotation builder
            {isEditMode && <Badge variant="secondary" className="text-[10px]">Edit mode</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a group, choose members & start month. If periods already exist they load automatically — change any beneficiary to swap with another month. Paid periods are locked.
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
              <Select value={String(startMonth)} onValueChange={(v) => { setStartMonth(parseInt(v)); setOverrides({}); }}>
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
                onChange={(e) => { setStartYear(parseInt(e.target.value) || new Date().getFullYear()); setOverrides({}); }}
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
                          {hasBank ? `${m.bank_name || "Bank"} · ${maskAccount(m.account_number)}` : "⚠ no bank details on file"}
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
              AI proposes an order; nothing is saved until you click <b>Save</b>.
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

          {/* Edit-mode info */}
          {isEditMode && (
            <div className="flex items-start gap-2 text-xs rounded-md p-2 border border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300">
              <ArrowLeftRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <b>Edit mode active.</b> {editStats.toUpdate} existing period{editStats.toUpdate === 1 ? "" : "s"} will be updated
                {editStats.toInsert > 0 && <>, {editStats.toInsert} new will be created</>}
                {editStats.locked > 0 && <>, {editStats.locked} paid period{editStats.locked === 1 ? "" : "s"} are locked and untouched</>}.
                Changes will affect upcoming beneficiary payouts.
              </span>
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
                  Tip: change any row's dropdown — if that member is already in another month, the system swaps them automatically. Account numbers shown masked for security.
                </p>
                <div className="rounded-lg border divide-y max-h-96 overflow-y-auto">
                  {plan.map((p, i) => {
                    const m = memberById[p.user_id];
                    const locked = !!p.existing?.is_finalized;
                    const isExisting = !!p.existing;
                    const isHighlighted = lastSwap && (lastSwap.a === i || lastSwap.b === i);
                    const isDuplicate = planDuplicates.has(p.user_id);
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2.5 text-sm transition-colors ${
                          locked ? "bg-muted/60" :
                          isDuplicate ? "bg-destructive/10" :
                          isHighlighted ? "bg-blue-500/10" :
                          isExisting ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <Badge variant="outline" className="w-7 justify-center flex-shrink-0">{i + 1}</Badge>
                        <div className="w-24 flex-shrink-0">
                          <p className="font-medium text-xs">{monthName(p.month).slice(0, 3)} {p.year}</p>
                          {m?.account_number ? (
                            <p className="text-[10px] text-muted-foreground truncate">{maskAccount(m.account_number)}</p>
                          ) : (
                            <p className="text-[10px] text-amber-600">no bank</p>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Select
                            value={p.user_id}
                            onValueChange={(v) => applySwap(i, v)}
                            disabled={locked}
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
                          {isHighlighted && lastSwap && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                              <ArrowLeftRight className="w-3 h-3" />
                              Swapped with {lastSwap.period}
                            </p>
                          )}
                        </div>
                        {locked ? (
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
                            <Lock className="w-3 h-3" /> Paid
                          </Badge>
                        ) : isExisting ? (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0 border-amber-500/50 text-amber-600">Editing</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0 border-green-500/50 text-green-600">New</Badge>
                        )}
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
                  <b>Save is disabled.</b>{" "}
                  {plan.length === 0
                    ? "Select at least 2 members to build a cycle."
                    : validation.find((v) => v.type === "error")?.msg ||
                      "Resolve the errors above to continue."}
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
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                {isEditMode ? "Save changes to existing cycle" : "Confirm & create cycle"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap confirmation dialog */}
      <AlertDialog open={!!pendingSwap} onOpenChange={(o) => !o && setPendingSwap(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Confirm beneficiary swap
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm">
                  This will swap two members' positions in the cycle. Their bank details, account numbers and payout assignments move with them.
                </p>
                {pendingSwap && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-md border p-2 space-y-1 bg-blue-500/5 border-blue-500/30">
                      <p className="text-[10px] text-muted-foreground uppercase">{pendingSwap.fromPeriod}</p>
                      <p className="font-semibold text-foreground">{pendingSwap.incoming.full_name}</p>
                      <p className="text-muted-foreground">{pendingSwap.incoming.bank_name || "No bank"}</p>
                      <p className="text-muted-foreground font-mono">{maskAccount(pendingSwap.incoming.account_number)}</p>
                    </div>
                    <div className="rounded-md border p-2 space-y-1 bg-blue-500/5 border-blue-500/30">
                      <p className="text-[10px] text-muted-foreground uppercase">{pendingSwap.toPeriod}</p>
                      <p className="font-semibold text-foreground">{pendingSwap.outgoing.full_name}</p>
                      <p className="text-muted-foreground">{pendingSwap.outgoing.bank_name || "No bank"}</p>
                      <p className="text-muted-foreground font-mono">{maskAccount(pendingSwap.outgoing.account_number)}</p>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-amber-600">
                  ⚠ This change will affect upcoming beneficiary payouts.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={commitSwap}>Confirm swap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RotationBuilder;
