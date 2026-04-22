import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BeneficiarySlot {
  groupId: string;
  groupName: string;
  contributionAmount: number;
  monthLabel: string;
  monthNumber: number;
  beneficiaryName: string;
  bankName: string | null;
  accountNumber: string | null;
  mySplitAmount: number | null;
}

interface Props {
  userId: string;
}

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const CurrentBeneficiaryWidget = ({ userId }: Props) => {
  const [slots, setSlots] = useState<BeneficiarySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [justUpdated, setJustUpdated] = useState(false);
  const isInitialLoad = useRef(true);
  const groupIdsRef = useRef<Set<string>>(new Set());
  const reloadTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  const load = async () => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    // 1. memberships
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const groupIds = (memberships || []).map((x) => x.group_id);
    groupIdsRef.current = new Set(groupIds);

    if (groupIds.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    // 2-4. parallel batched fetches
    const [groupsRes, mcRes, splitsRes] = await Promise.all([
      supabase
        .from("contribution_groups")
        .select("id, name, contribution_amount, current_month")
        .in("id", groupIds),
      supabase
        .from("monthly_contributions")
        .select("group_id, beneficiary_user_id, beneficiary_bank_name, beneficiary_account_number")
        .in("group_id", groupIds)
        .eq("month", m)
        .eq("year", y),
      supabase
        .from("contribution_splits")
        .select("group_id, split_amount")
        .in("group_id", groupIds)
        .eq("month", m)
        .eq("year", y)
        .eq("user_id", userId),
    ]);

    const mcByGroup = new Map((mcRes.data || []).map((r) => [r.group_id, r]));
    const splitByGroup = new Map((splitsRes.data || []).map((r) => [r.group_id, Number(r.split_amount)]));

    // 5. one profiles query for all beneficiaries
    const beneficiaryIds = Array.from(
      new Set((mcRes.data || []).map((r) => r.beneficiary_user_id).filter(Boolean) as string[])
    );

    const profilesById = new Map<string, string>();
    if (beneficiaryIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", beneficiaryIds);
      (profiles || []).forEach((p) => profilesById.set(p.user_id, p.full_name || "Unknown member"));
    }

    const built: BeneficiarySlot[] = [];
    for (const g of groupsRes.data || []) {
      const mc = mcByGroup.get(g.id);
      if (!mc?.beneficiary_user_id) continue;

      built.push({
        groupId: g.id,
        groupName: g.name,
        contributionAmount: Number(g.contribution_amount),
        monthLabel: `${monthNames[m - 1]} ${y}`,
        monthNumber: g.current_month || 0,
        beneficiaryName: profilesById.get(mc.beneficiary_user_id) || "Unknown member",
        bankName: mc.beneficiary_bank_name,
        accountNumber: mc.beneficiary_account_number,
        mySplitAmount: splitByGroup.get(g.id) ?? null,
      });
    }
    setSlots(built);
    setLoading(false);

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    } else {
      setJustUpdated(true);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setJustUpdated(false), 3000);
    }
  };

  // Debounced reloader so a burst of realtime events triggers a single refetch
  const scheduleReload = () => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null;
      load();
    }, 200);
  };

  // Only reload if the changed row belongs to one of the user's groups (and current month for mc/splits)
  const isRelevantGroupRow = (payload: any) => {
    const gid = payload?.new?.group_id ?? payload?.old?.group_id ?? payload?.new?.id ?? payload?.old?.id;
    return gid && groupIdsRef.current.has(gid);
  };

  const isRelevantMonthRow = (payload: any) => {
    if (!isRelevantGroupRow(payload)) return false;
    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();
    const row = payload?.new ?? payload?.old;
    return row?.month === m && row?.year === y;
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    load();

    const channel = supabase
      .channel(`beneficiary-widget-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_contributions" }, (p) => {
        if (isRelevantMonthRow(p)) scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_groups" }, (p) => {
        if (isRelevantGroupRow(p)) scheduleReload();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contribution_splits", filter: `user_id=eq.${userId}` },
        (p) => { if (isRelevantMonthRow(p)) scheduleReload(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_memberships", filter: `user_id=eq.${userId}` },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading || slots.length === 0) return null;

  return (
    <div className="mb-6">
      {justUpdated && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-medium"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Updated just now
        </motion.div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
      {slots.map((s, i) => (
        <motion.div
          key={s.groupId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-white/[0.04] to-white/[0.02] backdrop-blur-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Current beneficiary</p>
                <p className="text-xs text-white/70">{s.groupName} · {s.monthLabel}</p>
              </div>
            </div>
            {s.monthNumber > 0 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                Month {s.monthNumber}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold mb-3 text-white">{s.beneficiaryName}</h3>

          <div className="space-y-2 text-sm">
            {s.bankName && (
              <div className="flex items-center gap-2 text-white/70">
                <Building2 className="w-4 h-4 text-white/40" />
                <span>{s.bankName}</span>
              </div>
            )}
            {s.accountNumber && (
              <div className="flex items-center gap-2 text-white/70">
                <CreditCard className="w-4 h-4 text-white/40" />
                <span className="font-mono">{s.accountNumber}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/40">Contribution</p>
              <p className="text-lg font-bold text-white">£{s.contributionAmount.toLocaleString()}</p>
            </div>
            {s.mySplitAmount !== null && (
              <div className="text-right">
                <p className="text-[11px] text-amber-300/80">Your split</p>
                <p className="text-lg font-bold text-amber-300">£{s.mySplitAmount.toLocaleString()}</p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
      </div>
    </div>
  );
};

export default CurrentBeneficiaryWidget;
