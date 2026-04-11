import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, CreditCard, UserCheck, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

interface DashboardStats {
  totalMembers: number;
  monthlyContributions: number;
  outstandingLoans: number;
  overdueLoans: number;
  currentBeneficiary: string | null;
  currentMonth: string;
  totalInvestorFunds: number;
  totalInvestorObligations: number;
  availableFunds: number;
}

interface ChartData {
  month: string;
  contributions: number;
  loans: number;
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
    totalMembers: 0, monthlyContributions: 0, outstandingLoans: 0, overdueLoans: 0,
    currentBeneficiary: null, currentMonth: format(new Date(), "MMM yyyy"),
    totalInvestorFunds: 0, totalInvestorObligations: 0, availableFunds: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loans, setLoans] = useState<OutstandingLoan[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const [memberCountRes, monthlyContribRes, loansRes, paymentsRes, allProfilesRes, investmentsRes, investorPaymentsRes, repaymentsRes] = await Promise.all([
        supabase.from("group_memberships").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("monthly_contributions").select("total_collected, beneficiary_user_id").eq("month", currentMonth).eq("year", currentYear).maybeSingle(),
        supabase.from("loans").select("outstanding_balance, monthly_repayment, user_id, status, id").eq("status", "active"),
        supabase.from("contribution_payments").select("id, amount, payment_date, status, user_id").order("payment_date", { ascending: false }).limit(10),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("investments").select("amount, interest_rate, status"),
        supabase.from("investor_payments" as any).select("amount_paid"),
        supabase.from("loan_repayments").select("due_date, amount_due, amount").lt("due_date", new Date().toISOString().split("T")[0]),
      ]);

      const profileMap = new Map<string, string>();
      for (const p of allProfilesRes.data || []) {
        profileMap.set(p.user_id, p.full_name || "Unknown Member");
      }

      let beneficiaryName: string | null = null;
      if (monthlyContribRes.data?.beneficiary_user_id) {
        beneficiaryName = profileMap.get(monthlyContribRes.data.beneficiary_user_id) || null;
      }

      const totalOutstanding = (loansRes.data || []).reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0);

      // Calculate overdue repayments
      const overdueCount = (repaymentsRes.data || []).filter((r) => Number(r.amount) < Number(r.amount_due)).length;

      // Investor calculations
      const activeInvestments = (investmentsRes.data || []).filter((i) => i.status === "active");
      const totalInvestorFunds = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
      const totalInvestorObligations = activeInvestments.reduce((s, i) => s + Number(i.amount) * (1 + Number(i.interest_rate) / 100), 0);
      const totalInvestorPaid = (investorPaymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
      const totalContrib = (paymentsRes.data || []).reduce((s, p) => s + Number(p.amount), 0);
      
      // Also get all contributions for available funds calculation
      const { data: allPaidContribs } = await supabase.from("contribution_payments").select("amount").eq("status", "paid");
      const allContribTotal = (allPaidContribs || []).reduce((s, p) => s + Number(p.amount), 0);
      const availableFunds = allContribTotal - totalOutstanding - (totalInvestorObligations - totalInvestorPaid);

      const loansWithNames: OutstandingLoan[] = (loansRes.data || []).map((loan) => ({
        id: loan.id,
        memberName: profileMap.get(loan.user_id) || "Unknown Member",
        balance: Number(loan.outstanding_balance),
        monthlyRepayment: Number(loan.monthly_repayment) || 0,
        status: loan.status === "active" ? "On Track" : loan.status || "Unknown",
      }));

      const paymentsWithNames: RecentPayment[] = (paymentsRes.data || []).map((payment) => ({
        id: payment.id,
        memberName: profileMap.get(payment.user_id) || "Unknown Member",
        amount: Number(payment.amount),
        date: payment.payment_date ? format(new Date(payment.payment_date), "dd MMM yyyy") : "Unknown",
        status: payment.status === "paid" ? "Paid" : payment.status === "pending" ? "Pending" : payment.status || "Unknown",
      }));

      setStats({
        totalMembers: memberCountRes.count || 0,
        monthlyContributions: Number(monthlyContribRes.data?.total_collected) || 0,
        outstandingLoans: totalOutstanding,
        overdueLoans: overdueCount,
        currentBeneficiary: beneficiaryName,
        currentMonth: format(new Date(), "MMM yyyy"),
        totalInvestorFunds,
        totalInvestorObligations: totalInvestorObligations - totalInvestorPaid,
        availableFunds,
      });
      setRecentPayments(paymentsWithNames);
      setLoans(loansWithNames);

      // Build chart data for last 6 months
      await buildChartData();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildChartData = async () => {
    const months: ChartData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = d.toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
      const label = format(d, "MMM");

      const [contribRes, loanRes] = await Promise.all([
        supabase.from("contribution_payments").select("amount").eq("status", "paid").gte("payment_date", monthStart).lte("payment_date", monthEnd),
        supabase.from("loans").select("principal_amount").gte("issued_date", monthStart).lte("issued_date", monthEnd),
      ]);

      months.push({
        month: label,
        contributions: (contribRes.data || []).reduce((s, p) => s + Number(p.amount), 0),
        loans: (loanRes.data || []).reduce((s, l) => s + Number(l.principal_amount), 0),
      });
    }

    setChartData(months);
  };

  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const statsCards = [
    { title: "Total Members", value: stats.totalMembers.toString(), icon: Users, color: "text-contribution", bgColor: "bg-contribution-light" },
    { title: "Monthly Contributions", value: formatCurrency(stats.monthlyContributions), icon: Wallet, color: "text-contribution", bgColor: "bg-contribution-light" },
    { title: "Outstanding Loans", value: formatCurrency(stats.outstandingLoans), icon: CreditCard, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Overdue Repayments", value: stats.overdueLoans.toString(), icon: AlertTriangle, color: stats.overdueLoans > 0 ? "text-destructive" : "text-success", bgColor: stats.overdueLoans > 0 ? "bg-destructive/10" : "bg-success/10" },
    { title: "Investor Capital", value: formatCurrency(stats.totalInvestorFunds), icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Investor Obligations", value: formatCurrency(stats.totalInvestorObligations), icon: DollarSign, color: "text-amber-600", bgColor: "bg-amber-100" },
    { title: "Available Funds", value: formatCurrency(stats.availableFunds), icon: BarChart3, color: stats.availableFunds >= 0 ? "text-success" : "text-destructive", bgColor: stats.availableFunds >= 0 ? "bg-success/10" : "bg-destructive/10" },
    { title: "Beneficiary", value: stats.currentBeneficiary || "Not Set", icon: UserCheck, color: "text-primary", bgColor: "bg-primary/10", subtitle: stats.currentMonth },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartConfig = {
    contributions: { label: "Contributions", color: "hsl(var(--contribution))" },
    loans: { label: "Loans", color: "hsl(var(--primary))" },
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
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

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contributions (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="contributions" fill="var(--color-contributions)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loans Issued (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `£${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="loans" stroke="var(--color-loans)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

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
                        <span className="font-semibold text-contribution text-sm">{getInitials(item.memberName)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.memberName}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(item.amount)}</p>
                      <span className={`text-xs ${item.status === "Paid" ? "text-success" : "text-warning"}`}>{item.status}</span>
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
                      <span className={`text-xs ${item.status === "On Track" ? "text-success" : "text-destructive"}`}>{item.status}</span>
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
