import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Req {
  id: string; group_id: string; full_name: string; email: string; phone: string | null;
  status: string; created_at: string; requested_by: string;
}

const MembershipRequestsPage = () => {
  const [items, setItems] = useState<Req[]>([]);
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [requesters, setRequesters] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [approveTarget, setApproveTarget] = useState<Req | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("membership_requests")
      .select("*").eq("status", filter).order("created_at", { ascending: false });
    const list = (data as Req[]) || [];
    setItems(list);
    const gids = [...new Set(list.map((r) => r.group_id))];
    const uids = [...new Set(list.map((r) => r.requested_by))];
    if (gids.length) {
      const { data: gs } = await supabase.from("contribution_groups").select("id,name").in("id", gids);
      setGroups(Object.fromEntries((gs || []).map((g: any) => [g.id, g.name])));
    }
    if (uids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id,full_name").in("user_id", uids);
      setRequesters(Object.fromEntries((ps || []).map((p: any) => [p.user_id, p.full_name])));
    }
  };
  useEffect(() => { load(); }, [filter]);

  const callFn = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/approve-membership-request`, {
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

  const doApprove = async () => {
    if (!approveTarget || !password) return;
    setBusy(true);
    const r = await callFn({ action: "approve", requestId: approveTarget.id, password });
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Approved & member added");
    setApproveTarget(null); setPassword(""); load();
  };

  const doReject = async (req: Req) => {
    const note = prompt("Reason (optional):") || undefined;
    const r = await callFn({ action: "reject", requestId: req.id, note });
    if (r.error) toast.error(r.error); else { toast.success("Rejected"); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Membership requests</CardTitle>
        <div className="flex gap-1">
          {(["pending","approved","rejected"] as const).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No {filter} requests.</p>}
        {items.map((r) => (
          <div key={r.id} className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{r.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.email}{r.phone ? ` • ${r.phone}` : ""}</p>
              <p className="text-xs text-muted-foreground">
                Group: <span className="text-foreground">{groups[r.group_id] || "—"}</span> •
                Requested by: <span className="text-foreground">{requesters[r.requested_by] || "—"}</span> •
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.status}</Badge>
              {r.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => setApproveTarget(r)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => doReject(r)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) { setApproveTarget(null); setPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {approveTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              An account will be created for <strong>{approveTarget?.email}</strong> and they will be added to the group.
            </p>
            <Label>Temporary password</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a starter password" />
            <p className="text-xs text-muted-foreground">Share this password with the member directly.</p>
          </div>
          <DialogFooter>
            <Button onClick={doApprove} disabled={busy || !password}>{busy ? "Approving..." : "Approve & create account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
export default MembershipRequestsPage;
