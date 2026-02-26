import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  DollarSign,
  Check,
  X,
  Calendar,
  Users,
  Eye,
  Download,
  Trash2,
  Pencil,
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
import TransactionReceiptDialog from "@/components/shared/TransactionReceiptDialog";

interface MonthlyContribution {
  id: string;
  month: number;
  year: number;
  group_id: string;
  total_expected: number | null;
  total_collected: number | null;
}

interface Payment {
  id: string;
  user_id: string;
  monthly_contribution_id: string;
  amount: number;
  status: string | null;
  payment_date: string | null;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const PaymentRecordingPage = () => {
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContribution, setSelectedContribution] = useState<string>("");
  const [initialContributionId, setInitialContributionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [groupName, setGroupName] = useState<string>("Amana Market");

  // new states for editing and deletion
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newPayment, setNewPayment] = useState({
    user_id: "",
    amount: 0,
    status: "paid",
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    // read param
    const params = new URLSearchParams(location.search);
    const contribId = params.get("contribution");
    if (contribId) setInitialContributionId(contribId);
    fetchData();
  }, [location.search]);

  useEffect(() => {
    if (selectedContribution) {
      fetchPayments(selectedContribution);
    }
  }, [selectedContribution]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch monthly contributions
      const { data: contribData, error: contribError } = await supabase
        .from("monthly_contributions")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (contribError) throw contribError;
      setContributions(contribData || []);

      if (contribData && contribData.length > 0) {
        // FIXED: Only set selectedContribution if it's truly empty
        // This preserves the user's selection across re-renders and API calls
        if (!selectedContribution) {
          // If no selection exists, prefer URL param, otherwise use first contribution
          if (
            initialContributionId &&
            contribData.find((c) => c.id === initialContributionId)
          ) {
            setSelectedContribution(initialContributionId);
          } else {
            setSelectedContribution(contribData[0].id);
          }
        }
      }

      // Fetch members
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email");

      if (profilesError) throw profilesError;
      setMembers(profilesData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (contributionId: string) => {
    // update url param
    const params = new URLSearchParams(location.search);
    params.set("contribution", contributionId);
    navigate({ search: params.toString() }, { replace: true });
    try {
      const { data, error } = await supabase
        .from("contribution_payments")
        .select("*")
        .eq("monthly_contribution_id", contributionId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      const list = data || [];
      setPayments(list);

      // Fetch group name for the selected contribution
      const contrib = contributions.find((c) => c.id === contributionId);
      if (contrib?.group_id) {
        const { data: groupData } = await supabase
          .from("contribution_groups")
          .select("name")
          .eq("id", contrib.group_id)
          .maybeSingle();
        if (groupData) setGroupName(groupData.name);
      }

      return list;
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      return [];
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedContribution || !newPayment.user_id) {
      toast.error("Please select a member");
      return;
    }

    try {
      const contribution = contributions.find((c) => c.id === selectedContribution);
      const memberName = getMemberName(newPayment.user_id);
      const periodName = contribution
        ? `${monthNames[contribution.month - 1]} ${contribution.year}`
        : "this month";

      if (paymentToEdit) {
        // Updating an existing payment
        const { error } = await supabase
          .from("contribution_payments")
          .update({
            user_id: newPayment.user_id,
            amount: newPayment.amount,
            status: newPayment.status,
            payment_date: new Date().toISOString(),
          })
          .eq("id", paymentToEdit.id);
        if (error) throw error;

        // Notify contributor about the change
        await supabase.from("notifications").insert({
          user_id: newPayment.user_id,
          title: "Payment Updated",
          message: `Your payment of £${newPayment.amount} for ${periodName} has been updated by admin.`,
          type: "payment",
          link: "/dashboard/contributor",
        });
      } else {
        // Create new payment
        const { error } = await supabase.from("contribution_payments").insert({
          monthly_contribution_id: selectedContribution,
          user_id: newPayment.user_id,
          amount: newPayment.amount,
          status: newPayment.status,
          payment_date: new Date().toISOString(),
        });

        if (error) throw error;

        // Send initial notification
        if (newPayment.status === "paid") {
          await supabase.from("notifications").insert({
            user_id: newPayment.user_id,
            title: "Payment Confirmed ✓",
            message: `Your contribution of £${newPayment.amount} for ${periodName} has been recorded. Thank you!`,
            type: "payment",
            link: "/dashboard/contributor",
          });
        }
      }

      // FIXED: Only fetch payments for the current selection and update totals
      // This preserves selectedContribution and prevents month reset
      const updatedPayments = await fetchPayments(selectedContribution);
      const totalPaid = updatedPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      if (contribution) {
        await supabase
          .from("monthly_contributions")
          .update({ total_collected: totalPaid })
          .eq("id", selectedContribution);
        
        // Update local contributions state without resetting selectedContribution
        setContributions(prev =>
          prev.map(c =>
            c.id === selectedContribution
              ? { ...c, total_collected: totalPaid }
              : c
          )
        );
      }

      toast.success(paymentToEdit ? "Payment updated successfully" : "Payment recorded successfully");
      setIsRecordPaymentOpen(false);
      setPaymentToEdit(null);
      setNewPayment({ user_id: "", amount: getPerMemberAmount(), status: "paid" });
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("contribution_payments")
        .update({ status })
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Payment status updated");
      
      // FIXED: Only fetch and update payments for current selection
      // Preserves selectedContribution without full data reload
      const updatedPayments = await fetchPayments(selectedContribution);
      // Recalculate total collected
      const totalPaid = updatedPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      await supabase
        .from("monthly_contributions")
        .update({ total_collected: totalPaid })
        .eq("id", selectedContribution);

      // Update local state with recalculated total
      setContributions(prev =>
        prev.map(c =>
          c.id === selectedContribution
            ? { ...c, total_collected: totalPaid }
            : c
        )
      );
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment status");
    }
  };

  const confirmDeletePayment = async () => {
    if (!paymentToEdit) return;
    try {
      const deleted = await supabase
        .from("contribution_payments")
        .delete()
        .eq("id", paymentToEdit.id);

      if (deleted.error) throw deleted.error;

      // notify user
      const contribution = contributions.find((c) => c.id === selectedContribution);
      const periodName = contribution
        ? `${monthNames[contribution.month - 1]} ${contribution.year}`
        : "this period";

      await supabase.from("notifications").insert({
        user_id: paymentToEdit.user_id,
        title: "Payment Removed",
        message: `Your payment of £${paymentToEdit.amount} for ${periodName} has been removed by admin.`,
        type: "payment",
        link: "/dashboard/contributor",
      });

      toast.success("Payment deleted");
      setIsDeleteDialogOpen(false);
      setPaymentToEdit(null);
      
      // FIXED: Only fetch and update for current selection
      // Preserves selectedContribution without full data reload
      const updatedPayments = await fetchPayments(selectedContribution);
      const totalPaid = updatedPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      if (contribution) {
        await supabase
          .from("monthly_contributions")
          .update({ total_collected: totalPaid })
          .eq("id", selectedContribution);
        
        // Update local state with new total
        setContributions(prev =>
          prev.map(c =>
            c.id === selectedContribution
              ? { ...c, total_collected: totalPaid }
              : c
          )
        );
      }
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.full_name || member?.email || "Unknown";
  };

  const openEditDialog = (payment: Payment) => {
    setPaymentToEdit(payment);
    setNewPayment({
      user_id: payment.user_id,
      amount: payment.amount,
      status: payment.status || "pending",
    });
    setIsRecordPaymentOpen(true);
  };

  const openDeleteDialog = (payment: Payment) => {
    setPaymentToEdit(payment);
    setIsDeleteDialogOpen(true);
  };

  const getMembersNotPaid = () => {
    const paidUserIds = payments.map((p) => p.user_id);
    return members.filter((m) => !paidUserIds.includes(m.user_id));
  };

  const handleViewReceipt = (payment: Payment) => {
    const currentContrib = contributions.find((c) => c.id === selectedContribution);
    setSelectedPayment({
      id: payment.id,
      type: "contribution",
      amount: payment.amount,
      date: payment.payment_date || new Date().toISOString(),
      status: payment.status || "pending",
      memberName: getMemberName(payment.user_id),
      period: currentContrib
        ? `${monthNames[currentContrib.month - 1]} ${currentContrib.year}`
        : undefined,
      groupName,
    });
    setReceiptOpen(true);
  };

  const currentContribution = contributions.find((c) => c.id === selectedContribution);
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const getPerMemberAmount = () => {
    if (!currentContribution) return 0;
    if (currentContribution.per_member_amount && currentContribution.per_member_amount > 0) {
      return currentContribution.per_member_amount;
    }
    // fallback compute if stored
    const memberCount = members.length; // approximate
    if (memberCount > 0 && currentContribution.total_expected) {
      return currentContribution.total_expected / memberCount;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Record Payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Record and track contribution payments from members
          </p>
        </div>
        <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
          <DialogTrigger asChild>
            <Button variant="contribution" disabled={!selectedContribution}>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {paymentToEdit ? "Edit Contribution Payment" : "Record Contribution Payment"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Member</Label>
                <Select
                  value={newPayment.user_id}
                  onValueChange={(v) => setNewPayment({ ...newPayment, user_id: v })}
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
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newPayment.status}
                  onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="contribution" onClick={handleRecordPayment}>
                {paymentToEdit ? "Update Payment" : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period Selector & Stats */}
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedContribution} onValueChange={setSelectedContribution}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {contributions.map((contrib) => (
                  <SelectItem key={contrib.id} value={contrib.id}>
                    {monthNames[contrib.month - 1]} {contrib.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-contribution-light flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-contribution" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-bold">£{currentContribution?.total_expected || 0}</p>
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
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="font-bold text-success">
                  £{currentContribution?.total_collected || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid / Pending</p>
                <p className="font-bold">
                  {paidCount} / {pendingCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : !selectedContribution ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Select a contribution period to view payments</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payments recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Record Payment" to add the first payment
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {getMemberName(payment.user_id)}
                      </TableCell>
                      <TableCell>£{payment.amount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.payment_date
                          ? new Date(payment.payment_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payment.status === "paid"
                              ? "default"
                              : payment.status === "pending"
                              ? "outline"
                              : "secondary"
                          }
                          className={
                            payment.status === "paid"
                              ? "bg-success text-success-foreground"
                              : payment.status === "pending"
                              ? "bg-warning/10 text-warning border-warning"
                              : ""
                          }
                        >
                          {payment.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(payment)}
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(payment)}
                            title="Edit Payment"
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(payment)}
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          {payment.status !== "paid" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdatePaymentStatus(payment.id, "paid")}
                            >
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                          )}
                          {payment.status !== "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdatePaymentStatus(payment.id, "pending")}
                            >
                              <X className="w-4 h-4 text-warning" />
                            </Button>
                          )}
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

      {/* Members Not Yet Paid */}
      {selectedContribution && getMembersNotPaid().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-warning">
              Members Not Yet Paid ({getMembersNotPaid().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getMembersNotPaid().map((member) => (
                <Badge
                  key={member.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-contribution-light"
                  onClick={() => {
                    setNewPayment({
                      ...newPayment,
                      user_id: member.user_id,
                      amount: getPerMemberAmount(),
                    });
                    setIsRecordPaymentOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {member.full_name || member.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Dialog */}
      <TransactionReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        transaction={selectedPayment}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
          </DialogHeader>
          <p className="py-2">
            Are you sure you want to delete this payment? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={confirmDeletePayment}
            >
              Delete
            </Button>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentRecordingPage;
