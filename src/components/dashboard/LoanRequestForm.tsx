import React, { useState, useEffect } from "react";
import { CreditCard, AlertTriangle, CheckCircle, Users, Send, FileText } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";
import LoanDocumentViewer from "@/components/admin/LoanDocumentViewer";
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
  group_id: string;
}

const MIN_PAID_MONTHS = 3;
const LOAN_MULTIPLIER = 2;

// Sub-component for each loan request with signing and document viewing capability
const LoanRequestItem = ({
  request,
  userId,
  userName,
  getStatusBadge,
  onSignComplete,
}: {
  request: LoanRequest;
  userId: string;
  userName?: string;
  getStatusBadge: (status: string) => React.ReactNode;
  onSignComplete: () => void;
}) => {
  const [showSign, setShowSign] = useState(false);
  const [hasSigned, setHasSigned] = useState<boolean | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewDocument, setViewDocument] = useState(false);
  const [guarantorInfo, setGuarantorInfo] = useState<{ name: string; id: string } | null>(null);
  const [groupName, setGroupName] = useState("Contribution Group");

  useEffect(() => {
    checkSignature();
    fetchGuarantorAndGroup();
  }, [request.id]);

  const checkSignature = async () => {
    const { data } = await supabase
      .from("loan_signatures")
      .select("id")
      .eq("loan_request_id", request.id)
      .eq("signer_role", "borrower");
    setHasSigned(data && data.length > 0);
  };

  const fetchGuarantorAndGroup = async () => {
    const [guarantorRes, groupRes] = await Promise.all([
      supabase
        .from("loan_guarantors")
        .select("guarantor_id")
        .eq("loan_request_id", request.id)
        .limit(1),
      supabase
        .from("contribution_groups")
        .select("name")
        .eq("id", request.group_id)
        .maybeSingle(),
    ]);

    if (groupRes.data) setGroupName(groupRes.data.name);

    if (guarantorRes.data && guarantorRes.data.length > 0) {
      const gId = guarantorRes.data[0].guarantor_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", gId)
        .maybeSingle();
      setGuarantorInfo({ name: profile?.full_name || "Unknown", id: gId });
    }
  };

  const handleSign = async () => {
    if (!signature) {
      toast.error("Please draw your signature first");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("loan_signatures").insert({
        loan_request_id: request.id,
        signer_id: userId,
        signer_role: "borrower",
        signature_data: signature,
      });
      if (error) throw error;

      // Check if guarantor has also signed, if so update to pending_admin
      const { data: gSig } = await supabase
        .from("loan_signatures")
        .select("id")
        .eq("loan_request_id", request.id)
        .eq("signer_role", "guarantor");

      if (gSig && gSig.length > 0 && request.status === "awaiting_guarantor") {
        await supabase
          .from("loan_requests")
          .update({ status: "pending_admin" })
          .eq("id", request.id);
      }

      toast.success("Signature saved successfully!");
      setHasSigned(true);
      setShowSign(false);
      onSignComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  const needsSignature = hasSigned === false && ["awaiting_guarantor", "pending_admin", "approved"].includes(request.status);

  if (viewDocument && guarantorInfo) {
    return (
      <LoanDocumentViewer
        loanRequest={{
          id: request.id,
          borrower_id: userId,
          borrower_name: userName || "Borrower",
          guarantor_name: guarantorInfo.name,
          guarantor_id: guarantorInfo.id,
          amount: request.amount,
          duration_months: request.duration_months,
          purpose: request.purpose,
          group_name: groupName,
          status: request.status,
          created_at: request.created_at,
        }}
        onBack={() => setViewDocument(false)}
      />
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer hover:opacity-80"
        onClick={() => guarantorInfo && setViewDocument(true)}
      >
        <div>
          <p className="text-sm font-medium">£{request.amount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(request.created_at).toLocaleDateString()} • {request.purpose}
          </p>
          {guarantorInfo && (
            <p className="text-xs text-primary mt-0.5">Tap to view loan document →</p>
          )}
        </div>
        {getStatusBadge(request.status)}
      </div>
      {needsSignature && !showSign && (
        <Button size="sm" variant="outline" className="w-full text-xs border-destructive/50 text-destructive" onClick={() => setShowSign(true)}>
          ⚠️ Sign Loan Document
        </Button>
      )}
      {showSign && (
        <div className="space-y-2 pt-2 border-t">
          <SignaturePad
            label="Your Signature (Borrower)"
            onSave={(data) => setSignature(data)}
            existingSignature={signature}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSign} disabled={!signature || saving}>
              {saving ? "Saving..." : "Submit Signature"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSign(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const LoanRequestForm = ({ userId, userName }: LoanRequestFormProps) => {
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fellowContributors, setFellowContributors] = useState<FellowContributor[]>([]);
  const [myRequests, setMyRequests] = useState<LoanRequest[]>([]);

  const [borrowerSignature, setBorrowerSignature] = useState<string | null>(null);
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
        supabase.rpc("get_same_group_guarantors" as any, { _user_id: userId }) as any,
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

      const guarantorData = (guarantorsResult.data as any[] | null) || [];
      setFellowContributors(
        reasons.length === 0 ? guarantorData.map((g: any) => ({ user_id: g.user_id, full_name: g.full_name })) : [],
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
        .select("id, amount, duration_months, purpose, status, created_at, group_id")
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

    if (!borrowerSignature) {
      toast.error("Please sign the loan application before submitting");
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

      // Save borrower signature
      await supabase.from("loan_signatures" as any).insert({
        loan_request_id: request.id,
        signer_id: userId,
        signer_role: "borrower",
        signature_data: borrowerSignature,
      });

      toast.success("Loan request submitted! Awaiting guarantor approval.");
      setDialogOpen(false);
      setForm({ amount: 0, duration_months: 6, purpose: "", guarantor_id: "" });
      setBorrowerSignature(null);
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
      pending_admin_review: { label: "Pending Admin Review", variant: "default" },
      assigned_to_investor: { label: "Assigned to Investor", variant: "default" },
      partially_funded: { label: "Partially Funded", variant: "default" },
      fully_funded: { label: "Fully Funded", variant: "outline" },
      investor_rejected: { label: "Investor Rejected — Reassigning", variant: "destructive" },
      approved: { label: "Approved", variant: "outline" },
      active: { label: "Active", variant: "outline" },
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

                {/* Borrower Signature */}
                <div className="space-y-2">
                  <SignaturePad
                    label="Your Signature (required)"
                    onSave={(data) => setBorrowerSignature(data)}
                    existingSignature={borrowerSignature}
                  />
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
              <LoanRequestItem
                key={req.id}
                request={req}
                userId={userId}
                userName={userName}
                getStatusBadge={getStatusBadge}
                onSignComplete={() => { fetchMyRequests(); checkEligibility(); }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanRequestForm;
