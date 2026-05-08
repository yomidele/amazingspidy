import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Users, Wallet, Receipt, FileCheck, RefreshCw, LayoutDashboard, Search, Plus, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogoutConfirm } from "@/components/shared/LogoutConfirmProvider";
import MemberManagementPage from "@/components/admin/MemberManagementPage";
import PaymentRecordingPage from "@/components/admin/PaymentRecordingPage";
import ContributionSetupPage from "@/components/admin/ContributionSetupPage";
import RotationAndSplitsPanel from "@/components/admin/RotationAndSplitsPanel";
import NotificationBell from "@/components/shared/NotificationBell";
import GroupAdminMembershipRequests from "@/components/group-admin/GroupAdminMembershipRequests";
import GroupAdminOverview from "@/components/group-admin/GroupAdminOverview";

type Page = "overview" | "members" | "contributions" | "rotation" | "payments" | "requests";

const GroupAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [active, setActive] = useState<Page>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { confirmLogout } = useLogoutConfirm();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/admin"); return; }
      setUser(session.user);

      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const set = new Set((roles || []).map((r: any) => r.role));
      if (set.has("admin")) { navigate("/admin"); return; }
      if (!set.has("group_admin")) {
        toast.error("Access denied. Group admin role required.");
        await supabase.auth.signOut();
        navigate("/login/admin");
        return;
      }

      const { data: assn } = await supabase
        .from("group_admin_assignments")
        .select("group_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!assn?.group_id) {
        toast.error("No group assigned. Please contact a super admin.");
        setAuthorized(false);
        return;
      }
      setGroupId(assn.group_id);
      const { data: g } = await supabase
        .from("contribution_groups").select("name").eq("id", assn.group_id).maybeSingle();
      setGroupName(g?.name || "Your Group");
      setAuthorized(true);
    })();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/login/admin");
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }
  if (!authorized || !groupId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <Shield className="w-10 h-10 text-muted-foreground" />
        <p className="text-foreground font-medium">No group has been assigned to your account yet.</p>
        <p className="text-sm text-muted-foreground">Please contact a super admin to assign you to a group.</p>
        <Button variant="outline" onClick={() => confirmLogout(handleLogout)}>Sign out</Button>
      </div>
    );
  }

  const nav = [
    { key: "overview", label: "Dashboard", icon: LayoutDashboard },
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Payments", icon: Receipt },
    { key: "requests", label: "Requests", icon: FileCheck },
    { key: "contributions", label: "Contributions", icon: Wallet },
    { key: "rotation", label: "Rotation", icon: RefreshCw },
  ] as const;

  // Mobile bottom nav (5 items max)
  const bottomNav = [
    { key: "overview", label: "Home", icon: LayoutDashboard },
    { key: "members", label: "Members", icon: Users },
    { key: "payments", label: "Pay", icon: Receipt, isFab: true },
    { key: "requests", label: "Requests", icon: FileCheck },
    { key: "contributions", label: "More", icon: Settings },
  ] as const;

  const renderContent = () => {
    switch (active) {
      case "members": return <MemberManagementPage />;
      case "contributions": return <ContributionSetupPage />;
      case "rotation": return <RotationAndSplitsPanel />;
      case "payments": return <PaymentRecordingPage />;
      case "requests": return <GroupAdminMembershipRequests groupId={groupId} />;
      default: return <GroupAdminOverview groupId={groupId} groupName={groupName} onNavigate={(p) => setActive(p as Page)} />;
    }
  };

  const initials = (user?.email || "GA").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-background dark:via-background dark:to-muted/20 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/60 bg-card/60 backdrop-blur-xl p-5 gap-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm tracking-tight truncate">{groupName}</h2>
            <p className="text-[11px] text-muted-foreground truncate">Group Workspace</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setActive(n.key as Page)}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary shadow-[0_0_8px_2px] shadow-primary/40" />
                )}
                <Icon className={`w-4 h-4 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/10 p-4">
          <p className="text-xs font-semibold text-foreground">Need help?</p>
          <p className="text-[11px] text-muted-foreground mt-1">Reach out to your super admin for support.</p>
        </div>

        <Button variant="ghost" size="sm" className="justify-start gap-3 text-muted-foreground" onClick={() => confirmLogout(handleLogout)}>
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl flex items-center gap-3 px-4 lg:px-6">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate">{groupName}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search members…" className="pl-9 h-9 bg-muted/40 border-transparent focus:bg-background" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {user && <NotificationBell userId={user.id} variant="light" />}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
              {initials}
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
            <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border p-5 animate-slide-in-right" style={{ animation: "slide-in-right 0.25s ease-out" }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm truncate">{groupName}</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {nav.map((n) => {
                  const Icon = n.icon;
                  const isActive = active === n.key;
                  return (
                    <button key={n.key}
                      onClick={() => { setActive(n.key as Page); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}>
                      <Icon className="w-4 h-4" />{n.label}
                    </button>
                  );
                })}
              </nav>
              <Button variant="ghost" size="sm" className="mt-6 w-full justify-start gap-3 text-muted-foreground" onClick={() => confirmLogout(handleLogout)}>
                <LogOut className="w-4 h-4" /> Sign out
              </Button>
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 pb-28 lg:pb-8 overflow-x-hidden animate-fade-in" key={active}>
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Mobile bottom nav with FAB */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="grid grid-cols-5 h-16 relative">
            {bottomNav.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.key;
              if ((n as any).isFab) {
                return (
                  <button
                    key={n.key}
                    onClick={() => setActive(n.key as Page)}
                    className="flex flex-col items-center justify-center"
                  >
                    <div className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 transition-transform active:scale-95 ${isActive ? "scale-105" : ""}`}>
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] mt-9 font-medium text-muted-foreground">Pay</span>
                  </button>
                );
              }
              return (
                <button
                  key={n.key}
                  onClick={() => setActive(n.key as Page)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{n.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default GroupAdminDashboard;
