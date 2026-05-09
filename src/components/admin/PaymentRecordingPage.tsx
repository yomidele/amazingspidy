import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logActivity } from "@/lib/activityLogger";
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
  UsersRound,
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  membership_number?: string | null;
}

interface Group {
  id: string;
  name: string;
}

const PaymentRecordingPage = () => {
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [membersLoading, setMembersLoading] = useState(false);
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

  // Realtime: when totals or payments or splits change, refresh
  useEffect(() => {
    const refreshContribRow = async (id: string) => {
      const { data } = await supabase
        .from("monthly_contributions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setContributions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...data } : c))
        );
      }
    };

    const channel = supabase
      .channel("payment-recording-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_contributions" }, (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.id) refreshContribRow(row.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_payments" }, (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.monthly_contribution_id === selectedContribution) {
          fetchPayments(selectedContribution);
        }
        if (row?.monthly_contribution_id) refreshContribRow(row.monthly_contribution_id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_splits" }, () => {
        if (selectedContribution) refreshContribRow(selectedContribution);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContribution]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch groups (teams)
      const { data: groupsData, error: groupsError } = await supabase
        .from("contribution_groups")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch monthly contributions
      const { data: contribData, error: contribError } = await supabase
        .from("monthly_contributions")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (contribError) throw contribError;
      setContributions(contribData || []);

      // Pick initial group: from URL contribution param, else first group
      const params = new URLSearchParams(location.search);
      const groupParam = params.get("group");
      const contribParam = params.get("contribution");
      let initialGroup = "";
      if (groupParam && groupsData?.find((g) => g.id === groupParam)) {
        initialGroup = groupParam;
      } else if (contribParam) {
        const c = contribData?.find((x) => x.id === contribParam);
        if (c) initialGroup = c.group_id;
      }
      if (!initialGroup && groupsData && groupsData.length > 0) {
        initialGroup = groupsData[0].id;
      }
      if (initialGroup && !selectedGroup) {
        setSelectedGroup(initialGroup);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch members for the selected group/team
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedGroup) {
        setMembers([]);
        return;
      }
      setMembersLoading(true);
      try {
        const { data: memberships, error: mErr } = await supabase
          .from("group_memberships")
          .select("user_id")
          .eq("group_id", selectedGroup)
          .eq("is_active", true);
        if (mErr) throw mErr;
        const userIds = (memberships || []).map((m) => m.user_id);
        if (userIds.length === 0) {
          setMembers([]);
          return;
        }
        const { data: profilesData, error: pErr } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, email, membership_number")
          .in("user_id", userIds)
          .order("membership_number", { ascending: true, nullsFirst: false });
        if (pErr) throw pErr;
        setMembers(profilesData || []);
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load team members");
      } finally {
        setMembersLoading(false);
      }
    };
    fetchTeamMembers();
  }, [selectedGroup]);

  // When group changes, auto-pick latest period for that group
  useEffect(() => {
    if (!selectedGroup) return;
    const params = new URLSearchParams(location.search);
    params.set("group", selectedGroup);
    navigate({ search: params.toString() }, { replace: true });

    const groupContribs = contributions.filter((c) => c.group_id === selectedGroup);
    const currentBelongs = groupContribs.find((c) => c.id === selectedContribution);
    if (!currentBelongs) {
      setSelectedContribution(groupContribs[0]?.id || "");
    }
  }, [selectedGroup, contributions]);


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

      // Totals are recalculated by DB trigger; refetch payments only
      await fetchPayments(selectedContribution);

      // Log activity
      const logMemberName = getMemberName(newPayment.user_id);
      await logActivity(
        paymentToEdit ? "payment_updated" : "payment_recorded",
        `${paymentToEdit ? "Updated" : "Recorded"} contribution payment of £${newPayment.amount} for ${logMemberName}`,
        "contribution_payment", paymentToEdit?.id || selectedContribution, newPayment.user_id
      );

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
      
      // Totals are recalculated by DB trigger; refetch payments only
      await fetchPayments(selectedContribution);
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
      
      // Totals are recalculated by DB trigger; refetch payments only
      await fetchPayments(selectedContribution);
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
    // Compute from total_expected and member count
    const memberCount = members.length;
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

      {/* Team & Period Selector & Stats */}
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UsersRound className="w-4 h-4" />
              Select Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" /> Period
              </Label>
              <Select value={selectedContribution} onValueChange={setSelectedContribution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {contributions
                    .filter((c) => !selectedGroup || c.group_id === selectedGroup)
                    .map((contrib) => (
                      <SelectItem key={contrib.id} value={contrib.id}>
                        {monthNames[contrib.month - 1]} {contrib.year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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
                <p className="text-xs text-muted-foreground">Members / Paid</p>
                <p className="font-bold">
                  {members.length} / {paidCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Payment Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-contribution" />
            {selectedGroup
              ? `${groups.find((g) => g.id === selectedGroup)?.name || "Team"} — Members`
              : "Team Members"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedGroup ? (
            <div className="text-center py-10">
              <UsersRound className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Please select a team to view members</p>
            </div>
          ) : membersLoading || loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading team members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No members assigned to this team yet</p>
            </div>
          ) : !selectedContribution ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Select a contribution period to record payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const payment = payments.find((p) => p.user_id === member.user_id);
                    const status = payment?.status || "unpaid";
                    const teamName = groups.find((g) => g.id === selectedGroup)?.name || "—";
                    return (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">
                          {member.full_name || member.email || "Unknown"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {member.membership_number || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{teamName}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              status === "paid"
                                ? "bg-success text-success-foreground"
                                : status === "partial"
                                ? "bg-warning/10 text-warning border border-warning"
                                : status === "pending"
                                ? "bg-warning/10 text-warning border border-warning"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment ? `£${payment.amount}` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment?.payment_date
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {payment ? (
                              <>
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
                              </>
                            ) : (
                              <Button
                                variant="contribution"
                                size="sm"
                                onClick={() => {
                                  setPaymentToEdit(null);
                                  setNewPayment({
                                    user_id: member.user_id,
                                    amount: getPerMemberAmount(),
                                    status: "paid",
                                  });
                                  setIsRecordPaymentOpen(true);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Record
                              </Button>
                            )}
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
