import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wallet, Receipt, FileCheck } from "lucide-react";

interface Props { groupId: string; groupName: string }

const Stat = ({ icon: Icon, label, value }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const GroupAdminOverview = ({ groupId, groupName }: Props) => {
  const [members, setMembers] = useState(0);
  const [pending, setPending] = useState(0);
  const [collected, setCollected] = useState(0);
  const [expected, setExpected] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: m }, { count: p }, { data: mc }] = await Promise.all([
        supabase.from("group_memberships").select("*", { count: "exact", head: true })
          .eq("group_id", groupId).eq("is_active", true),
        supabase.from("membership_requests").select("*", { count: "exact", head: true })
          .eq("group_id", groupId).eq("status", "pending"),
        supabase.from("monthly_contributions").select("total_collected,total_expected").eq("group_id", groupId),
      ]);
      setMembers(m || 0);
      setPending(p || 0);
      setCollected((mc || []).reduce((s, r: any) => s + Number(r.total_collected || 0), 0));
      setExpected((mc || []).reduce((s, r: any) => s + Number(r.total_expected || 0), 0));
    })();
  }, [groupId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{groupName}</h1>
        <p className="text-sm text-muted-foreground">Group admin overview — manage your assigned group.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Active members" value={members} />
        <Stat icon={FileCheck} label="Pending requests" value={pending} />
        <Stat icon={Wallet} label="Total collected" value={`£${collected.toFixed(2)}`} />
        <Stat icon={Receipt} label="Total expected" value={`£${expected.toFixed(2)}`} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Quick guide</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Use <strong>Members</strong> to view people in your group.</p>
          <p>• Use <strong>Contributions</strong> and <strong>Rotation & Splits</strong> to set up monthly cycles.</p>
          <p>• Use <strong>Payments</strong> to record contributions.</p>
          <p>• Use <strong>Member Requests</strong> to invite new members — a Super Admin will approve.</p>
        </CardContent>
      </Card>
    </div>
  );
};
export default GroupAdminOverview;
