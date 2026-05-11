import { useEffect, useMemo, useState } from "react";
import { Shield, Lock, ShieldCheck, ShieldAlert, Eye, EyeOff, Clock, LogOut, RefreshCw, Users, Wallet, CreditCard, TrendingUp, Activity, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "amana.secureSession";

interface SecureSession {
  token: string;
  expires_at: string;
}

interface SecureStats {
  total_users: number;
  total_groups: number;
  total_collected: number;
  total_expected: number;
  total_loans: number;
  outstanding_loans: number;
  total_investments: number;
  pending_loan_requests: number;
}

const formatGBP = (n: number) =>
  "£" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const useCountdown = (target?: string) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { ms: 0, label: "00:00", expired: true };
  const ms = Math.max(0, new Date(target).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, expired: ms <= 0 };
};

const SecureDataCenter = () => {
  const [session, setSession] = useState<SecureSession | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [duration, setDuration] = useState<5 | 10 | 15>(10);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState<SecureStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const countdown = useCountdown(session?.expires_at);
  const lockCountdown = useCountdown(lockedUntil || undefined);

  // Restore session from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SecureSession;
      if (new Date(parsed.expires_at).getTime() > Date.now()) {
        verifySession(parsed);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Auto-expire watcher
  useEffect(() => {
    if (!session) return;
    if (countdown.expired) {
      setSession(null);
      setStats(null);
      setAuditLogs([]);
      sessionStorage.removeItem(STORAGE_KEY);
      toast.info("Secure session expired. Please re-verify.");
    }
  }, [countdown.expired, session]);

  const verifySession = async (s: SecureSession) => {
    const { data, error } = await supabase.rpc("check_secure_session" as any, { _token: s.token });
    if (!error && (data as any)?.valid) {
      setSession(s);
      loadAll(s.token);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const loadAll = async (token: string) => {
    setLoadingStats(true);
    const [{ data: statsData, error: statsErr }, { data: logs }] = await Promise.all([
      supabase.rpc("get_secure_stats" as any, { _token: token }),
      supabase
        .from("activity_logs")
        .select("id, action, description, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    if (statsErr) toast.error(statsErr.message);
    else setStats(statsData as any);
    setAuditLogs(logs || []);
    setLoadingStats(false);
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      toast.error("Enter at least 4 digits");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_admin_pin" as any, {
      _pin: pin,
      _duration_minutes: duration,
      _user_agent: navigator.userAgent,
      _ip: null,
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as any;
    if (result?.success) {
      const newSession: SecureSession = { token: result.token, expires_at: result.expires_at };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setPin("");
      setPinOpen(false);
      toast.success("Access granted ✓");
      loadAll(newSession.token);
    } else if (result?.locked) {
      setLockedUntil(result.locked_until);
      toast.error("Too many wrong attempts — temporarily locked");
    } else {
      toast.error(`Wrong PIN (${result?.failed_attempts || 0}/5)`);
      setPin("");
    }
  };

  const handleLogoutSecure = async () => {
    if (!session) return;
    await supabase.rpc("revoke_secure_session" as any, { _token: session.token });
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setStats(null);
    setAuditLogs([]);
    toast.success("Secure session closed");
  };

  const handleRefresh = () => session && loadAll(session.token);

  // ----- LOCKED VIEW -----
  if (!session) {
    const isPinLocked = lockedUntil && !lockCountdown.expired;
    return (
      <>
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <CardContent className="p-8 sm:p-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center max-w-xl mx-auto"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl">
                    <Lock className="w-10 h-10 text-slate-900" />
                  </div>
                </div>
                <Badge className="mb-3 bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/20">
                  Verification Required
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">🔒 Secure Data Access</h2>
                <p className="text-slate-300 text-sm sm:text-base mb-8">
                  Sensitive financial data, system-wide records and exports are protected behind a second layer of verification.
                </p>
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
                  onClick={() => setPinOpen(true)}
                  disabled={!!isPinLocked}
                >
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  {isPinLocked ? `Locked — try in ${lockCountdown.label}` : "Unlock Secure Access"}
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", icon: Users },
              { label: "System Finances", icon: Wallet },
              { label: "Loan Portfolio", icon: CreditCard },
              { label: "Audit Logs", icon: Activity },
            ].map((item) => (
              <Card key={item.label} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <Lock className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <div className="space-y-2 blur-sm select-none">
                    <div className="h-7 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted/60 rounded" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{item.label}</p>
                </CardContent>
                <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
              </Card>
            ))}
          </div>
        </div>

        <PinDialog
          open={pinOpen}
          onOpenChange={setPinOpen}
          pin={pin}
          setPin={setPin}
          showPin={showPin}
          setShowPin={setShowPin}
          duration={duration}
          setDuration={setDuration}
          verifying={verifying}
          onVerify={handleVerify}
        />
      </>
    );
  }

  // ----- UNLOCKED VIEW -----
  return (
    <div className="space-y-6">
      {/* Session bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Secure Session Active</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Expires in {countdown.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogoutSecure}>
                <LogOut className="w-4 h-4 mr-1.5" /> Lock
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.total_users} icon={Users} loading={loadingStats} />
        <StatCard label="Active Groups" value={stats?.total_groups} icon={Shield} loading={loadingStats} />
        <StatCard label="Pending Loan Requests" value={stats?.pending_loan_requests} icon={CreditCard} loading={loadingStats} />
        <StatCard label="Active Investments" value={stats ? formatGBP(stats.total_investments) : undefined} icon={TrendingUp} loading={loadingStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> System Finances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Total Collected" value={stats ? formatGBP(stats.total_collected) : "—"} />
            <Row label="Total Expected" value={stats ? formatGBP(stats.total_expected) : "—"} />
            <Row
              label="Collection Rate"
              value={
                stats && stats.total_expected > 0
                  ? `${((stats.total_collected / stats.total_expected) * 100).toFixed(1)}%`
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Loan Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Total Disbursed" value={stats ? formatGBP(stats.total_loans) : "—"} />
            <Row label="Outstanding" value={stats ? formatGBP(stats.outstanding_loans) : "—"} />
            <Row label="Repaid" value={stats ? formatGBP(stats.total_loans - stats.outstanding_loans) : "—"} />
          </CardContent>
        </Card>
      </div>

      {/* Audit logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" /> Recent Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {auditLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.description}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, loading }: { label: string; value?: number | string; icon: any; loading: boolean }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-primary" />
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-2xl font-bold">{value ?? "—"}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </CardContent>
  </Card>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const PinDialog = ({
  open, onOpenChange, pin, setPin, showPin, setShowPin, duration, setDuration, verifying, onVerify,
}: any) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Enter Security PIN
          </DialogTitle>
          <DialogDescription>
            This unlocks sensitive backend data for a limited session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              autoFocus
              maxLength={12}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && onVerify()}
              className="text-center text-xl tracking-[0.5em] font-mono pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Session duration</p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    duration === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <Button onClick={onVerify} disabled={verifying || pin.length < 4} className="w-full">
            {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            {verifying ? "Verifying..." : "Verify & Unlock"}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" /> 5 wrong attempts will temporarily lock PIN entry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecureDataCenter;
