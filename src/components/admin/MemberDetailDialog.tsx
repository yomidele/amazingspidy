import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CopyField from "@/components/shared/CopyField";
import { Calendar, Crown, ExternalLink, User, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

interface Member {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  membership_number?: string | null;
}

interface Props {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemberDetailDialog = ({ member, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [contribsById, setContribsById] = useState<Map<string, any>>(new Map());
  const [loans, setLoans] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [groups, setGroups] = useState<Map<string, any>>(new Map());
  const [beneficiaryMonths, setBeneficiaryMonths] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !member) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pRes, lRes, sRes, mRes, bRes] = await Promise.all([
          supabase
            .from("contribution_payments")
            .select("*")
            .eq("user_id", member.user_id)
            .order("payment_date", { ascending: false }),
          supabase
            .from("loans")
            .select("*")
            .eq("user_id", member.user_id)
            .order("issued_date", { ascending: false }),
          supabase
            .from("contribution_splits")
            .select("*")
            .eq("user_id", member.user_id)
            .order("year", { ascending: false })
            .order("month", { ascending: false }),
          supabase
            .from("group_memberships")
            .select("*")
            .eq("user_id", member.user_id),
          supabase
            .from("monthly_contributions")
            .select("id, group_id, month, year, beneficiary_user_id")
            .eq("beneficiary_user_id", member.user_id)
            .order("year", { ascending: false })
            .order("month", { ascending: false }),
        ]);

        const mcIds = (pRes.data || []).map((p) => p.monthly_contribution_id);
        let mcMap = new Map<string, any>();
        if (mcIds.length) {
          const { data } = await supabase
            .from("monthly_contributions")
            .select("id, group_id, month, year")
            .in("id", mcIds);
          (data || []).forEach((m) => mcMap.set(m.id, m));
        }

        const groupIds = new Set<string>([
          ...(mRes.data || []).map((g) => g.group_id),
          ...Array.from(mcMap.values()).map((m: any) => m.group_id),
          ...(bRes.data || []).map((b) => b.group_id),
          ...(sRes.data || []).map((s) => s.group_id),
        ]);

        let gMap = new Map<string, any>();
        if (groupIds.size) {
          const { data } = await supabase
            .from("contribution_groups")
            .select("id, name, contribution_amount")
            .in("id", Array.from(groupIds));
          (data || []).forEach((g) => gMap.set(g.id, g));
        }

        if (cancelled) return;
        setPayments(pRes.data || []);
        setContribsById(mcMap);
        setLoans(lRes.data || []);
        setSplits(sRes.data || []);
        setMemberships(mRes.data || []);
        setGroups(gMap);
        setBeneficiaryMonths(bRes.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, member]);

  if (!member) return null;

  const totalContributed = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const outstandingLoanBalance = loans
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + Number(l.outstanding_balance || 0), 0);

  const statusBadge = (status: string | null) => {
    const s = status || "pending";
    const map: Record<string, string> = {
      paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
      pending: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
      overdue: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300",
      split: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    };
    return (
      <Badge variant="outline" className={`capitalize ${map[s] || ""}`}>
        {s}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-contribution" />
            {member.full_name || "Unnamed member"}
          </DialogTitle>
          <DialogDescription>
            Full member profile, contribution history, loans and beneficiary records.
          </DialogDescription>
        </DialogHeader>

        {/* Identity */}
        <div className="grid sm:grid-cols-2 gap-3">
          <CopyField label="Membership ID" value={member.membership_number || "—"} mono />
          <CopyField label="Email" value={member.email || "—"} />
          <CopyField label="Phone" value={member.phone || "—"} />
          <CopyField
            label="Joined"
            value={new Date(member.created_at).toLocaleDateString()}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total contributed</p>
              <p className="text-lg font-bold text-contribution">
                £{totalContributed.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Outstanding loans</p>
              <p
                className={`text-lg font-bold ${
                  outstandingLoanBalance > 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                £{outstandingLoanBalance.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Groups</p>
              <p className="text-lg font-bold">{memberships.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Beneficiary times</p>
              <p className="text-lg font-bold">{beneficiaryMonths.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contributions" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="splits">Splits</TabsTrigger>
            <TabsTrigger value="beneficiary">Beneficiary</TabsTrigger>
          </TabsList>

          <TabsContent value="contributions" className="mt-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contribution records.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const mc = contribsById.get(p.monthly_contribution_id);
                    const g = mc ? groups.get(mc.group_id) : null;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          {mc ? `${MONTHS[mc.month - 1]} ${mc.year}` : "—"}
                        </TableCell>
                        <TableCell>{g?.name || "—"}</TableCell>
                        <TableCell>£{Number(p.amount).toLocaleString()}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.payment_date
                            ? new Date(p.payment_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="loans" className="mt-4">
            {loans.length === 0 ? (
              <p className="text-muted-foreground text-sm">No loans on record.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issued</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.issued_date
                          ? new Date(l.issued_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        £{Number(l.principal_amount).toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={
                          Number(l.outstanding_balance) > 0
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        £{Number(l.outstanding_balance).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {l.status || "active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="splits" className="mt-4">
            {splits.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No split contributions recorded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Split amount</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splits.map((s) => {
                    const g = groups.get(s.group_id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          {MONTHS[s.month - 1]} {s.year}
                        </TableCell>
                        <TableCell>{g?.name || "—"}</TableCell>
                        <TableCell>£{Number(s.split_amount).toLocaleString()}</TableCell>
                        <TableCell>{statusBadge(s.is_paid ? "paid" : "pending")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="beneficiary" className="mt-4">
            {beneficiaryMonths.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Has not been a monthly beneficiary yet.
              </p>
            ) : (
              <div className="space-y-2">
                {beneficiaryMonths.map((b) => {
                  const g = groups.get(b.group_id);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="font-medium text-sm">
                            {MONTHS[b.month - 1]} {b.year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g?.name || "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        Beneficiary
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/users/${member.user_id}`)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open full activity page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailDialog;
