import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
  contribution_amount: number;
  current_month: number;
}

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

  const load = async () => {
    setLoading(true);
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }

    const { data: groups } = await supabase
      .from("contribution_groups")
      .select("id, name, contribution_amount, current_month")
      .in("id", groupIds);

    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const built: BeneficiarySlot[] = [];

    for (const g of (groups as Group[]) || []) {
      const { data: mc } = await supabase
        .from("monthly_contributions")
        .select("beneficiary_user_id, beneficiary_bank_name, beneficiary_account_number, month, year")
        .eq("group_id", g.id)
        .eq("month", m)
        .eq("year", y)
        .maybeSingle();

      if (!mc?.beneficiary_user_id) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", mc.beneficiary_user_id)
        .maybeSingle();

      const { data: mySplit } = await supabase
        .from("contribution_splits")
        .select("split_amount")
        .eq("group_id", g.id)
        .eq("month", m)
        .eq("year", y)
        .eq("user_id", userId)
        .maybeSingle();

      built.push({
        groupId: g.id,
        groupName: g.name,
        contributionAmount: Number(g.contribution_amount),
        monthLabel: `${monthNames[m - 1]} ${y}`,
        monthNumber: g.current_month || 0,
        beneficiaryName: profile?.full_name || "Unknown member",
        bankName: mc.beneficiary_bank_name,
        accountNumber: mc.beneficiary_account_number,
        mySplitAmount: mySplit ? Number(mySplit.split_amount) : null,
      });
    }
    setSlots(built);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();

    // Realtime: refresh when current month/beneficiary or splits change
    const channel = supabase
      .channel(`beneficiary-widget-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_contributions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_groups" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_splits", filter: `user_id=eq.${userId}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading || slots.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
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
  );
};

export default CurrentBeneficiaryWidget;
