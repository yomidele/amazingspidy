import { useState, useEffect } from "react";
import { Settings, Save, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const InterestRateSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalRate, setTotalRate] = useState("5");
  const [investorRate, setInvestorRate] = useState("3");
  const [adminRate, setAdminRate] = useState("2");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [adminEarnings, setAdminEarnings] = useState(0);

  const isValid = Number(investorRate) + Number(adminRate) === Number(totalRate);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const [settingsRes, earningsRes] = await Promise.all([
      supabase.from("admin_settings" as any).select("*").eq("setting_key", "investment_interest").maybeSingle(),
      supabase.from("admin_earnings" as any).select("amount"),
    ]);

    if (settingsRes.data) {
      const d = settingsRes.data as any;
      setTotalRate(String(d.total_interest_rate));
      setInvestorRate(String(d.investor_share_rate));
      setAdminRate(String(d.admin_share_rate));
      setLastUpdated(d.updated_at);
    }

    const total = (earningsRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
    setAdminEarnings(total);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Investor share + Admin share must equal Total rate");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("admin_settings" as any)
        .update({
          total_interest_rate: Number(totalRate),
          investor_share_rate: Number(investorRate),
          admin_share_rate: Number(adminRate),
          updated_by: user?.id,
        } as any)
        .eq("setting_key", "investment_interest");

      if (error) throw error;

      await logActivity(
        "rate_change",
        `Interest rates updated: Total ${totalRate}%, Investor ${investorRate}%, Admin ${adminRate}%`,
        "admin_settings",
        "investment_interest",
        user?.id
      );

      toast.success("Interest rates updated successfully");
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update rates");
    } finally {
      setSaving(false);
    }
  };

  const handleTotalChange = (val: string) => {
    setTotalRate(val);
    // Auto-adjust admin rate
    const newAdmin = Number(val) - Number(investorRate);
    if (newAdmin >= 0) setAdminRate(String(newAdmin));
  };

  const handleInvestorChange = (val: string) => {
    setInvestorRate(val);
    const newAdmin = Number(totalRate) - Number(val);
    if (newAdmin >= 0) setAdminRate(String(newAdmin));
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Investment Interest Rates
          </CardTitle>
          <CardDescription>
            Configure how investment returns are split between investors and admin. Changes only affect new investments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="font-medium">Total Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={totalRate}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Overall return on investment</p>
            </div>
            <div>
              <Label className="font-medium">Investor Share (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={investorRate}
                onChange={(e) => handleInvestorChange(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Paid to the investor</p>
            </div>
            <div>
              <Label className="font-medium">Admin Share (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={adminRate}
                onChange={(e) => setAdminRate(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Retained as admin revenue</p>
            </div>
          </div>

          {!isValid && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Investor share ({investorRate}%) + Admin share ({adminRate}%) = {Number(investorRate) + Number(adminRate)}% — must equal Total rate ({totalRate}%)
            </div>
          )}

          {isValid && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p><strong>Example:</strong> On a £10,000 investment:</p>
              <p>• Investor receives: <span className="text-green-600 font-medium">£{(10000 * Number(investorRate) / 100).toLocaleString()}</span></p>
              <p>• Admin earns: <span className="text-primary font-medium">£{(10000 * Number(adminRate) / 100).toLocaleString()}</span></p>
              <p>• Total return: <span className="font-medium">£{(10000 * Number(totalRate) / 100).toLocaleString()}</span></p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {lastUpdated && <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>}
            </div>
            <Button onClick={handleSave} disabled={saving || !isValid}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Rates"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Earnings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Revenue from Investments</CardTitle>
          <CardDescription>Total admin earnings from investment interest splits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-primary">£{adminEarnings.toLocaleString()}</div>
            <Badge variant="secondary">Lifetime Earnings</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterestRateSettings;
