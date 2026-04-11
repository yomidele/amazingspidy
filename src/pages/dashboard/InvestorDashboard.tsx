import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, LogOut, DollarSign, Clock, BarChart3, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/investor"); return; }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "investor")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Investor privileges required.");
        await supabase.auth.signOut();
        navigate("/login/investor");
        return;
      }

      setUser(session.user);
      setIsVerified(true);

      const [profileRes, investmentsRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("investments").select("*").eq("investor_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("investor_payments" as any).select("*").eq("investor_id", session.user.id).order("payment_date", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setInvestments(investmentsRes.data || []);
      setPayments(paymentsRes.data || []);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/login/investor");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/investor");
  };

  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  const getExpectedReturn = (inv: any) => Number(inv.amount) * (1 + Number(inv.interest_rate) / 100);
  const getTotalPaidForInvestment = (investmentId: string) =>
    payments.filter((p) => p.investment_id === investmentId).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalExpectedReturn = investments.reduce((sum, inv) => sum + getExpectedReturn(inv), 0);
  const totalEarnings = totalExpectedReturn - totalInvested;
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const remainingBalance = totalExpectedReturn - totalPaid;

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "matured": return "secondary";
      case "withdrawn": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-lg">Investor Dashboard</h1>
              <p className="text-xs text-muted-foreground">{profile?.full_name || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
                <DollarSign className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0"><div className="text-lg sm:text-2xl font-bold">£{totalInvested.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Expected Return</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0"><div className="text-lg sm:text-2xl font-bold text-amber-600">£{totalExpectedReturn.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Received</CardTitle>
                <Receipt className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0"><div className="text-lg sm:text-2xl font-bold text-green-600">£{totalPaid.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Balance Due</CardTitle>
                <Clock className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0"><div className="text-lg sm:text-2xl font-bold text-destructive">£{remainingBalance.toLocaleString()}</div></CardContent>
            </Card>
          </div>

          {/* Investments Table */}
          <Card className="mb-8">
            <CardHeader><CardTitle>My Investments</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : investments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No investments yet. Contact your administrator.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Principal</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Expected Return</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.map((inv) => {
                        const expected = getExpectedReturn(inv);
                        const paid = getTotalPaidForInvestment(inv.id);
                        const balance = expected - paid;
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">£{Number(inv.amount).toLocaleString()}</TableCell>
                            <TableCell>{inv.interest_rate}%</TableCell>
                            <TableCell className="text-amber-600 font-medium">£{expected.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600 font-medium">£{paid.toLocaleString()}</TableCell>
                            <TableCell className="text-destructive font-medium">£{balance.toLocaleString()}</TableCell>
                            <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments received yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-green-600">£{Number(p.amount_paid).toLocaleString()}</TableCell>
                          <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default InvestorDashboard;
