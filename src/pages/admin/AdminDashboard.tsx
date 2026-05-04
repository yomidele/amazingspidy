import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Plane,
  LayoutDashboard,
  Wallet,
  CreditCard,
  FileCheck,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Star,
  Receipt,
  HelpCircle,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext";
import AdminTooltip, { tooltipContent } from "@/components/admin/AdminTooltip";
import { useExitConfirm } from "@/hooks/useExitConfirm";
import { useLogoutConfirm } from "@/components/shared/LogoutConfirmProvider";
import ContributionSetupPage from "@/components/admin/ContributionSetupPage";
import MemberManagementPage from "@/components/admin/MemberManagementPage";
import LoanManagementPage from "@/components/admin/LoanManagementPage";
import PaymentRecordingPage from "@/components/admin/PaymentRecordingPage";
import ContributionDashboardContent from "@/components/admin/ContributionDashboardContent";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import LiveReviews from "@/components/travel/LiveReviews";
import AdminTutorial from "@/components/admin/AdminTutorial";
import TravelClientManagement from "@/components/admin/travel/TravelClientManagement";
import TravelCaseManagement from "@/components/admin/travel/TravelCaseManagement";
import TravelConsultationManagement from "@/components/admin/travel/TravelConsultationManagement";
import TravelDashboardContent from "@/components/admin/travel/TravelDashboardContent";
import UserActivityPage from "@/components/admin/UserActivityPage";
import InvestorManagementPage from "@/components/admin/InvestorManagementPage";
import LoanRequestReview from "@/components/admin/LoanRequestReview";
import InvestorRequestsPage from "@/components/admin/InvestorRequestsPage";
import InvestorModuleLockedScreen from "@/components/admin/InvestorModuleLockedScreen";
import { useInvestorModuleStatus } from "@/hooks/useInvestorModuleStatus";
import NotificationBell from "@/components/shared/NotificationBell";
import AmanaAIAssistant from "@/components/admin/AmanaAIAssistant";
import AccountManagementPage from "@/components/admin/AccountManagementPage";
import RotationAndSplitsPanel from "@/components/admin/RotationAndSplitsPanel";

const AdminDashboardContent = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<"contribution" | "travel" | "investor">("contribution");
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLoanRequestId, setSelectedLoanRequestId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [triggerAddInvestor, setTriggerAddInvestor] = useState(false);
  const { status: investorModuleStatus, loading: investorModuleLoading } = useInvestorModuleStatus();

  const { tutorialEnabled, showTutorialOnFirstLoad, hasSeenTutorial } = useTutorial();
  const location = useLocation();

  // sync state with path for user detail
  useEffect(() => {
    const userMatch = location.pathname.match(/^\/admin\/users\/([^\/]+)/);
    const loanMatch = location.pathname.match(/^\/admin\/loan-requests\/([^\/]+)/);
    if (userMatch) {
      setActiveModule("contribution");
      setActivePage("user-detail");
      setSelectedUserId(userMatch[1]);
    } else if (loanMatch) {
      setActiveModule("contribution");
      setActivePage("loan-requests");
      setSelectedLoanRequestId(loanMatch[1]);
    } else if (location.pathname === "/admin/contributions") {
      setActiveModule("contribution");
      setActivePage("contributions");
    } else if (location.pathname === "/admin/members") {
      setActiveModule("contribution");
      setActivePage("members");
    } else if (activePage === "user-detail") {
      setActivePage("members");
      setSelectedUserId(null);
    }
  }, [location.pathname]);

  // Periodically check for missing beneficiaries (admins only)
  useEffect(() => {
    if (!isAdmin) return;
    const run = () => supabase.rpc("check_missing_beneficiaries" as any).then(() => {});
    run();
    const id = window.setInterval(run, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [isAdmin]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/admin");
        return;
      }
      setUser(session.user);

      // Verify admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        navigate("/login/admin");
        return;
      }
      setIsAdmin(true);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login/admin");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadAlerts(count || 0);
    };
    fetchAlerts();
  }, [user]);

  // Auto-show tutorial for new admins
  useEffect(() => {
    if (tutorialEnabled && showTutorialOnFirstLoad && !hasSeenTutorial && user) {
      const timer = setTimeout(() => {
        setTutorialOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tutorialEnabled, showTutorialOnFirstLoad, hasSeenTutorial, user]);

  const { confirmLogout } = useLogoutConfirm();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/admin");
  };
  const requestLogout = () => confirmLogout(handleLogout);

  // Intercept browser back so admins aren't accidentally logged out.
  useExitConfirm(handleLogout, { message: "Do you want to logout?", enabled: !!isAdmin });

  // Show loading while checking admin role
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  const contributionNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "dashboard", tooltip: tooltipContent.dashboardHome },
    { icon: Users, label: "Members", page: "members", tooltip: tooltipContent.addContributor },
    { icon: Shield, label: "Accounts", page: "accounts", tooltip: "Approve, lock, and manage user accounts" },
    { icon: Wallet, label: "Contributions", page: "contributions", tooltip: tooltipContent.newMonth },
    { icon: RefreshCw, label: "Rotation & Splits", page: "rotation", tooltip: "Manage month progression and split contributions" },
    { icon: Receipt, label: "Payments", page: "payments", tooltip: tooltipContent.recordPayment },
    { icon: CreditCard, label: "Loans", page: "loans", tooltip: tooltipContent.issueLoan },
    { icon: FileCheck, label: "Loan Requests", page: "loan-requests", tooltip: "Review and approve loan requests from contributors" },
    { icon: Bell, label: "Notifications", page: "notifications", tooltip: tooltipContent.notifications },
    { icon: Settings, label: "Settings", page: "settings", tooltip: tooltipContent.settings },
  ];

  const travelNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "travel-dashboard", tooltip: tooltipContent.dashboardHome },
    { icon: Users, label: "Clients", page: "travel-clients", tooltip: "Manage travel consultation clients" },
    { icon: FileCheck, label: "Cases", page: "travel-cases", tooltip: "Track visa and travel cases" },
    { icon: Calendar, label: "Consultations", page: "travel-consultations", tooltip: "Manage consultation appointments" },
    { icon: Star, label: "Reviews", page: "travel-reviews", tooltip: "View and moderate client reviews" },
    { icon: Bell, label: "Notifications", page: "travel-notifications", tooltip: tooltipContent.notifications },
    { icon: Settings, label: "Settings", page: "travel-settings", tooltip: tooltipContent.settings },
  ];

  const investorNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "investor-dashboard", tooltip: "Investor management overview" },
    { icon: TrendingUp, label: "Investors", page: "investor-management", tooltip: "Manage investors and investments" },
    { icon: Receipt, label: "Payments", page: "investor-payments", tooltip: "Record payments to investors" },
    { icon: Users, label: "Applications", page: "investor-requests", tooltip: "Review investor applications" },
    { icon: Settings, label: "Settings", page: "investor-settings", tooltip: tooltipContent.settings },
  ];

  const navItems = activeModule === "contribution" ? contributionNavItems : activeModule === "travel" ? travelNavItems : investorNavItems;

  const renderContent = () => {
    if (activeModule === "contribution") {
      switch (activePage) {
        case "members":
          return <MemberManagementPage />;
        case "accounts":
          return <AccountManagementPage />;
        case "user-detail":
          return <UserActivityPage userId={selectedUserId} />;
        case "contributions":
          return <ContributionSetupPage />;
        case "rotation":
          return <RotationAndSplitsPanel />;
        case "payments":
          return <PaymentRecordingPage />;
        case "loans":
          return <LoanManagementPage />;
        case "loan-requests":
          return (
            <LoanRequestReview
              initialRequestId={selectedLoanRequestId}
              onClearInitial={() => setSelectedLoanRequestId(null)}
            />
          );
        case "settings":
          return (
            <AdminSettingsPage
              onOpenTutorial={() => setTutorialOpen(true)}
              onOpenManual={() => navigate("/admin/manual")}
            />
          );
        case "dashboard":
        default:
          return <ContributionDashboardContent onNavigate={(page) => {
            if (page.startsWith("investor")) {
              setActiveModule("investor");
            }
            setActivePage(page);
          }} />;
      }
    } else if (activeModule === "travel") {
      switch (activePage) {
        case "travel-clients":
          return <TravelClientManagement />;
        case "travel-cases":
          return <TravelCaseManagement />;
        case "travel-consultations":
          return <TravelConsultationManagement />;
        case "travel-reviews":
          return <LiveReviews />;
        case "travel-settings":
          return (
            <AdminSettingsPage
              onOpenTutorial={() => setTutorialOpen(true)}
              onOpenManual={() => navigate("/admin/manual")}
            />
          );
        case "travel-dashboard":
        default:
          return <TravelDashboardContent />;
      }
    } else {
      // Gate investor module — only settings is accessible when inactive
      if (investorModuleStatus !== "active" && activePage !== "investor-settings") {
        return <InvestorModuleLockedScreen variant="admin" />;
      }
      switch (activePage) {
        case "investor-management":
          return <InvestorManagementPage triggerAddInvestor={triggerAddInvestor} onAddInvestorHandled={() => setTriggerAddInvestor(false)} />;
        case "investor-payments":
          return <InvestorManagementPage initialTab="payments" />;
        case "investor-requests":
          return <InvestorRequestsPage />;
        case "investor-settings":
          return (
            <AdminSettingsPage
              onOpenTutorial={() => setTutorialOpen(true)}
              onOpenManual={() => navigate("/admin/manual")}
            />
          );
        case "investor-dashboard":
        default:
          return <InvestorManagementPage initialTab="overview" triggerAddInvestor={triggerAddInvestor} onAddInvestorHandled={() => setTriggerAddInvestor(false)} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-accent rounded-lg">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <NotificationBell userId={user.id} variant="light" />}
          <AdminTooltip content={tooltipContent.logout}>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </AdminTooltip>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header (fixed) */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sidebar-primary truncate">AMANA MARKET</h2>
                <p className="text-xs text-sidebar-foreground/60 truncate">Admin Portal</p>
              </div>
            </div>
          </div>

          {/* Scrollable middle: module switcher + nav */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            {/* Module Switcher */}
            <div className="mb-6 p-1 rounded-xl bg-sidebar-accent/50">
              <div className="grid grid-cols-3 gap-1">
                <AdminTooltip content={tooltipContent.switchToAmana}>
                  <button
                    onClick={() => { setActiveModule("contribution"); setActivePage("dashboard"); }}
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${
                      activeModule === "contribution"
                        ? "bg-contribution text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Amana</span>
                  </button>
                </AdminTooltip>
                <AdminTooltip content={tooltipContent.switchToTeemah}>
                  <button
                    onClick={() => { setActiveModule("travel"); setActivePage("travel-dashboard"); }}
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${
                      activeModule === "travel"
                        ? "bg-travel text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5" />
                    <span>Teemah</span>
                  </button>
                </AdminTooltip>
                <AdminTooltip content="Manage investor accounts and investments">
                  <button
                    onClick={() => { setActiveModule("investor"); setActivePage("investor-dashboard"); }}
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${
                      activeModule === "investor"
                        ? "bg-investor text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Invest</span>
                  </button>
                </AdminTooltip>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <AdminTooltip key={item.label} content={item.tooltip} side="right">
                  <Button
                    variant="ghost"
                    onClick={() => setActivePage(item.page)}
                    className={`w-full justify-start ${
                      activePage === item.page
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                </AdminTooltip>
              ))}
            </nav>
          </div>

          {/* Footer (fixed at bottom, no overlap) */}
          <div className="shrink-0 p-4 border-t border-sidebar-border bg-sidebar">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                <span className="font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Administrator</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            </div>
            <AdminTooltip content={tooltipContent.logout}>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-3 shrink-0" />
                Sign Out
              </Button>
            </AdminTooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-3 py-4 sm:p-4 lg:p-8 pt-20 lg:pt-8 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`${activeModule}-${activePage}`}
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col gap-3 mb-4 lg:mb-8">
              <div className="min-w-0">
                <h1 className="font-heading text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-0.5 truncate">
                  {activePage === "dashboard" ? "Admin Dashboard" : 
                   activePage === "contributions" ? "Monthly Contributions" :
                   activePage === "reviews" ? "Client Reviews" :
                   activePage === "settings" ? "Settings" :
                   activePage === "user-detail" ? "User Activity" :
                   activePage.charAt(0).toUpperCase() + activePage.slice(1)}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Manage your {activeModule === "contribution" ? "Amana Market Contribution" : activeModule === "investor" ? "investor accounts and investments" : "Teemah Travels services"}
                </p>
              </div>
              
              {/* Action buttons - wrapping on mobile */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {activeModule === "contribution" && (
                  <>
                    <AdminTooltip content={tooltipContent.restartTutorial}>
                      <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-2.5 sm:px-3" onClick={() => setTutorialOpen(true)}>
                        <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                        Tutorial
                      </Button>
                    </AdminTooltip>
                    <AdminTooltip content={tooltipContent.openAdminManual}>
                      <Button variant="outline" size="sm" onClick={() => navigate("/admin/manual")} className="h-8 text-xs sm:text-sm px-2.5 sm:px-3">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        Manual
                      </Button>
                    </AdminTooltip>
                  </>
                )}
                <AdminTooltip content={tooltipContent.notifications}>
                  <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm px-2.5 sm:px-3">
                    <Bell className="w-3.5 h-3.5 mr-1.5" />
                    Alerts{unreadAlerts > 0 ? ` (${unreadAlerts})` : ""}
                  </Button>
                </AdminTooltip>
                <AdminTooltip content={activeModule === "contribution" ? tooltipContent.addContributor : activeModule === "investor" ? "Add a new investor" : "Add a new travel client"}>
                  <Button
                    variant={activeModule === "contribution" ? "contribution" : activeModule === "investor" ? "investor" : "travel"}
                    size="sm"
                    className="h-8 text-xs sm:text-sm px-2.5 sm:px-3"
                    onClick={() => {
                      if (activeModule === "investor") {
                        setActivePage("investor-dashboard");
                        setTriggerAddInvestor(true);
                      } else if (activeModule === "contribution") {
                        setActivePage("members");
                      } else {
                        setActivePage("travel-clients");
                      }
                    }}
                  >
                    + Add {activeModule === "contribution" ? "Member" : activeModule === "investor" ? "Investor" : "Client"}
                  </Button>
                </AdminTooltip>
              </div>
            </div>

            {/* Render active page content */}
            {renderContent()}
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

      {/* Tutorial Dialog */}
      <AdminTutorial open={tutorialOpen} onOpenChange={setTutorialOpen} />

      {/* AI Assistant */}
      <AmanaAIAssistant />
    </div>
  );
};

// Wrap with TutorialProvider
const AdminDashboard = () => {
  return (
    <TutorialProvider>
      <AdminDashboardContent />
    </TutorialProvider>
  );
};

export default AdminDashboard;
