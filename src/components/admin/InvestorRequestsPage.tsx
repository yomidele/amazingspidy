import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Mail, Phone, User } from "lucide-react";

interface InvestorRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const InvestorRequestsPage = () => {
  const [requests, setRequests] = useState<InvestorRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("investor_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load investor requests");
    } else {
      setRequests((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("investor_requests" as any)
      .update({ status } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Request ${status}`);
      fetchRequests();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No investor applications yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Investor Applications ({requests.length})</h2>
      {requests.map((req) => (
        <Card key={req.id} className="border-border/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{req.full_name}</h3>
                  {statusBadge(req.status)}
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {req.email}
                  </span>
                  {req.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {req.phone}
                    </span>
                  )}
                </div>
                {req.message && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2">
                    "{req.message}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Applied {new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {req.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => updateStatus(req.id, "approved")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(req.id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InvestorRequestsPage;
