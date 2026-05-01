import { useEffect, useState } from "react";
import { Briefcase, Check, X, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface Assignment {
  id: string;
  loan_request_id: string;
  amount: number;
  assignment_share: number;
  status: "pending" | "accepted" | "rejected";
  assigned_at: string;
  responded_at: string | null;
  borrower_name: string;
  duration_months: number;
  purpose: string | null;
  loan_amount: number;
}

const InvestorLoanAssignments = ({ investorId }: { investorId: string }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data: aData, error } = await (supabase as any)
        .from("loan_assignments")
        .select("id, loan_request_id, amount, assignment_share, status, assigned_at, responded_at")
        .eq("investor_id", investorId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;

      const reqIds = (aData || []).map((a: any) => a.loan_request_id);
      const enriched: Assignment[] = [];

      if (reqIds.length > 0) {
        const { data: reqs } = await supabase
          .from("loan_requests")
          .select("id, borrower_id, duration_months, purpose, amount")
          .in("id", reqIds);
        const borrowerIds = (reqs || []).map((r) => r.borrower_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", borrowerIds);
        const profMap = new Map((profs || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
        const reqMap = new Map((reqs || []).map((r) => [r.id, r]));

        for (const a of aData || []) {
          const req = reqMap.get(a.loan_request_id);
          enriched.push({
            id: a.id,
            loan_request_id: a.loan_request_id,
            amount: Number(a.amount),
            assignment_share: Number(a.assignment_share ?? a.amount),
            status: a.status,
            assigned_at: a.assigned_at,
            responded_at: a.responded_at ?? null,
            borrower_name: req ? profMap.get(req.borrower_id) || "Unknown" : "Unknown",
            duration_months: req?.duration_months ?? 0,
            purpose: req?.purpose ?? null,
            loan_amount: req ? Number(req.amount) : Number(a.amount),
          });
        }
      }
      setAssignments(enriched);

      // Refresh available balance
      const { data: bal } = await (supabase as any).rpc("investor_available_balance", { _investor_id: investorId });
      setAvailable(typeof bal === "number" ? bal : Number(bal) || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (investorId) fetchAssignments();
  }, [investorId]);

  const respond = async (a: Assignment, status: "accepted" | "rejected") => {
    setProcessing(a.id);
    try {
      // Re-validate balance just before accepting
      if (status === "accepted") {
        const { data: bal } = await (supabase as any).rpc("investor_available_balance", { _investor_id: investorId });
        const current = typeof bal === "number" ? bal : Number(bal) || 0;
        if (current < a.assignment_share) {
          toast.error(`Insufficient available balance. You have £${current.toLocaleString()}, this needs £${a.assignment_share.toLocaleString()}.`);
          fetchAssignments();
          setProcessing(null);
          return;
        }
      }

      // The DB triggers handle:
      //  - on accept: deducts balance, creates loan + disbursement + repayments,
      //    transitions request to LOAN_DISBURSED, notifies borrower & admin, writes audit log
      //  - on reject: transitions request to INVESTOR_REJECTED, notifies admin & borrower
      const { error } = await (supabase as any)
        .from("loan_assignments")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;

      toast.success(
        status === "accepted"
          ? "Loan approved & funded — borrower has been notified"
          : "Assignment rejected — admin will reassign"
      );
      fetchAssignments();
    } catch (e: any) {
      toast.error(e.message || "Could not update assignment");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 text-white/50 text-sm">
        Loading loan assignments…
      </div>
    );
  }

  if (assignments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-base text-white">Loan Funding Requests</h3>
        </div>
        {available !== null && (
          <div className="flex items-center gap-1.5 text-xs text-white/70">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            Available: <span className="font-semibold text-emerald-400">£{available.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {assignments.map((a) => {
          const insufficient = a.status === "pending" && available !== null && available < a.assignment_share;
          return (
          <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">{a.borrower_name}</p>
                <p className="text-white/50 text-xs">
                  Your share: £{a.assignment_share.toLocaleString()} of £{a.loan_amount.toLocaleString()} • {a.duration_months}m
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  a.status === "accepted"
                    ? "border-emerald-500 text-emerald-400"
                    : a.status === "rejected"
                    ? "border-red-500 text-red-400"
                    : "border-amber-400 text-amber-400"
                }
              >
                {a.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                {a.status}
              </Badge>
            </div>
            {a.purpose && <p className="text-white/40 text-xs mb-2">{a.purpose}</p>}
            <div className="text-[11px] text-white/40 mb-3 space-y-0.5">
              <div>Assigned: {new Date(a.assigned_at).toLocaleString()}</div>
              {a.responded_at && (
                <div>
                  {a.status === "accepted" ? "Accepted" : "Rejected"} on{" "}
                  {new Date(a.responded_at).toLocaleString()}
                </div>
              )}
            </div>
            {insufficient && (
              <div className="text-xs text-red-400 mb-2">
                ⚠ Your available balance has changed and is now below this assignment.
              </div>
            )}
            {a.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={processing === a.id || insufficient}
                  onClick={() => respond(a, "accepted")}
                >
                  <Check className="w-4 h-4 mr-1" /> Approve & Lock
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                  disabled={processing === a.id}
                  onClick={() => respond(a, "rejected")}
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        );})}
      </div>
    </div>
  );
};

export default InvestorLoanAssignments;
