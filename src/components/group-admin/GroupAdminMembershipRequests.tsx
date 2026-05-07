import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Props { groupId: string }

interface Req {
  id: string; full_name: string; email: string; phone: string | null;
  status: string; created_at: string; review_note: string | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const GroupAdminMembershipRequests = ({ groupId }: Props) => {
  const [requests, setRequests] = useState<Req[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("membership_requests")
      .select("id,full_name,email,phone,status,created_at,review_note")
      .eq("group_id", groupId).order("created_at", { ascending: false });
    setRequests((data as Req[]) || []);
  };

  useEffect(() => { load(); }, [groupId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { error } = await supabase.from("membership_requests").insert({
      group_id: groupId,
      requested_by: user.id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted for super admin approval");
    setOpen(false);
    setForm({ full_name: "", email: "", phone: "", notes: "" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Membership requests</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Request new member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request new member</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Full name</Label>
                <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
              <div><Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><Label>Phone (optional)</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Notes (optional)</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit request"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.email}{r.phone ? ` • ${r.phone}` : ""}</p>
              {r.review_note && <p className="text-xs text-muted-foreground mt-1">Note: {r.review_note}</p>}
            </div>
            <Badge className={statusColor[r.status] || ""}>{r.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
export default GroupAdminMembershipRequests;
