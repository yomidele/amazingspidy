import { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";
import LoanDocumentViewer from "@/components/admin/LoanDocumentViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GuarantorRequestsProps {
  userId: string;
}

interface GuarantorRequest {
  id: string;
  status: string;
  loan_request_id: string;
  borrower_id: string;
  borrower_name: string;
  guarantor_name: string;
  amount: number;
  purpose: string | null;
  duration_months: number;
  group_id: string;
  group_name: string;
  loan_status: string;
  created_at: string;
}

const GuarantorRequests = ({ userId }: GuarantorRequestsProps) => {
  const [requests, setRequests] = useState<GuarantorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [guarantorSignature, setGuarantorSignature] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<GuarantorRequest | null>(null);

  useEffect(() => {
    if (userId) fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: guarantorRecords } = await supabase
        .from("loan_guarantors")
        .select("id, status, loan_request_id, created_at")
        .eq("guarantor_id", userId)
        .order("created_at", { ascending: false });

      if (!guarantorRecords || guarantorRecords.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch guarantor's own name
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();

      const enriched: GuarantorRequest[] = [];
      for (const rec of guarantorRecords) {
        const { data: loanReq } = await supabase
          .from("loan_requests")
          .select("borrower_id, amount, purpose, duration_months, group_id, status")
          .eq("id", rec.loan_request_id)
          .maybeSingle();

        if (!loanReq) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", loanReq.borrower_id)
          .maybeSingle();

        // Fetch group name
        const { data: group } = await supabase
          .from("contribution_groups")
          .select("name")
          .eq("id", loanReq.group_id)
          .maybeSingle();

        enriched.push({
          id: rec.id,
          status: rec.status,
          loan_request_id: rec.loan_request_id,
          borrower_id: loanReq.borrower_id,
          borrower_name: profile?.full_name || "Member data missing",
          guarantor_name: myProfile?.full_name || "Member data missing",
          amount: Number(loanReq.amount),
          purpose: loanReq.purpose,
          duration_months: loanReq.duration_months,
          group_id: loanReq.group_id,
          group_name: group?.name || "Contribution Group",
          loan_status: loanReq.status,
          created_at: rec.created_at,
        });
      }

      setRequests(enriched);
    } catch (error) {
      console.error("Error fetching guarantor requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: string, loanRequestId: string, approve: boolean) => {
    if (approve && !guarantorSignature) {
      toast.error("Please sign the document before approving");
      return;
    }

    try {
      const { error: gError } = await supabase
        .from("loan_guarantors")
        .update({
          status: approve ? "approved" : "rejected",
          response_note: responseNote || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (gError) throw gError;

      if (approve) {
        await supabase.from("loan_signatures" as any).insert({
          loan_request_id: loanRequestId,
          signer_id: userId,
          signer_role: "guarantor",
          signature_data: guarantorSignature,
        });
      }

      // Central state-machine transition (handles notifications + audit log)
      const { error: rpcError } = await (supabase as any).rpc("update_loan_status", {
        _loan_request_id: loanRequestId,
        _new_status: approve ? "GUARANTOR_APPROVED" : "GUARANTOR_REJECTED",
        _actor_id: userId,
        _note: responseNote || null,
      });
      if (rpcError) throw rpcError;

      toast.success(approve ? "Request approved!" : "Request rejected");
      setRespondingId(null);
      setResponseNote("");
      setGuarantorSignature(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Error responding:", error);
      toast.error(error.message || "Failed to respond");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading guarantor requests...</p>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) return null;

  // Show document viewer if a request is selected
  if (viewingDocument) {
    return (
      <LoanDocumentViewer
        loanRequest={{
          id: viewingDocument.loan_request_id,
          borrower_id: viewingDocument.borrower_id,
          borrower_name: viewingDocument.borrower_name,
          guarantor_name: viewingDocument.guarantor_name,
          guarantor_id: userId,
          amount: viewingDocument.amount,
          duration_months: viewingDocument.duration_months,
          purpose: viewingDocument.purpose,
          group_name: viewingDocument.group_name,
          status: viewingDocument.loan_status,
          created_at: viewingDocument.created_at,
        }}
        onBack={() => setViewingDocument(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Guarantor Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <GuarantorRequestItem
            key={req.id}
            req={req}
            userId={userId}
            respondingId={respondingId}
            setRespondingId={setRespondingId}
            responseNote={responseNote}
            setResponseNote={setResponseNote}
            guarantorSignature={guarantorSignature}
            setGuarantorSignature={setGuarantorSignature}
            handleRespond={handleRespond}
            fetchRequests={fetchRequests}
            onViewDocument={() => setViewingDocument(req)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const GuarantorRequestItem = ({
  req,
  userId,
  respondingId,
  setRespondingId,
  responseNote,
  setResponseNote,
  guarantorSignature,
  setGuarantorSignature,
  handleRespond,
  fetchRequests,
  onViewDocument,
}: {
  req: GuarantorRequest;
  userId: string;
  respondingId: string | null;
  setRespondingId: (id: string | null) => void;
  responseNote: string;
  setResponseNote: (note: string) => void;
  guarantorSignature: string | null;
  setGuarantorSignature: (sig: string | null) => void;
  handleRespond: (requestId: string, loanRequestId: string, approve: boolean) => void;
  fetchRequests: () => void;
  onViewDocument: () => void;
}) => {
  const [hasSigned, setHasSigned] = useState<boolean | null>(null);
  const [showLateSign, setShowLateSign] = useState(false);
  const [lateSignature, setLateSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (req.status === "approved") {
      checkSignature();
    }
  }, [req.id, req.status]);

  const checkSignature = async () => {
    const { data } = await supabase
      .from("loan_signatures")
      .select("id")
      .eq("loan_request_id", req.loan_request_id)
      .eq("signer_role", "guarantor");
    setHasSigned(data && data.length > 0);
  };

  const handleLateSign = async () => {
    if (!lateSignature) {
      toast.error("Please draw your signature first");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("loan_signatures").insert({
        loan_request_id: req.loan_request_id,
        signer_id: userId,
        signer_role: "guarantor",
        signature_data: lateSignature,
      });
      if (error) throw error;

      // If borrower has also signed and we're still PENDING_GUARANTOR, advance state
      const { data: bSig } = await supabase
        .from("loan_signatures")
        .select("id")
        .eq("loan_request_id", req.loan_request_id)
        .eq("signer_role", "borrower");

      if (bSig && bSig.length > 0 && req.loan_status === "PENDING_GUARANTOR") {
        await (supabase as any).rpc("update_loan_status", {
          _loan_request_id: req.loan_request_id,
          _new_status: "GUARANTOR_APPROVED",
          _actor_id: userId,
          _note: "Late guarantor signature completed",
        });
      }

      toast.success("Signature saved successfully!");
      setHasSigned(true);
      setShowLateSign(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  const needsLateSignature = req.status === "GUARANTOR_APPROVED" && hasSigned === false;

  return (
    <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onViewDocument}
      >
        <div>
          <p className="font-semibold">{req.borrower_name}</p>
          <p className="text-sm text-muted-foreground">
            £{req.amount.toLocaleString()} • {req.duration_months} months
          </p>
          {req.purpose && <p className="text-sm mt-1">{req.purpose}</p>}
          <p className="text-xs text-primary mt-1">Tap to view loan document →</p>
        </div>
        <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "outline" : "destructive"}>
          {req.status}
        </Badge>
      </div>

      {needsLateSignature && !showLateSign && (
        <Button size="sm" variant="outline" className="w-full text-xs border-destructive/50 text-destructive" onClick={() => setShowLateSign(true)}>
          ⚠️ Sign Loan Document (Required)
        </Button>
      )}
      {showLateSign && (
        <div className="space-y-2 pt-2 border-t">
          <SignaturePad
            label="Your Signature (Guarantor)"
            onSave={(data) => setLateSignature(data)}
            existingSignature={lateSignature}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleLateSign} disabled={!lateSignature || saving}>
              {saving ? "Saving..." : "Submit Signature"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLateSign(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {req.status === "pending" && (
        <div className="space-y-2">
          {respondingId === req.id ? (
            <>
              <Textarea
                placeholder="Add a note (optional)"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                maxLength={300}
              />
              <SignaturePad
                label="Sign to approve this guarantee"
                onSave={(data) => setGuarantorSignature(data)}
                existingSignature={guarantorSignature}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRespond(req.id, req.loan_request_id, true)}
                  className="bg-success hover:bg-success/90"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRespond(req.id, req.loan_request_id, false)}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRespondingId(null)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setRespondingId(req.id)}>
              Respond
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GuarantorRequests;
