import { useState, useEffect } from "react";
import { CreditCard, AlertTriangle, CheckCircle, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LoanRequestFormProps {
  userId: string;
  userName?: string;
}

interface EligibilityResult {
  eligible: boolean;
  totalContributed: number;
  paidMonths: number;
  maxLoanAmount: number;
  hasActiveLoan: boolean;
  reasons: string[];
}

interface FellowContributor {
  user_id: string;
  full_name: string | null;
}

interface LoanRequest {
  id: string;
  amount: number;
  duration_months: number;
  purpose: string | null;
  status: string;
  created_at: string;
}

const MIN_PAID_MONTHS = 3;
const LOAN_MULTIPLIER = 2;

const LoanRequestForm = ({ userId }: LoanRequestFormProps) => {
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fellowContributors, setFellowContributors] = useState<FellowContributor[]>([]);
  const [myRequests, setMyRequests] = useState<LoanRequest[]>([]);

  const [form, setForm] = useState({
    amount: 0,
    duration_months: 6,
    purpose: "",
    guarantor_id: "",
  });

  useEffect(() => {
    if (userId) {
      checkEligibility();
      fetchMyRequests();
    }
  }, [userId]);

  const checkEligibility = async () => {
    setLoading(true);
    const reasons: string[] = [];

    try {
      const [paymentsResult, activeLoansResult, pendingRequestsResult, guarantorsResult] = await Promise.all([
        supabase
          .from("contribution_payments")
          .select("amount")
          .eq("user_id", userId)
          .eq("status", "paid"),
        supabase
          .from("loans")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase
          .from("loan_requests")
          .select("id")
          .eq("borrower_id", userId)
          .in("status", ["pending", "awaiting_guarantor", "pending_admin"]),
        supabase.rpc("get_same_group_guarantors" as any, { _user_id: userId }),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (activeLoansResult.error) throw activeLoansResult.error;
      if (pendingRequestsResult.error) throw pendingRequestsResult.error;
      if (guarantorsResult.error) throw guarantorsResult.error;

      const totalContributed = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const paidMonths = paymentsResult.data?.length || 0;
      const hasActiveLoan = (activeLoansResult.data?.length || 0) > 0;
      const hasPendingRequest = (pendingRequestsResult.data?.length || 0) > 0;

      if (paidMonths < MIN_PAID_MONTHS) {
        reasons.push(`You need at least ${MIN_PAID_MONTHS} months of paid contributions (you have ${paidMonths}).`);
      }
      if (hasActiveLoan) {
        reasons.push("You have an active loan that must be fully repaid first.");
      }
      if (hasPendingRequest) {
        reasons.push("You already have a pending loan request.");
      }

      const maxLoanAmount = totalContributed * LOAN_MULTIPLIER;

      setEligibility({
        eligible: reasons.length === 0,
        totalContributed,
        paidMonths,
        maxLoanAmount,
        hasActiveLoan,
        reasons,
      });

      setFellowContributors(
        reasons.length === 0 ? ((guarantorsResult.data as unknown as FellowContributor[] | null) ?? []) : [],
      );
    } catch (error) {
      console.error("Error checking eligibility:", error);
      setFellowContributors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_requests")
        .select("id, amount, duration_months, purpose, status, created_at")
        .eq("borrower_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setMyRequests((data as LoanRequest[]) || []);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
      setMyRequests([]);
    }
  };

  const handleSubmit = async () => {
    if (!eligibility?.eligible) return;

    if (form.amount <= 0 || form.amount > eligibility.maxLoanAmount) {
      toast.error(`Loan amount must be between £1 and £${eligibility.maxLoanAmount.toLocaleString()}`);
      return;
    }

    if (!form.guarantor_id) {
      toast.error("Please select a guarantor");
      return;
    }

    if (!fellowContributors.some((contributor) => contributor.user_id === form.guarantor_id)) {
      toast.error("Guarantor must be an active contributor in your group");
      return;
    }

    if (!form.purpose.trim()) {
      toast.error("Please provide a purpose for the loan");
      return;
    }

    setSubmitting(true);
    try {
      const { data: membership, error: membershipError } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);

      if (membershipError) throw membershipError;

      if (!membership || membership.length === 0) {
        toast.error("No active group membership found");
        return;
      }

      const { data: request, error: requestError } = await supabase
        .from("loan_requests")
        .insert({
          borrower_id: userId,
          group_id: membership[0].group_id,
          amount: form.amount,
          duration_months: form.duration_months,
          purpose: form.purpose.trim(),
          status: "awaiting_guarantor",
        })
        .select("id")
        .single();

      if (requestError) throw requestError;

      const { error: guarantorError } = await supabase
        .from("loan_guarantors")
        .insert({
          loan_request_id: request.id,
          guarantor_id: form.guarantor_id,
          status: "pending",
        });

      if (guarantorError) throw guarantorError;

      toast.success("Loan request submitted! Awaiting guarantor approval.");
      setDialogOpen(false);
      setForm({ amount: 0, duration_months: 6, purpose: "", guarantor_id: "" });
      checkEligibility();
      fetchMyRequests();
    } catch (error: any) {
      console.error("Error submitting loan request:", error);
      toast.error(error.message || "Failed to submit loan request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
      pending: { label: "Pending", variant: "secondary" },
      awaiting_guarantor: { label: "Awaiting Guarantor", variant: "default" },
      pending_admin: { label: "Pending Admin", variant: "default" },
      approved: { label: "Approved", variant: "outline" },
      rejected: { label: "Rejected", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Checking loan eligibility...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Loan Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {eligibility && (
          <div className={`p-4 rounded-xl border ${eligibility.eligible ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              {eligibility.eligible ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              <span className="font-semibold">
                {eligibility.eligible ? "You are eligible for a loan" : "Not eligible for a loan"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Total contributed: £{eligibility.totalContributed.toLocaleString()}</p>
              <p>Months paid: {eligibility.paidMonths}</p>
              {eligibility.eligible && (
                <p className="font-medium text-foreground">Max loan amount: £{eligibility.maxLoanAmount.toLocaleString()}</p>
              )}
              {eligibility.reasons.map((reason, index) => (
                <p key={index} className="text-destructive">• {reason}</p>
              ))}
            </div>
          </div>
        )}

        {eligibility?.eligible && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Request a Loan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Loan Request</DialogTitle>
                <DialogDescription>
                  Choose an active guarantor from your contribution group before submitting this request.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Amount (max £{eligibility.maxLoanAmount.toLocaleString()})</Label>
                  <Input
                    type="number"
                    min={1}
                    max={eligibility.maxLoanAmount}
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (months)</Label>
                  <Select
                    value={String(form.duration_months)}
                    onValueChange={(value) => setForm({ ...form, duration_months: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 6, 9, 12].map((months) => (
                        <SelectItem key={months} value={String(months)}>{months} months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    placeholder="Why do you need this loan?"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> Guarantor
                  </Label>
                  <Select
                    value={form.guarantor_id}
                    onValueChange={(value) => setForm({ ...form, guarantor_id: value })}
                    disabled={fellowContributors.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={fellowContributors.length === 0 ? "No same-group guarantors available" : "Select a fellow contributor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fellowContributors.map((contributor) => (
                        <SelectItem key={contributor.user_id} value={contributor.user_id}>
                          {contributor.full_name || "Unnamed member"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Your guarantor must approve before admin review.</p>
                  {fellowContributors.length === 0 && (
                    <p className="text-xs text-destructive">No active contributors are currently available in your group to act as guarantor.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={submitting || fellowContributors.length === 0}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {myRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Your Requests</h4>
            {myRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">£{req.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()} • {req.purpose}
                  </p>
                </div>
                {getStatusBadge(req.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanRequestForm;
