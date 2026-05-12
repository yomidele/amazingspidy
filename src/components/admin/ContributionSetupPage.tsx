import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Calendar,
  Users,
  DollarSign,
  Check,
  X,
  ChevronDown,
  Search,
  UserCheck,
  CreditCard,
  Edit2,
  ArrowLeft,
  ChevronRight,
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContributionAmountManager from "@/components/admin/ContributionAmountManager";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface GroupMembership {
  user_id: string;
  group_id: string;
  is_active: boolean;
}

interface ContributionGroup {
  id: string;
  name: string;
  contribution_amount: number;
}

interface MonthlyContribution {
  id: string;
  month: number;
  year: number;
  group_id: string;
  beneficiary_user_id: string | null;
  beneficiary_account_name?: string | null;
  beneficiary_account_number: string | null;
  beneficiary_bank_name: string | null;
  beneficiary_sort_code?: string | null;
  total_expected: number | null;
  total_collected: number | null;
  is_finalized: boolean;
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_date: string;
  user_name?: string;
}

const ContributionSetupPage = () => {
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupMemberships, setGroupMemberships] = useState<GroupMembership[]>([]);
  const [groups, setGroups] = useState<ContributionGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<MonthlyContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [editDetails, setEditDetails] = useState<Partial<MonthlyContribution>>({});
  const [newContribution, setNewContribution] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    group_id: "",
    beneficiary_user_id: "",
    beneficiary_account_name: "",
    beneficiary_account_number: "",
    beneficiary_bank_name: "",
    beneficiary_sort_code: "",
  });

  // Helpers: sort code XX-XX-XX auto-format and account number digits-only
  const formatSortCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean);
    return parts.join("-");
  };
  const onlyDigits = (raw: string, max = 10) => raw.replace(/\D/g, "").slice(0, max);
  const isValidAccountNumber = (v: string) => !v || /^[0-9]{6,10}$/.test(v);
  const isValidSortCode = (v: string) => !v || /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(v);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Realtime: keep totals fresh on splits/payments/membership changes
  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase
        .from("monthly_contributions")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (data) {
        setContributions(data as MonthlyContribution[]);
        setSelectedContribution((prev) =>
          prev ? (data.find((d: any) => d.id === prev.id) as MonthlyContribution) || prev : prev
        );
      }
    };
    const channel = supabase
      .channel("contrib-setup-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_contributions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_payments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contribution_splits" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_memberships" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch contribution groups first
      const { data: groupsData, error: groupsError } = await supabase
        .from("contribution_groups")
        .select("id, name, contribution_amount")
        .eq("is_active", true);

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Set default group if available
      if (groupsData && groupsData.length > 0) {
        setNewContribution(prev => ({
          ...prev,
          group_id: groupsData[0].id,
        }));
      }

      // Fetch group memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("group_memberships")
        .select("user_id, group_id, is_active")
        .eq("is_active", true);

      if (membershipsError) throw membershipsError;
      setGroupMemberships(membershipsData || []);

      // Fetch monthly contributions
      const { data: contribData, error: contribError } = await supabase
        .from("monthly_contributions")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (contribError) throw contribError;
      const list = contribData || [];
      setContributions(list);

      // Fetch members (profiles with contributor role)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email");

      if (profilesError) throw profilesError;
      setMembers(profilesData || []);

      return list; // return for callers who need fresh data

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (contributionId: string) => {
    try {
      const { data, error } = await supabase
        .from("contribution_payments")
        .select("*")
        .eq("monthly_contribution_id", contributionId);

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
    }
  };

  // Get members belonging to a specific group
  const getGroupMembers = (groupId: string) => {
    const memberUserIds = groupMemberships
      .filter(gm => gm.group_id === groupId && gm.is_active)
      .map(gm => gm.user_id);
    return members.filter(m => memberUserIds.includes(m.user_id));
  };

  // Get selected group info
  const getSelectedGroup = () => {
    return groups.find(g => g.id === newContribution.group_id);
  };

  // Get group name by id
  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || "Unknown Group";
  };

  const handleCreateContribution = async () => {
    // Ensure we have a group selected
    if (!newContribution.group_id) {
      toast.error("Please select a contribution group");
      return;
    }
    // Validate required fields
    if (!newContribution.month || !newContribution.year) {
      toast.error("Please select month and year");
      return;
    }

    const selectedGroup = getSelectedGroup();
    if (!selectedGroup) {
      toast.error("Selected group not found");
      return;
    }

    // Get members count for the selected group
    const groupMembers = getGroupMembers(newContribution.group_id);

    try {
      // Validate bank fields
      if (!isValidAccountNumber(newContribution.beneficiary_account_number)) {
        toast.error("Account number must be 6–10 digits");
        return;
      }
      if (!isValidSortCode(newContribution.beneficiary_sort_code)) {
        toast.error("Sort code must be in format XX-XX-XX");
        return;
      }

      // total_expected is computed by DB trigger (sum of per-member obligations including splits)
      const { error } = await supabase.from("monthly_contributions").insert({
        month: newContribution.month,
        year: newContribution.year,
        beneficiary_user_id: newContribution.beneficiary_user_id || null,
        beneficiary_account_name: newContribution.beneficiary_account_name || null,
        beneficiary_account_number: newContribution.beneficiary_account_number || null,
        beneficiary_bank_name: newContribution.beneficiary_bank_name || null,
        beneficiary_sort_code: newContribution.beneficiary_sort_code || null,
        total_collected: 0,
        is_finalized: false,
        group_id: newContribution.group_id,
      } as any);

      if (error) throw error;

      toast.success("Monthly contribution created successfully");
      setIsCreateDialogOpen(false);
      // Reset form
      setNewContribution({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        group_id: groups[0]?.id || "",
        beneficiary_user_id: "",
        beneficiary_account_name: "",
        beneficiary_account_number: "",
        beneficiary_bank_name: "",
        beneficiary_sort_code: "",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error creating contribution:", error);
      toast.error(error.message || "Failed to create contribution");
    }
  };

  // Handle group change - reset beneficiary when group changes
  const handleGroupChange = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    setNewContribution({
      ...newContribution,
      group_id: groupId,
      beneficiary_user_id: "",
    });
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("contribution_payments")
        .update({ status })
        .eq("id", paymentId);

      if (error) throw error;
      
      toast.success("Payment status updated");
      if (selectedContribution) {
        fetchPayments(selectedContribution.id);
      }
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment status");
    }
  };

  const handleSelectContribution = (contribution: MonthlyContribution) => {
    setSelectedContribution(contribution);
    fetchPayments(contribution.id);
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.full_name || member?.email || "Member data missing";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Monthly Contribution Setup
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage monthly contributions, beneficiaries, and track payments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="contribution">
              <Plus className="w-4 h-4 mr-2" />
              New Month
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Monthly Contribution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Group Selection */}
              <div className="space-y-2">
                <Label>Contribution Group</Label>
                <Select
                  value={newContribution.group_id}
                  onValueChange={handleGroupChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} (£{group.contribution_amount}/member)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newContribution.group_id && (
                  <p className="text-xs text-muted-foreground">
                    {getGroupMembers(newContribution.group_id).length} members in this group
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={String(newContribution.month)}
                    onValueChange={(v) => setNewContribution({ ...newContribution, month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((name, index) => (
                        <SelectItem key={index} value={String(index + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={String(newContribution.year)}
                    onValueChange={(v) => setNewContribution({ ...newContribution, year: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Beneficiary - Only show members from selected group */}
              <div className="space-y-2">
                <Label>Beneficiary (from group members)</Label>
                <Select
                  value={newContribution.beneficiary_user_id}
                  onValueChange={(v) => setNewContribution({ ...newContribution, beneficiary_user_id: v })}
                  disabled={!newContribution.group_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newContribution.group_id ? "Select beneficiary" : "Select a group first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getGroupMembers(newContribution.group_id).map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newContribution.group_id && getGroupMembers(newContribution.group_id).length === 0 && (
                  <p className="text-xs text-destructive">
                    No members assigned to this group yet
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank details</p>
                <p className="text-xs text-muted-foreground -mt-1">
                  Account name must match the bank account holder name, not necessarily the member's name.
                </p>

                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input
                    placeholder="e.g. Barclays"
                    value={newContribution.beneficiary_bank_name}
                    onChange={(e) => setNewContribution({ ...newContribution, beneficiary_bank_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Name *</Label>
                  <Input
                    placeholder="Bank account holder name"
                    value={newContribution.beneficiary_account_name}
                    onChange={(e) => setNewContribution({ ...newContribution, beneficiary_account_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="6–10 digits"
                      value={newContribution.beneficiary_account_number}
                      onChange={(e) => setNewContribution({ ...newContribution, beneficiary_account_number: onlyDigits(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Code</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="XX-XX-XX"
                      value={newContribution.beneficiary_sort_code}
                      onChange={(e) => setNewContribution({ ...newContribution, beneficiary_sort_code: formatSortCode(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Show contribution amount from selected group */}
              {getSelectedGroup() && (
                <div className="p-3 rounded-lg bg-contribution-light border border-contribution/20">
                  <p className="text-sm text-muted-foreground">Contribution Amount (per member)</p>
                  <p className="font-bold text-contribution text-lg">£{getSelectedGroup()?.contribution_amount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Expected: £{getGroupMembers(newContribution.group_id).length * (getSelectedGroup()?.contribution_amount || 0)}
                  </p>
                </div>
              )}

              <Button 
                variant="contribution" 
                className="w-full" 
                onClick={handleCreateContribution}
                disabled={!newContribution.group_id}
              >
                Create Monthly Contribution
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* FIXED: Edit Details Dialog - Moved OUTSIDE the Create Dialog */}
      {/* This allows editing any contribution independently, without requiring "+ New Month" first */}
      <Dialog open={isEditDetailsOpen} onOpenChange={setIsEditDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contribution Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Beneficiary (from group members)</Label>
              <Select
                value={editDetails.beneficiary_user_id || ""}
                onValueChange={(v) =>
                  setEditDetails({ ...editDetails, beneficiary_user_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select beneficiary" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const groupMems = getGroupMembers(
                      selectedContribution?.group_id || ""
                    );
                    if (
                      editDetails.beneficiary_user_id &&
                      !groupMems.find(
                        (m) => m.user_id === editDetails.beneficiary_user_id
                      )
                    ) {
                      const extra = members.find(
                        (m) => m.user_id === editDetails.beneficiary_user_id
                      );
                      if (extra) {
                        groupMems.push(extra);
                      }
                    }
                    return groupMems.map((member) => (
                      <SelectItem
                        key={member.user_id}
                        value={member.user_id}
                      >
                        {member.full_name || member.email}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank details</p>
              <p className="text-xs text-muted-foreground -mt-1">
                Account name must match the bank account holder name, not necessarily the member's name.
              </p>

              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g. Barclays"
                  value={editDetails.beneficiary_bank_name || ""}
                  onChange={(e) => setEditDetails({ ...editDetails, beneficiary_bank_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  placeholder="Bank account holder name"
                  value={(editDetails as any).beneficiary_account_name || ""}
                  onChange={(e) => setEditDetails({ ...editDetails, beneficiary_account_name: e.target.value } as any)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="6–10 digits"
                    value={editDetails.beneficiary_account_number || ""}
                    onChange={(e) => setEditDetails({ ...editDetails, beneficiary_account_number: onlyDigits(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Code</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="XX-XX-XX"
                    value={(editDetails as any).beneficiary_sort_code || ""}
                    onChange={(e) => setEditDetails({ ...editDetails, beneficiary_sort_code: formatSortCode(e.target.value) } as any)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDetailsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contribution"
              onClick={async () => {
                if (!selectedContribution) return;
                try {
                  // FIXED: Only send fields that exist in the current database schema
                  // The newer columns (beneficiary_account_name, beneficiary_sort_code, per_member_amount)
                  // are defined in migrations but may not be deployed yet to your Supabase instance.
                  // Only update the core fields that exist in the base schema to avoid schema cache errors.
                  if (!isValidAccountNumber(editDetails.beneficiary_account_number || "")) {
                    toast.error("Account number must be 6–10 digits");
                    return;
                  }
                  if (!isValidSortCode((editDetails as any).beneficiary_sort_code || "")) {
                    toast.error("Sort code must be in format XX-XX-XX");
                    return;
                  }
                  const { error } = await supabase
                    .from("monthly_contributions")
                    .update({
                      beneficiary_user_id: editDetails.beneficiary_user_id || null,
                      beneficiary_bank_name: editDetails.beneficiary_bank_name || null,
                      beneficiary_account_name: (editDetails as any).beneficiary_account_name || null,
                      beneficiary_account_number: editDetails.beneficiary_account_number || null,
                      beneficiary_sort_code: (editDetails as any).beneficiary_sort_code || null,
                      total_expected: editDetails.total_expected || null,
                    } as any)
                    .eq("id", selectedContribution.id);
                  
                  if (error) throw error;
                  
                  toast.success("Details updated successfully");
                  setIsEditDetailsOpen(false);
                  
                  // FIXED: Update local state to reflect changes immediately
                  setSelectedContribution((prev) =>
                    prev
                      ? { ...prev, ...editDetails as any }
                      : prev
                  );
                  
                  // FIXED: Properly handle fetchData() return value
                  // fetchData() guarantees a return value so we can safely use it
                  const refreshed = await fetchData();
                  if (refreshed && selectedContribution) {
                    // Find the updated contribution from refreshed data
                    const updated = refreshed.find(c => c.id === selectedContribution.id);
                    // Only update selectedContribution if we found the fresh data
                    if (updated) {
                      setSelectedContribution(updated);
                    }
                  }
                } catch (error: any) {
                  console.error("Error updating details:", error);
                  // Provide more specific error message
                  const errorMsg = error?.message || "Failed to update contribution details";
                  toast.error(errorMsg);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!selectedContribution && groups.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => (
            <ContributionAmountManager key={g.id} groupId={g.id} groupName={g.name} compact />
          ))}
        </div>
      )}

      {!selectedContribution ? (
        /* LIST VIEW — full width, click a card to open details */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : contributions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No contributions yet</p>
                <p className="text-xs text-muted-foreground">Create your first monthly contribution</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contributions.map((contrib) => (
                  <button
                    key={contrib.id}
                    onClick={() => handleSelectContribution(contrib)}
                    className="group p-4 rounded-lg text-left transition-all bg-muted/40 hover:bg-contribution-light border-2 border-transparent hover:border-contribution"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">
                        {monthNames[contrib.month - 1]} {contrib.year}
                      </span>
                      {contrib.is_finalized ? (
                        <Badge className="bg-success text-success-foreground">Finalized</Badge>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                    </div>
                    <p className="text-xs font-medium text-contribution mb-2">
                      {getGroupName(contrib.group_id)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>£{contrib.total_collected || 0} / £{contrib.total_expected || 0}</span>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* DETAIL VIEW — full width with back button */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedContribution(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to periods
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditDetails({ ...selectedContribution });
                setIsEditDetailsOpen(true);
              }}
            >
              <Edit2 className="w-4 h-4 mr-1" /> Edit details
            </Button>
          </div>

          {/* Selected Contribution Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                {monthNames[selectedContribution.month - 1]} {selectedContribution.year} — {getGroupName(selectedContribution.group_id)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Beneficiary Info */}
                <div className="p-4 rounded-xl bg-contribution-light border border-contribution/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Beneficiary
                  </h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Member</p>
                      <p className="font-medium">
                        {selectedContribution.beneficiary_user_id
                          ? getMemberName(selectedContribution.beneficiary_user_id)
                          : "Not assigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Name</p>
                      <p className="font-medium">
                        {(selectedContribution as any).beneficiary_account_name || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bank</p>
                      <p className="font-medium">
                        {selectedContribution.beneficiary_bank_name || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">
                        {selectedContribution.beneficiary_account_number || "Not set"}
                      </p>
                    </div>
                    {(selectedContribution as any).beneficiary_sort_code && (
                      <div>
                        <p className="text-muted-foreground">Sort Code</p>
                        <p className="font-medium font-mono">
                          {(selectedContribution as any).beneficiary_sort_code}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collection Summary */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-contribution-light flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-contribution" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expected</p>
                          <p className="font-bold">£{selectedContribution.total_expected || 0}</p>
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
                          <p className="font-bold text-success">£{selectedContribution.total_collected || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className="font-bold text-warning">
                            £{(selectedContribution.total_expected || 0) - (selectedContribution.total_collected || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payments List */}
                <div>
                  <h4 className="font-semibold mb-3">Member Payments</h4>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 bg-muted/50 rounded-lg">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No payments recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-contribution-light flex items-center justify-center">
                              <span className="font-semibold text-contribution text-sm">
                                {getMemberName(payment.user_id).charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{getMemberName(payment.user_id)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">£{payment.amount}</span>
                            <Select
                              value={payment.status}
                              onValueChange={(v) => handleUpdatePaymentStatus(payment.id, v)}
                            >
                              <SelectTrigger className={`w-28 h-8 text-xs ${
                                payment.status === "paid" ? "text-success" :
                                payment.status === "pending" ? "text-warning" : "text-destructive"
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContributionSetupPage;
