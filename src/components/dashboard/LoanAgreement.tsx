import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LoanAgreementProps {
  borrowerName: string;
  guarantorName: string;
  amount: number;
  durationMonths: number;
  purpose: string;
  groupName: string;
  date: string;
}

const LoanAgreement = ({
  borrowerName,
  guarantorName,
  amount,
  durationMonths,
  purpose,
  groupName,
  date,
}: LoanAgreementProps) => {
  const monthlyRepayment = Math.ceil((amount / durationMonths) * 100) / 100;
  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const agreementText = `
LOAN AGREEMENT

Date: ${formattedDate}
Group: ${groupName}

PARTIES:
1. Borrower: ${borrowerName}
2. Guarantor: ${guarantorName}

TERMS:
- Loan Amount: £${amount.toLocaleString()}
- Duration: ${durationMonths} months
- Monthly Repayment: £${monthlyRepayment.toLocaleString()}
- Purpose: ${purpose}

CONDITIONS:
1. The Borrower agrees to repay the full loan amount of £${amount.toLocaleString()} within ${durationMonths} months.
2. Monthly repayments of £${monthlyRepayment.toLocaleString()} are due on the 1st of each month.
3. The Guarantor accepts responsibility if the Borrower defaults on repayment.
4. Late payments may result in suspension of contribution benefits.
5. The Borrower may not apply for another loan until this loan is fully repaid.

This agreement is binding upon approval by the group administrator.

_________________________          _________________________
Borrower Signature                 Guarantor Signature
${borrowerName}                    ${guarantorName}

_________________________
Administrator Signature
  `.trim();

  const handleDownload = () => {
    const blob = new Blob([agreementText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-agreement-${borrowerName.replace(/\s+/g, "-").toLowerCase()}-${new Date(date).toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-1" />
          Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loan Agreement</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-lg border">
          {agreementText}
        </pre>
        <Button onClick={handleDownload} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          Download Agreement
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LoanAgreement;
