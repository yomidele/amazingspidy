import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane,
  FileCheck,
  GraduationCap,
  Calendar,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Star,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveReviews from "@/components/travel/LiveReviews";
import { format } from "date-fns";

interface UserCase {
  id: string;
  title: string;
  case_type: string;
  status: string | null;
  progress: number | null;
  updated_at: string;
}

interface UserConsultation {
  id: string;
  title: string;
  scheduled_date: string;
  consultation_type: string | null;
  status: string | null;
}

interface UserStats {
  activeCases: number;
  consultations: number;
  documents: number;
  reviews: number;
}

const TravelDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<UserCase[]>([]);
  const [consultations, setConsultations] = useState<UserConsultation[]>([]);
  const [stats, setStats] = useState<UserStats>({
    activeCases: 0,
    consultations: 0,
    documents: 0,
    reviews: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/travel");
        return;
      }
      setUser(session.user);
      fetchUserData(session.user.id);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login/travel");
      } else {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch user's cases
      const { data: casesData, error: casesError } = await supabase
        .from("consultation_cases")
        .select("id, title, case_type, status, progress, updated_at")
        .eq("user_id", userId)
        .not("status", "eq", "closed")
        .order("updated_at", { ascending: false });

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch upcoming consultations
      const { data: consultationsData, error: consultationsError } = await supabase
        .from("consultations")
        .select("id, title, scheduled_date, consultation_type, status")
        .eq("user_id", userId)
        .gte("scheduled_date", new Date().toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (consultationsError) throw consultationsError;
      setConsultations(consultationsData || []);

      // Fetch stats
      const { count: totalCases } = await supabase
        .from("consultation_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("status", "eq", "closed");

      const { count: totalConsultations } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: totalDocuments } = await supabase
        .from("case_documents")
        .select("*, consultation_cases!inner(user_id)", { count: "exact", head: true })
        .eq("consultation_cases.user_id", userId);

      const { count: totalReviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setStats({
        activeCases: totalCases || 0,
        consultations: totalConsultations || 0,
        documents: totalDocuments || 0,
        reviews: totalReviews || 0,
      });

    } catch (error: any) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/travel");
  };

  const getStatusLabel = (status: string | null) => {
    const statusMap: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      documents_pending: "Documents Pending",
      under_review: "Under Review",
      interview_scheduled: "Interview Scheduled",
      approved: "Approved",
      rejected: "Rejected",
      closed: "Closed",
    };
    return statusMap[status || ""] || status || "Unknown";
  };

  const statsDisplay = [
    {
      title: "Active Cases",
      value: stats.activeCases.toString(),
      icon: FileCheck,
      color: "text-travel",
      bgColor: "bg-travel-light",
    },
    {
      title: "Consultations",
      value: stats.consultations.toString(),
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Documents",
      value: stats.documents.toString(),
      icon: GraduationCap,
      color: "text-contribution",
      bgColor: "bg-contribution-light",
    },
    {
      title: "Reviews Posted",
      value: stats.reviews.toString(),
      icon: Star,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const navItems = [
    { icon: Plane, label: "Dashboard", page: "dashboard" },
    { icon: FileCheck, label: "My Cases", page: "cases" },
    { icon: Calendar, label: "Consultations", page: "consultations" },
    { icon: GraduationCap, label: "Academic", page: "academic" },
    { icon: MessageSquare, label: "Reviews", page: "reviews" },
    { icon: Bell, label: "Notifications", page: "notifications" },
  ];

  const renderDashboard = () => loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-travel" />
    </div>
  ) : (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsDisplay.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Cases & Consultations */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Cases</span>
              <Button variant="ghost" size="sm" onClick={() => setActivePage("cases")}>
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active cases</p>
                <p className="text-sm text-muted-foreground">Your cases will appear here when created</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.slice(0, 3).map((caseItem) => (
                  <div key={caseItem.id} className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{caseItem.title}</h4>
                        <p className="text-sm text-muted-foreground">{caseItem.case_type}</p>
                      </div>
                      <Badge variant="secondary" className="bg-travel-light text-travel border-0">
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{caseItem.progress || 0}%</span>
                      </div>
                      <Progress value={caseItem.progress || 0} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Last updated: {format(new Date(caseItem.updated_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Consultations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Consultations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consultations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming consultations</p>
                <p className="text-sm text-muted-foreground">Your scheduled consultations will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="p-4 rounded-xl bg-travel-light border border-travel/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-travel flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{consultation.title}</h4>
                        <p className="text-sm text-muted-foreground">{consultation.consultation_type || "Consultation"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-travel">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(consultation.scheduled_date), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(new Date(consultation.scheduled_date), "h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Write Review CTA */}
      <Card className="mt-6 bg-gradient-to-r from-travel/10 to-travel/5 border-travel/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-travel flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Share Your Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Help others by writing a review about our services
                </p>
              </div>
            </div>
            <Button variant="travel" onClick={() => setActivePage("reviews")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderCases = () => loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-travel" />
    </div>
  ) : (
    <div className="space-y-4">
      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No cases found</p>
            <p className="text-sm text-muted-foreground">Your visa and consultation cases will appear here</p>
          </CardContent>
        </Card>
      ) : (
        cases.map((caseItem) => (
          <Card key={caseItem.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                  <p className="text-muted-foreground">{caseItem.case_type}</p>
                </div>
                <Badge variant="secondary" className="bg-travel-light text-travel border-0">
                  {getStatusLabel(caseItem.status)}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{caseItem.progress || 0}%</span>
                </div>
                <Progress value={caseItem.progress || 0} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  Last updated: {format(new Date(caseItem.updated_at), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderConsultations = () => loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-travel" />
    </div>
  ) : (
    <div className="space-y-4">
      {consultations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No upcoming consultations</p>
            <p className="text-sm text-muted-foreground">Your scheduled consultations will appear here</p>
          </CardContent>
        </Card>
      ) : (
        consultations.map((consultation) => (
          <Card key={consultation.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-travel flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{consultation.title}</h3>
                    <p className="text-muted-foreground">{consultation.consultation_type || "Consultation"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-travel">
                    {format(new Date(consultation.scheduled_date), "MMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground">
                    {format(new Date(consultation.scheduled_date), "h:mm a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return renderDashboard();
      case "cases":
        return renderCases();
      case "consultations":
        return renderConsultations();
      case "reviews":
        return <LiveReviews />;
      default:
        return (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">This section is coming soon...</p>
            </CardContent>
          </Card>
        );
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
            <div className="w-8 h-8 rounded-lg bg-travel flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Travel Client</span>
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
              <div className="w-10 h-10 rounded-xl bg-travel flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sidebar-primary">Teemah Travels</h2>
                <p className="text-xs text-sidebar-foreground/60">by AMANA MARKET</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.label}
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
              ))}
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
            key={activePage}
            className="max-w-6xl mx-auto"
          >
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-2">
                {activePage === "dashboard" 
                  ? `Welcome back, ${user?.user_metadata?.full_name?.split(" ")[0] || "Traveler"}!`
                  : activePage === "reviews" 
                  ? "Client Reviews"
                  : activePage === "cases"
                  ? "My Cases"
                  : activePage === "consultations"
                  ? "My Consultations"
                  : activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </h1>
              <p className="text-muted-foreground">
                {activePage === "dashboard" 
                  ? "Track your visa applications and academic consultations."
                  : activePage === "reviews"
                  ? "Read and write reviews about our services"
                  : activePage === "cases"
                  ? "Track all your visa and consultation cases"
                  : activePage === "consultations"
                  ? "View your scheduled consultations"
                  : `Manage your ${activePage}`}
              </p>
            </div>

            {/* Render active page */}
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
    </div>
  );
};

export default TravelDashboard;
