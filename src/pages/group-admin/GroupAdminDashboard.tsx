import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Users, Wallet, Receipt, FileCheck, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { confirmLogout } = useLogoutConfirm();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/admin"); return; }
      setUser(session.user);

      // Block super admins from this dashboard — they have /admin
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
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
    { key: "overview", label: "Overview", icon: Shield },
    { key: "members", label: "Members", icon: Users },
    { key: "contributions", label: "Contributions", icon: Wallet },
    { key: "rotation", label: "Rotation & Splits", icon: RefreshCw },
    { key: "payments", label: "Payments", icon: Receipt },
    { key: "requests", label: "Member Requests", icon: FileCheck },
  ] as const;

  const renderContent = () => {
    switch (active) {
      case "members": return <MemberManagementPage />;
      case "contributions": return <ContributionSetupPage />;
      case "rotation": return <RotationAndSplitsPanel />;
      case "payments": return <PaymentRecordingPage />;
      case "requests": return <GroupAdminMembershipRequests groupId={groupId} />;
      default: return <GroupAdminOverview groupId={groupId} groupName={groupName} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground p-6 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sidebar-primary truncate">Group Admin</h2>
            <p className="text-xs text-sidebar-foreground/60 truncate">{groupName}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.key;
            return (
              <button key={n.key}
                onClick={() => setActive(n.key as Page)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground/80"
                }`}>
                <Icon className="w-4 h-4" />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-sidebar-foreground/80" onClick={() => confirmLogout(handleLogout)}>
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-background sticky top-0 z-30">
          <div className="lg:hidden flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">Group Admin</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {user && <NotificationBell userId={user.id} variant="light" />}
            <Button variant="ghost" size="icon" onClick={() => confirmLogout(handleLogout)}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="lg:hidden border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {nav.map((n) => (
              <button key={n.key}
                onClick={() => setActive(n.key as Page)}
                className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                  active === n.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{n.label}</button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default GroupAdminDashboard;
