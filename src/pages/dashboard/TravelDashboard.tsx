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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TravelDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/travel");
        return;
      }
      setUser(session.user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login/travel");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login/travel");
  };

  const stats = [
    {
      title: "Active Cases",
      value: "2",
      icon: FileCheck,
      color: "text-travel",
      bgColor: "bg-travel-light",
    },
    {
      title: "Consultations",
      value: "5",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Documents",
      value: "8",
      icon: GraduationCap,
      color: "text-contribution",
      bgColor: "bg-contribution-light",
    },
    {
      title: "Reviews Posted",
      value: "1",
      icon: Star,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const activeCases = [
    {
      id: 1,
      title: "UK Student Visa",
      type: "Visa Application",
      status: "In Progress",
      progress: 65,
      lastUpdate: "Jan 20, 2025",
    },
    {
      id: 2,
      title: "Dissertation Review",
      type: "Academic Support",
      status: "Under Review",
      progress: 40,
      lastUpdate: "Jan 18, 2025",
    },
  ];

  const upcomingConsultations = [
    {
      id: 1,
      title: "Visa Strategy Session",
      date: "Feb 5, 2025",
      time: "10:00 AM",
      type: "Video Call",
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
                <h2 className="font-semibold text-sidebar-primary">ServiPro</h2>
                <p className="text-xs text-sidebar-foreground/60">Travel & Academic</p>
              </div>
            </div>

            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground">
                <Plane className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <FileCheck className="w-5 h-5 mr-3" />
                My Cases
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Calendar className="w-5 h-5 mr-3" />
                Consultations
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <GraduationCap className="w-5 h-5 mr-3" />
                Academic
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <MessageSquare className="w-5 h-5 mr-3" />
                Reviews
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
                Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "Traveler"}!
              </h1>
              <p className="text-muted-foreground">
                Track your visa applications and academic consultations.
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
                    <Button variant="ghost" size="sm">
                      View all <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeCases.map((caseItem) => (
                      <div key={caseItem.id} className="p-4 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{caseItem.title}</h4>
                            <p className="text-sm text-muted-foreground">{caseItem.type}</p>
                          </div>
                          <Badge variant="secondary" className="bg-travel-light text-travel border-0">
                            {caseItem.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{caseItem.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-travel to-teal-400 rounded-full transition-all"
                              style={{ width: `${caseItem.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last updated: {caseItem.lastUpdate}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Consultations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Upcoming Consultations</span>
                    <Button variant="travel" size="sm">
                      Book New
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingConsultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 rounded-xl bg-travel-light border border-travel/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-travel flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{consultation.title}</h4>
                            <p className="text-sm text-muted-foreground">{consultation.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-travel">
                            <Calendar className="w-4 h-4" />
                            {consultation.date}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {consultation.time}
                          </span>
                        </div>
                      </div>
                    ))}

                    {upcomingConsultations.length === 0 && (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No upcoming consultations</p>
                        <Button variant="travel" size="sm" className="mt-4">
                          Book a Consultation
                        </Button>
                      </div>
                    )}
                  </div>
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
                  <Button variant="travel">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Write a Review
                  </Button>
                </div>
              </CardContent>
            </Card>
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
