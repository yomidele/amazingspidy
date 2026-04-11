import { supabase } from "@/integrations/supabase/client";

export const logActivity = async (
  action: string,
  description: string,
  entityType: string,
  entityId: string,
  userId?: string | null
) => {
  try {
    await supabase.from("activity_logs").insert({
      user_id: userId || null,
      action,
      description,
      entity_type: entityType,
      entity_id: entityId,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = "info",
  link?: string
) => {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      link: link || null,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

export interface LiquidityCheck {
  totalContributions: number;
  totalActiveLoans: number;
  totalInvestorObligations: number;
  availableFunds: number;
  canApproveLoan: boolean;
  reason?: string;
}

export const checkLiquidity = async (requestedAmount: number): Promise<LiquidityCheck> => {
  const [paymentsRes, loansRes, investmentsRes, investorPaymentsRes] = await Promise.all([
    supabase.from("contribution_payments").select("amount").eq("status", "paid"),
    supabase.from("loans").select("outstanding_balance").eq("status", "active"),
    supabase.from("investments").select("amount, interest_rate").eq("status", "active"),
    supabase.from("investor_payments" as any).select("amount_paid"),
  ]);

  const totalContributions = (paymentsRes.data || []).reduce((s, p) => s + Number(p.amount), 0);
  const totalActiveLoans = (loansRes.data || []).reduce((s, l) => s + Number(l.outstanding_balance), 0);

  const totalInvestorObligations = (investmentsRes.data || []).reduce(
    (s, i) => s + Number(i.amount) * (1 + Number(i.interest_rate) / 100),
    0
  );
  const totalInvestorPaid = (investorPaymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const remainingInvestorObligations = totalInvestorObligations - totalInvestorPaid;

  const availableFunds = totalContributions - totalActiveLoans - remainingInvestorObligations;
  const canApproveLoan = availableFunds >= requestedAmount;

  return {
    totalContributions,
    totalActiveLoans,
    totalInvestorObligations: remainingInvestorObligations,
    availableFunds,
    canApproveLoan,
    reason: canApproveLoan
      ? undefined
      : `Insufficient liquidity. Available: £${availableFunds.toLocaleString()}, Requested: £${requestedAmount.toLocaleString()}`,
  };
};
