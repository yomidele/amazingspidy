import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  variant?: "light" | "dark" | "glass";
}

const NotificationBell = ({ userId, variant = "light" }: NotificationBellProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
    setIsOpen(false);
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "success": return "bg-green-500";
      case "error": return "bg-red-500";
      case "warning": return "bg-yellow-500";
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
    return `${days}d ago`;
  };

  const bellClasses = cn(
    "relative p-2 rounded-xl transition-all duration-200 cursor-pointer",
    variant === "glass" && "bg-white/10 hover:bg-white/20 border border-white/10",
    variant === "dark" && "bg-gray-800 hover:bg-gray-700 border border-gray-700",
    variant === "light" && "bg-gray-100 hover:bg-gray-200 border border-gray-200",
  );

  const iconColor = variant === "light" ? "text-gray-700" : "text-white";

  const panelClasses = cn(
    "absolute right-0 top-full mt-2 w-80 max-h-96 rounded-2xl shadow-2xl border overflow-hidden z-[100]",
    variant === "glass" && "bg-gray-900/95 backdrop-blur-xl border-white/10",
    variant === "dark" && "bg-gray-900 border-gray-700",
    variant === "light" && "bg-white border-gray-200",
  );

  const textPrimary = variant === "light" ? "text-gray-900" : "text-white";
  const textSecondary = variant === "light" ? "text-gray-500" : "text-white/60";
  const hoverBg = variant === "light" ? "hover:bg-gray-50" : "hover:bg-white/5";
  const dividerColor = variant === "light" ? "border-gray-100" : "border-white/10";

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={bellClasses}>
        <Bell className={cn("w-5 h-5", iconColor)} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold px-1 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={panelClasses}>
          {/* Header */}
          <div className={cn("flex items-center justify-between px-4 py-3 border-b", dividerColor)}>
            <h3 className={cn("font-semibold text-sm", textPrimary)}>Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className={cn("text-xs font-medium text-blue-400 hover:text-blue-300")}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className={cn("p-1 rounded-lg", hoverBg)}>
                <X className={cn("w-4 h-4", textSecondary)} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[320px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className={cn("w-8 h-8 mx-auto mb-2", textSecondary)} />
                <p className={cn("text-sm", textSecondary)}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0",
                    dividerColor,
                    hoverBg,
                    !notif.is_read && (variant === "light" ? "bg-blue-50/50" : "bg-white/[0.03]")
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn("w-2.5 h-2.5 rounded-full", getTypeColor(notif.type))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", textPrimary)}>
                      {notif.title}
                    </p>
                    <p className={cn("text-xs mt-0.5 line-clamp-2", textSecondary)}>
                      {notif.message}
                    </p>
                    <p className={cn("text-[11px] mt-1", textSecondary)}>
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                      className={cn("flex-shrink-0 p-1 rounded-lg self-center", hoverBg)}
                      title="Mark as read"
                    >
                      <Check className={cn("w-3.5 h-3.5", textSecondary)} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with link to full page */}
          <div className={cn("px-4 py-2.5 border-t", dividerColor)}>
            <button
              onClick={() => { setIsOpen(false); navigate("/dashboard/notifications"); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              See all notifications
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
