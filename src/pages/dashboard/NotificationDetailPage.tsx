import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CreditCard, Calendar, ExternalLink, Bell, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { parseBeneficiaryHints, maskAccount, timeAgo } from "@/lib/notificationUtils";

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

const NotificationDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [notif, setNotif] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login/contribution"); return; }
      if (!id) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Notification not found");
        navigate("/dashboard/notifications");
        return;
      }
      setNotif(data);

      if (!data.is_read) {
        await supabase.from("notifications").update({ is_read: true }).eq("id", data.id);
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading || !notif) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const hints = parseBeneficiaryHints(notif.title, notif.message);
  const hasBeneficiary = !!(hints.bankName || hints.accountNumber || hints.memberName || hints.monthLabel);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/dashboard/notifications");
            }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold flex items-center gap-2 truncate">
            <Bell className="w-4 h-4" />
            Notification details
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-4">
        {/* Title card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${typeColor(notif.type)}`} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight break-words">{notif.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeAgo(notif.created_at)} · {new Date(notif.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] flex-shrink-0">Read</Badge>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
                {notif.message}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Beneficiary block */}
        {hasBeneficiary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Beneficiary details
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {hints.memberName && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Member</p>
                      <p className="font-medium">{hints.memberName}</p>
                    </div>
                  </div>
                )}
                {hints.monthLabel && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Contribution period</p>
                      <p className="font-medium">{hints.monthLabel}</p>
                    </div>
                  </div>
                )}
                {hints.bankName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Bank</p>
                      <p className="font-medium">{hints.bankName}</p>
                    </div>
                  </div>
                )}
                {hints.accountNumber && (
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Account</p>
                      <p className="font-medium font-mono">{maskAccount(hints.accountNumber)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {notif.link && (
          <Button className="w-full" onClick={() => navigate(notif.link!)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open related page
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotificationDetailPage;
