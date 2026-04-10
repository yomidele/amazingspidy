import { useState, useEffect } from "react";
import { FileCheck, CheckCircle, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  guarantor_status: string;
  created_at: string;
  group_id: string;
}

const LoanRequestReview = () => {
  const [requests, setRequests] = useState<LoanRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: loanRequests } = await supabase
        .from("loan_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!loanRequests) {
        setRequests([]);
        return;
      }

      const enriched: LoanRequestRow[] = [];
      for (const lr of loanRequests) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", lr.borrower_id)
          .maybeSingle();

        const { data: group } = await supabase
          .from("contribution_groups")
          .select("name")
          .eq("id", lr.group_id)
          .maybeSingle();

        const { data: guarantors } = await supabase
          .from("loan_guarantors")
          .select("guarantor_id, status")
          .eq("loan_request_id", lr.id);

        let guarantorName = "None";
        let guarantorStatus = "none";
        if (guarantors && guarantors.length > 0) {
          const g = guarantors[0];
          guarantorStatus = g.status;
          const { data: gProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", g.guarantor_id)
            .maybeSingle();
          guarantorName = gProfile?.full_name || "Unknown";
        }

        enriched.push({
          id: lr.id,
          borrower_id: lr.borrower_id,
          borrower_name: profile?.full_name || "Unknown",
          group_name: group?.name || "Unknown",
          amount: Number(lr.amount),
          duration_months: lr.duration_months,
          purpose: lr.purpose,
          status: lr.status,
          guarantor_name: guarantorName,
          guarantor_status: guarantorStatus,
          created_at: lr.created_at,
          group_id: lr.group_id,
        });
      }

      setRequests(enriched);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (request: LoanRequestRow, approve: boolean) => {
    setProcessing(request.id);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("loan_requests")
        .update({
          status: approve ? "approved" : "rejected",
          admin_notes: adminNotes[request.id] || null,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // If approved, create actual loan
      if (approve) {
        const { error: loanError } = await supabase.from("loans").insert({
          user_id: request.borrower_id,
          group_id: request.group_id,
          principal_amount: request.amount,
          outstanding_balance: request.amount,
          status: "active",
          issued_date: new Date().toISOString(),
        });

        if (loanError) throw loanError;
      }

      toast.success(approve ? "Loan approved and issued!" : "Loan request rejected");
      fetchRequests();
    } catch (error: any) {
      console.error("Error processing request:", error);
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      awaiting_guarantor: "bg-warning/10 text-warning border-warning",
      pending_admin: "bg-primary/10 text-primary border-primary",
      approved: "bg-success/10 text-success border-success",
      rejected: "bg-destructive/10 text-destructive border-destructive",
    };
    return (
      <Badge variant="outline" className={colors[status] || ""}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Loan Requests</h2>
        <p className="text-sm text-muted-foreground">Review and approve contributor loan requests</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Admin Review</p>
            <p className="font-bold text-2xl">{requests.filter((r) => r.status === "pending_admin").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awaiting Guarantor</p>
            <p className="font-bold text-2xl">{requests.filter((r) => r.status === "awaiting_guarantor").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="font-bold text-2xl">{requests.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            All Loan Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No loan requests yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Guarantor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.borrower_name}</TableCell>
                      <TableCell>£{req.amount.toLocaleString()}</TableCell>
                      <TableCell>{req.duration_months}m</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.purpose || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{req.guarantor_name}</span>
                          {req.guarantor_status === "approved" && <CheckCircle className="w-3 h-3 text-success" />}
                          {req.guarantor_status === "rejected" && <XCircle className="w-3 h-3 text-destructive" />}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "pending_admin" && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Admin notes..."
                              className="text-xs min-h-[40px]"
                              value={adminNotes[req.id] || ""}
                              onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                            />
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                disabled={processing === req.id}
                                onClick={() => handleDecision(req, true)}
                                className="bg-success hover:bg-success/90"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processing === req.id}
                                onClick={() => handleDecision(req, false)}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanRequestReview;
