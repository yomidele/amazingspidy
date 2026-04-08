import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, TrendingUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Investor {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Investment {
  id: string;
  investor_id: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  investor_name?: string;
}

const InvestorManagementPage = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create investor dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newInvestor, setNewInvestor] = useState({ fullName: "", email: "", password: "" });

  // Investment dialog
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentForm, setInvestmentForm] = useState({
    investor_id: "",
    amount: "",
    interest_rate: "0",
    duration_months: "12",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "active",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    // Get all investor user_ids
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "investor" as any);

    const investorIds = roles?.map((r) => r.user_id) || [];

    if (investorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", investorIds);
      setInvestors(profiles || []);
    } else {
      setInvestors([]);
    }

    // Fetch all investments
    const { data: invData } = await supabase
      .from("investments")
      .select("*")
      .order("created_at", { ascending: false });

    // Map investor names
    const { data: allProfiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(allProfiles?.map((p) => [p.user_id, p.full_name || "Unknown"]) || []);

    setInvestments(
      (invData || []).map((inv) => ({
        ...inv,
        investor_name: profileMap.get(inv.investor_id) || "Unknown",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvestor = async () => {
    if (!newInvestor.fullName || !newInvestor.email || !newInvestor.password) {
      toast.error("All fields are required");
      return;
    }
    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-member", {
        body: {
          email: newInvestor.email,
          password: newInvestor.password,
          fullName: newInvestor.fullName,
          role: "investor",
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Investor created successfully");
      setCreateOpen(false);
      setNewInvestor({ fullName: "", email: "", password: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create investor");
    } finally {
      setCreateLoading(false);
    }
  };

  const openAddInvestment = () => {
    setEditingInvestment(null);
    setInvestmentForm({
      investor_id: "",
      amount: "",
      interest_rate: "0",
      duration_months: "12",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      status: "active",
      notes: "",
    });
    setInvestmentOpen(true);
  };

  const openEditInvestment = (inv: Investment) => {
    setEditingInvestment(inv);
    setInvestmentForm({
      investor_id: inv.investor_id,
      amount: String(inv.amount),
      interest_rate: String(inv.interest_rate),
      duration_months: String(inv.duration_months),
      start_date: inv.start_date,
      end_date: inv.end_date || "",
      status: inv.status,
      notes: inv.notes || "",
    });
    setInvestmentOpen(true);
  };

  const handleSaveInvestment = async () => {
    if (!investmentForm.investor_id || !investmentForm.amount) {
      toast.error("Investor and amount are required");
      return;
    }

    const payload = {
      investor_id: investmentForm.investor_id,
      amount: Number(investmentForm.amount),
      interest_rate: Number(investmentForm.interest_rate),
      duration_months: Number(investmentForm.duration_months),
      start_date: investmentForm.start_date,
      end_date: investmentForm.end_date || null,
      status: investmentForm.status,
      notes: investmentForm.notes || null,
    };

    if (editingInvestment) {
      const { error } = await supabase.from("investments").update(payload).eq("id", editingInvestment.id);
      if (error) { toast.error("Failed to update investment"); return; }
      toast.success("Investment updated");
    } else {
      const { error } = await supabase.from("investments").insert(payload);
      if (error) { toast.error("Failed to add investment"); return; }
      toast.success("Investment added");
    }

    setInvestmentOpen(false);
    fetchData();
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment?")) return;
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Investment deleted");
    fetchData();
  };

  const filteredInvestments = investments.filter(
    (inv) =>
      inv.investor_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investors</CardTitle>
            <TrendingUp className="w-4 h-4 text-investor" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{investors.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investments.filter((i) => i.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capital</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{investments.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="investor" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Investor
        </Button>
        <Button variant="outline" onClick={openAddInvestment}>
          <Plus className="w-4 h-4 mr-2" /> Add Investment
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search investments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Investors List */}
      <Card>
        <CardHeader><CardTitle>Investors</CardTitle></CardHeader>
        <CardContent>
          {investors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No investors yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {investors.map((inv) => (
                <div key={inv.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-full bg-investor-light flex items-center justify-center">
                    <span className="font-semibold text-sm text-investor">
                      {inv.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{inv.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investments Table */}
      <Card>
        <CardHeader><CardTitle>All Investments</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredInvestments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No investments found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestments.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.investor_name}</TableCell>
                      <TableCell>£{Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell>{inv.interest_rate}%</TableCell>
                      <TableCell>{inv.duration_months}mo</TableCell>
                      <TableCell>{new Date(inv.start_date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={inv.status === "active" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditInvestment(inv)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteInvestment(inv.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Investor Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Investor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={newInvestor.fullName} onChange={(e) => setNewInvestor({ ...newInvestor, fullName: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={newInvestor.email} onChange={(e) => setNewInvestor({ ...newInvestor, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={newInvestor.password} onChange={(e) => setNewInvestor({ ...newInvestor, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="investor" onClick={handleCreateInvestor} disabled={createLoading}>
              {createLoading ? "Creating..." : "Create Investor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investment Dialog */}
      <Dialog open={investmentOpen} onOpenChange={setInvestmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInvestment ? "Edit Investment" : "Add Investment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Investor</Label>
              <Select value={investmentForm.investor_id} onValueChange={(v) => setInvestmentForm({ ...investmentForm, investor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>
                  {investors.map((inv) => (
                    <SelectItem key={inv.user_id} value={inv.user_id}>{inv.full_name || inv.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount (£)</Label><Input type="number" value={investmentForm.amount} onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })} /></div>
              <div><Label>Interest Rate (%)</Label><Input type="number" value={investmentForm.interest_rate} onChange={(e) => setInvestmentForm({ ...investmentForm, interest_rate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Duration (months)</Label><Input type="number" value={investmentForm.duration_months} onChange={(e) => setInvestmentForm({ ...investmentForm, duration_months: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={investmentForm.status} onValueChange={(v) => setInvestmentForm({ ...investmentForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="matured">Matured</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={investmentForm.start_date} onChange={(e) => setInvestmentForm({ ...investmentForm, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={investmentForm.end_date} onChange={(e) => setInvestmentForm({ ...investmentForm, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={investmentForm.notes} onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestmentOpen(false)}>Cancel</Button>
            <Button variant="investor" onClick={handleSaveInvestment}>
              {editingInvestment ? "Update" : "Add Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestorManagementPage;
