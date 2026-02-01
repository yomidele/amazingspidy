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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
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
  beneficiary_account_number: string | null;
  beneficiary_bank_name: string | null;
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
  const [groups, setGroups] = useState<ContributionGroup[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedContribution, setSelectedContribution] = useState<MonthlyContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newContribution, setNewContribution] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    beneficiary_user_id: "",
    beneficiary_account_number: "",
    beneficiary_bank_name: "",
    contribution_amount: 500,
  });

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
      // Fetch contribution groups first
      const { data: groupsData, error: groupsError } = await supabase
        .from("contribution_groups")
        .select("id, name, contribution_amount")
        .eq("is_active", true);

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Set default contribution amount from first group if available
      if (groupsData && groupsData.length > 0) {
        setNewContribution(prev => ({
          ...prev,
          contribution_amount: groupsData[0].contribution_amount,
        }));
      }

      // Fetch monthly contributions
      const { data: contribData, error: contribError } = await supabase
        .from("monthly_contributions")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (contribError) throw contribError;
      setContributions(contribData || []);

      // Fetch members (profiles with contributor role)
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

  const handleCreateContribution = async () => {
    // Ensure we have a group
    if (groups.length === 0) {
      toast.error("Please create a contribution group first in Member Management");
      return;
    }

    try {
      const { error } = await supabase.from("monthly_contributions").insert({
        month: newContribution.month,
        year: newContribution.year,
        beneficiary_user_id: newContribution.beneficiary_user_id || null,
        beneficiary_account_number: newContribution.beneficiary_account_number || null,
        beneficiary_bank_name: newContribution.beneficiary_bank_name || null,
        total_expected: members.length * newContribution.contribution_amount,
        total_collected: 0,
        is_finalized: false,
        group_id: groups[0].id, // Use the first active group
      });

      if (error) throw error;
      
      toast.success("Monthly contribution created successfully");
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error creating contribution:", error);
      toast.error(error.message || "Failed to create contribution");
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
    return member?.full_name || member?.email || "Unknown";
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
                      {[2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beneficiary</Label>
                <Select
                  value={newContribution.beneficiary_user_id}
                  onValueChange={(v) => setNewContribution({ ...newContribution, beneficiary_user_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select beneficiary" />
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
                <Label>Beneficiary Bank Name</Label>
                <Input
                  placeholder="Enter bank name"
                  value={newContribution.beneficiary_bank_name}
                  onChange={(e) => setNewContribution({ ...newContribution, beneficiary_bank_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Beneficiary Account Number</Label>
                <Input
                  placeholder="Enter account number"
                  value={newContribution.beneficiary_account_number}
                  onChange={(e) => setNewContribution({ ...newContribution, beneficiary_account_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Contribution Amount (per member)</Label>
                <Input
                  type="number"
                  value={newContribution.contribution_amount}
                  onChange={(e) => setNewContribution({ ...newContribution, contribution_amount: parseFloat(e.target.value) })}
                />
              </div>

              <Button variant="contribution" className="w-full" onClick={handleCreateContribution}>
                Create Monthly Contribution
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Contributions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : contributions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No contributions yet</p>
                  <p className="text-xs text-muted-foreground">Create your first monthly contribution</p>
                </div>
              ) : (
                contributions.map((contrib) => (
                  <button
                    key={contrib.id}
                    onClick={() => handleSelectContribution(contrib)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedContribution?.id === contrib.id
                        ? "bg-contribution-light border-2 border-contribution"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {monthNames[contrib.month - 1]} {contrib.year}
                      </span>
                      {contrib.is_finalized ? (
                        <Badge className="bg-success text-success-foreground">Finalized</Badge>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Collected: £{contrib.total_collected || 0}
                      </span>
                      <span>
                        Expected: £{contrib.total_expected || 0}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Contribution Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Contribution Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedContribution ? (
              <div className="space-y-6">
                {/* Beneficiary Info */}
                <div className="p-4 rounded-xl bg-contribution-light border border-contribution/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Beneficiary for {monthNames[selectedContribution.month - 1]} {selectedContribution.year}
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {selectedContribution.beneficiary_user_id
                          ? getMemberName(selectedContribution.beneficiary_user_id)
                          : "Not assigned"}
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
                      <p className="font-medium">
                        {selectedContribution.beneficiary_account_number || "Not set"}
                      </p>
                    </div>
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
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
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
                            <span className="font-semibold">${payment.amount}</span>
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
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Select a Month</h3>
                <p className="text-muted-foreground">
                  Choose a monthly period from the list to view details and manage payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContributionSetupPage;
