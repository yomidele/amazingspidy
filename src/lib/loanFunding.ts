import { supabase } from "@/integrations/supabase/client";
import { logActivity, sendNotification } from "@/lib/activityLogger";

/**
 * Disburse a fully-funded loan request:
 *  - creates a `loans` row
 *  - records per-investor `loan_disbursements`
 *  - generates a repayment schedule
 *  - flips the loan_request status to "active"
 *  - notifies borrower & investors
 */
export async function disburseLoan(loanRequestId: string) {
  // 1. Load request + accepted assignments
  const { data: request, error: reqErr } = await supabase
    .from("loan_requests")
    .select("id, borrower_id, group_id, amount, duration_months, status")
    .eq("id", loanRequestId)
    .single();
  if (reqErr || !request) throw reqErr || new Error("Loan request not found");

  if (request.status !== "fully_funded") {
    throw new Error(`Loan must be fully funded before disbursement (current: ${request.status})`);
  }

  const { data: assignments, error: aErr } = await (supabase as any)
    .from("loan_assignments")
    .select("id, investor_id, assignment_share, status")
    .eq("loan_request_id", loanRequestId)
    .eq("status", "accepted");
  if (aErr) throw aErr;

  const totalAccepted = (assignments || []).reduce((s: number, a: any) => s + Number(a.assignment_share), 0);
  if (Math.abs(totalAccepted - Number(request.amount)) > 0.01) {
    throw new Error(`Accepted total (£${totalAccepted}) does not match loan amount (£${request.amount})`);
  }

  // 2. Create loan record
  const monthly = Math.ceil((Number(request.amount) / request.duration_months) * 100) / 100;
  const { data: loan, error: loanErr } = await supabase
    .from("loans")
    .insert({
      user_id: request.borrower_id,
      group_id: request.group_id,
      principal_amount: request.amount,
      outstanding_balance: request.amount,
      monthly_repayment: monthly,
      status: "active",
      issued_date: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (loanErr || !loan) throw loanErr || new Error("Failed to create loan");

  // 3. Per-investor disbursement ledger
  const disbursements = (assignments || []).map((a: any) => ({
    loan_id: loan.id,
    loan_request_id: loanRequestId,
    investor_id: a.investor_id,
    amount: Number(a.assignment_share),
  }));
  if (disbursements.length > 0) {
    const { error: dErr } = await (supabase as any).from("loan_disbursements").insert(disbursements);
    if (dErr) throw dErr;
  }

  // 4. Repayment schedule
  const repayments = [];
  const now = new Date();
  for (let i = 1; i <= request.duration_months; i++) {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const isLast = i === request.duration_months;
    const amountDue = isLast
      ? Number(request.amount) - monthly * (request.duration_months - 1)
      : monthly;
    repayments.push({
      loan_id: loan.id,
      amount: 0,
      amount_due: amountDue,
      due_date: dueDate.toISOString().split("T")[0],
      repayment_type: "manual",
      notes: `Installment ${i} of ${request.duration_months}`,
    });
  }
  await supabase.from("loan_repayments").insert(repayments);

  // 5. Move request to active + audit
  await (supabase as any)
    .from("loan_requests")
    .update({ status: "active" })
    .eq("id", loanRequestId);

  await logActivity(
    "loan_disbursed",
    `Loan of £${Number(request.amount).toLocaleString()} disbursed across ${disbursements.length} investor(s).`,
    "loan",
    loan.id
  );

  await sendNotification(
    request.borrower_id,
    "Loan Disbursed ✅",
    `Your loan of £${Number(request.amount).toLocaleString()} has been disbursed. Repayment schedule is now active.`,
    "success",
    "/dashboard/contributor"
  );

  for (const a of assignments || []) {
    await sendNotification(
      a.investor_id,
      "Loan Disbursed",
      `£${Number(a.assignment_share).toLocaleString()} of your investment is now funding an active loan.`,
      "info",
      "/dashboard/investor"
    );
  }

  return loan.id;
}

/**
 * Distribute a borrower repayment across the funding investors,
 * proportional to each investor's disbursement share.
 *
 * Call AFTER inserting/updating a `loan_repayments` row with `amount > 0`.
 */
export async function distributeRepayment(loanRepaymentId: string, loanId: string, repaymentAmount: number) {
  if (!repaymentAmount || repaymentAmount <= 0) return;

  const { data: disbursements, error } = await (supabase as any)
    .from("loan_disbursements")
    .select("investor_id, amount")
    .eq("loan_id", loanId);
  if (error || !disbursements || disbursements.length === 0) return;

  const total = disbursements.reduce((s: number, d: any) => s + Number(d.amount), 0);
  if (total <= 0) return;

  const rows = disbursements.map((d: any) => {
    const sharePct = (Number(d.amount) / total) * 100;
    const share = Math.round((Number(d.amount) / total) * repaymentAmount * 100) / 100;
    return {
      loan_repayment_id: loanRepaymentId,
      loan_id: loanId,
      investor_id: d.investor_id,
      amount: share,
      share_percent: Math.round(sharePct * 100) / 100,
    };
  });

  await (supabase as any).from("loan_repayment_distributions").insert(rows);

  // Notify investors of returned funds
  for (const r of rows) {
    await sendNotification(
      r.investor_id,
      "Loan Repayment Received",
      `£${r.amount.toLocaleString()} of a loan you funded has been repaid and returned to your available balance.`,
      "success",
      "/dashboard/investor"
    );
  }
}
