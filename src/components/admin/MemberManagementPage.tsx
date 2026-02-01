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
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{group.name}</h4>
                  <Badge variant={group.is_active ? "default" : "secondary"}>
                    {group.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{group.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{memberCount} members</span>
                  <span className="font-semibold text-contribution">
                    ${group.contribution_amount}/mo
                  </span>
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
    </div>
  );
};

export default MemberManagementPage;
