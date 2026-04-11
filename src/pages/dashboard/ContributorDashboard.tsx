import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wallet, TrendingUp, Calendar, CreditCard, Bell, LogOut,
  Menu, X, AlertTriangle, CheckCircle, Building2, ChevronRight,
  Sparkles, ArrowUpRight, ArrowDownRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContributorTransactionList from "@/components/dashboard/ContributorTransactionList";
import LoanRequestForm from "@/components/dashboard/LoanRequestForm";
import GuarantorRequests from "@/components/dashboard/GuarantorRequests";
import RepaymentSchedule from "@/components/dashboard/RepaymentSchedule";
import ContributorCharts from "@/components/dashboard/ContributorCharts";
import ContributorInsights from "@/components/dashboard/ContributorInsights";

interface BeneficiaryInfo {
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  sortCode?: string | null;
}

// Glass card wrapper
const GlassCard = ({ children, className = "", delay = 0, hover = true }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={`
      rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl
      shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      ${hover ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]" : ""}
      ${className}
    `}
  >
    {children}
  </motion.div>
);

const ContributorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loanBalance, setLoanBalance] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [isBeneficiary, setIsBeneficiary] = useState(false);
  const [beneficiaryMonth, setBeneficiaryMonth] = useState("");
  const [expectedPayout, setExpectedPayout] = useState(0);
  const [hasCurrentMonthPaid, setHasCurrentMonthPaid] = useState(false);
  const [currentMonthPeriod, setCurrentMonthPeriod] = useState("");
  const [currentBeneficiary, setCurrentBeneficiary] = useState<BeneficiaryInfo | null>(null);
  const [contributionHistory, setContributionHistory] = useState<{ month: string; amount: number }[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "loans" | "history">("overview");

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

      const notificationChannel = supabase
        .channel('contributor-notifications')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          const notification = payload.new as any;
          toast.success(notification.title, { description: notification.message, duration: 8000 });
          fetchUserData(session.user.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(notificationChannel); };
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/login/contribution");
      else { setUser(session.user); fetchUserData(session.user.id); }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    setCurrentMonthPeriod(`${monthNames[currentMonth - 1]} ${currentYear}`);

    try {
      const { data: membershipData } = await supabase
        .from("group_memberships").select("group_id")
        .eq("user_id", userId).eq("is_active", true).limit(1);

      let userGroupId: string | null = null;

      if (membershipData && membershipData.length > 0) {
        userGroupId = membershipData[0].group_id;
        const { data: groupData } = await supabase
          .from("contribution_groups").select("contribution_amount")
          .eq("id", userGroupId).maybeSingle();
        if (groupData) setMonthlyContribution(Number(groupData.contribution_amount));
      }

      const { data: loansData, error: loansError } = await supabase
        .from("loans").select("outstanding_balance, monthly_repayment, status")
        .eq("user_id", userId).eq("status", "active");

      if (!loansError && loansData) {
        setLoanBalance(loansData.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0));
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("contribution_payments")
        .select("amount, status, payment_date, monthly_contribution_id")
        .eq("user_id", userId).eq("status", "paid")
        .order("payment_date", { ascending: false });

      if (!paymentsError && paymentsData) {
        setTotalContributed(paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0));

        // Build contribution history for charts
        const monthlyMap = new Map<string, number>();
        for (const p of paymentsData) {
          if (p.payment_date) {
            const d = new Date(p.payment_date);
            const key = `${monthNames[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
            monthlyMap.set(key, (monthlyMap.get(key) || 0) + p.amount);
          }
        }
        const historyArr = Array.from(monthlyMap.entries())
          .map(([month, amount]) => ({ month, amount }))
          .reverse()
          .slice(-6);
        setContributionHistory(historyArr);
      }

      if (userGroupId) {
        const { data: currentMonthMc } = await supabase
          .from("monthly_contributions")
          .select("id, beneficiary_user_id, beneficiary_bank_name, beneficiary_account_number")
          .eq("group_id", userGroupId).eq("month", currentMonth).eq("year", currentYear)
          .maybeSingle();

        if (currentMonthMc) {
          const { data: paymentCheck } = await supabase
            .from("contribution_payments").select("id")
            .eq("user_id", userId).eq("monthly_contribution_id", currentMonthMc.id)
            .eq("status", "paid").limit(1);

          setHasCurrentMonthPaid(paymentCheck && paymentCheck.length > 0);

          if (currentMonthMc.beneficiary_user_id) {
            const { data: benefProfile } = await supabase
              .from("profiles").select("full_name")
              .eq("user_id", currentMonthMc.beneficiary_user_id).maybeSingle();

            setCurrentBeneficiary({
              name: benefProfile?.full_name || "Unknown",
              bankName: currentMonthMc.beneficiary_bank_name,
              accountNumber: currentMonthMc.beneficiary_account_number,
              sortCode: null,
            });
          }
        }
      }

      const { data: beneficiaryData, error: beneficiaryError } = await supabase
        .from("monthly_contributions").select("*")
        .eq("beneficiary_user_id", userId).gte("year", currentYear)
        .order("year", { ascending: true }).order("month", { ascending: true }).limit(1);

      if (!beneficiaryError && beneficiaryData && beneficiaryData.length > 0) {
        const benef = beneficiaryData[0];
        setBeneficiaryMonth(`${monthNames[benef.month - 1]} ${benef.year}`);
        setExpectedPayout(benef.total_expected || 0);
        setIsBeneficiary(benef.month === currentMonth && benef.year === currentYear);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/contribution");
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Contributor";
  const progressPercent = monthlyContribution > 0
    ? Math.min(100, (totalContributed / (monthlyContribution * 12)) * 100)
    : 0;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "loans" as const, label: "Loans" },
    { id: "history" as const, label: "History" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0B0F14]/80 backdrop-blur-xl h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-semibold text-sm">Contributor</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10">
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0D1117] border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-wide">AMANA MARKET</h2>
                <p className="text-[11px] text-white/40">Contributor Portal</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  {tab.id === "overview" && <TrendingUp className="w-4 h-4" />}
                  {tab.id === "loans" && <CreditCard className="w-4 h-4" />}
                  {tab.id === "history" && <Clock className="w-4 h-4" />}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 flex items-center justify-center border border-emerald-500/20">
                <span className="font-semibold text-sm text-emerald-400">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "User"}</p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all duration-200">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {/* Welcome + Mobile Tabs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold mb-1">
                Welcome back, <span className="text-emerald-400">{firstName}</span>
              </h1>
              <p className="text-white/40 text-sm">Here's your contribution overview</p>
              {/* Mobile tab bar */}
              <div className="flex lg:hidden gap-2 mt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "text-white/40 bg-white/5 border border-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Hero Balance Section */}
                  <GlassCard className="p-6 lg:p-8 mb-6" delay={0.1} hover={false}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div>
                        <p className="text-white/40 text-sm mb-1">Total Contributions</p>
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                          £{totalContributed.toLocaleString()}
                        </h2>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className={`w-2 h-2 rounded-full ${hasCurrentMonthPaid ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                            <span className="text-white/50">
                              {hasCurrentMonthPaid ? `${currentMonthPeriod} paid` : `${currentMonthPeriod} pending`}
                            </span>
                          </div>
                          {loanBalance > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-red-400" />
                              <span className="text-white/50">Loan: £{loanBalance.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-full lg:w-64">
                        <div className="flex justify-between text-xs text-white/40 mb-2">
                          <span>Annual Progress</span>
                          <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                          />
                        </div>
                        <p className="text-[11px] text-white/30 mt-1">Based on 12-month cycle</p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                    {[
                      {
                        label: "Loan Balance",
                        value: `£${loanBalance.toLocaleString()}`,
                        icon: CreditCard,
                        accent: loanBalance > 0 ? "text-red-400" : "text-emerald-400",
                        iconBg: loanBalance > 0 ? "bg-red-500/15" : "bg-emerald-500/15",
                        badge: loanBalance > 0 ? { text: "ACTIVE", color: "bg-red-500/20 text-red-400" } : null,
                      },
                      {
                        label: `${currentMonthPeriod}`,
                        value: `£${monthlyContribution.toLocaleString()}`,
                        icon: Wallet,
                        accent: "text-violet-400",
                        iconBg: "bg-violet-500/15",
                        badge: hasCurrentMonthPaid
                          ? { text: "PAID", color: "bg-emerald-500/20 text-emerald-400" }
                          : monthlyContribution > 0
                          ? { text: "UNPAID", color: "bg-amber-500/20 text-amber-400" }
                          : null,
                      },
                      {
                        label: "Total Contributed",
                        value: `£${totalContributed.toLocaleString()}`,
                        icon: TrendingUp,
                        accent: "text-emerald-400",
                        iconBg: "bg-emerald-500/15",
                        badge: null,
                      },
                      {
                        label: "Next Payout",
                        value: beneficiaryMonth || "None",
                        icon: Calendar,
                        accent: "text-blue-400",
                        iconBg: "bg-blue-500/15",
                        badge: isBeneficiary ? { text: "THIS MONTH", color: "bg-emerald-500/20 text-emerald-400" } : null,
                      },
                    ].map((stat, i) => (
                      <GlassCard key={stat.label} className="p-4 lg:p-5" delay={0.15 + i * 0.05}>
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 ${stat.accent}`} />
                          </div>
                          {stat.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.badge.color}`}>
                              {stat.badge.text}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 mb-0.5">{stat.label}</p>
                        <p className={`text-xl lg:text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
                      </GlassCard>
                    ))}
                  </div>

                  {/* Charts + Insights */}
                  <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
                    <div className="lg:col-span-2">
                      <GlassCard className="p-5 lg:p-6 h-full" delay={0.3}>
                        <h3 className="font-semibold text-sm mb-4 text-white/70">Contribution Trend</h3>
                        <ContributorCharts data={contributionHistory} />
                      </GlassCard>
                    </div>
                    <GlassCard className="p-5 lg:p-6" delay={0.35}>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-semibold text-sm text-white/70">Insights</h3>
                      </div>
                      <ContributorInsights
                        totalContributed={totalContributed}
                        monthlyContribution={monthlyContribution}
                        hasCurrentMonthPaid={hasCurrentMonthPaid}
                        loanBalance={loanBalance}
                        beneficiaryMonth={beneficiaryMonth}
                        contributionHistory={contributionHistory}
                      />
                    </GlassCard>
                  </div>

                  {/* Beneficiary Info + Payout */}
                  <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                    <GlassCard className="p-5 lg:p-6" delay={0.4}>
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-4 h-4 text-white/50" />
                        <h3 className="font-semibold text-sm text-white/70">{currentMonthPeriod} Beneficiary</h3>
                      </div>
                      {currentBeneficiary ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <p className="text-[11px] text-white/30 mb-1">This Month's Beneficiary</p>
                            <p className="font-semibold">{currentBeneficiary.name}</p>
                          </div>
                          {currentBeneficiary.bankName && currentBeneficiary.accountNumber ? (
                            <div className="p-3 rounded-xl bg-violet-500/[0.08] border border-violet-500/10 space-y-2">
                              <p className="text-[11px] text-white/30">Payment Details</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-white/50">Bank</span>
                                <span className="font-medium">{currentBeneficiary.bankName}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white/50">Account</span>
                                <span className="font-mono font-medium">{currentBeneficiary.accountNumber}</span>
                              </div>
                              {currentBeneficiary.sortCode && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-white/50">Sort Code</span>
                                  <span className="font-mono font-medium">{currentBeneficiary.sortCode}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                              <p className="text-xs text-white/30">Bank details not yet provided</p>
                            </div>
                          )}
                          {hasCurrentMonthPaid && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs text-emerald-400 font-medium">Paid for {currentMonthPeriod}</span>
                            </div>
                          )}
                          {!hasCurrentMonthPaid && monthlyContribution > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              <span className="text-xs text-amber-400 font-medium">Payment pending</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Building2 className="w-10 h-10 mx-auto text-white/20 mb-2" />
                          <p className="text-xs text-white/30">No beneficiary set yet</p>
                        </div>
                      )}
                    </GlassCard>

                    <GlassCard className="p-5 lg:p-6" delay={0.45}>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4 text-white/50" />
                        <h3 className="font-semibold text-sm text-white/70">Your Payout Schedule</h3>
                      </div>
                      <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-white/20" />
                        </div>
                        {beneficiaryMonth ? (
                          <>
                            <h4 className="font-semibold mb-1">
                              {isBeneficiary ? "🎉 You're This Month's Beneficiary!" : "Scheduled Payout"}
                            </h4>
                            <p className="text-xs text-white/40 mb-4">
                              You'll receive in <span className="text-emerald-400 font-medium">{beneficiaryMonth}</span>
                            </p>
                            <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10">
                              <p className="text-[11px] text-white/30">Expected</p>
                              <p className="text-xl font-bold text-emerald-400">£{expectedPayout.toLocaleString()}</p>
                              {loanBalance > 0 && (
                                <p className="text-[11px] text-white/30 mt-1">
                                  After deduction: £{Math.max(0, expectedPayout - loanBalance).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <h4 className="font-semibold mb-1 text-white/70">No Scheduled Payout</h4>
                            <p className="text-xs text-white/30">Contact your group admin for details</p>
                          </>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {activeTab === "loans" && (
                <motion.div key="loans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="contributor-dark-override">
                      <LoanRequestForm userId={user?.id || ""} userName={user?.user_metadata?.full_name} />
                    </div>
                    <div className="contributor-dark-override">
                      <GuarantorRequests userId={user?.id || ""} />
                    </div>
                  </div>
                  <div className="contributor-dark-override">
                    <RepaymentSchedule userId={user?.id || ""} />
                  </div>
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="contributor-dark-override">
                    <ContributorTransactionList userId={user?.id || ""} userName={user?.user_metadata?.full_name} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default ContributorDashboard;
