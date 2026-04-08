import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, LogOut, DollarSign, Calendar, Clock, BarChart3 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/investor"); return; }

      // Verify investor role
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

      // Fetch profile & investments in parallel
      const [profileRes, investmentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("investments").select("*").eq("investor_id", session.user.id).order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setInvestments(investmentsRes.data || []);
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
          <div className="w-10 h-10 rounded-xl bg-investor flex items-center justify-center animate-pulse">
            <TrendingUp className="w-5 h-5 text-investor-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const activeInvestments = investments.filter((inv) => inv.status === "active");

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
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-investor flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-investor-foreground" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
                <DollarSign className="w-4 h-4 text-investor" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{totalInvested.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
                <BarChart3 className="w-4 h-4 text-investor" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeInvestments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Investments</CardTitle>
                <Clock className="w-4 h-4 text-investor" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investments.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Investments Table */}
          <Card>
            <CardHeader>
              <CardTitle>My Investments</CardTitle>
            </CardHeader>
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Interest Rate</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">£{Number(inv.amount).toLocaleString()}</TableCell>
                          <TableCell>{inv.interest_rate}%</TableCell>
                          <TableCell>{inv.duration_months} months</TableCell>
                          <TableCell>{new Date(inv.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{inv.end_date ? new Date(inv.end_date).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(inv.status)}>{inv.status}</Badge>
                          </TableCell>
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
