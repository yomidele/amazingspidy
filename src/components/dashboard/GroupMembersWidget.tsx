import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, Shield, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  user_id: string;
  full_name: string | null;
  membership_number: string | null;
  role: string;
  contribution_amount: number;
}

interface GroupInfo {
  id: string;
  name: string;
  members: Member[];
}

interface Props {
  userId: string;
}

const initials = (name: string | null) =>
  (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const GroupMembersWidget = ({ userId }: Props) => {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const groupIdsRef = useRef<Set<string>>(new Set());
  const reloadTimer = useRef<number | null>(null);

  const load = async () => {
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const ids = (memberships || []).map((m) => m.group_id);
    groupIdsRef.current = new Set(ids);
    if (ids.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: groupsData } = await supabase
      .from("contribution_groups")
      .select("id, name")
      .in("id", ids);

    const results = await Promise.all(
      (groupsData || []).map(async (g) => {
        const { data, error } = await supabase.rpc("get_group_members", { _group_id: g.id });
        if (error) return { id: g.id, name: g.name, members: [] };
        return {
          id: g.id,
          name: g.name,
          members: (data || []) as Member[],
        };
      })
    );
    setGroups(results);
    setLoading(false);
  };

  const scheduleReload = () => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null;
      load();
    }, 250);
  };

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    load();

    const channel = supabase
      .channel(`group-members-widget-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_memberships" }, (p: any) => {
        const gid = p?.new?.group_id ?? p?.old?.group_id;
        if (gid && (groupIdsRef.current.has(gid) || p?.new?.user_id === userId || p?.old?.user_id === userId)) {
          scheduleReload();
        }
      })
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading || groups.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {groups.map((g) => (
        <motion.div
          key={g.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Group members</p>
                <p className="text-sm text-white/80 font-medium">{g.name}</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
              {g.members.length} {g.members.length === 1 ? "member" : "members"}
            </span>
          </div>

          <ul className="divide-y divide-white/5">
            {g.members.map((m) => {
              const isAdmin = m.role === "admin";
              const isSelf = m.user_id === userId;
              return (
                <li key={m.user_id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isAdmin
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {m.full_name || "Member data missing"}
                        {isSelf && <span className="ml-2 text-[10px] text-white/50">(You)</span>}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {m.membership_number || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/70">£{Number(m.contribution_amount || 0).toLocaleString()}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                        isAdmin
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {isAdmin ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      {isAdmin ? "Admin" : "Member"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>
      ))}
    </div>
  );
};

export default GroupMembersWidget;
