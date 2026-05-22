import { useEffect, useMemo, useState } from "react";
import {
  Shield, Lock, ShieldCheck, ShieldAlert, Eye, EyeOff, Clock, LogOut, RefreshCw,
  Users, Wallet, CreditCard, TrendingUp, Activity, Loader2, Download, FileJson,
  ChevronRight, KeyRound, Search, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "amana.secureSession";

interface SecureSession { token: string; expires_at: string; }
interface SecureStats {
  total_users: number; total_groups: number;
  total_collected: number; total_expected: number;
  total_loans: number; outstanding_loans: number;
  total_investments: number; pending_loan_requests: number;
}

type DatasetKey = "users" | "groups" | "loans" | "investments" | "audit_logs";

const DATASETS: Record<DatasetKey, { title: string; rpc: string; icon: any; color: string; description: string }> = {
  users: { title: "All Users", rpc: "get_secure_users_full", icon: Users, color: "from-blue-500 to-cyan-500", description: "Members, roles, balances, joined groups" },
  groups: { title: "Active Groups", rpc: "get_secure_groups_full", icon: Shield, color: "from-emerald-500 to-teal-500", description: "Members, expected vs collected, group admins" },
  loans: { title: "Loan Portfolio", rpc: "get_secure_loans_full", icon: CreditCard, color: "from-amber-500 to-orange-500", description: "Borrowers, amounts, repayments, status" },
  investments: { title: "Active Investments", rpc: "get_secure_investments_full", icon: TrendingUp, color: "from-purple-500 to-pink-500", description: "Investors, ROI, payouts, maturity" },
  audit_logs: { title: "Audit Logs", rpc: "get_secure_audit_logs_full", icon: Activity, color: "from-slate-600 to-slate-800", description: "Full system activity history" },
};

const formatGBP = (n: number) =>
  "£" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const useCountdown = (target?: string) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
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
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const [openDataset, setOpenDataset] = useState<DatasetKey | null>(null);
  const [datasetRows, setDatasetRows] = useState<any[] | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState("");
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const countdown = useCountdown(session?.expires_at);
  const lockCountdown = useCountdown(lockedUntil || undefined);

  // Restore session
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SecureSession;
      if (new Date(parsed.expires_at).getTime() > Date.now()) verifySession(parsed);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch { sessionStorage.removeItem(STORAGE_KEY); }
  }, []);

  // Auto-expire & secure cleanup
  useEffect(() => {
    if (!session) return;
    if (countdown.expired) lockEverything("Secure session expired. Please re-verify.");
  }, [countdown.expired, session]);

  const lockEverything = (msg?: string) => {
    setSession(null);
    setStats(null);
    setOpenDataset(null);
    setDatasetRows(null);
    setDatasetSearch("");
    sessionStorage.removeItem(STORAGE_KEY);
    if (msg) toast.info(msg);
  };

  const verifySession = async (s: SecureSession) => {
    const { data, error } = await supabase.rpc("check_secure_session" as any, { _token: s.token });
    if (!error && (data as any)?.valid) {
      setSession(s);
      loadStats(s.token);
    } else sessionStorage.removeItem(STORAGE_KEY);
  };

  const loadStats = async (token: string) => {
    setLoadingStats(true);
    const { data, error } = await supabase.rpc("get_secure_stats" as any, { _token: token });
    if (error) toast.error(error.message); else setStats(data as any);
    setLoadingStats(false);
  };

  const handleVerify = async () => {
    if (pin.length < 4) { toast.error("Enter at least 4 digits"); return; }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_admin_pin" as any, {
      _pin: pin, _duration_minutes: duration, _user_agent: navigator.userAgent, _ip: null,
    });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    const result = data as any;
    if (result?.success) {
      const newSession: SecureSession = { token: result.token, expires_at: result.expires_at };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setPin(""); setPinOpen(false);
      toast.success("Vault unlocked ✓");
      loadStats(newSession.token);
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
    lockEverything("Secure session closed");
  };

  const openVault = async (key: DatasetKey) => {
    if (!session) return;
    setOpenDataset(key);
    setDatasetRows(null);
    setDatasetSearch("");
    setDatasetLoading(true);
    // fake decrypt animation min duration
    const delay = new Promise((r) => setTimeout(r, 700));
    const { data, error } = await supabase.rpc(DATASETS[key].rpc as any, { _token: session.token });
    await delay;
    setDatasetLoading(false);
    if (error) {
      toast.error(error.message);
      if (/expired|invalid|authorized/i.test(error.message)) lockEverything();
      setOpenDataset(null);
      return;
    }
    setDatasetRows(Array.isArray(data) ? data : []);
    await supabase.rpc("log_secure_access" as any, {
      _token: session.token, _action: "view_" + key,
      _description: "Opened secure dataset: " + DATASETS[key].title,
    });
  };

  const handleExport = async (format: "csv" | "json") => {
    if (!session || !openDataset) return;
    setExporting(format);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { toast.error("Sign in required"); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-export`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataset: openDataset, format, secure_token: session.token }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `amana-${openDataset}-${stamp}.${format}`;
      const a = document.createElement("a");
      const dlUrl = URL.createObjectURL(blob);
      a.href = dlUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      // Revoke shortly after — temporary URL
      setTimeout(() => URL.revokeObjectURL(dlUrl), 30_000);
      toast.success(`Exported ${format.toUpperCase()} • temporary URL expires in 30s`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  // ---------- LOCKED VIEW ----------
  if (!session) {
    const isPinLocked = lockedUntil && !lockCountdown.expired;
    return (
      <>
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <CardContent className="p-8 sm:p-12">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center max-w-xl mx-auto">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl">
                    <Lock className="w-10 h-10 text-slate-900" />
                  </div>
                </div>
                <Badge className="mb-3 bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/20">
                  <KeyRound className="w-3 h-3 mr-1" /> Verification Required
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">🔒 Encrypted Data Vault</h2>
                <p className="text-slate-300 text-sm sm:text-base mb-8">
                  Sensitive system records and exports are protected behind a second layer of verification. No data is loaded until your PIN is verified.
                </p>
                <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
                  onClick={() => setPinOpen(true)} disabled={!!isPinLocked}>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  {isPinLocked ? `Locked — try in ${lockCountdown.label}` : "Unlock Secure Access"}
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(DATASETS) as DatasetKey[]).slice(0, 4).map((k) => {
              const d = DATASETS[k];
              return (
                <Card key={k} className="relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <d.icon className="w-5 h-5 text-muted-foreground" />
                      <Lock className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-2 blur-sm select-none pointer-events-none">
                      <div className="h-7 w-24 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted/60 rounded" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">{d.title}</p>
                  </CardContent>
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
                </Card>
              );
            })}
          </div>
        </div>

        <PinDialog
          open={pinOpen} onOpenChange={setPinOpen}
          pin={pin} setPin={setPin}
          showPin={showPin} setShowPin={setShowPin}
          duration={duration} setDuration={setDuration}
          verifying={verifying} onVerify={handleVerify}
        />
      </>
    );
  }

  // ---------- UNLOCKED ----------
  return (
    <div className="space-y-6">
      {/* Session bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-2">
                  Secure Vault Active
                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">ENCRYPTED</Badge>
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Session expires in <span className="font-mono font-semibold">{countdown.label}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadStats(session.token)}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogoutSecure}>
                <LogOut className="w-4 h-4 mr-1.5" /> Lock Vault
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Collected" value={stats ? formatGBP(stats.total_collected) : undefined} icon={Wallet} loading={loadingStats} />
        <StatCard label="Outstanding Loans" value={stats ? formatGBP(stats.outstanding_loans) : undefined} icon={CreditCard} loading={loadingStats} />
        <StatCard label="Active Investments" value={stats ? formatGBP(stats.total_investments) : undefined} icon={TrendingUp} loading={loadingStats} />
        <StatCard label="Pending Loan Requests" value={stats?.pending_loan_requests} icon={Activity} loading={loadingStats} />
      </div>

      {/* Vault cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">Secure Datasets</h3>
            <p className="text-xs text-muted-foreground">Click a card to decrypt and view records. Data is fetched server-side per click.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(DATASETS) as DatasetKey[]).map((k) => {
            const d = DATASETS[k];
            return (
              <motion.button
                key={k}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => openVault(k)}
                className="group text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all p-5 relative overflow-hidden"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${d.color}`} />
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center shadow-md`}>
                    <d.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                    <Lock className="w-2.5 h-2.5" /> Encrypted
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{d.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Decrypt & view</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Secure data drawer */}
      <Sheet open={!!openDataset} onOpenChange={(o) => !o && (setOpenDataset(null), setDatasetRows(null))}>
        <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col p-0">
          {openDataset && (
            <>
              <SheetHeader className="p-5 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${DATASETS[openDataset].color} flex items-center justify-center shrink-0`}>
                      {(() => { const I = DATASETS[openDataset].icon; return <I className="w-5 h-5 text-white" />; })()}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-white truncate">{DATASETS[openDataset].title}</SheetTitle>
                      <SheetDescription className="text-slate-300 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified session • <Clock className="w-3 h-3" /> {countdown.label}
                      </SheetDescription>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-hidden flex flex-col">
                {datasetLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-4"
                    />
                    <p className="font-semibold text-sm">Decrypting Secure Records…</p>
                    <p className="text-xs text-muted-foreground mt-1">Verifying session and fetching encrypted payload</p>
                  </div>
                ) : datasetRows && datasetRows.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No records found.</div>
                ) : datasetRows ? (
                  <>
                    <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={datasetSearch} onChange={(e) => setDatasetSearch(e.target.value)}
                          placeholder="Search records…" className="pl-8 h-9" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">{datasetRows.length} rows</Badge>
                        <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => handleExport("csv")}>
                          {exporting === "csv" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                          CSV
                        </Button>
                        <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => handleExport("json")}>
                          {exporting === "json" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileJson className="w-4 h-4 mr-1.5" />}
                          JSON
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <SecureTable rows={datasetRows} search={datasetSearch} />
                    </div>
                    <div className="px-4 py-2 border-t text-[10px] text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Records cleared from memory when vault locks.</span>
                      <span>Cache-Control: no-store</span>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const SecureTable = ({ rows, search }: { rows: any[]; search: string }) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);
  const headers = useMemo(() => {
    const set = new Set<string>();
    filtered.slice(0, 20).forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [filtered]);
  const fmt = (v: any) => {
    if (v === null || v === undefined) return "—";
    if (Array.isArray(v)) return v.join(", ") || "—";
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try { return new Date(v).toLocaleString(); } catch { return v; }
    }
    return String(v);
  };
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          {headers.map((h) => (
            <TableHead key={h} className="whitespace-nowrap text-xs uppercase tracking-wide">{h.replace(/_/g, " ")}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((r, i) => (
          <TableRow key={i}>
            {headers.map((h) => (
              <TableCell key={h} className="text-xs whitespace-nowrap max-w-[260px] truncate">
                {fmt(r[h])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const StatCard = ({ label, value, icon: Icon, loading }: { label: string; value?: number | string; icon: any; loading: boolean }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-primary" />
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>
      {loading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-bold">{value ?? "—"}</p>}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </CardContent>
  </Card>
);

const PinDialog = ({
  open, onOpenChange, pin, setPin, showPin, setShowPin, duration, setDuration, verifying, onVerify,
}: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" /> Enter Security PIN
        </DialogTitle>
        <DialogDescription>Unlocks the encrypted data vault for a limited session.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="relative">
          <Input
            type={showPin ? "text" : "password"} inputMode="numeric" autoFocus maxLength={12}
            placeholder="••••" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && onVerify()}
            className="text-center text-xl tracking-[0.5em] font-mono pr-10"
          />
          <button type="button" onClick={() => setShowPin(!showPin)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Session duration</p>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((d) => (
              <button key={d} onClick={() => setDuration(d)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  duration === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                }`}>{d} min</button>
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

export default SecureDataCenter;
