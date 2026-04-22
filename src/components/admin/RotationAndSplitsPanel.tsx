import { useEffect, useState } from "react";
import { ArrowRight, Plus, Trash2, Users, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  contribution_amount: number;
  current_month: number;
  total_months: number;
  progression_mode: "auto" | "manual";
  last_progressed_at: string | null;
}

interface Member {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Split {
  id: string;
  group_id: string;
  month: number;
  year: number;
  user_id: string;
  split_amount: number;
  is_paid: boolean;
}

const RotationAndSplitsPanel = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [progressing, setProgressing] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const today = new Date();
  const [splitForm, setSplitForm] = useState({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    user_id: "",
    split_amount: 0,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchSplits(selectedGroupId);
  }, [selectedGroupId]);

  const fetchAll = async () => {
    setLoading(true);
    const [groupsRes, membersRes] = await Promise.all([
      supabase
        .from("contribution_groups")
        .select("id, name, contribution_amount, current_month, total_months, progression_mode, last_progressed_at")
        .eq("is_active", true)
        .order("name"),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);
    setGroups((groupsRes.data as Group[]) || []);
    setMembers(membersRes.data || []);
    if (groupsRes.data?.[0] && !selectedGroupId) {
      setSelectedGroupId(groupsRes.data[0].id);
    }
    setLoading(false);
  };

  const fetchSplits = async (groupId: string) => {
    const { data } = await supabase
      .from("contribution_splits")
      .select("*")
      .eq("group_id", groupId)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setSplits((data as Split[]) || []);
  };

  const updateGroupField = async (id: string, patch: Partial<Group>) => {
    const { error } = await supabase.from("contribution_groups").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Group updated");
    fetchAll();
  };

  const advanceMonth = async (groupId: string) => {
    setProgressing(true);
    const { data, error } = await supabase.rpc("advance_group_month" as any, { _group_id: groupId });
    setProgressing(false);
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result?.success) {
      toast.success(`Advanced to month ${result.current_month} (${result.period})`);
      fetchAll();
    } else {
      toast.error(result?.reason || "Could not advance month");
    }
  };

  const handleAddSplit = async () => {
    if (!selectedGroupId || !splitForm.user_id || splitForm.split_amount <= 0) {
      return toast.error("Pick a member and amount > 0");
    }
    const { error } = await supabase.from("contribution_splits").insert({
      group_id: selectedGroupId,
      month: splitForm.month,
      year: splitForm.year,
      user_id: splitForm.user_id,
      split_amount: splitForm.split_amount,
    });
    if (error) return toast.error(error.message);
    toast.success("Split added");
    setSplitDialogOpen(false);
    setSplitForm({ ...splitForm, user_id: "", split_amount: 0 });
    fetchSplits(selectedGroupId);
  };

  const deleteSplit = async (id: string) => {
    const { error } = await supabase.from("contribution_splits").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Split removed");
    fetchSplits(selectedGroupId);
  };

  const memberName = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.full_name || m?.email || "Unknown";
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading rotation settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Rotation & Splits</h2>
        <p className="text-sm text-muted-foreground">
          Manage month progression mode and split contribution slots per group.
        </p>
      </div>

      {/* Groups list with progression controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const cycleComplete = g.current_month >= g.total_months;
          return (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      £{g.contribution_amount}/member · {g.total_months} months
                    </p>
                  </div>
                  <Badge variant={g.progression_mode === "auto" ? "default" : "secondary"}>
                    {g.progression_mode}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {g.current_month} <span className="text-sm font-normal text-muted-foreground">/ {g.total_months}</span>
                    </p>
                    {g.last_progressed_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last advanced {new Date(g.last_progressed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => advanceMonth(g.id)}
                    disabled={progressing || cycleComplete}
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    {cycleComplete ? "Complete" : "Next month"}
                  </Button>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Mode</Label>
                    <Select
                      value={g.progression_mode}
                      onValueChange={(v) => updateGroupField(g.id, { progression_mode: v as "auto" | "manual" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="auto">Auto (monthly)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      defaultValue={g.total_months}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (v && v !== g.total_months) updateGroupField(g.id, { total_months: v });
                      }}
                    />
                  </div>
                </div>

                <Button
                  variant={selectedGroupId === g.id ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Manage splits
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Splits manager */}
      {selectedGroup && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Split contributions — {selectedGroup.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Up to 2 members per slot · sum must equal £{selectedGroup.contribution_amount}
              </p>
            </div>
            <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add split</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add split member</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Month</Label>
                      <Input
                        type="number" min={1} max={12}
                        value={splitForm.month}
                        onChange={(e) => setSplitForm({ ...splitForm, month: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Year</Label>
                      <Input
                        type="number" min={2024}
                        value={splitForm.year}
                        onChange={(e) => setSplitForm({ ...splitForm, year: parseInt(e.target.value) || today.getFullYear() })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Member</Label>
                    <Select
                      value={splitForm.user_id}
                      onValueChange={(v) => setSplitForm({ ...splitForm, user_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Pick a member" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Split amount (£)</Label>
                    <Input
                      type="number" min={0} step="0.01"
                      value={splitForm.split_amount}
                      onChange={(e) => setSplitForm({ ...splitForm, split_amount: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Group contribution: £{selectedGroup.contribution_amount}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSplit}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {splits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 opacity-50" />
                No split assignments yet
              </p>
            ) : (
              <div className="divide-y">
                {splits.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{memberName(s.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.month}/{s.year} · £{Number(s.split_amount).toFixed(2)}
                        {s.is_paid && <Badge variant="default" className="ml-2 text-[10px]">Paid</Badge>}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteSplit(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RotationAndSplitsPanel;
