import { useState, useEffect } from "react";
import { Wallet, TrendingUp, CreditCard, Download, Eye, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import TransactionReceiptDialog from "@/components/shared/TransactionReceiptDialog";

interface Transaction {
  id: string;
  type: "contribution" | "loan" | "repayment" | "payout";
  description: string;
  date: string;
  amount: number;
  status: string;
  period?: string;
  groupName?: string;
  memberName?: string;
}

interface ContributorTransactionListProps {
  userId: string;
  userName?: string;
}

const ContributorTransactionList = ({
  userId,
  userName,
}: ContributorTransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchTransactions = async () => {
    setLoading(true);
    const allTransactions: Transaction[] = [];

    try {
      // Fetch contribution payments with monthly contribution details
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("contribution_payments")
        .select(`
          id,
          amount,
          status,
          payment_date,
          monthly_contribution_id
        `)
        .eq("user_id", userId)
        .order("payment_date", { ascending: false });

      if (!paymentsError && paymentsData) {
        // Get monthly contribution details for each payment
        for (const payment of paymentsData) {
          const { data: mcData } = await supabase
            .from("monthly_contributions")
            .select("month, year, group_id")
            .eq("id", payment.monthly_contribution_id)
            .maybeSingle();

          let groupName = "Amana Market";
          if (mcData?.group_id) {
            const { data: groupData } = await supabase
              .from("contribution_groups")
              .select("name")
              .eq("id", mcData.group_id)
              .maybeSingle();
            if (groupData) groupName = groupData.name;
          }

          allTransactions.push({
            id: payment.id,
            type: "contribution",
            description: "Monthly contribution payment",
            date: payment.payment_date || new Date().toISOString(),
            amount: payment.amount,
            status: payment.status || "pending",
            period: mcData ? `${monthNames[mcData.month - 1]} ${mcData.year}` : undefined,
            groupName,
            memberName: userName,
          });
        }
      }

      // Fetch loans
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select(`
          id,
          principal_amount,
          status,
          issued_date,
          group_id
        `)
        .eq("user_id", userId)
        .order("issued_date", { ascending: false });

      if (!loansError && loansData) {
        for (const loan of loansData) {
          let groupName = "Amana Market";
          if (loan.group_id) {
            const { data: groupData } = await supabase
              .from("contribution_groups")
              .select("name")
              .eq("id", loan.group_id)
              .maybeSingle();
            if (groupData) groupName = groupData.name;
          }

          allTransactions.push({
            id: loan.id,
            type: "loan",
            description: "Loan disbursement",
            date: loan.issued_date || new Date().toISOString(),
            amount: loan.principal_amount,
            status: loan.status || "active",
            groupName,
            memberName: userName,
          });
        }
      }

      // Fetch loan repayments
      const { data: repaymentsData, error: repaymentsError } = await supabase
        .from("loan_repayments")
        .select(`
          id,
          amount,
          repayment_date,
          repayment_type,
          loan_id
        `)
        .order("repayment_date", { ascending: false });

      if (!repaymentsError && repaymentsData) {
        // Filter repayments for user's loans
        const userLoanIds = loansData?.map((l) => l.id) || [];
        const userRepayments = repaymentsData.filter((r) =>
          userLoanIds.includes(r.loan_id)
        );

        for (const repayment of userRepayments) {
          allTransactions.push({
            id: repayment.id,
            type: "repayment",
            description: `Loan repayment (${repayment.repayment_type || "manual"})`,
            date: repayment.repayment_date || new Date().toISOString(),
            amount: repayment.amount,
            status: "completed",
            memberName: userName,
          });
        }
      }

      // Sort all transactions by date
      allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReceiptOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "contribution":
        return <Wallet className="w-5 h-5 text-contribution" />;
      case "loan":
        return <CreditCard className="w-5 h-5 text-destructive" />;
      case "repayment":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "payout":
        return <TrendingUp className="w-5 h-5 text-success" />;
      default:
        return <Wallet className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case "contribution":
      case "repayment":
        return "-";
      case "loan":
      case "payout":
        return "+";
      default:
        return "";
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case "loan":
      case "payout":
        return "text-success";
      case "contribution":
      case "repayment":
        return "text-foreground";
      default:
        return "text-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <Button variant="ghost" size="sm">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleViewReceipt(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === "loan" || transaction.type === "payout"
                          ? "bg-success/10"
                          : "bg-contribution-light"
                      }`}
                    >
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                        {transaction.period && ` • ${transaction.period}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold ${getAmountColor(
                        transaction.type
                      )}`}
                    >
                      {getAmountPrefix(transaction.type)}£
                      {transaction.amount.toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewReceipt(transaction);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        transaction={selectedTransaction}
      />
    </>
  );
};

export default ContributorTransactionList;
