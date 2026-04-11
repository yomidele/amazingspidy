import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, TrendingUp, DollarSign, Receipt, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

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

interface InvestorPayment {
  id: string;
  investor_id: string;
  investment_id: string;
  amount_paid: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  investor_name?: string;
  investment_amount?: number;
}

interface Props {
  initialTab?: "overview" | "payments";
}

const InvestorManagementPage = ({ initialTab = "overview" }: Props) => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [payments, setPayments] = useState<InvestorPayment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "payments">(initialTab);

  // Promote user dialog
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteMode, setPromoteMode] = useState<"choose" | "existing" | "new">("choose");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [nonInvestorUsers, setNonInvestorUsers] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [selectedPromoteUser, setSelectedPromoteUser] = useState("");
  const [newInvestorForm, setNewInvestorForm] = useState({ fullName: "", email: "", password: "", phone: "" });

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

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    investor_id: "",
    investment_id: "",
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, invDataRes, allProfilesRes, paymentsRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "investor" as any),
      supabase.from("investments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("investor_payments" as any).select("*").order("payment_date", { ascending: false }),
    ]);

    const profileMap = new Map(allProfilesRes.data?.map((p: any) => [p.user_id, { name: p.full_name || "Unknown", email: p.email }]) || []);
    const investorIds = new Set(rolesRes.data?.map((r) => r.user_id) || []);

    setInvestors(
      Array.from(investorIds).map((id) => ({
        user_id: id,
        full_name: (profileMap.get(id) as any)?.name || "Unknown",
        email: (profileMap.get(id) as any)?.email || null,
      }))
    );

    // Build list of non-investor users for promotion
    const nonInvestors = (allProfilesRes.data || [])
      .filter((p: any) => !investorIds.has(p.user_id))
      .map((p: any) => ({ user_id: p.user_id, full_name: p.full_name, email: p.email }));
    setNonInvestorUsers(nonInvestors);

    const investmentMap = new Map<string, number>();
    const mappedInvestments = (invDataRes.data || []).map((inv: any) => {
      investmentMap.set(inv.id, Number(inv.amount));
      return { ...inv, investor_name: (profileMap.get(inv.investor_id) as any)?.name || "Unknown" };
    });
    setInvestments(mappedInvestments);

    setPayments(
      (paymentsRes.data || []).map((p: any) => ({
        ...p,
        investor_name: (profileMap.get(p.investor_id) as any)?.name || "Unknown",
        investment_amount: investmentMap.get(p.investment_id) || 0,
      }))
    );

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handlePromoteToInvestor = async () => {
    if (!selectedPromoteUser) { toast.error("Please select a user"); return; }
    setPromoteLoading(true);
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedPromoteUser,
        role: "investor" as any,
      });
      if (error) throw error;
      toast.success("User promoted to investor successfully");
      setPromoteOpen(false);
      setSelectedPromoteUser("");
      setPromoteMode("choose");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to promote user");
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleCreateNewInvestor = async () => {
    const { fullName, email, password, phone } = newInvestorForm;
    if (!fullName || !email || !password) { toast.error("Name, email and password are required"); return; }
    setPromoteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-member", {
        body: { email, password, fullName, phone, role: "investor" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("New investor account created successfully. Share login credentials via WhatsApp.");
      setPromoteOpen(false);
      setNewInvestorForm({ fullName: "", email: "", password: "", phone: "" });
      setPromoteMode("choose");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create investor");
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleRevokeInvestorRole = async (userId: string, name: string) => {
    if (!confirm(`Revoke investor access for "${name}"? They will no longer be able to access the investor dashboard.`)) return;
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "investor" as any);
      if (error) throw error;
      toast.success("Investor access revoked");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access");
    }
  };

  const openAddInvestment = () => {
    setEditingInvestment(null);
    setInvestmentForm({ investor_id: "", amount: "", interest_rate: "0", duration_months: "12", start_date: new Date().toISOString().split("T")[0], end_date: "", status: "active", notes: "" });
    setInvestmentOpen(true);
  };

  const openEditInvestment = (inv: Investment) => {
    setEditingInvestment(inv);
    setInvestmentForm({ investor_id: inv.investor_id, amount: String(inv.amount), interest_rate: String(inv.interest_rate), duration_months: String(inv.duration_months), start_date: inv.start_date, end_date: inv.end_date || "", status: inv.status, notes: inv.notes || "" });
    setInvestmentOpen(true);
  };

  const handleSaveInvestment = async () => {
    if (!investmentForm.investor_id || !investmentForm.amount) {
      toast.error("Investor and amount are required"); return;
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
      await logActivity("investment_created", `New investment of £${investmentForm.amount} added`, "investment", "new", investmentForm.investor_id);
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

  const handleRecordPayment = async () => {
    if (!paymentForm.investor_id || !paymentForm.investment_id || !paymentForm.amount_paid) {
      toast.error("Investor, investment, and amount are required"); return;
    }
    const { error } = await supabase.from("investor_payments" as any).insert({
      investor_id: paymentForm.investor_id,
      investment_id: paymentForm.investment_id,
      amount_paid: Number(paymentForm.amount_paid),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || null,
    });
    if (error) { toast.error("Failed to record payment"); return; }
    toast.success("Payment recorded");
    const invName = investors.find((i) => i.user_id === paymentForm.investor_id)?.full_name || "Unknown";
    await logActivity("investor_payment", `Recorded payment of £${paymentForm.amount_paid} to investor ${invName}`, "investor_payment", paymentForm.investment_id, paymentForm.investor_id);
    setPaymentOpen(false);
    setPaymentForm({ investor_id: "", investment_id: "", amount_paid: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    fetchData();
  };

  const getExpectedReturn = (inv: Investment) => Number(inv.amount) * (1 + Number(inv.interest_rate) / 100);
  const getTotalPaid = (investmentId: string) => payments.filter((p) => p.investment_id === investmentId).reduce((s, p) => s + Number(p.amount_paid), 0);

  const totalCapital = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpectedReturn = investments.reduce((s, i) => s + getExpectedReturn(i), 0);
  const totalPaidOut = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalRemaining = totalExpectedReturn - totalPaidOut;

  const filteredInvestments = investments.filter(
    (inv) => inv.investor_name?.toLowerCase().includes(search.toLowerCase()) || inv.status.toLowerCase().includes(search.toLowerCase())
  );

  const investorInvestments = investments.filter((i) => i.investor_id === paymentForm.investor_id);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button variant={activeTab === "overview" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("overview")}>
          <TrendingUp className="w-4 h-4 mr-2" /> Overview & Investments
        </Button>
        <Button variant={activeTab === "payments" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("payments")}>
          <Receipt className="w-4 h-4 mr-2" /> Payments
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investors</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{investors.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capital</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">£{totalCapital.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">£{totalExpectedReturn.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">£{totalRemaining.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="investor" onClick={() => { setPromoteMode("choose"); setPromoteOpen(true); }}>
              <ShieldCheck className="w-4 h-4 mr-2" /> Activate Investor Role
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
            <CardHeader><CardTitle>Active Investors</CardTitle></CardHeader>
            <CardContent>
              {investors.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No investors yet. Promote an existing user to investor.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {investors.map((inv) => (
                    <div key={inv.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="font-semibold text-sm">{inv.full_name?.charAt(0)?.toUpperCase() || "?"}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{inv.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeInvestorRole(inv.user_id, inv.full_name || "Unknown")}
                        title="Revoke investor access"
                      >
                        <ShieldOff className="w-4 h-4 text-destructive" />
                      </Button>
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
                        <TableHead>Principal</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Expected Return</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvestments.map((inv) => {
                        const expected = getExpectedReturn(inv);
                        const paid = getTotalPaid(inv.id);
                        const balance = expected - paid;
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.investor_name}</TableCell>
                            <TableCell>£{Number(inv.amount).toLocaleString()}</TableCell>
                            <TableCell>{inv.interest_rate}%</TableCell>
                            <TableCell className="text-amber-600 font-medium">£{expected.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600 font-medium">£{paid.toLocaleString()}</TableCell>
                            <TableCell className="text-destructive font-medium">£{balance.toLocaleString()}</TableCell>
                            <TableCell><Badge variant={inv.status === "active" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditInvestment(inv)}><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteInvestment(inv.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "payments" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="investor" onClick={() => setPaymentOpen(true)}>
              <DollarSign className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.investor_name}</TableCell>
                          <TableCell className="text-green-600 font-medium">£{Number(p.amount_paid).toLocaleString()}</TableCell>
                          <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Promote User to Investor Dialog */}
      <Dialog open={promoteOpen} onOpenChange={(open) => { setPromoteOpen(open); if (!open) setPromoteMode("choose"); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Investor Role</DialogTitle>
            <DialogDescription>
              {promoteMode === "choose" && "Choose how to add an investor."}
              {promoteMode === "existing" && "Select an existing member to grant investor access."}
              {promoteMode === "new" && "Create a new account with investor role."}
            </DialogDescription>
          </DialogHeader>

          {promoteMode === "choose" && (
            <div className="grid grid-cols-1 gap-3 py-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-1" onClick={() => setPromoteMode("existing")}>
                <span className="font-semibold">Add from Existing Members</span>
                <span className="text-xs text-muted-foreground">Promote a current contributor to also be an investor</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-1" onClick={() => setPromoteMode("new")}>
                <span className="font-semibold">Create New Investor Account</span>
                <span className="text-xs text-muted-foreground">Register a brand new user with investor login credentials</span>
              </Button>
            </div>
          )}

          {promoteMode === "existing" && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Select User</Label>
                <Select value={selectedPromoteUser} onValueChange={setSelectedPromoteUser}>
                  <SelectTrigger><SelectValue placeholder="Choose a user to promote" /></SelectTrigger>
                  <SelectContent>
                    {nonInvestorUsers.length === 0 ? (
                      <SelectItem value="_none" disabled>All users already have investor access</SelectItem>
                    ) : (
                      nonInvestorUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name || "Unknown"} — {u.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPromoteMode("choose")}>Back</Button>
                <Button variant="investor" onClick={handlePromoteToInvestor} disabled={promoteLoading || !selectedPromoteUser}>
                  {promoteLoading ? "Promoting..." : "Activate Investor Role"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {promoteMode === "new" && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Full Name</Label>
                <Input value={newInvestorForm.fullName} onChange={(e) => setNewInvestorForm({ ...newInvestorForm, fullName: e.target.value })} placeholder="Investor full name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newInvestorForm.email} onChange={(e) => setNewInvestorForm({ ...newInvestorForm, email: e.target.value })} placeholder="investor@email.com" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={newInvestorForm.password} onChange={(e) => setNewInvestorForm({ ...newInvestorForm, password: e.target.value })} placeholder="Set a password" />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={newInvestorForm.phone} onChange={(e) => setNewInvestorForm({ ...newInvestorForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPromoteMode("choose")}>Back</Button>
                <Button variant="investor" onClick={handleCreateNewInvestor} disabled={promoteLoading || !newInvestorForm.fullName || !newInvestorForm.email || !newInvestorForm.password}>
                  {promoteLoading ? "Creating..." : "Create Investor Account"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Investment Dialog */}
      <Dialog open={investmentOpen} onOpenChange={setInvestmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInvestment ? "Edit Investment" : "Add Investment"}</DialogTitle>
            <DialogDescription>
              {editingInvestment ? "Update the investment details below." : "Record a new investment for an existing investor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Investor</Label>
              <Select value={investmentForm.investor_id} onValueChange={(v) => setInvestmentForm({ ...investmentForm, investor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>{investors.map((inv) => (<SelectItem key={inv.user_id} value={inv.user_id}>{inv.full_name || inv.email}</SelectItem>))}</SelectContent>
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
            <Button variant="investor" onClick={handleSaveInvestment}>{editingInvestment ? "Update" : "Add Investment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment to Investor</DialogTitle>
            <DialogDescription>Record a payment made to an investor for their investment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Investor</Label>
              <Select value={paymentForm.investor_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, investor_id: v, investment_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>{investors.map((inv) => (<SelectItem key={inv.user_id} value={inv.user_id}>{inv.full_name || inv.email}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Investment</Label>
              <Select value={paymentForm.investment_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, investment_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select investment" /></SelectTrigger>
                <SelectContent>
                  {investorInvestments.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>£{Number(inv.amount).toLocaleString()} — {inv.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount Paid (£)</Label><Input type="number" value={paymentForm.amount_paid} onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })} /></div>
            <div><Label>Payment Date</Label><Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button variant="investor" onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestorManagementPage;
