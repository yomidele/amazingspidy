import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, KeyRound, Trash2 } from "lucide-react";

interface Assn {
  user_id: string; group_id: string; assigned_at: string;
  full_name?: string | null; email?: string | null; group_name?: string;
}
interface Group { id: string; name: string }

const callFn = async (body: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/manage-group-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
};

const GroupAdminManagementPage = () => {
  const [assignments, setAssignments] = useState<Assn[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Assn | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", group_id: "" });

  const load = async () => {
    const [{ data: a }, { data: g }] = await Promise.all([
      supabase.from("group_admin_assignments").select("user_id,group_id,assigned_at"),
      supabase.from("contribution_groups").select("id,name").order("name"),
    ]);
    const list = (a as Assn[]) || [];
    setGroups((g as Group[]) || []);
    if (list.length) {
      const uids = list.map((x) => x.user_id);
      const gids = [...new Set(list.map((x) => x.group_id))];
      const [{ data: ps }, { data: gs }] = await Promise.all([
        supabase.from("profiles").select("user_id,full_name,email").in("user_id", uids),
        supabase.from("contribution_groups").select("id,name").in("id", gids),
      ]);
      const pmap: Record<string, any> = Object.fromEntries((ps || []).map((p: any) => [p.user_id, p]));
      const gmap: Record<string, string> = Object.fromEntries((gs || []).map((x: any) => [x.id, x.name]));
      setAssignments(list.map((x) => ({
        ...x, full_name: pmap[x.user_id]?.full_name, email: pmap[x.user_id]?.email,
        group_name: gmap[x.group_id],
      })));
    } else setAssignments([]);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await callFn({ action: "create", fullName: form.full_name, email: form.email,
      password: form.password, phone: form.phone, groupId: form.group_id });
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Group admin created");
    setCreateOpen(false);
    setForm({ full_name: "", email: "", phone: "", password: "", group_id: "" });
    load();
  };

  const remove = async (a: Assn) => {
    if (!confirm(`Remove ${a.full_name || a.email} as group admin?`)) return;
    const r = await callFn({ action: "remove", userId: a.user_id });
    if (r.error) toast.error(r.error); else { toast.success("Removed"); load(); }
  };

  const reset = async () => {
    if (!resetTarget || !resetPwd) return;
    setBusy(true);
    const r = await callFn({ action: "reset_password", userId: resetTarget.user_id, newPassword: resetPwd });
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Password reset");
    setResetTarget(null); setResetPwd("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Group admins</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Create group admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create group admin</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required /></div>
              <div><Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
              <div><Label>Phone (optional)</Label>
                <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Temporary password</Label>
                <Input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} /></div>
              <div><Label>Group</Label>
                <Select value={form.group_id} onValueChange={(v) => setForm({...form, group_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy || !form.group_id}>{busy ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">No group admins yet.</p>}
        {assignments.map((a) => (
          <div key={a.user_id} className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{a.full_name || a.email}</p>
              <p className="text-xs text-muted-foreground truncate">{a.email}</p>
            </div>
            <Badge variant="outline">{a.group_name || a.group_id.slice(0, 6)}</Badge>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setResetTarget(a)}>
                <KeyRound className="w-4 h-4 mr-1" />Reset password
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetPwd(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password for {resetTarget?.full_name || resetTarget?.email}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>New temporary password</Label>
            <Input value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} minLength={6} />
            <p className="text-xs text-muted-foreground">They will be required to change it on next login.</p>
          </div>
          <DialogFooter>
            <Button onClick={reset} disabled={busy || !resetPwd}>{busy ? "Saving..." : "Reset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
export default GroupAdminManagementPage;
