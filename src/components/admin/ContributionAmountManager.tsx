import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wallet, History, Pencil, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  groupId: string;
  groupName?: string;
  /** Hide history list (compact mode) */
  compact?: boolean;
}

interface HistoryRow {
  id: string;
  old_amount: number;
  new_amount: number;
  applied_retroactively: boolean;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

const ContributionAmountManager = ({ groupId, groupName, compact }: Props) => {
  const [current, setCurrent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [retro, setRetro] = useState(false);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: h }] = await Promise.all([
      supabase.from("contribution_groups").select("contribution_amount, name").eq("id", groupId).maybeSingle(),
      supabase
        .from("contribution_amount_history")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (g) {
      setCurrent(Number(g.contribution_amount));
      setAmount(String(g.contribution_amount));
    }
    setHistory((h as HistoryRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!groupId) return;
    load();
    const ch = supabase
      .channel(`amt-mgr-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_groups", filter: `id=eq.${groupId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_amount_history", filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0 && /^\d+(\.\d{1,2})?$/.test(amount.trim());
  const changed = valid && parsed !== current;

  const askConfirm = () => {
    if (!valid) {
      toast.error("Enter a valid positive amount (max 2 decimals)");
      return;
    }
    if (!changed) {
      toast.info("No change to save");
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("update_group_contribution_amount", {
      _group_id: groupId,
      _new_amount: parsed,
      _apply_retroactive: retro,
      _note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to update amount");
      return;
    }
    toast.success(`Monthly amount updated to £${parsed}`);
    setConfirmOpen(false);
    setEditing(false);
    setNote("");
    setRetro(false);
    load();
  };

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-contribution" />
            Monthly Contribution Amount
            {groupName && <Badge variant="outline" className="ml-2 font-normal">{groupName}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !editing ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-bold tracking-tight">£{current ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">per member, per month</p>
              </div>
              <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="amt">New amount (£)</Label>
                <Input
                  id="amt"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  autoFocus
                />
                {!valid && amount && (
                  <p className="text-[11px] text-destructive">Enter a positive number with up to 2 decimal places</p>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <Switch checked={retro} onCheckedChange={setRetro} id="retro" />
                <div className="text-xs">
                  <Label htmlFor="retro" className="text-sm font-medium">Apply retroactively to unpaid months</Label>
                  <p className="text-muted-foreground mt-0.5">
                    {retro
                      ? "All open (non-finalized) months will use the new amount."
                      : "Only the current and future months will use the new amount. Past unpaid months stay at the old amount."}
                  </p>
                  <p className="text-muted-foreground mt-1">Finalized (paid) records are never changed.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the change" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setAmount(String(current ?? "")); setNote(""); setRetro(false); }}>
                  Cancel
                </Button>
                <Button variant="contribution" size="sm" onClick={askConfirm} disabled={!changed}>
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {!compact && history.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5" /> Change history
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="text-xs flex items-start justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2">
                    <div>
                      <p className="font-medium">£{h.old_amount} → £{h.new_amount}</p>
                      <p className="text-muted-foreground">
                        {h.changed_by_name || "Admin"} • {new Date(h.created_at).toLocaleString()}
                        {h.applied_retroactively ? " • retroactive" : " • future months"}
                      </p>
                      {h.note && <p className="text-muted-foreground italic mt-0.5">“{h.note}”</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm amount change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the monthly contribution amount from <strong>£{current}</strong> to <strong>£{parsed}</strong>?
              <br />
              {retro
                ? "All unpaid (non-finalized) months will be recalculated."
                : "Only current and future months will use the new amount."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contribution" onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : <><Check className="w-4 h-4 mr-1.5" /> Yes, change</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContributionAmountManager;
