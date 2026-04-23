import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ArrowLeft, CheckCheck, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login/contribution");
        return;
      }
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
      .limit(200);
    if (error) {
      toast.error("Failed to load notifications");
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const paged = filtered.slice(0, page * PAGE_SIZE);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const typeColor = (t: string | null) => {
    switch (t) {
      case "success": return "bg-green-500";
      case "error": return "bg-red-500";
      case "warning": return "bg-yellow-500";
      case "payment": return "bg-purple-500";
      default: return "bg-blue-500";
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
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

        {/* List */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paged.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "group flex gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                  n.is_read
                    ? "bg-card border-border"
                    : "bg-primary/5 border-primary/20"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0", typeColor(n.type))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-tight", !n.is_read && "font-semibold")}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 break-words">{n.message}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}

            {paged.length < filtered.length && (
              <div className="pt-4 text-center">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
