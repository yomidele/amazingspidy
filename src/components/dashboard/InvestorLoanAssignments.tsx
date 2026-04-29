import { useEffect, useState } from "react";
import { Briefcase, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Assignment {
  id: string;
  loan_request_id: string;
  amount: number;
  status: "pending" | "accepted" | "rejected";
  assigned_at: string;
  borrower_name: string;
  duration_months: number;
  purpose: string | null;
}

const InvestorLoanAssignments = ({ investorId }: { investorId: string }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data: aData, error } = await (supabase as any)
        .from("loan_assignments")
        .select("id, loan_request_id, amount, status, assigned_at")
        .eq("investor_id", investorId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;

      const reqIds = (aData || []).map((a: any) => a.loan_request_id);
      const enriched: Assignment[] = [];

      if (reqIds.length > 0) {
        const { data: reqs } = await supabase
          .from("loan_requests")
          .select("id, borrower_id, duration_months, purpose")
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
            status: a.status,
            assigned_at: a.assigned_at,
            borrower_name: req ? profMap.get(req.borrower_id) || "Unknown" : "Unknown",
            duration_months: req?.duration_months ?? 0,
            purpose: req?.purpose ?? null,
          });
        }
      }
      setAssignments(enriched);
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
      const { error } = await (supabase as any)
        .from("loan_assignments")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;

      if (status === "accepted") {
        // Mark loan request as funded (admin still completes formal approval flow)
        await (supabase as any)
          .from("loan_requests")
          .update({ status: "approved" })
          .eq("id", a.loan_request_id);
      }
      toast.success(status === "accepted" ? "Funding accepted" : "Assignment rejected");
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
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-base text-white">Loan Funding Requests</h3>
      </div>
      <div className="space-y-3">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">{a.borrower_name}</p>
                <p className="text-white/50 text-xs">
                  £{a.amount.toLocaleString()} • {a.duration_months} months
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
            {a.purpose && <p className="text-white/40 text-xs mb-3">{a.purpose}</p>}
            {a.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={processing === a.id}
                  onClick={() => respond(a, "accepted")}
                >
                  <Check className="w-4 h-4 mr-1" /> Accept Funding
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
        ))}
      </div>
    </div>
  );
};

export default InvestorLoanAssignments;
