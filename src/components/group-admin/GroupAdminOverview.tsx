import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wallet, Receipt, FileCheck, TrendingUp, AlertCircle, Plus, UserPlus, Download, Bell, ArrowUpRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  groupId: string;
  groupName: string;
  onNavigate?: (page: string) => void;
}

interface Activity {
  id: string;
  type: "payment" | "member" | "request";
  title: string;
  subtitle: string;
  time: string;
}

const useCounter = (target: number, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const Counter = ({ value, prefix = "", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) => {
  const v = useCounter(value);
  return <>{prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
};

const StatCard = ({ icon: Icon, label, value, accent, prefix, decimals, trend }: any) => (
  <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
    <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14] ${accent}`} />
    <div className="relative flex items-start justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend !== undefined && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="w-3 h-3" />{trend}
        </span>
      )}
    </div>
    <p className="relative mt-4 text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</p>
    <p className="relative mt-1 text-2xl font-bold tracking-tight text-foreground">
      <Counter value={value} prefix={prefix} decimals={decimals} />
    </p>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, accent }: any) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent} text-white`}>
      <Icon className="w-4 h-4" />
    </div>
    <span className="text-sm font-medium text-foreground">{label}</span>
    <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
  </button>
);

const GroupAdminOverview = ({ groupId, groupName, onNavigate }: Props) => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState(0);
  const [pending, setPending] = useState(0);
  const [collected, setCollected] = useState(0);
  const [expected, setExpected] = useState(0);
  const [activePayments, setActivePayments] = useState(0);
  const [missed, setMissed] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ count: m }, { count: p }, { data: mc }, { data: pays }] = await Promise.all([
        supabase.from("group_memberships").select("*", { count: "exact", head: true })
          .eq("group_id", groupId).eq("is_active", true),
        supabase.from("membership_requests").select("*", { count: "exact", head: true })
          .eq("group_id", groupId).eq("status", "pending"),
        supabase.from("monthly_contributions").select("id,total_collected,total_expected,month_year").eq("group_id", groupId),
        supabase.from("contribution_payments").select("id,amount_paid,status,paid_at,user_id")
          .order("paid_at", { ascending: false }).limit(5),
      ]);
      setMembers(m || 0);
      setPending(p || 0);
      const totC = (mc || []).reduce((s, r: any) => s + Number(r.total_collected || 0), 0);
      const totE = (mc || []).reduce((s, r: any) => s + Number(r.total_expected || 0), 0);
      setCollected(totC);
      setExpected(totE);
      setActivePayments((pays || []).filter((x: any) => x.status === "paid").length);
      setMissed(Math.max(0, Math.round((totE - totC) / Math.max(1, (mc || []).length || 1) / Math.max(1, (m || 1)))));

      const acts: Activity[] = (pays || []).slice(0, 4).map((x: any) => ({
        id: x.id,
        type: "payment",
        title: x.status === "paid" ? "Payment recorded" : "Payment updated",
        subtitle: `£${Number(x.amount_paid).toFixed(2)}`,
        time: x.paid_at ? new Date(x.paid_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—",
      }));
      setActivities(acts);
      setLoading(false);
    })();
  }, [groupId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const progress = expected > 0 ? Math.min(100, (collected / expected) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/95 via-primary to-primary/80 p-6 sm:p-8 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_80%,white,transparent_35%)]" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Group Admin Workspace
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Welcome back 👋</h1>
          <p className="mt-1 text-sm sm:text-base text-primary-foreground/80 truncate">
            You're managing <span className="font-semibold">{groupName}</span>
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Members</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold"><Counter value={members} /></p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Collected</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold"><Counter value={collected} prefix="£" decimals={0} /></p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Pending</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold"><Counter value={pending} /></p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-primary-foreground/80 mb-2">
              <span>Collection progress</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Members" value={members} accent="bg-blue-500" />
        <StatCard icon={Wallet} label="Active Payments" value={activePayments} accent="bg-emerald-500" />
        <StatCard icon={FileCheck} label="Pending" value={pending} accent="bg-amber-500" />
        <StatCard icon={Receipt} label="Monthly £" value={collected} prefix="£" accent="bg-violet-500" />
        <StatCard icon={AlertCircle} label="Missed" value={missed} accent="bg-rose-500" />
      </div>

      {/* Quick actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <QuickAction icon={Plus} label="Record Payment" accent="bg-emerald-500" onClick={() => onNavigate?.("payments")} />
            <QuickAction icon={UserPlus} label="Add Member" accent="bg-blue-500" onClick={() => onNavigate?.("requests")} />
            <QuickAction icon={Bell} label="Send Reminder" accent="bg-amber-500" onClick={() => onNavigate?.("members")} />
            <QuickAction icon={Download} label="Export Report" accent="bg-violet-500" onClick={() => onNavigate?.("members")} />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <button onClick={() => onNavigate?.("payments")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Recorded payments and member updates will show here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.time}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{a.subtitle}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupAdminOverview;
