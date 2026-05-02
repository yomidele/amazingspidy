import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowLeft, CheckCheck, Inbox, ChevronRight, Building2, CreditCard, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseBeneficiaryHints, maskAccount, timeAgo, groupByPeriod } from "@/lib/notificationUtils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
}

const typeColor = (t: string | null) => {
  switch (t) {
    case "success": return "bg-emerald-500";
    case "error": return "bg-red-500";
    case "warning": return "bg-amber-500";
    case "payment": return "bg-purple-500";
    default: return "bg-blue-500";
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/contribution"); return; }
      setUser(session.user);
      await fetchNotifications(session.user.id);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Failed to load notifications");
    else setNotifications(data || []);
    setLoading(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  const openDetail = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    // If the notification has a deep link, navigate straight there
    if (n.link) {
      navigate(n.link);
      return;
    }
    navigate(`/dashboard/notifications/${n.id}`);
  };

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByPeriod(filtered);

  const renderItem = (n: Notification) => {
    const hints = parseBeneficiaryHints(n.title, n.message);
    const hasBeneficiary = !!(hints.bankName || hints.accountNumber || hints.memberName);
    return (
      <button
        key={n.id}
        onClick={() => openDetail(n)}
        className={cn(
          "group w-full text-left flex gap-3 p-4 rounded-xl border transition-all hover:shadow-sm active:scale-[0.99]",
          n.is_read
            ? "bg-card border-border"
            : "bg-primary/5 border-primary/30"
        )}
      >
        <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
          <div className={cn("w-2.5 h-2.5 rounded-full", typeColor(n.type))} />
          {!n.is_read && <span className="mt-1 text-[9px] font-bold tracking-wide text-primary uppercase">New</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm leading-tight", !n.is_read && "font-semibold")}>{n.title}</p>
            <span className="text-[11px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
              {timeAgo(n.created_at)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-words line-clamp-2">{n.message}</p>

          {hasBeneficiary && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hints.memberName && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {hints.memberName}
                </Badge>
              )}
              {hints.bankName && (
                <Badge variant="outline" className="text-[10px] font-normal gap-1">
                  <Building2 className="w-3 h-3" /> {hints.bankName}
                </Badge>
              )}
              {hints.accountNumber && (
                <Badge variant="outline" className="text-[10px] font-normal gap-1 font-mono">
                  <CreditCard className="w-3 h-3" /> {maskAccount(hints.accountNumber)}
                </Badge>
              )}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
      </button>
    );
  };

  const Section = ({ label, items }: { label: string; items: Notification[] }) =>
    items.length === 0 ? null : (
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
          <Calendar className="w-3 h-3" /> {label}
          <span className="text-muted-foreground/60">({items.length})</span>
        </h2>
        <div className="space-y-2">{items.map(renderItem)}</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Safe back: if there's nowhere to go, send to dashboard
                if (window.history.length > 1) navigate(-1);
                else navigate("/dashboard/contributor");
              }}
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
                <Bell className="w-5 h-5" />
                Notifications
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex-shrink-0">
              <CheckCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                filter === f
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-5 pb-20">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Section label="Today" items={groups.today} />
            <Section label="This week" items={groups.week} />
            <Section label="Earlier" items={groups.earlier} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
