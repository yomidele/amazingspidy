import { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";
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
  borrower_name: string;
  amount: number;
  purpose: string | null;
  duration_months: number;
  created_at: string;
}

const GuarantorRequests = ({ userId }: GuarantorRequestsProps) => {
  const [requests, setRequests] = useState<GuarantorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [guarantorSignature, setGuarantorSignature] = useState<string | null>(null);

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

      const enriched: GuarantorRequest[] = [];
      for (const rec of guarantorRecords) {
        const { data: loanReq } = await supabase
          .from("loan_requests")
          .select("borrower_id, amount, purpose, duration_months")
          .eq("id", rec.loan_request_id)
          .maybeSingle();

        if (!loanReq) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", loanReq.borrower_id)
          .maybeSingle();

        enriched.push({
          id: rec.id,
          status: rec.status,
          loan_request_id: rec.loan_request_id,
          borrower_name: profile?.full_name || "Unknown",
          amount: Number(loanReq.amount),
          purpose: loanReq.purpose,
          duration_months: loanReq.duration_months,
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
        // Save guarantor signature
        await supabase.from("loan_signatures" as any).insert({
          loan_request_id: loanRequestId,
          signer_id: userId,
          signer_role: "guarantor",
          signature_data: guarantorSignature,
        });

        const { error: lrError } = await supabase
          .from("loan_requests")
          .update({ status: "pending_admin" })
          .eq("id", loanRequestId);
        if (lrError) throw lrError;
      } else {
        const { error: lrError } = await supabase
          .from("loan_requests")
          .update({ status: "rejected" })
          .eq("id", loanRequestId);
        if (lrError) throw lrError;
      }

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
          <div key={req.id} className="p-4 rounded-xl border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{req.borrower_name}</p>
                <p className="text-sm text-muted-foreground">
                  £{req.amount.toLocaleString()} • {req.duration_months} months
                </p>
                {req.purpose && <p className="text-sm mt-1">{req.purpose}</p>}
              </div>
              <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "outline" : "destructive"}>
                {req.status}
              </Badge>
            </div>

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
        ))}
      </CardContent>
    </Card>
  );
};

export default GuarantorRequests;
