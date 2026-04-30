import { useEffect, useState } from "react";
import { Briefcase, Plus, Trash2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity, sendNotification } from "@/lib/activityLogger";

interface InvestorBalance {
  investor_id: string;
  full_name: string | null;
  total_capital: number;
  available_balance: number;
}

interface AssignmentRow {
  id: string;
  investor_id: string;
  investor_name: string;
  assignment_share: number;
  status: "pending" | "accepted" | "rejected";
  responded_at: string | null;
}

interface DraftRow {
  investor_id: string;
  amount: string;
}

interface Props {
  loanRequestId: string;
  loanAmount: number;
  borrowerName: string;
  borrowerId: string;
  onChanged?: () => void;
}

const MultiInvestorAssignment = ({ loanRequestId, loanAmount, borrowerName, borrowerId, onChanged }: Props) => {
  const [balances, setBalances] = useState<InvestorBalance[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([{ investor_id: "", amount: "" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [balRes, assignRes] = await Promise.all([
        (supabase as any).rpc("investor_available_balances"),
        (supabase as any)
          .from("loan_assignments")
          .select("id, investor_id, assignment_share, status, responded_at")
          .eq("loan_request_id", loanRequestId)
          .order("assigned_at", { ascending: true }),
      ]);

      const bals: InvestorBalance[] = (balRes.data || []).map((b: any) => ({
        investor_id: b.investor_id,
        full_name: b.full_name,
        total_capital: Number(b.total_capital) || 0,
        available_balance: Number(b.available_balance) || 0,
      }));
      setBalances(bals);

      const nameMap = new Map(bals.map((b) => [b.investor_id, b.full_name || "Investor"]));
      const rows: AssignmentRow[] = (assignRes.data || []).map((a: any) => ({
        id: a.id,
        investor_id: a.investor_id,
        investor_name: nameMap.get(a.investor_id) || "Investor",
        assignment_share: Number(a.assignment_share),
        status: a.status,
        responded_at: a.responded_at,
      }));
      setAssignments(rows);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [loanRequestId]);

  const totalAssigned = assignments.reduce((s, a) => s + a.assignment_share, 0);
  const remaining = Math.max(loanAmount - totalAssigned, 0);
  const draftsTotal = drafts.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const usedInvestorIds = new Set([
    ...assignments.map((a) => a.investor_id),
    ...drafts.map((d) => d.investor_id).filter(Boolean),
  ]);

  const addDraft = () => setDrafts([...drafts, { investor_id: "", amount: "" }]);
  const removeDraft = (i: number) => setDrafts(drafts.filter((_, idx) => idx !== i));
  const updateDraft = (i: number, patch: Partial<DraftRow>) =>
    setDrafts(drafts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const handleSave = async () => {
    const validDrafts = drafts.filter((d) => d.investor_id && Number(d.amount) > 0);
    if (validDrafts.length === 0) {
      toast.error("Add at least one investor with an amount");
      return;
    }
    if (draftsTotal > remaining + 0.001) {
      toast.error(`Total assignment (£${draftsTotal.toLocaleString()}) exceeds remaining (£${remaining.toLocaleString()})`);
      return;
    }
    // Validate per-investor available balance
    for (const d of validDrafts) {
      const bal = balances.find((b) => b.investor_id === d.investor_id);
      if (!bal) continue;
      if (Number(d.amount) > bal.available_balance + 0.001) {
        toast.error(`${bal.full_name || "Investor"} only has £${bal.available_balance.toLocaleString()} available`);
        return;
      }
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData?.user?.id ?? null;

      const rows = validDrafts.map((d) => ({
        loan_request_id: loanRequestId,
        investor_id: d.investor_id,
        amount: Number(d.amount),
        assignment_share: Number(d.amount),
        status: "pending",
        assigned_by: adminId,
        responded_at: null,
      }));

      const { error } = await (supabase as any).from("loan_assignments").insert(rows);
      if (error) throw error;

      // Mark request as investor-funded
      await (supabase as any)
        .from("loan_requests")
        .update({ funding_source: "investor" })
        .eq("id", loanRequestId);

      // Notify each investor + audit
      for (const d of validDrafts) {
        const inv = balances.find((b) => b.investor_id === d.investor_id);
        await sendNotification(
          d.investor_id,
          "New Loan Funding Request",
          `You have been asked to fund £${Number(d.amount).toLocaleString()} of a £${loanAmount.toLocaleString()} loan for ${borrowerName}.`,
          "info",
          "/dashboard/investor"
        );
        await logActivity(
          "loan_assigned_to_investor",
          `Admin assigned £${Number(d.amount).toLocaleString()} of loan for ${borrowerName} to ${inv?.full_name || "investor"}.`,
          "loan_request",
          loanRequestId,
          adminId
        );
      }

      toast.success(`Assigned to ${validDrafts.length} investor${validDrafts.length > 1 ? "s" : ""}`);
      setDrafts([{ investor_id: "", amount: "" }]);
      await fetchAll();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (a: AssignmentRow) => {
    if (a.status === "accepted") {
      if (!confirm("This investor has already approved. Removing will unlock their funds. Continue?")) return;
    }
    try {
      const { error } = await (supabase as any).from("loan_assignments").delete().eq("id", a.id);
      if (error) throw error;
      await logActivity(
        "loan_assignment_removed",
        `Admin removed assignment of £${a.assignment_share.toLocaleString()} from ${a.investor_name} for loan ${borrowerName}.`,
        "loan_request",
        loanRequestId
      );
      toast.success("Assignment removed");
      await fetchAll();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground p-3">Loading investor balances…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="w-4 h-4" /> Investor Funding Assignments
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded bg-muted">
          <p className="text-muted-foreground">Loan Amount</p>
          <p className="font-bold text-sm">£{loanAmount.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded bg-muted">
          <p className="text-muted-foreground">Assigned</p>
          <p className="font-bold text-sm">£{totalAssigned.toLocaleString()}</p>
        </div>
        <div className={`p-2 rounded ${remaining === 0 ? "bg-success/10" : "bg-warning/10"}`}>
          <p className="text-muted-foreground">Remaining</p>
          <p className="font-bold text-sm">£{remaining.toLocaleString()}</p>
        </div>
      </div>

      {/* Existing assignments */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.investor_name}</p>
                <p className="text-xs text-muted-foreground">£{a.assignment_share.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    a.status === "accepted"
                      ? "border-success text-success"
                      : a.status === "rejected"
                      ? "border-destructive text-destructive"
                      : "border-warning text-warning"
                  }
                >
                  {a.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                  {a.status === "accepted" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {a.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                  {a.status}
                </Badge>
                {a.status !== "accepted" || remaining > 0 ? (
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                    onClick={() => handleRemoveAssignment(a)}
                    title="Remove assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New assignment drafts */}
      {remaining > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">
            Assign remaining £{remaining.toLocaleString()} to one or more investors:
          </p>
          {drafts.map((d, i) => {
            const bal = balances.find((b) => b.investor_id === d.investor_id);
            const overBalance = bal && Number(d.amount) > bal.available_balance + 0.001;
            return (
              <div key={i} className="flex gap-2 items-start">
                <Select
                  value={d.investor_id}
                  onValueChange={(v) => updateDraft(i, { investor_id: v })}
                >
                  <SelectTrigger className="flex-1 h-9 text-xs">
                    <SelectValue placeholder="Choose investor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.length === 0 ? (
                      <SelectItem value="__none" disabled>No investors</SelectItem>
                    ) : (
                      balances.map((b) => {
                        const taken = usedInvestorIds.has(b.investor_id) && b.investor_id !== d.investor_id;
                        return (
                          <SelectItem key={b.investor_id} value={b.investor_id} disabled={taken || b.available_balance <= 0}>
                            <div className="flex flex-col">
                              <span>{b.full_name || b.investor_id.slice(0, 8)}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Available £{b.available_balance.toLocaleString()} / Total £{b.total_capital.toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Amount"
                  value={d.amount}
                  onChange={(e) => updateDraft(i, { amount: e.target.value })}
                  className={`w-28 h-9 text-xs ${overBalance ? "border-destructive" : ""}`}
                />
                {drafts.length > 1 && (
                  <button
                    className="p-2 rounded hover:bg-muted text-muted-foreground"
                    onClick={() => removeDraft(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {drafts.some((d) => d.investor_id && Number(d.amount) > 0) && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Draft total: £{draftsTotal.toLocaleString()} — must not exceed remaining (£{remaining.toLocaleString()})
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addDraft} className="flex-1">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add investor
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || draftsTotal === 0} className="flex-1">
              {saving ? "Saving…" : "Save assignments"}
            </Button>
          </div>
        </div>
      )}

      {remaining === 0 && assignments.every((a) => a.status === "accepted") && (
        <div className="p-3 rounded-lg bg-success/10 text-success text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Loan is fully funded. Ready to disburse.
        </div>
      )}
    </div>
  );
};

export default MultiInvestorAssignment;
