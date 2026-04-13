import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccountProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  account_status: string;
  failed_login_attempts: number;
  locked_at: string | null;
  created_at: string;
}

const AccountManagementPage = () => {
  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    account: AccountProfile | null;
  }>({ open: false, action: "", account: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, account_status, failed_login_attempts, locked_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load accounts");
    } else {
      setAccounts((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleAction = async (action: string, account: AccountProfile) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired");
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action, user_id: account.user_id }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(data.message || `Account ${action} successful`);
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setActionLoading(false);
      setActionDialog({ open: false, action: "", account: null });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "locked":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredAccounts = accounts.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.full_name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      a.account_status.toLowerCase().includes(q)
    );
  });

  const pendingCount = accounts.filter((a) => a.account_status === "pending").length;
  const lockedCount = accounts.filter((a) => a.account_status === "locked").length;
  const activeCount = accounts.filter((a) => a.account_status === "active").length;

  const actionLabels: Record<string, { label: string; description: string; variant: string }> = {
    approve: { label: "Approve Account", description: "This will activate the account and allow the user to log in.", variant: "success" },
    unlock: { label: "Unlock Account", description: "This will reset failed login attempts and restore access.", variant: "info" },
    lock: { label: "Lock Account", description: "This will prevent the user from logging in.", variant: "destructive" },
    suspend: { label: "Suspend Account", description: "This will set the account back to pending status.", variant: "warning" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Account Management</h2>
        <p className="text-muted-foreground">Approve, lock, and manage user account access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lockedCount}</p>
              <p className="text-xs text-muted-foreground">Locked Accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pending approvals alert */}
      {pendingCount > 0 && (
        <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {pendingCount} account{pendingCount > 1 ? "s" : ""} awaiting approval
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accounts table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failed Attempts</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading accounts...
                  </TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.user_id}>
                    <TableCell className="font-medium">{account.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{account.email || "—"}</TableCell>
                    <TableCell>{getStatusBadge(account.account_status)}</TableCell>
                    <TableCell>
                      {account.failed_login_attempts > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {account.failed_login_attempts}/5
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(account.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {account.account_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => setActionDialog({ open: true, action: "approve", account })}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        {account.account_status === "locked" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => setActionDialog({ open: true, action: "unlock", account })}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Unlock
                          </Button>
                        )}
                        {account.account_status === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => setActionDialog({ open: true, action: "lock", account })}
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Lock
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                              onClick={() => setActionDialog({ open: true, action: "suspend", account })}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Suspend
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: "", account: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabels[actionDialog.action]?.label || "Confirm Action"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {actionLabels[actionDialog.action]?.description}
            </p>
            {actionDialog.account && (
              <div className="mt-4 p-3 rounded-lg bg-muted">
                <p className="font-medium">{actionDialog.account.full_name}</p>
                <p className="text-sm text-muted-foreground">{actionDialog.account.email}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: "", account: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "lock" ? "destructive" : "default"}
              onClick={() => actionDialog.account && handleAction(actionDialog.action, actionDialog.account)}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountManagementPage;
