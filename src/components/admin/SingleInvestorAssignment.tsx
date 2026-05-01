import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface Props {
  loanRequestId: string;
  loanAmount: number;
  borrowerName: string;
  loanStatus: string;
  onChanged?: () => void;
}

/**
 * Single-investor assignment panel.
 * Admin picks ONE investor to fund the entire loan.
 * Used when loan_request.status === 'GUARANTOR_APPROVED' or 'INVESTOR_REJECTED'.
 */
const SingleInvestorAssignment = ({ loanRequestId, loanAmount, borrowerName, loanStatus, onChanged }: Props) => {
  const [balances, setBalances] = useState<InvestorBalance[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [picked, setPicked] = useState<string>("");
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
      setAssignments(
        (assignRes.data || []).map((a: any) => ({
          id: a.id,
          investor_id: a.investor_id,
          investor_name: nameMap.get(a.investor_id) || "Investor",
          assignment_share: Number(a.assignment_share),
          status: a.status,
          responded_at: a.responded_at,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [loanRequestId]);

  const canAssign = loanStatus === "GUARANTOR_APPROVED" || loanStatus === "INVESTOR_REJECTED";
  const activeAssignment = assignments.find((a) => a.status === "pending" || a.status === "accepted");

  const handleAssign = async () => {
    if (!picked) {
      toast.error("Choose an investor");
      return;
    }
    const inv = balances.find((b) => b.investor_id === picked);
    if (!inv) return;
    if (inv.available_balance < loanAmount) {
      toast.error(`${inv.full_name || "Investor"} has only £${inv.available_balance.toLocaleString()} available — needs £${loanAmount.toLocaleString()}`);
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData?.user?.id ?? null;

      const { error } = await (supabase as any).from("loan_assignments").insert({
        loan_request_id: loanRequestId,
        investor_id: picked,
        amount: loanAmount,
        assignment_share: loanAmount,
        status: "pending",
        assigned_by: adminId,
      });
      if (error) throw error;

      toast.success(`Assigned to ${inv.full_name || "investor"}`);
      setPicked("");
      await fetchAll();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (a: AssignmentRow) => {
    if (a.status === "accepted") {
      toast.error("Accepted assignments cannot be removed — loan is already funded.");
      return;
    }
    if (!confirm(`Remove assignment to ${a.investor_name}?`)) return;
    try {
      const { error } = await (supabase as any).from("loan_assignments").delete().eq("id", a.id);
      if (error) throw error;
      toast.success("Assignment removed");
      await fetchAll();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  if (loading) return <div className="text-xs text-muted-foreground p-3">Loading investors…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="w-4 h-4" /> Investor Assignment
      </div>

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
                {a.status === "pending" && (
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                    onClick={() => handleRemove(a)}
                    title="Remove assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canAssign && !activeAssignment && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Pick one investor to fund the full £{loanAmount.toLocaleString()} loan for {borrowerName}.
          </p>
          <div className="flex gap-2">
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="flex-1 h-9 text-xs">
                <SelectValue placeholder="Choose investor…" />
              </SelectTrigger>
              <SelectContent>
                {balances.length === 0 ? (
                  <SelectItem value="__none" disabled>No investors available</SelectItem>
                ) : (
                  balances.map((b) => {
                    const insufficient = b.available_balance < loanAmount;
                    return (
                      <SelectItem key={b.investor_id} value={b.investor_id} disabled={insufficient}>
                        <div className="flex flex-col">
                          <span>
                            {b.full_name || b.investor_id.slice(0, 8)}
                            {insufficient ? " (insufficient)" : ""}
                          </span>
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
            <Button size="sm" onClick={handleAssign} disabled={saving || !picked}>
              {saving ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      )}

      {!canAssign && assignments.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Loan must be in GUARANTOR_APPROVED or INVESTOR_REJECTED state to assign an investor.
        </p>
      )}
    </div>
  );
};

export default SingleInvestorAssignment;
