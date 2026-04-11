import { useState, useEffect } from "react";
import { CalendarDays, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface RepaymentScheduleProps {
  userId: string;
}

interface Repayment {
  id: string;
  loan_id: string;
  amount: number;
  amount_due: number;
  due_date: string | null;
  repayment_date: string | null;
  repayment_type: string | null;
  notes: string | null;
}

interface LoanWithRepayments {
  loanId: string;
  principal: number;
  outstanding: number;
  repayments: Repayment[];
}

const RepaymentSchedule = ({ userId }: RepaymentScheduleProps) => {
  const [loans, setLoans] = useState<LoanWithRepayments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchSchedule();
  }, [userId]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const { data: activeLoans } = await supabase
        .from("loans")
        .select("id, principal_amount, outstanding_balance")
        .eq("user_id", userId)
        .eq("status", "active");

      if (!activeLoans || activeLoans.length === 0) {
        setLoans([]);
        return;
      }

      const result: LoanWithRepayments[] = [];
      for (const loan of activeLoans) {
        const { data: repayments } = await supabase
          .from("loan_repayments")
          .select("*")
          .eq("loan_id", loan.id)
          .order("due_date", { ascending: true });

        result.push({
          loanId: loan.id,
          principal: Number(loan.principal_amount),
          outstanding: Number(loan.outstanding_balance),
          repayments: (repayments || []) as Repayment[],
        });
      }

      setLoans(result);
    } catch (error) {
      console.error("Error fetching repayment schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (r: Repayment) => {
    if (Number(r.amount) >= Number(r.amount_due) && Number(r.amount_due) > 0) return "paid";
    if (r.due_date && new Date(r.due_date) < new Date() && Number(r.amount) < Number(r.amount_due)) return "overdue";
    return "upcoming";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading repayment schedule...</p>
        </CardContent>
      </Card>
    );
  }

  if (loans.length === 0) return null;

  return (
    <>
      {loans.map((loan) => {
        const totalDue = loan.repayments.reduce((s, r) => s + Number(r.amount_due), 0);
        const totalPaid = loan.repayments.reduce((s, r) => s + Number(r.amount), 0);
        const progress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

        return (
          <Card key={loan.loanId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5" />
                Repayment Schedule — £{loan.principal.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  £{totalPaid.toLocaleString()} paid of £{totalDue.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                {loan.repayments.map((r) => {
                  const status = getStatus(r);
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        status === "paid"
                          ? "bg-success/5 border-success/20"
                          : status === "overdue"
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {status === "paid" && <CheckCircle className="w-4 h-4 text-success" />}
                        {status === "overdue" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        {status === "upcoming" && <Clock className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <p className="text-sm font-medium">£{Number(r.amount_due).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.due_date ? new Date(r.due_date).toLocaleDateString() : "No date"} • {r.notes}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={status === "paid" ? "outline" : status === "overdue" ? "destructive" : "secondary"}
                      >
                        {status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Upcoming"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};

export default RepaymentSchedule;
