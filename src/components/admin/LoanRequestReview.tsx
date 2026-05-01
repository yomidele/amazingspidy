import { useState, useEffect } from "react";
import { FileCheck, CheckCircle, XCircle, Users, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity, sendNotification } from "@/lib/activityLogger";
import LoanDocumentViewer from "./LoanDocumentViewer";
import SingleInvestorAssignment from "./SingleInvestorAssignment";

interface LoanRequestRow {
  id: string;
  borrower_id: string;
  borrower_name: string;
  group_name: string;
  amount: number;
  duration_months: number;
  purpose: string | null;
  status: string;
  guarantor_name: string;
  guarantor_id: string;
  guarantor_status: string;
  created_at: string;
  group_id: string;
}

const LoanRequestReview = () => {
  const [requests, setRequests] = useState<LoanRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequestRow | null>(null);
  const [auditTimeline, setAuditTimeline] = useState<Array<{ id: string; action: string; description: string; created_at: string; actor_name: string }>>([]);

  useEffect(() => { fetchRequests(); }, []);

  // Fetch audit timeline whenever a request is opened
  useEffect(() => {
    const loadTimeline = async () => {
      if (!selectedRequest) { setAuditTimeline([]); return; }
      const { data: assignmentRows } = await (supabase as any)
        .from("loan_assignments")
        .select("id")
        .eq("loan_request_id", selectedRequest.id);
      const assignmentIds = (assignmentRows || []).map((a: any) => a.id);
      const entityIds = [selectedRequest.id, ...assignmentIds];

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, action, description, created_at, user_id")
        .in("entity_id", entityIds)
        .in("action", [
          "loan_assigned_to_investor",
          "loan_assignment_accepted",
          "loan_assignment_rejected",
          "loan_assignment_removed",
          "loan_approved",
          "loan_rejected",
          "loan_disbursed",
        ])
        .order("created_at", { ascending: true });

      const userIds = Array.from(new Set((logs || []).map((l) => l.user_id).filter(Boolean))) as string[];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] as any[] };
      const nameMap = new Map((profs || []).map((p) => [p.user_id, p.full_name || "User"]));

      setAuditTimeline(
        (logs || []).map((l) => ({
          id: l.id,
          action: l.action,
          description: l.description || "",
          created_at: l.created_at,
          actor_name: l.user_id ? (nameMap.get(l.user_id) || "User") : "User",
        }))
      );
    };
    loadTimeline();
  }, [selectedRequest]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [loanRes, profilesRes, groupsRes] = await Promise.all([
        supabase.from("loan_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("contribution_groups").select("id, name"),
      ]);

      if (!loanRes.data) { setRequests([]); return; }

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
      const groupMap = new Map((groupsRes.data || []).map((g) => [g.id, g.name]));

      const requestIds = loanRes.data.map((r) => r.id);
      const { data: allGuarantors } = await supabase
        .from("loan_guarantors")
        .select("loan_request_id, guarantor_id, status")
        .in("loan_request_id", requestIds);

      const guarantorMap = new Map<string, { guarantor_id: string; status: string }>();
      for (const g of allGuarantors || []) {
        if (!guarantorMap.has(g.loan_request_id)) {
          guarantorMap.set(g.loan_request_id, { guarantor_id: g.guarantor_id, status: g.status });
        }
      }

      const enriched: LoanRequestRow[] = loanRes.data.map((lr) => {
        const g = guarantorMap.get(lr.id);
        return {
          id: lr.id,
          borrower_id: lr.borrower_id,
          borrower_name: profileMap.get(lr.borrower_id) || "Unknown",
          group_name: groupMap.get(lr.group_id) || "Unknown",
          amount: Number(lr.amount),
          duration_months: lr.duration_months,
          purpose: lr.purpose,
          status: lr.status,
          guarantor_name: g ? (profileMap.get(g.guarantor_id) || "Unknown") : "None",
          guarantor_id: g?.guarantor_id || "",
          guarantor_status: g?.status || "none",
          created_at: lr.created_at,
          group_id: lr.group_id,
        };
      });

      setRequests(enriched);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRepaymentSchedule = async (loanId: string, amount: number, durationMonths: number) => {
    const monthlyAmount = Math.ceil((amount / durationMonths) * 100) / 100;
    const now = new Date();
    const repayments = [];

    for (let i = 1; i <= durationMonths; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const isLast = i === durationMonths;
      const amountDue = isLast ? amount - monthlyAmount * (durationMonths - 1) : monthlyAmount;

      repayments.push({
        loan_id: loanId,
        amount: 0,
        amount_due: amountDue,
        due_date: dueDate.toISOString().split("T")[0],
        repayment_type: "manual",
        notes: `Installment ${i} of ${durationMonths}`,
      });
    }

    const { error } = await supabase.from("loan_repayments").insert(repayments);
    if (error) throw error;
  };

  const handleApproveClick = async (request: LoanRequestRow) => {
    const check = await checkLiquidity(request.amount);
    if (!check.canApproveLoan) {
      setLiquidityDialog({ open: true, request, check });
      return;
    }
    await executeApproval(request);
  };

  const executeApproval = async (request: LoanRequestRow) => {
    setProcessing(request.id);
    setLiquidityDialog({ open: false, request: null, check: null });
    try {
      const { error: updateError } = await supabase
        .from("loan_requests")
        .update({ status: "approved", admin_notes: adminNotes[request.id] || null })
        .eq("id", request.id);

      if (updateError) throw updateError;

      const { data: loan, error: loanError } = await supabase.from("loans").insert({
        user_id: request.borrower_id,
        group_id: request.group_id,
        principal_amount: request.amount,
        outstanding_balance: request.amount,
        monthly_repayment: Math.ceil((request.amount / request.duration_months) * 100) / 100,
        status: "active",
        issued_date: new Date().toISOString(),
      }).select("id").single();

      if (loanError) throw loanError;

      await generateRepaymentSchedule(loan.id, request.amount, request.duration_months);

      await logActivity(
        "loan_approved",
        `Loan of £${request.amount.toLocaleString()} approved for ${request.borrower_name}. Guarantor: ${request.guarantor_name}. Duration: ${request.duration_months} months.`,
        "loan", loan.id
      );

      await sendNotification(
        request.borrower_id,
        "Loan Approved ✅",
        `Your loan request of £${request.amount.toLocaleString()} has been approved! Check your repayment schedule.`,
        "success", "/dashboard/contributor"
      );

      if (request.guarantor_id) {
        await sendNotification(
          request.guarantor_id,
          "Loan You Guaranteed Was Approved",
          `The loan of £${request.amount.toLocaleString()} for ${request.borrower_name} that you guaranteed has been approved.`,
          "info"
        );
      }

      toast.success("Loan approved with repayment schedule!");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error processing request:", error);
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: LoanRequestRow) => {
    setProcessing(request.id);
    try {
      const { error: updateError } = await supabase
        .from("loan_requests")
        .update({ status: "rejected", admin_notes: adminNotes[request.id] || null })
        .eq("id", request.id);

      if (updateError) throw updateError;

      await logActivity(
        "loan_rejected",
        `Loan request of £${request.amount.toLocaleString()} by ${request.borrower_name} was rejected. Reason: ${adminNotes[request.id] || "No reason provided"}.`,
        "loan_request", request.id
      );

      await sendNotification(
        request.borrower_id,
        "Loan Request Rejected",
        `Your loan request of £${request.amount.toLocaleString()} has been rejected. ${adminNotes[request.id] ? `Reason: ${adminNotes[request.id]}` : "Contact admin for details."}`,
        "error"
      );

      toast.success("Loan request rejected");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (request: LoanRequestRow) => {
    if (!confirm(`Delete loan request from ${request.borrower_name}? This will remove all related documents (signatures, guarantor records, repayments) and clear their loan eligibility.`)) return;
    setProcessing(request.id);
    try {
      // If this request was approved, delete the associated loan first (repayments cascade via FK)
      if (request.status === "approved") {
        await supabase
          .from("loans")
          .delete()
          .eq("user_id", request.borrower_id)
          .eq("group_id", request.group_id)
          .eq("principal_amount", request.amount);
      }

      // Delete the loan request (guarantors + signatures cascade via FK)
      const { error } = await supabase.from("loan_requests").delete().eq("id", request.id);
      if (error) throw error;

      await logActivity(
        "loan_request_deleted",
        `Loan request of £${request.amount.toLocaleString()} by ${request.borrower_name} was deleted by admin.`,
        "loan_request", request.id
      );

      await sendNotification(
        request.borrower_id,
        "Loan Request Removed",
        `Your loan request of £${request.amount.toLocaleString()} has been removed. You are now eligible to submit a new request.`,
        "info", "/dashboard/contributor"
      );

      toast.success("Loan request deleted. User can now submit a new request.");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete request");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      awaiting_guarantor: "bg-warning/10 text-warning border-warning",
      pending_admin: "bg-primary/10 text-primary border-primary",
      pending_admin_review: "bg-primary/10 text-primary border-primary",
      assigned_to_investor: "bg-blue-500/10 text-blue-500 border-blue-500",
      partially_funded: "bg-amber-500/10 text-amber-500 border-amber-500",
      fully_funded: "bg-emerald-500/10 text-emerald-500 border-emerald-500",
      investor_rejected: "bg-orange-500/10 text-orange-500 border-orange-500",
      approved: "bg-success/10 text-success border-success",
      active: "bg-success/10 text-success border-success",
      rejected: "bg-destructive/10 text-destructive border-destructive",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{status.replace(/_/g, " ")}</Badge>;
  };

  // If viewing a specific loan request document
  if (selectedRequest) {
    return (
      <div className="space-y-4">
        <LoanDocumentViewer
          loanRequest={selectedRequest}
          onBack={() => setSelectedRequest(null)}
        />
        {/* Admin actions for pending_admin */}
        {["pending_admin", "pending_admin_review", "assigned_to_investor", "partially_funded", "fully_funded", "investor_rejected"].includes(selectedRequest.status) && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Admin Decision</h3>
              <Textarea
                placeholder="Admin notes (optional)..."
                className="text-sm"
                value={adminNotes[selectedRequest.id] || ""}
                onChange={(e) => setAdminNotes({ ...adminNotes, [selectedRequest.id]: e.target.value })}
              />

              {selectedRequest.status === "fully_funded" ? (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  disabled={processing === selectedRequest.id}
                  onClick={async () => {
                    setProcessing(selectedRequest.id);
                    try {
                      await disburseLoan(selectedRequest.id);
                      toast.success("Loan disbursed and active!");
                      fetchRequests();
                      setSelectedRequest(null);
                    } catch (e: any) {
                      toast.error(e.message || "Disbursement failed");
                    } finally {
                      setProcessing(null);
                    }
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Disburse Loan to Borrower
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    disabled={processing === selectedRequest.id}
                    onClick={() => handleApproveClick(selectedRequest)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve from Pool
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={processing === selectedRequest.id}
                    onClick={() => handleReject(selectedRequest)}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}

              {/* Multi-investor assignment */}
              <div className="pt-3 border-t">
                <MultiInvestorAssignment
                  loanRequestId={selectedRequest.id}
                  loanAmount={selectedRequest.amount}
                  borrowerName={selectedRequest.borrower_name}
                  borrowerId={selectedRequest.borrower_id}
                  onChanged={fetchRequests}
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Tip: assign to one or several investors (split funding). Loan only becomes fundable once all assigned investors approve.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit timeline — assignment & decision history */}
        {auditTimeline.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Assignment & Decision Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="relative border-l border-border ml-2 space-y-4">
                {auditTimeline.map((e) => {
                  const tone =
                    e.action.includes("accepted") || e.action === "loan_approved"
                      ? "bg-success"
                      : e.action.includes("rejected")
                      ? "bg-destructive"
                      : "bg-primary";
                  const label = e.action.replace(/_/g, " ");
                  return (
                    <li key={e.id} className="ml-4">
                      <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${tone}`} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase">{label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{e.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">By {e.actor_name}</p>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Loan Requests</h2>
        <p className="text-sm text-muted-foreground">Review and approve contributor loan requests</p>
      </div>

      {/* Stats cards - 2 per row on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Review</p>
            <p className="font-bold text-2xl">{requests.filter((r) => r.status === "pending_admin").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awaiting Guarantor</p>
            <p className="font-bold text-2xl">{requests.filter((r) => r.status === "awaiting_guarantor").length}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="font-bold text-2xl">{requests.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Request list as cards for mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck className="w-5 h-5" /> All Loan Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No loan requests yet</p>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border bg-muted/30 cursor-pointer hover:bg-accent/50 transition-colors space-y-2"
                onClick={() => setSelectedRequest(req)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.borrower_name}</p>
                    <p className="text-xs text-muted-foreground">
                      £{req.amount.toLocaleString()} • {req.duration_months}m
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{req.guarantor_name}</span>
                    {req.guarantor_status === "approved" && <CheckCircle className="w-3 h-3 text-success" />}
                    {req.guarantor_status === "rejected" && <XCircle className="w-3 h-3 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    <button
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(req); }}
                      title="Delete request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Liquidity Warning Dialog */}
      <Dialog open={liquidityDialog.open} onOpenChange={(open) => !open && setLiquidityDialog({ open: false, request: null, check: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Liquidity Warning
            </DialogTitle>
            <DialogDescription>
              Insufficient available funds to cover this loan.
            </DialogDescription>
          </DialogHeader>
          {liquidityDialog.check && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Total Contributions</p>
                  <p className="font-bold">£{liquidityDialog.check.totalContributions.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Active Loans</p>
                  <p className="font-bold text-destructive">£{liquidityDialog.check.totalActiveLoans.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Investor Obligations</p>
                  <p className="font-bold">£{liquidityDialog.check.totalInvestorObligations.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Available Funds</p>
                  <p className={`font-bold ${liquidityDialog.check.availableFunds >= 0 ? "text-success" : "text-destructive"}`}>
                    £{liquidityDialog.check.availableFunds.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <p><strong>Requested:</strong> £{liquidityDialog.request?.amount.toLocaleString()}</p>
                <p className="text-destructive mt-1">{liquidityDialog.check.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiquidityDialog({ open: false, request: null, check: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => liquidityDialog.request && executeApproval(liquidityDialog.request)}>
              <ShieldCheck className="w-4 h-4 mr-2" /> Override & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanRequestReview;
