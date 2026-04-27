import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  userId: string;
  variant?: "light" | "dark" | "glass";
  /** Where to send the user when they tap the bell. Defaults to /dashboard/notifications. */
  to?: string;
}

/**
 * Bell button — NO dropdown. Tapping it navigates to the full notifications page.
 * Shows a live unread badge powered by realtime inserts.
 */
const NotificationBell = ({ userId, variant = "light", to = "/dashboard/notifications" }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchUnread = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (!userId) return;
    fetchUnread();

    const channel = supabase
      .channel(`notifications-bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnreadCount((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const bellClasses = cn(
    "relative p-2 rounded-xl transition-all duration-200 cursor-pointer",
    variant === "glass" && "bg-white/10 hover:bg-white/20 border border-white/10",
    variant === "dark" && "bg-gray-800 hover:bg-gray-700 border border-gray-700",
    variant === "light" && "bg-gray-100 hover:bg-gray-200 border border-gray-200",
  );

  const iconColor = variant === "light" ? "text-gray-700" : "text-white";

  return (
    <button
      onClick={() => navigate(to)}
      className={bellClasses}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className={cn("w-5 h-5", iconColor)} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold px-1 animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
