import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContributorTransactionList from "@/components/dashboard/ContributorTransactionList";

interface LoanData {
  outstanding_balance: number;
  monthly_repayment: number | null;
  status: string | null;
}

interface ContributionPayment {
  amount: number;
  status: string | null;
  payment_date: string | null;
}

interface MonthlyContribution {
  id: string;
  month: number;
  year: number;
  beneficiary_user_id: string | null;
  total_expected: number | null;
}

const ContributorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loanBalance, setLoanBalance] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [totalContributed, setTotalContributed] = useState(0);
  const [isBeneficiary, setIsBeneficiary] = useState(false);
  const [beneficiaryMonth, setBeneficiaryMonth] = useState("");
  const [expectedPayout, setExpectedPayout] = useState(0);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/contribution");
        return;
      }
      setUser(session.user);
      fetchUserData(session.user.id);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login/contribution");
      } else {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch loan balance
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("outstanding_balance, monthly_repayment, status")
        .eq("user_id", userId)
        .eq("status", "active");

      if (!loansError && loansData) {
        const totalLoanBalance = loansData.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0);
        setLoanBalance(totalLoanBalance);
      }

      // Fetch contribution payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("contribution_payments")
        .select("amount, status, payment_date")
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("payment_date", { ascending: false });

      if (!paymentsError && paymentsData) {
        const total = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
        setTotalContributed(total);
      }

      // Check if user is beneficiary for current or upcoming month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from("monthly_contributions")
        .select("*")
        .eq("beneficiary_user_id", userId)
        .gte("year", currentYear)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(1);

      if (!beneficiaryError && beneficiaryData && beneficiaryData.length > 0) {
        const benef = beneficiaryData[0];
        setBeneficiaryMonth(`${monthNames[benef.month - 1]} ${benef.year}`);
        setExpectedPayout(benef.total_expected || 0);
        setIsBeneficiary(benef.month === currentMonth && benef.year === currentYear);
      }

      // Get group contribution amount
      const { data: membershipData } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);

      if (membershipData && membershipData.length > 0) {
        const { data: groupData } = await supabase
          .from("contribution_groups")
          .select("contribution_amount")
          .eq("id", membershipData[0].group_id)
          .maybeSingle();

        if (groupData) {
          setMonthlyContribution(groupData.contribution_amount);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/contribution");
  };

  const stats = [
    {
      title: "Current Loan Balance",
      value: `£${loanBalance.toLocaleString()}`,
      icon: CreditCard,
      color: loanBalance > 0 ? "text-destructive" : "text-success",
      bgColor: loanBalance > 0 ? "bg-destructive/10" : "bg-success/10",
      showDanger: loanBalance > 0,
    },
    {
      title: "Monthly Contribution",
      value: `£${monthlyContribution.toLocaleString()}`,
      icon: Wallet,
      color: "text-contribution",
      bgColor: "bg-contribution-light",
      showDanger: false,
    },
    {
      title: "Total Contributed",
      value: `£${totalContributed.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      showDanger: false,
    },
    {
      title: "Next Payout",
      value: beneficiaryMonth || "Not scheduled",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      showDanger: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-accent rounded-lg">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-contribution flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Contributor</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-contribution flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sidebar-primary">ServiPro</h2>
                <p className="text-xs text-sidebar-foreground/60">Contributor Portal</p>
              </div>
            </div>

            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground">
                <TrendingUp className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Wallet className="w-5 h-5 mr-3" />
                Contributions
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <CreditCard className="w-5 h-5 mr-3" />
                Loans
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Bell className="w-5 h-5 mr-3" />
                Notifications
              </Button>
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "User"}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-2">
                Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "Contributor"}!
              </h1>
              <p className="text-muted-foreground">
                Here's an overview of your contribution account.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`card-hover ${stat.showDanger ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        {stat.showDanger && (
                          <div className="flex items-center gap-1 text-destructive animate-pulse">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-xs font-semibold">UNPAID</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.showDanger ? 'text-destructive' : 'text-foreground'}`}>{stat.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Transactions & Beneficiary Status */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Transaction History with Receipts */}
              <ContributorTransactionList
                userId={user?.id || ""}
                userName={user?.user_metadata?.full_name}
              />

              {/* Beneficiary Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Beneficiary Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-10 h-10 text-muted-foreground" />
                    </div>
                    {beneficiaryMonth ? (
                      <>
                        <h3 className="font-semibold text-lg mb-2">
                          {isBeneficiary ? "You Are This Month's Beneficiary!" : "Scheduled Payout"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          You are scheduled to be the beneficiary in <strong>{beneficiaryMonth}</strong>.
                        </p>
                        <div className="p-4 rounded-xl bg-contribution-light border border-contribution/20">
                          <p className="text-sm text-contribution-foreground">
                            Expected payout: <strong className="text-contribution">£{expectedPayout.toLocaleString()}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            After loan deduction: £{Math.max(0, expectedPayout - loanBalance).toLocaleString()}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg mb-2">No Scheduled Payout</h3>
                        <p className="text-muted-foreground">
                          You are not currently scheduled as a beneficiary. Contact your group admin for more information.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ContributorDashboard;
