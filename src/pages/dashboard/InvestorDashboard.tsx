import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, LogOut, DollarSign, Clock, Receipt, Menu, X,
  BarChart3, History, Wallet, Eye, Download, Calendar, ArrowLeft, PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Area, AreaChart, CartesianGrid,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import NotificationBell from "@/components/shared/NotificationBell";
import DashboardThemeToggle from "@/components/shared/DashboardThemeToggle";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import InvestorModuleLockedScreen from "@/components/admin/InvestorModuleLockedScreen";
import { useInvestorModuleStatus } from "@/hooks/useInvestorModuleStatus";
import { useExitConfirm } from "@/hooks/useExitConfirm";
import { useLogoutConfirm } from "@/components/shared/LogoutConfirmProvider";
import InvestorLoanAssignments from "@/components/dashboard/InvestorLoanAssignments";
import RoleSwitcher from "@/components/shared/RoleSwitcher";
import { useActiveRole } from "@/contexts/ActiveRoleContext";

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

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const { isDark, toggleMode } = useDashboardTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "investments" | "payments">("overview");
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { status: investorModuleStatus, loading: moduleLoading } = useInvestorModuleStatus();

  const { setActiveRole, hasContributor } = useActiveRole();

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
        // User no longer has investor access — fall back to contributor dashboard if available, else logout
        toast.error("Investor access not available on this account.");
        if (hasContributor) {
          setActiveRole("contributor");
          navigate("/dashboard/contributor");
        } else {
          await supabase.auth.signOut();
          navigate("/login/investor");
        }
        return;
      }

      setActiveRole("investor");
      setUser(session.user);
      setIsVerified(true);

      const [profileRes, investmentsRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("investments").select("*").eq("investor_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("investor_payments").select("*").eq("investor_id", session.user.id).order("payment_date", { ascending: false }),
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
  }, [navigate, setActiveRole, hasContributor]);

  const { confirmLogout } = useLogoutConfirm();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/investor");
  };
  const requestLogout = () => confirmLogout(handleLogout);

  // Intercept browser back so investors aren't accidentally logged out.
  useExitConfirm(handleLogout, { message: "Do you want to logout?", enabled: isVerified === true });

  if (isVerified === null || moduleLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-white/40 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (investorModuleStatus !== "active") {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <InvestorModuleLockedScreen variant="investor" />
      </div>
    );
  }

  const getInvestorReturn = (inv: any) => {
    const investorRate = Number(inv.investor_share_rate || inv.interest_rate || 0);
    return Number(inv.amount) * (1 + investorRate / 100);
  };
  const getTotalPaidForInvestment = (investmentId: string) =>
    payments.filter((p) => p.investment_id === investmentId).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalExpectedReturn = investments.reduce((sum, inv) => sum + getInvestorReturn(inv), 0);
  const totalEarnings = totalExpectedReturn - totalInvested;
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const remainingBalance = totalExpectedReturn - totalPaid;

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Investor";

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400";
      case "matured": return "bg-blue-500/20 text-blue-400";
      case "withdrawn": return "bg-white/10 text-white/50";
      default: return "bg-white/10 text-white/50";
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "investments" as const, label: "Investments", icon: TrendingUp },
    { id: "payments" as const, label: "Payments", icon: History },
  ];

  return (
    <div className={`min-h-screen bg-[#0B0F14] text-white overflow-x-hidden ${!isDark ? "dashboard-light" : ""}`}>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0B0F14]/80 backdrop-blur-xl h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-semibold text-sm">Investor</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DashboardThemeToggle isDark={isDark} onToggle={toggleMode} />
          {user && <NotificationBell userId={user.id} variant="glass" />}
          <Button variant="ghost" size="icon" onClick={requestLogout} className="text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-w-0">
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0D1117] border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-wide">AMANA MARKET</h2>
                <p className="text-[11px] text-white/40">Investor Portal</p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex items-center justify-center border border-amber-500/20">
                <span className="font-semibold text-sm text-amber-400">
                  {user?.email?.charAt(0).toUpperCase() || "I"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || "Investor"}</p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={requestLogout} className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all duration-200">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <DashboardThemeToggle isDark={isDark} onToggle={toggleMode} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 p-4 lg:p-8 pt-20 lg:pt-8 min-h-screen">
          <div className="mx-auto w-full max-w-6xl">
            {/* Welcome + Mobile Tabs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold mb-1">
                Welcome back, <span className="text-amber-400">{firstName}</span>
              </h1>
              <p className="text-white/40 text-sm">Here's your investment overview</p>
              {/* Mobile tab bar */}
              <div className="flex flex-wrap lg:hidden gap-2 mt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-w-0 flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : "text-white/40 bg-white/5 border border-white/5"
                    }`}
                  >
                    <span className="block truncate">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Loan funding requests assigned by admin */}
                  {user?.id && <InvestorLoanAssignments investorId={user.id} />}

                  {/* Hero Balance */}
                  <GlassCard className="p-6 lg:p-8 mb-6" delay={0.1} hover={false}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div>
                        <p className="text-white/40 text-sm mb-1">Total Invested</p>
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                          £{totalInvested.toLocaleString()}
                        </h2>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-white/50">{investments.length} investment{investments.length !== 1 ? "s" : ""}</span>
                          </div>
                          {totalEarnings > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-white/50">Earnings: £{totalEarnings.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-full lg:w-64">
                        <div className="flex justify-between text-xs text-white/40 mb-2">
                          <span>Payout Progress</span>
                          <span>{totalExpectedReturn > 0 ? Math.round((totalPaid / totalExpectedReturn) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${totalExpectedReturn > 0 ? (totalPaid / totalExpectedReturn) * 100 : 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                          />
                        </div>
                        <p className="text-[11px] text-white/30 mt-1">£{totalPaid.toLocaleString()} of £{totalExpectedReturn.toLocaleString()} received</p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                    {[
                      {
                        label: "Total Invested",
                        value: `£${totalInvested.toLocaleString()}`,
                        icon: DollarSign,
                        accent: "text-amber-400",
                        iconBg: "bg-amber-500/15",
                      },
                      {
                        label: "Expected Return",
                        value: `£${totalExpectedReturn.toLocaleString()}`,
                        icon: TrendingUp,
                        accent: "text-violet-400",
                        iconBg: "bg-violet-500/15",
                      },
                      {
                        label: "Total Received",
                        value: `£${totalPaid.toLocaleString()}`,
                        icon: Receipt,
                        accent: "text-emerald-400",
                        iconBg: "bg-emerald-500/15",
                      },
                      {
                        label: "Balance Due",
                        value: `£${remainingBalance.toLocaleString()}`,
                        icon: Clock,
                        accent: remainingBalance > 0 ? "text-red-400" : "text-emerald-400",
                        iconBg: remainingBalance > 0 ? "bg-red-500/15" : "bg-emerald-500/15",
                      },
                    ].map((stat, i) => (
                      <GlassCard key={stat.label} className="p-4 lg:p-5" delay={0.15 + i * 0.05}>
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 ${stat.accent}`} />
                          </div>
                        </div>
                        <p className="text-[11px] text-white/40 mb-0.5">{stat.label}</p>
                        <p className={`text-xl lg:text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
                      </GlassCard>
                    ))}
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                    {/* Investment Breakdown Pie */}
                    <GlassCard className="p-5 lg:p-6" delay={0.25}>
                      <h3 className="font-semibold text-sm mb-4 text-white/70">Portfolio Breakdown</h3>
                      {investments.length === 0 ? (
                        <div className="text-center py-8">
                          <PieChart className="w-10 h-10 mx-auto text-white/20 mb-2" />
                          <p className="text-xs text-white/30">No data yet</p>
                        </div>
                      ) : (() => {
                        const PIE_COLORS = ["#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];
                        const pieData = investments.map((inv, i) => ({
                          name: `£${Number(inv.amount).toLocaleString()}`,
                          value: Number(inv.amount),
                          status: inv.status,
                        }));
                        return (
                          <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={200}>
                              <RechartsPie>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {pieData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Amount"]}
                                />
                              </RechartsPie>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-3 mt-2 justify-center">
                              {pieData.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px] text-white/50">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  {d.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </GlassCard>

                    {/* Payout Trend Area Chart */}
                    <GlassCard className="p-5 lg:p-6" delay={0.3}>
                      <h3 className="font-semibold text-sm mb-4 text-white/70">Payout Trend</h3>
                      {payments.length === 0 ? (
                        <div className="text-center py-8">
                          <BarChart3 className="w-10 h-10 mx-auto text-white/20 mb-2" />
                          <p className="text-xs text-white/30">No payments yet</p>
                        </div>
                      ) : (() => {
                        const sorted = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
                        let cumulative = 0;
                        const trendData = sorted.map((p) => {
                          cumulative += Number(p.amount_paid);
                          return {
                            date: format(new Date(p.payment_date), "dd MMM"),
                            amount: Number(p.amount_paid),
                            cumulative,
                          };
                        });
                        return (
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={trendData}>
                              <defs>
                                <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                              <Tooltip
                                contentStyle={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                                formatter={(value: number, name: string) => [
                                  `£${value.toLocaleString()}`,
                                  name === "cumulative" ? "Total Received" : "Payment",
                                ]}
                              />
                              <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="url(#payoutGrad)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </GlassCard>
                  </div>

                  {/* Investment vs Return Bar Chart */}
                  {investments.length > 0 && (
                    <GlassCard className="p-5 lg:p-6 mb-6" delay={0.35}>
                      <h3 className="font-semibold text-sm mb-4 text-white/70">Investment vs Expected Return</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={investments.map((inv, i) => ({
                          name: `#${i + 1}`,
                          invested: Number(inv.amount),
                          expected: getInvestorReturn(inv),
                          paid: getTotalPaidForInvestment(inv.id),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                          <Tooltip
                            contentStyle={{ background: "#1e2530", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                            formatter={(value: number) => [`£${value.toLocaleString()}`]}
                          />
                          <Bar dataKey="invested" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Invested" />
                          <Bar dataKey="expected" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Expected" />
                          <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} name="Paid" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 justify-center mt-3">
                        {[
                          { color: "#f59e0b", label: "Invested" },
                          { color: "#8b5cf6", label: "Expected" },
                          { color: "#10b981", label: "Paid" },
                        ].map((l) => (
                          <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-white/50">
                            <div className="w-2.5 h-2.5 rounded" style={{ background: l.color }} />
                            {l.label}
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Quick Investment Summary */}
                  <GlassCard className="p-5 lg:p-6" delay={0.3}>
                    <h3 className="font-semibold text-sm mb-4 text-white/70">Recent Investments</h3>
                    {loading ? (
                      <p className="text-white/30 text-center py-8 text-sm">Loading...</p>
                    ) : investments.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-10 h-10 mx-auto text-white/20 mb-2" />
                        <p className="text-xs text-white/30">No investments yet. Contact your administrator.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {investments.slice(0, 3).map((inv) => {
                          const expected = getInvestorReturn(inv);
                          const paid = getTotalPaidForInvestment(inv.id);
                          return (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                              <div>
                                <p className="font-medium text-sm">£{Number(inv.amount).toLocaleString()}</p>
                                <p className="text-[11px] text-white/40">{Number(inv.investor_share_rate || inv.interest_rate)}% rate</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-amber-400">£{expected.toLocaleString()}</p>
                                <p className="text-[11px] text-emerald-400">£{paid.toLocaleString()} paid</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>
                                {inv.status?.toUpperCase()}
                              </span>
                            </div>
                          );
                        })}
                        {investments.length > 3 && (
                          <button
                            onClick={() => setActiveTab("investments")}
                            className="w-full text-center text-xs text-amber-400 hover:text-amber-300 py-2 transition-colors"
                          >
                            View all {investments.length} investments →
                          </button>
                        )}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "investments" && (
                <motion.div key="investments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard className="p-5 lg:p-6" delay={0.1}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-base text-white">My Investments</h3>
                    </div>
                    {investments.length > 0 && (
                      <p className="text-xs text-white/40 mb-4">
                        Total invested: <span className="text-amber-400 font-medium">£{investments.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}</span>
                      </p>
                    )}
                    <div className="h-px bg-white/10 mb-4" />
                    {investments.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-10 h-10 mx-auto text-white/20 mb-2" />
                        <p className="text-xs text-white/30">No investments yet. Contact your administrator.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {investments.map((inv) => {
                          const expected = getInvestorReturn(inv);
                          const paid = getTotalPaidForInvestment(inv.id);
                          const statusColors: Record<string, string> = {
                            active: "bg-emerald-500/20 text-emerald-400",
                            completed: "bg-blue-500/20 text-blue-400",
                            cancelled: "bg-red-500/20 text-red-400",
                          };
                          const sColor = statusColors[inv.status] || "bg-white/10 text-white/60";
                          return (
                            <button
                              key={inv.id}
                              onClick={() => { setSelectedInvestment(inv); setInvestmentDialogOpen(true); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-white truncate">
                                  £{Number(inv.amount).toLocaleString()} at {Number(inv.investor_share_rate || inv.interest_rate)}%
                                </p>
                                <p className="text-xs text-white/40">
                                  {format(new Date(inv.start_date), "MMM do, yyyy")} · Expected: £{expected.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-semibold text-emerald-400">
                                  £{paid.toLocaleString()}
                                </p>
                                <Badge className={`${sColor} border-0 text-[10px] px-1.5 py-0`}>
                                  {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === "payments" && (
                <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard className="p-5 lg:p-6" delay={0.1}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-base text-white">Payment History</h3>
                    </div>
                    {payments.length > 0 && (
                      <p className="text-xs text-white/40 mb-4">
                        Total received: <span className="text-emerald-400 font-medium">£{payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0).toLocaleString()}</span>
                      </p>
                    )}
                    <div className="h-px bg-white/10 mb-4" />
                    {payments.length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="w-10 h-10 mx-auto text-white/20 mb-2" />
                        <p className="text-xs text-white/30">No payments received yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {payments.map((p: any, idx: number) => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedPayment(p); setPaymentDialogOpen(true); }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-white truncate">
                                {p.notes || "Investment Payout"}
                              </p>
                              <p className="text-xs text-white/40">
                                {format(new Date(p.payment_date), "MMM do, HH:mm")}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-semibold text-emerald-400">
                                +£{Number(p.amount_paid).toLocaleString()}
                              </p>
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5 py-0">
                                Received
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Investment Detail Dialog */}
      <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
        <DialogContent className="bg-[#161B22] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <TrendingUp className="w-5 h-5" />
              Investment Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvestment && (() => {
            const inv = selectedInvestment;
            const expected = getInvestorReturn(inv);
            const paid = getTotalPaidForInvestment(inv.id);
            const balance = expected - paid;
            const invPayments = payments.filter((p) => p.investment_id === inv.id);
            return (
              <div className="space-y-5">
                <div className="bg-amber-500/10 rounded-xl p-4 text-center border border-amber-500/20">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Principal Amount</p>
                  <p className="text-3xl font-bold text-amber-400">£{Number(inv.amount).toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Reference", value: inv.id.slice(0, 8).toUpperCase() },
                    { label: "Interest Rate", value: `${Number(inv.investor_share_rate || inv.interest_rate)}%` },
                    { label: "Duration", value: `${inv.duration_months} months` },
                    { label: "Start Date", value: format(new Date(inv.start_date), "dd MMM yyyy") },
                    { label: "End Date", value: inv.end_date ? format(new Date(inv.end_date), "dd MMM yyyy") : "Ongoing" },
                    { label: "Expected Return", value: `£${expected.toLocaleString()}` },
                    { label: "Total Paid", value: `£${paid.toLocaleString()}` },
                    { label: "Balance Due", value: `£${balance.toLocaleString()}` },
                    { label: "Status", value: inv.status?.toUpperCase() },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/40">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>

                {invPayments.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Payment History</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {invPayments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                          <span className="text-emerald-400 font-medium">£{Number(p.amount_paid).toLocaleString()}</span>
                          <span className="text-white/40">{format(new Date(p.payment_date), "dd MMM yyyy")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2 border-t border-white/5">
                  <p className="text-[10px] text-white/30">AMANA MARKET • Investor Portal</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-[#161B22] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Receipt className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (() => {
            const p = selectedPayment;
            const relatedInv = investments.find((inv) => inv.id === p.investment_id);
            return (
              <div className="space-y-5">
                <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Amount Received</p>
                  <p className="text-3xl font-bold text-emerald-400">£{Number(p.amount_paid).toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Reference", value: p.id.slice(0, 8).toUpperCase() },
                    { label: "Payment Date", value: format(new Date(p.payment_date), "dd MMM yyyy") },
                    { label: "Recipient", value: profile?.full_name || "Investor" },
                    ...(relatedInv ? [
                      { label: "Investment Principal", value: `£${Number(relatedInv.amount).toLocaleString()}` },
                      { label: "Investment Rate", value: `${Number(relatedInv.investor_share_rate || relatedInv.interest_rate)}%` },
                    ] : []),
                    { label: "Notes", value: p.notes || "—" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/40">{row.label}</span>
                      <span className="text-sm font-semibold text-right max-w-[60%]">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-2 bg-white/[0.03] rounded-lg px-3 border border-white/5">
                  <span className="text-xs text-white/40">Status</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    COMPLETED
                  </span>
                </div>

                <div className="text-center pt-2 border-t border-white/5">
                  <p className="text-[10px] text-white/30">AMANA MARKET • Investor Portal</p>
                  <p className="text-[10px] text-white/20 mt-0.5">Generated on {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default InvestorDashboard;
