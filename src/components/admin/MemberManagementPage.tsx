import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  Users,
  Mail,
  Phone,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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

interface Member {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  is_active: boolean;
}

interface GroupMembership {
  id: string;
  user_id: string;
  group_id: string;
  is_active: boolean;
  joined_at: string;
}

interface MonthlyContribution {
  id: string;
  month: number;
  year: number;
  group_id: string;
}

interface Payment {
  id: string;
  user_id: string;
  monthly_contribution_id: string;
  amount: number;
  status: string | null;
  payment_date: string | null;
}

const MemberManagementPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAssignGroupOpen, setIsAssignGroupOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  // Group detail sheet
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);
  
  // Payment recording from group detail
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentMember, setPaymentMember] = useState<Member | null>(null);
  const [monthlyContributions, setMonthlyContributions] = useState<MonthlyContribution[]>([]);
  const [currentMonthPayments, setCurrentMonthPayments] = useState<Payment[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: 500,
    status: "paid",
    monthly_contribution_id: "",
  });
  
  // Add members to group
  const [isAddMemberToGroupOpen, setIsAddMemberToGroupOpen] = useState(false);
  const [unassignedMembers, setUnassignedMembers] = useState<Member[]>([]);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);

  const [newMember, setNewMember] = useState({
    email: "",
    full_name: "",
    phone: "",
    password: "",
  });

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    contribution_amount: 500,
  });

  const [selectedGroupId, setSelectedGroupId] = useState("");
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch members (contributors)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "contributor");

      if (rolesError) throw rolesError;

      const contributorIds = rolesData?.map((r) => r.user_id) || [];

      if (contributorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", contributorIds);

        if (profilesError) throw profilesError;
        setMembers(profilesData || []);
      } else {
        setMembers([]);
      }

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("contribution_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("group_memberships")
        .select("*");

      if (membershipsError) throw membershipsError;
      setMemberships(membershipsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async () => {
    try {
      // Create user via signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newMember.email,
        password: newMember.password,
        options: {
          data: {
            full_name: newMember.full_name,
            role: "contributor",
          },
        },
      });

      if (authError) throw authError;

      toast.success("Member created successfully. They will receive a confirmation email.");
      setIsAddMemberOpen(false);
      setNewMember({ email: "", full_name: "", phone: "", password: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error creating member:", error);
      toast.error(error.message || "Failed to create member");
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editingMember.full_name,
          phone: editingMember.phone,
        })
        .eq("id", editingMember.id);

      if (error) throw error;

      toast.success("Member updated successfully");
      setEditingMember(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  const handleCreateGroup = async () => {
    try {
      const { error } = await supabase.from("contribution_groups").insert({
        name: newGroup.name,
        description: newGroup.description,
        contribution_amount: newGroup.contribution_amount,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Group created successfully");
      setIsAddGroupOpen(false);
      setNewGroup({ name: "", description: "", contribution_amount: 500 });
      fetchData();
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.message || "Failed to create group");
    }
  };

  const handleAssignToGroup = async () => {
    if (!selectedMember || !selectedGroupId) return;

    try {
      // Check if already a member
      const existing = memberships.find(
        (m) => m.user_id === selectedMember.user_id && m.group_id === selectedGroupId
      );

      if (existing) {
        toast.error("Member is already in this group");
        return;
      }

      const { error } = await supabase.from("group_memberships").insert({
        user_id: selectedMember.user_id,
        group_id: selectedGroupId,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Member assigned to group successfully");
      setIsAssignGroupOpen(false);
      setSelectedMember(null);
      setSelectedGroupId("");
      fetchData();
    } catch (error: any) {
      console.error("Error assigning member:", error);
      toast.error("Failed to assign member to group");
    }
  };

  const handleRemoveFromGroup = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from("group_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast.success("Member removed from group");
      fetchData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member from group");
    }
  };

  const getMemberGroups = (userId: string) => {
    const userMemberships = memberships.filter((m) => m.user_id === userId);
    return userMemberships
      .map((m) => {
        const group = groups.find((g) => g.id === m.group_id);
        return { ...m, groupName: group?.name || "Unknown" };
      });
  };

  const getGroupMembers = (groupId: string) => {
    const groupMemberships = memberships.filter((m) => m.group_id === groupId);
    return groupMemberships.map((gm) => {
      const member = members.find((m) => m.user_id === gm.user_id);
      return { ...gm, member };
    });
  };

  const handleOpenGroupDetail = async (group: Group) => {
    setSelectedGroup(group);
    setIsGroupDetailOpen(true);
    
    // Fetch monthly contributions for this group
    try {
      const { data: contribs } = await supabase
        .from("monthly_contributions")
        .select("*")
        .eq("group_id", group.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      
      setMonthlyContributions(contribs || []);
      
      // Fetch payments for current month if available
      if (contribs && contribs.length > 0) {
        const currentContrib = contribs[0];
        setNewPayment(prev => ({ ...prev, monthly_contribution_id: currentContrib.id, amount: group.contribution_amount }));
        
        const { data: paymentsData } = await supabase
          .from("contribution_payments")
          .select("*")
          .eq("monthly_contribution_id", currentContrib.id);
        
        setCurrentMonthPayments(paymentsData || []);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    }
  };

  const handleOpenPaymentDialog = (member: Member) => {
    setPaymentMember(member);
    if (selectedGroup) {
      setNewPayment(prev => ({ ...prev, amount: selectedGroup.contribution_amount }));
    }
    setIsRecordPaymentOpen(true);
  };

  const handleRecordPaymentFromGroup = async () => {
    if (!paymentMember || !newPayment.monthly_contribution_id) {
      toast.error("Please select a contribution period");
      return;
    }

    try {
      // Check if payment already exists
      const existingPayment = currentMonthPayments.find((p) => p.user_id === paymentMember.user_id);
      const contribution = monthlyContributions.find((c) => c.id === newPayment.monthly_contribution_id);
      const periodName = contribution
        ? `${monthNames[contribution.month - 1]} ${contribution.year}`
        : "this month";
      
      if (existingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from("contribution_payments")
          .update({
            amount: newPayment.amount,
            status: newPayment.status,
            payment_date: new Date().toISOString(),
          })
          .eq("id", existingPayment.id);

        if (error) throw error;
      } else {
        // Create new payment
        const { error } = await supabase.from("contribution_payments").insert({
          monthly_contribution_id: newPayment.monthly_contribution_id,
          user_id: paymentMember.user_id,
          amount: newPayment.amount,
          status: newPayment.status,
          payment_date: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // Send notification to the contributor
      if (newPayment.status === "paid") {
        await supabase.from("notifications").insert({
          user_id: paymentMember.user_id,
          title: "Payment Confirmed ✓",
          message: `Your contribution of £${newPayment.amount} for ${periodName} has been recorded. Thank you!`,
          type: "payment",
          link: "/dashboard/contributor",
        });
      }

      toast.success("Payment recorded successfully");
      setIsRecordPaymentOpen(false);
      setPaymentMember(null);
      
      // Refresh payments
      if (contribution) {
        const { data: paymentsData } = await supabase
          .from("contribution_payments")
          .select("*")
          .eq("monthly_contribution_id", contribution.id);
        setCurrentMonthPayments(paymentsData || []);
      }
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    }
  };

  const getMemberPaymentStatus = (userId: string) => {
    const payment = currentMonthPayments.find((p) => p.user_id === userId);
    return payment?.status || null;
  };

  // Fetch members not assigned to any group
  const fetchUnassignedMembers = () => {
    const assignedUserIds = memberships.map((m) => m.user_id);
    const unassigned = members.filter((m) => !assignedUserIds.includes(m.user_id));
    setUnassignedMembers(unassigned);
    setSelectedMembersToAdd([]);
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedGroup || selectedMembersToAdd.length === 0) return;

    try {
      const inserts = selectedMembersToAdd.map((userId) => ({
        user_id: userId,
        group_id: selectedGroup.id,
        is_active: true,
      }));

      const { error } = await supabase.from("group_memberships").insert(inserts);

      if (error) throw error;

      toast.success(`${selectedMembersToAdd.length} member(s) added to group`);
      setIsAddMemberToGroupOpen(false);
      setSelectedMembersToAdd([]);
      fetchData();
    } catch (error: any) {
      console.error("Error adding members:", error);
      toast.error("Failed to add members to group");
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembersToAdd((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredMembers = members.filter(
    (member) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Member Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, and manage contributors and their group assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Contribution Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="e.g., Monthly Savings Group"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of the group"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Contribution Amount</Label>
                  <Input
                    type="number"
                    value={newGroup.contribution_amount}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, contribution_amount: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="contribution" onClick={handleCreateGroup}>
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
            <DialogTrigger asChild>
              <Button variant="contribution">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Enter full name"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="Enter phone number"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input
                    type="password"
                    placeholder="Set a temporary password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="contribution" onClick={handleCreateMember}>
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groups.map((group) => {
          const memberCount = memberships.filter((m) => m.group_id === group.id).length;
          return (
            <Card 
              key={group.id} 
              className="cursor-pointer hover:border-contribution hover:shadow-md transition-all"
              onClick={() => handleOpenGroupDetail(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-contribution hover:underline">
                    {group.name}
                  </h4>
                  <Badge variant={group.is_active ? "default" : "secondary"}>
                    {group.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{group.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{memberCount} members</span>
                  <span className="font-semibold text-contribution">
                    £{group.contribution_amount}/mo
                  </span>
                </div>
                <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                  <span>Click to view details</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {groups.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No groups created yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contributors ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const memberGroups = getMemberGroups(member.user_id);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.full_name || "—"}
                        </TableCell>
                        <TableCell>{member.email || "—"}</TableCell>
                        <TableCell>{member.phone || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {memberGroups.length > 0 ? (
                              memberGroups.map((mg) => (
                                <Badge
                                  key={mg.id}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-destructive/10"
                                  onClick={() => handleRemoveFromGroup(mg.id)}
                                >
                                  {mg.groupName} <X className="w-3 h-3 ml-1" />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No groups</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setIsAssignGroupOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMember(member)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
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

      {/* Assign to Group Dialog */}
      <Dialog open={isAssignGroupOpen} onOpenChange={setIsAssignGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Assign <strong>{selectedMember?.full_name || selectedMember?.email}</strong> to a
              contribution group.
            </p>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} (${group.contribution_amount}/mo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignGroupOpen(false)}>
              Cancel
            </Button>
            <Button variant="contribution" onClick={handleAssignToGroup}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editingMember?.full_name || ""}
                onChange={(e) =>
                  setEditingMember(
                    editingMember ? { ...editingMember, full_name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editingMember?.phone || ""}
                onChange={(e) =>
                  setEditingMember(
                    editingMember ? { ...editingMember, phone: e.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button variant="contribution" onClick={handleUpdateMember}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Detail Sheet */}
      <Sheet open={isGroupDetailOpen} onOpenChange={setIsGroupDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-contribution" />
              {selectedGroup?.name}
            </SheetTitle>
            <SheetDescription>
              View group details, members, and record payments
            </SheetDescription>
          </SheetHeader>
          
          {selectedGroup && (
            <div className="mt-6 space-y-6">
              {/* Group Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-contribution">
                      £{selectedGroup.contribution_amount}
                    </p>
                    <p className="text-xs text-muted-foreground">Monthly Amount</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {getGroupMembers(selectedGroup.id).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Members</p>
                  </CardContent>
                </Card>
              </div>

              {selectedGroup.description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                </div>
              )}

              {/* Current Period */}
              {monthlyContributions.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Period</Label>
                  <Select 
                    value={newPayment.monthly_contribution_id} 
                    onValueChange={(v) => {
                      setNewPayment(prev => ({ ...prev, monthly_contribution_id: v }));
                      // Fetch payments for selected period
                      supabase
                        .from("contribution_payments")
                        .select("*")
                        .eq("monthly_contribution_id", v)
                        .then(({ data }) => setCurrentMonthPayments(data || []));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlyContributions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {monthNames[c.month - 1]} {c.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Group Members</h4>
                  <Badge variant="outline">{getGroupMembers(selectedGroup.id).length} members</Badge>
                </div>
                
                {/* Add Members Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsAddMemberToGroupOpen(true);
                    fetchUnassignedMembers();
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members to Group
                </Button>
                
                {getGroupMembers(selectedGroup.id).length === 0 ? (
                  <div className="text-center py-6 border rounded-lg">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No members in this group</p>
                  </div>
                ) : (
                <div className="space-y-2">
                    {getGroupMembers(selectedGroup.id).map((gm) => {
                      const paymentStatus = getMemberPaymentStatus(gm.user_id);
                      return (
                        <Card 
                          key={gm.id}
                          className="cursor-pointer hover:border-contribution transition-colors"
                          onClick={() => gm.member && handleOpenPaymentDialog(gm.member)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {gm.member?.full_name || gm.member?.email || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {gm.member?.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {paymentStatus && (
                                  <Badge 
                                    variant={paymentStatus === "paid" ? "default" : "outline"}
                                    className={paymentStatus === "paid" ? "bg-green-500" : ""}
                                  >
                                    {paymentStatus === "paid" ? "PAID" : paymentStatus.toUpperCase()}
                                  </Badge>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (gm.member) handleOpenPaymentDialog(gm.member);
                                  }}
                                  title="Record Payment"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFromGroup(gm.id);
                                  }}
                                  title="Remove from Group"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Record Payment Dialog (from Group Detail) */}
      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{paymentMember?.full_name || paymentMember?.email}</p>
              <p className="text-xs text-muted-foreground">{paymentMember?.email}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Contribution Period</Label>
              <Select
                value={newPayment.monthly_contribution_id}
                onValueChange={(v) => setNewPayment({ ...newPayment, monthly_contribution_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {monthlyContributions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {monthNames[c.month - 1]} {c.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount (£)</Label>
              <Input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
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
            <Button variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button variant="contribution" onClick={handleRecordPaymentFromGroup}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members to Group Dialog */}
      <Dialog open={isAddMemberToGroupOpen} onOpenChange={setIsAddMemberToGroupOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Members to {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {unassignedMembers.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">All members are already assigned to groups</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Select members to add to this group ({unassignedMembers.length} available)
                </p>
                {unassignedMembers.map((member) => (
                  <Card
                    key={member.id}
                    className={`cursor-pointer transition-all ${
                      selectedMembersToAdd.includes(member.user_id)
                        ? "border-contribution bg-contribution/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() => toggleMemberSelection(member.user_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedMembersToAdd.includes(member.user_id)
                            ? "bg-contribution border-contribution"
                            : "border-muted-foreground"
                        }`}>
                          {selectedMembersToAdd.includes(member.user_id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {member.full_name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberToGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contribution"
              onClick={handleAddMembersToGroup}
              disabled={selectedMembersToAdd.length === 0}
            >
              Add {selectedMembersToAdd.length > 0 ? `(${selectedMembersToAdd.length})` : ""} Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberManagementPage;
