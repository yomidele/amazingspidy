import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  DollarSign,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Check,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Loan {
  id: string;
  user_id: string;
  group_id: string;
  principal_amount: number;
  outstanding_balance: number;
  monthly_repayment: number | null;
  status: string | null;
  issued_date: string | null;
  created_at: string;
}

interface LoanRepayment {
  id: string;
  loan_id: string;
  amount: number;
  repayment_date: string | null;
  repayment_type: string | null;
  notes: string | null;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Group {
  id: string;
  name: string;
}

const LoanManagementPage = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isIssueLoanOpen, setIsIssueLoanOpen] = useState(false);
  const [isRecordRepaymentOpen, setIsRecordRepaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [newLoan, setNewLoan] = useState({
    user_id: "",
    group_id: "",
    principal_amount: 0,
    monthly_repayment: 0,
  });

  const [newRepayment, setNewRepayment] = useState({
    amount: 0,
    repayment_type: "manual",
    notes: "",
  });

  // delete loan
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [isDeleteLoanOpen, setIsDeleteLoanOpen] = useState(false);
  const [isDeletingLoan, setIsDeletingLoan] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch loans
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .order("created_at", { ascending: false });

      if (loansError) throw loansError;
      setLoans(loansData || []);

      // Fetch repayments
      const { data: repaymentsData, error: repaymentsError } = await supabase
        .from("loan_repayments")
        .select("*")
        .order("repayment_date", { ascending: false });

      if (repaymentsError) throw repaymentsError;
      setRepayments(repaymentsData || []);

      // Fetch members
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email");

      if (profilesError) throw profilesError;
      setMembers(profilesData || []);

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("contribution_groups")
        .select("id, name");

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueLoan = async () => {
    try {
      const { error } = await supabase.from("loans").insert({
        user_id: newLoan.user_id,
        group_id: newLoan.group_id,
        principal_amount: newLoan.principal_amount,
        outstanding_balance: newLoan.principal_amount,
        monthly_repayment: newLoan.monthly_repayment || null,
        status: "active",
        issued_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Loan issued successfully");
      setIsIssueLoanOpen(false);
      setNewLoan({ user_id: "", group_id: "", principal_amount: 0, monthly_repayment: 0 });
      fetchData();
    } catch (error: any) {
      console.error("Error issuing loan:", error);
      toast.error(error.message || "Failed to issue loan");
    }
  };

  const handleRecordRepayment = async () => {
    if (!selectedLoan) return;

    try {
      // Insert repayment
      const { error: repaymentError } = await supabase.from("loan_repayments").insert({
        loan_id: selectedLoan.id,
        amount: newRepayment.amount,
        repayment_type: newRepayment.repayment_type,
        notes: newRepayment.notes || null,
        repayment_date: new Date().toISOString(),
      });

      if (repaymentError) throw repaymentError;

      // Update loan balance
      const newBalance = selectedLoan.outstanding_balance - newRepayment.amount;
      const newStatus = newBalance <= 0 ? "paid" : "active";

      const { error: updateError } = await supabase
        .from("loans")
        .update({
          outstanding_balance: Math.max(0, newBalance),
          status: newStatus,
        })
        .eq("id", selectedLoan.id);

      if (updateError) throw updateError;

      toast.success("Repayment recorded successfully");
      setIsRecordRepaymentOpen(false);
      setSelectedLoan(null);
      setNewRepayment({ amount: 0, repayment_type: "manual", notes: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error recording repayment:", error);
      toast.error("Failed to record repayment");
    }
  };

  const handleDeleteLoan = async () => {
    if (!deletingLoan) return;
    setIsDeletingLoan(true);

    try {
      const { error } = await supabase
        .from("loans")
        .delete()
        .eq("id", deletingLoan.id);
      if (error) throw error;

      toast.success("Loan deleted successfully");
      setIsDeleteLoanOpen(false);
      setDeletingLoan(null);
      // remove from local state immediately
      setLoans((prev) => prev.filter((l) => l.id !== deletingLoan.id));
    } catch (error: any) {
      console.error("Error deleting loan:", error);
      toast.error(error.message || "Failed to delete loan");
    } finally {
      setIsDeletingLoan(false);
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.full_name || member?.email || "Unknown";
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group?.name || "Unknown";
  };

  const getLoanRepayments = (loanId: string) => {
    return repayments.filter((r) => r.loan_id === loanId);
  };

  const totalOutstanding = loans.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0);
  const activeLoans = loans.filter((l) => l.status === "active").length;
  const paidLoans = loans.filter((l) => l.status === "paid").length;

  const filteredLoans = loans.filter((loan) => {
    const memberName = getMemberName(loan.user_id).toLowerCase();
    return memberName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Loan Management</h2>
          <p className="text-sm text-muted-foreground">
            Issue loans, track balances, and record repayments
          </p>
        </div>
        <Dialog open={isIssueLoanOpen} onOpenChange={setIsIssueLoanOpen}>
          <DialogTrigger asChild>
            <Button variant="contribution">
              <Plus className="w-4 h-4 mr-2" />
              Issue Loan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Loan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Member</Label>
                <Select
                  value={newLoan.user_id}
                  onValueChange={(v) => setNewLoan({ ...newLoan, user_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contribution Group</Label>
                <Select
                  value={newLoan.group_id}
                  onValueChange={(v) => setNewLoan({ ...newLoan, group_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input
                  type="number"
                  value={newLoan.principal_amount}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, principal_amount: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Repayment (optional)</Label>
                <Input
                  type="number"
                  value={newLoan.monthly_repayment}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, monthly_repayment: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="contribution" onClick={handleIssueLoan}>
                Issue Loan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="font-bold text-lg">${totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Loans</p>
                <p className="font-bold text-lg">{activeLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid Off</p>
                <p className="font-bold text-lg">{paidLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search loans by member..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loans ({filteredLoans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No loans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{getMemberName(loan.user_id)}</TableCell>
                      <TableCell>{getGroupName(loan.group_id)}</TableCell>
                      <TableCell>${loan.principal_amount.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-destructive">
                        ${loan.outstanding_balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {loan.monthly_repayment ? `$${loan.monthly_repayment}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            loan.status === "active"
                              ? "default"
                              : loan.status === "paid"
                              ? "outline"
                              : "destructive"
                          }
                          className={
                            loan.status === "active"
                              ? "bg-warning text-warning-foreground"
                              : loan.status === "paid"
                              ? "bg-success/10 text-success border-success"
                              : ""
                          }
                        >
                          {loan.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {loan.issued_date
                          ? new Date(loan.issued_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loan.status === "paid"}
                          onClick={() => {
                            setSelectedLoan(loan);
                            setIsRecordRepaymentOpen(true);
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Repay
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeletingLoan(loan);
                            setIsDeleteLoanOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Record Repayment Dialog */}
      <Dialog open={isRecordRepaymentOpen} onOpenChange={setIsRecordRepaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Loan Repayment</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Member</p>
                <p className="font-semibold">{getMemberName(selectedLoan.user_id)}</p>
                <p className="text-sm text-muted-foreground mt-2">Outstanding Balance</p>
                <p className="font-bold text-lg text-destructive">
                  ${selectedLoan.outstanding_balance.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Repayment Amount</Label>
                <Input
                  type="number"
                  value={newRepayment.amount}
                  onChange={(e) =>
                    setNewRepayment({ ...newRepayment, amount: parseFloat(e.target.value) })
                  }
                  max={selectedLoan.outstanding_balance}
                />
              </div>
              <div className="space-y-2">
                <Label>Repayment Type</Label>
                <Select
                  value={newRepayment.repayment_type}
                  onValueChange={(v) => setNewRepayment({ ...newRepayment, repayment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Payment</SelectItem>
                    <SelectItem value="auto_deduction">Auto Deduction (from payout)</SelectItem>
                    <SelectItem value="partial">Partial Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Add any notes..."
                  value={newRepayment.notes}
                  onChange={(e) => setNewRepayment({ ...newRepayment, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordRepaymentOpen(false)}>
              Cancel
            </Button>
            <Button variant="contribution" onClick={handleRecordRepayment}>
              Record Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Loan Confirmation Dialog */}
      <Dialog open={isDeleteLoanOpen} onOpenChange={setIsDeleteLoanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Loan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will permanently remove the loan record. Are you sure?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteLoanOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLoan}
              disabled={isDeletingLoan}
            >
              {isDeletingLoan ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanManagementPage;
