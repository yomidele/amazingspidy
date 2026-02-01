import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, CheckCircle, Calendar, User, CreditCard, Receipt } from "lucide-react";
import { format } from "date-fns";

interface TransactionDetails {
  id: string;
  type: "contribution" | "loan" | "repayment" | "payout";
  amount: number;
  date: string;
  status: string;
  memberName?: string;
  memberEmail?: string;
  description?: string;
  reference?: string;
  period?: string;
  groupName?: string;
}

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetails | null;
}

const TransactionReceiptDialog = ({
  open,
  onOpenChange,
  transaction,
}: TransactionReceiptDialogProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handleDownload = () => {
    if (!receiptRef.current) return;

    // Create a printable version
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to download the receipt");
      return;
    }

    const receiptContent = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.reference || transaction.id}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              color: #1a1a1a;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #0f766e;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .receipt-body {
              padding: 20px 0;
            }
            .field-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }
            .field-label {
              color: #666;
              font-size: 14px;
            }
            .field-value {
              font-weight: 600;
              font-size: 14px;
            }
            .amount-row {
              background: #f0fdfa;
              padding: 16px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .amount-label {
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount-value {
              font-size: 32px;
              font-weight: bold;
              color: #0f766e;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .receipt-footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "contribution":
        return "Contribution Payment";
      case "loan":
        return "Loan Disbursement";
      case "repayment":
        return "Loan Repayment";
      case "payout":
        return "Payout Received";
      default:
        return "Transaction";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "completed":
      case "active":
        return "status-paid";
      case "pending":
        return "status-pending";
      default:
        return "status-pending";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-contribution" />
            Transaction Receipt
          </DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-card rounded-lg border p-6 space-y-6"
        >
          {/* Header */}
          <div className="receipt-header text-center border-b pb-4">
            <div className="logo text-xl font-bold text-contribution">
              AMANA MARKET
            </div>
            <div className="subtitle text-sm text-muted-foreground">
              Contribution Management System
            </div>
          </div>

          {/* Amount */}
          <div className="amount-row bg-contribution-light rounded-xl p-4 text-center">
            <div className="amount-label text-xs text-muted-foreground uppercase tracking-wider">
              Amount
            </div>
            <div className="amount-value text-3xl font-bold text-contribution">
              £{transaction.amount.toLocaleString()}
            </div>
          </div>

          {/* Details */}
          <div className="receipt-body space-y-3">
            <div className="field-row flex justify-between py-2 border-b border-border">
              <span className="field-label text-sm text-muted-foreground">
                Transaction Type
              </span>
              <span className="field-value text-sm font-semibold">
                {getTypeLabel(transaction.type)}
              </span>
            </div>

            <div className="field-row flex justify-between py-2 border-b border-border">
              <span className="field-label text-sm text-muted-foreground">
                Reference
              </span>
              <span className="field-value text-sm font-mono">
                {transaction.reference || transaction.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="field-row flex justify-between py-2 border-b border-border">
              <span className="field-label text-sm text-muted-foreground">
                Date
              </span>
              <span className="field-value text-sm font-semibold">
                {format(new Date(transaction.date), "dd MMM yyyy, HH:mm")}
              </span>
            </div>

            {transaction.memberName && (
              <div className="field-row flex justify-between py-2 border-b border-border">
                <span className="field-label text-sm text-muted-foreground">
                  Member
                </span>
                <span className="field-value text-sm font-semibold">
                  {transaction.memberName}
                </span>
              </div>
            )}

            {transaction.period && (
              <div className="field-row flex justify-between py-2 border-b border-border">
                <span className="field-label text-sm text-muted-foreground">
                  Period
                </span>
                <span className="field-value text-sm font-semibold">
                  {transaction.period}
                </span>
              </div>
            )}

            {transaction.groupName && (
              <div className="field-row flex justify-between py-2 border-b border-border">
                <span className="field-label text-sm text-muted-foreground">
                  Group
                </span>
                <span className="field-value text-sm font-semibold">
                  {transaction.groupName}
                </span>
              </div>
            )}

            <div className="field-row flex justify-between py-2">
              <span className="field-label text-sm text-muted-foreground">
                Status
              </span>
              <span
                className={`status-badge inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  transaction.status?.toLowerCase() === "paid" ||
                  transaction.status?.toLowerCase() === "completed"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {transaction.status || "Pending"}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="receipt-footer text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Generated on {format(new Date(), "dd MMM yyyy, HH:mm")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Thank you for your contribution!
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button variant="contribution" className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReceiptDialog;
