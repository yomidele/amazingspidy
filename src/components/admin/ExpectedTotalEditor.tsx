import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Pencil, Loader2, RotateCcw } from "lucide-react";

interface Props {
  groupId: string;
  month: number;
  year: number;
  /** Latest expected total currently stored on monthly_contributions */
  expected: number;
  /** Whether the value is a manual override (passed from parent if known) */
  isOverride?: boolean;
  /** Auto-calculated baseline (per-member × members), shown for reference */
  autoBaseline?: number;
  onUpdated?: () => void;
}

const ExpectedTotalEditor = ({ groupId, month, year, expected, isOverride, autoBaseline, onUpdated }: Props) => {
  const [override, setOverride] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOverride = async () => {
    const { data } = await supabase
      .from("monthly_contributions")
      .select("expected_total_override")
      .eq("group_id", groupId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();
    setOverride(data?.expected_total_override ?? null);
  };

  useEffect(() => {
    if (groupId && month && year) loadOverride();
  }, [groupId, month, year]);

  const manual = isOverride ?? override !== null;

  const openDialog = () => {
    setAmount(String(expected ?? ""));
    setNote("");
    setOpen(true);
  };

  const save = async (clear = false) => {
    const parsed = clear ? null : parseFloat(amount);
    if (!clear && (isNaN(parsed!) || parsed! < 0)) {
      toast.error("Enter a valid non-negative amount");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("set_monthly_expected_total", {
      _group_id: groupId,
      _month: month,
      _year: year,
      _amount: parsed,
      _note: clear ? null : note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to save");
      return;
    }
    toast.success(clear ? "Reverted to auto-calculated total" : `Expected total set to £${parsed}`);
    setOpen(false);
    setOverride(parsed);
    onUpdated?.();
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-contribution-light flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-contribution" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">Expected Total</p>
                  {manual && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">manual</Badge>}
                </div>
                <p className="font-bold truncate">£{expected || 0}</p>
                {manual && autoBaseline !== undefined && (
                  <p className="text-[10px] text-muted-foreground">auto: £{autoBaseline}</p>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={openDialog} title="Edit expected total">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expected Total Amount</DialogTitle>
            <DialogDescription>
              The official monthly target for this group. This does not change the per-member contribution amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Expected Total (£)</Label>
              <Input
                id="amt"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n">Note (optional)</Label>
              <Textarea id="n" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for change" />
            </div>
            {manual && (
              <p className="text-xs text-muted-foreground">
                Currently using a manual total. You can revert to the auto-calculated value (per-member × active members).
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            {manual && (
              <Button variant="ghost" size="sm" onClick={() => save(true)} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Revert to auto
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contribution" size="sm" onClick={() => save(false)} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpectedTotalEditor;
