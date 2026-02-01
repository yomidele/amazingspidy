import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, CreditCard, UserCheck, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalMembers: number;
  monthlyContributions: number;
  outstandingLoans: number;
  currentBeneficiary: string | null;
  currentMonth: string;
}

interface RecentPayment {
  id: string;
  memberName: string;
  amount: number;
  date: string;
  status: string;
}

interface OutstandingLoan {
  id: string;
  memberName: string;
  balance: number;
  monthlyRepayment: number;
  status: string;
}

const ContributionDashboardContent = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    monthlyContributions: 0,
    outstandingLoans: 0,
    currentBeneficiary: null,
    currentMonth: format(new Date(), "MMM yyyy"),
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loans, setLoans] = useState<OutstandingLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total active members
      const { count: memberCount } = await supabase
        .from("group_memberships")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch current month's contributions total
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: monthlyContrib } = await supabase
        .from("monthly_contributions")
        .select("total_collected, beneficiary_user_id")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      // Fetch beneficiary name if exists
      let beneficiaryName = null;
      if (monthlyContrib?.beneficiary_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", monthlyContrib.beneficiary_user_id)
          .maybeSingle();
        beneficiaryName = profile?.full_name || null;
      }

      // Fetch outstanding loans total
      const { data: loansData } = await supabase
        .from("loans")
        .select("outstanding_balance, monthly_repayment, user_id, status, id")
        .eq("status", "active");

      const totalOutstanding = loansData?.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0) || 0;

      // Build loans list with member names
      const loansWithNames: OutstandingLoan[] = [];
      if (loansData && loansData.length > 0) {
        for (const loan of loansData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", loan.user_id)
            .maybeSingle();
          
          loansWithNames.push({
            id: loan.id,
            memberName: profile?.full_name || "Unknown Member",
            balance: Number(loan.outstanding_balance),
            monthlyRepayment: Number(loan.monthly_repayment) || 0,
            status: loan.status === "active" ? "On Track" : loan.status || "Unknown",
          });
        }
      }

      // Fetch recent payments with member names
      const { data: paymentsData } = await supabase
        .from("contribution_payments")
        .select("id, amount, payment_date, status, user_id")
        .order("payment_date", { ascending: false })
        .limit(10);

      const paymentsWithNames: RecentPayment[] = [];
      if (paymentsData && paymentsData.length > 0) {
        for (const payment of paymentsData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", payment.user_id)
            .maybeSingle();
          
          paymentsWithNames.push({
            id: payment.id,
            memberName: profile?.full_name || "Unknown Member",
            amount: Number(payment.amount),
            date: payment.payment_date ? formatDistanceToNow(new Date(payment.payment_date), { addSuffix: false }) : "Unknown",
            status: payment.status === "paid" ? "Paid" : payment.status === "pending" ? "Pending" : payment.status || "Unknown",
          });
        }
      }

      setStats({
        totalMembers: memberCount || 0,
        monthlyContributions: Number(monthlyContrib?.total_collected) || 0,
        outstandingLoans: totalOutstanding,
        currentBeneficiary: beneficiaryName,
        currentMonth: format(new Date(), "MMM yyyy"),
      });
      setRecentPayments(paymentsWithNames);
      setLoans(loansWithNames);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const statsCards = [
    { title: "Total Members", value: stats.totalMembers.toString(), icon: Users },
    { title: "Monthly Contributions", value: formatCurrency(stats.monthlyContributions), icon: Wallet },
    { title: "Outstanding Loans", value: formatCurrency(stats.outstandingLoans), icon: CreditCard },
    { title: "This Month's Beneficiary", value: stats.currentBeneficiary || "Not Set", icon: UserCheck, subtitle: stats.currentMonth },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => (
          <Card key={stat.title} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-contribution-light">
                  <stat.icon className="w-6 h-6 text-contribution" />
                </div>
                {stat.subtitle && (
                  <div className="flex items-center gap-1 text-sm text-success">
                    <TrendingUp className="w-4 h-4" />
                    <span>{stat.subtitle}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Contributions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No contribution payments recorded yet.</p>
                <p className="text-sm mt-1">Record payments in the Payments section.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-contribution-light flex items-center justify-center">
                        <span className="font-semibold text-contribution text-sm">
                          {getInitials(item.memberName)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.memberName}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(item.amount)}</p>
                      <span className={`text-xs ${item.status === "Paid" ? "text-success" : "text-warning"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Loans */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Loans</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active loans.</p>
                <p className="text-sm mt-1">Issue loans in the Loans section.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.memberName}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.monthlyRepayment)}/month</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(item.balance)}</p>
                      <span className={`text-xs ${item.status === "On Track" ? "text-success" : "text-destructive"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ContributionDashboardContent;
