import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext";
import AdminTooltip, { tooltipContent } from "@/components/admin/AdminTooltip";
import ContributionSetupPage from "@/components/admin/ContributionSetupPage";
import MemberManagementPage from "@/components/admin/MemberManagementPage";
import LoanManagementPage from "@/components/admin/LoanManagementPage";
import PaymentRecordingPage from "@/components/admin/PaymentRecordingPage";
import ContributionDashboardContent from "@/components/admin/ContributionDashboardContent";
import AdminSettingsPage from "@/components/admin/AdminSettingsPage";
import LiveReviews from "@/components/travel/LiveReviews";
import AdminTutorial from "@/components/admin/AdminTutorial";
import AdminUserManual from "@/components/admin/AdminUserManual";

const AdminDashboardContent = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<"contribution" | "travel">("contribution");
  const [activePage, setActivePage] = useState("dashboard");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const { tutorialEnabled, showTutorialOnFirstLoad, hasSeenTutorial } = useTutorial();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/admin");
        return;
      }
      setUser(session.user);
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

  // Auto-show tutorial for new admins
  useEffect(() => {
    if (tutorialEnabled && showTutorialOnFirstLoad && !hasSeenTutorial && user) {
      const timer = setTimeout(() => {
        setTutorialOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tutorialEnabled, showTutorialOnFirstLoad, hasSeenTutorial, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/admin");
  };

  const travelStats = [
    { title: "Active Clients", value: "32", icon: Users, change: "+5", positive: true },
    { title: "Open Cases", value: "18", icon: FileCheck, change: "+2", positive: true },
    { title: "Consultations Today", value: "4", icon: Calendar, change: "2 pending", positive: true },
    { title: "Visa Approvals", value: "89%", icon: TrendingUp, change: "+4%", positive: true },
  ];

  const contributionNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "dashboard", tooltip: tooltipContent.dashboardHome },
    { icon: Users, label: "Members", page: "members", tooltip: tooltipContent.addContributor },
    { icon: Wallet, label: "Contributions", page: "contributions", tooltip: tooltipContent.newMonth },
    { icon: Receipt, label: "Payments", page: "payments", tooltip: tooltipContent.recordPayment },
    { icon: CreditCard, label: "Loans", page: "loans", tooltip: tooltipContent.issueLoan },
    { icon: Bell, label: "Notifications", page: "notifications", tooltip: tooltipContent.notifications },
    { icon: Settings, label: "Settings", page: "settings", tooltip: tooltipContent.settings },
  ];

  const travelNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "dashboard", tooltip: tooltipContent.dashboardHome },
    { icon: Users, label: "Clients", page: "clients", tooltip: "Manage travel consultation clients" },
    { icon: FileCheck, label: "Cases", page: "cases", tooltip: "Track visa and travel cases" },
    { icon: Calendar, label: "Consultations", page: "consultations", tooltip: "Manage consultation appointments" },
    { icon: Star, label: "Reviews", page: "reviews", tooltip: "View and moderate client reviews" },
    { icon: Bell, label: "Notifications", page: "notifications", tooltip: tooltipContent.notifications },
    { icon: Settings, label: "Settings", page: "settings", tooltip: tooltipContent.settings },
  ];

  const navItems = activeModule === "contribution" ? contributionNavItems : travelNavItems;

  const renderContent = () => {
    if (activeModule === "contribution") {
      switch (activePage) {
        case "members":
          return <MemberManagementPage />;
        case "contributions":
          return <ContributionSetupPage />;
        case "payments":
          return <PaymentRecordingPage />;
        case "loans":
          return <LoanManagementPage />;
        case "settings":
          return (
            <AdminSettingsPage
              onOpenTutorial={() => setTutorialOpen(true)}
              onOpenManual={() => setManualOpen(true)}
            />
          );
        case "dashboard":
        default:
          return <ContributionDashboardContent />;
      }
    } else {
      switch (activePage) {
        case "reviews":
          return <LiveReviews />;
        case "settings":
          return (
            <AdminSettingsPage
              onOpenTutorial={() => setTutorialOpen(true)}
              onOpenManual={() => setManualOpen(true)}
            />
          );
        case "dashboard":
        default:
          return renderTravelDashboard();
      }
    }
  };

  const renderTravelDashboard = () => (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Active Visa Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Active Visa Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Chen Wei", type: "UK Student Visa", progress: 75, status: "In Progress" },
              { name: "Maria Garcia", type: "Canada PR", progress: 45, status: "Documents Pending" },
              { name: "Ahmed Hassan", type: "US B1/B2", progress: 90, status: "Interview Scheduled" },
              { name: "Sophie Martin", type: "Schengen Visa", progress: 30, status: "Under Review" },
            ].map((item, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  <span className="text-xs text-travel font-medium">{item.status}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-travel to-teal-400 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Consultations */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Consultations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Jennifer Adams", time: "10:00 AM", type: "Visa Strategy", status: "Completed" },
              { name: "Kevin Park", time: "11:30 AM", type: "Document Review", status: "In Progress" },
              { name: "Rachel Green", time: "2:00 PM", type: "Academic Guidance", status: "Upcoming" },
              { name: "Tom Wilson", time: "4:00 PM", type: "Refusal Analysis", status: "Upcoming" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-travel-light flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-travel" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{item.time}</p>
                  <span className={`text-xs ${
                    item.status === "Completed" ? "text-success" :
                    item.status === "In Progress" ? "text-travel" : "text-muted-foreground"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
        <AdminTooltip content={tooltipContent.logout}>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </AdminTooltip>
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
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sidebar-primary">AMANA MARKET</h2>
                <p className="text-xs text-sidebar-foreground/60">Admin Portal</p>
              </div>
            </div>

            {/* Module Switcher */}
            <div className="mb-6 p-1 rounded-xl bg-sidebar-accent/50">
              <div className="grid grid-cols-2 gap-1">
                <AdminTooltip content={tooltipContent.switchToAmana}>
                  <button
                    onClick={() => { setActiveModule("contribution"); setActivePage("dashboard"); }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors ${
                      activeModule === "contribution"
                        ? "bg-contribution text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Amana</span>
                  </button>
                </AdminTooltip>
                <AdminTooltip content={tooltipContent.switchToTeemah}>
                  <button
                    onClick={() => { setActiveModule("travel"); setActivePage("dashboard"); }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors ${
                      activeModule === "travel"
                        ? "bg-travel text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    <span>Teemah</span>
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
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Button>
                </AdminTooltip>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
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
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </AdminTooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`${activeModule}-${activePage}`}
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-1">
                  {activePage === "dashboard" ? "Admin Dashboard" : 
                   activePage === "contributions" ? "Monthly Contributions" :
                   activePage === "reviews" ? "Client Reviews" :
                   activePage === "settings" ? "Settings" :
                   activePage.charAt(0).toUpperCase() + activePage.slice(1)}
                </h1>
                <p className="text-muted-foreground">
                  Manage your {activeModule === "contribution" ? "Amana Market Contribution" : "Teemah Travels services"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AdminTooltip content={tooltipContent.restartTutorial}>
                  <Button variant="outline" size="sm" onClick={() => setTutorialOpen(true)}>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Tutorial
                  </Button>
                </AdminTooltip>
                <AdminTooltip content={tooltipContent.openAdminManual}>
                  <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manual
                  </Button>
                </AdminTooltip>
                <AdminTooltip content={tooltipContent.notifications}>
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Alerts (3)
                  </Button>
                </AdminTooltip>
                <AdminTooltip content={activeModule === "contribution" ? tooltipContent.addContributor : "Add a new travel client"}>
                  <Button
                    variant={activeModule === "contribution" ? "contribution" : "travel"}
                    size="sm"
                  >
                    + Add {activeModule === "contribution" ? "Member" : "Client"}
                  </Button>
                </AdminTooltip>
              </div>
            </div>

            {/* Stats Grid - Only show on travel dashboard */}
            {activePage === "dashboard" && activeModule === "travel" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {travelStats.map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-travel-light">
                            <stat.icon className="w-6 h-6 text-travel" />
                          </div>
                          <div className={`flex items-center gap-1 text-sm ${
                            stat.positive ? "text-success" : "text-destructive"
                          }`}>
                            <TrendingUp className="w-4 h-4" />
                            <span>{stat.change}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

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

      {/* User Manual Dialog */}
      <AdminUserManual open={manualOpen} onOpenChange={setManualOpen} />
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
