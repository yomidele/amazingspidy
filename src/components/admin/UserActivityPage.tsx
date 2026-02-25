import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ContributorTransactionList from "@/components/dashboard/ContributorTransactionList";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface Loan {
  id: string;
  principal_amount: number;
  outstanding_balance: number;
  status: string | null;
  issued_date: string | null;
  group_id: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string | null;
  payment_date: string | null;
}

interface UserActivityPageProps {
  userId: string | null;
}

const UserActivityPage = ({ userId }: UserActivityPageProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (profError) throw profError;
      setProfile(profData || null);

      const { data: loanData, error: loanError } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", userId)
        .order("issued_date", { ascending: false });
      if (loanError) throw loanError;
      setLoans(loanData || []);

      const { data: paymentData, error: paymentError } = await supabase
        .from("contribution_payments")
        .select("*")
        .eq("user_id", userId)
        .order("payment_date", { ascending: false });
      if (paymentError) throw paymentError;
      setPayments(paymentData || []);
    } catch (error: any) {
      console.error("Error fetching user activity:", error);
      toast.error("Failed to load user activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin")}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-1">
              <p className="font-semibold">{profile.full_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.phone && (
                <p className="text-sm text-muted-foreground">{profile.phone}</p>
              )}
            </div>
          ) : loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <p className="text-muted-foreground">No profile found</p>
          )}
        </CardContent>
      </Card>

      {/* Loan History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Loan History ({loans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading loans...</p>
          ) : loans.length === 0 ? (
            <p className="text-muted-foreground">No loans</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Principal</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>${loan.principal_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">
                        ${loan.outstanding_balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge>{loan.status || "active"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {loan.issued_date
                          ? new Date(loan.issued_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Records Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading payments...</p>
          ) : payments.length === 0 ? (
            <p className="text-muted-foreground">No payments</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>£{p.amount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>{p.status || "pending"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Timeline */}
      <ContributorTransactionList
        userId={userId || ""}
        userName={profile?.full_name || profile?.email || ""}
      />
    </div>
  );
};

export default UserActivityPage;
