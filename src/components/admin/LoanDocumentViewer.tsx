import { useState, useEffect, useRef } from "react";
import { FileText, Download, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

interface LoanDocumentViewerProps {
  loanRequest: {
    id: string;
    borrower_id: string;
    borrower_name: string;
    guarantor_name: string;
    guarantor_id: string;
    amount: number;
    duration_months: number;
    purpose: string | null;
    group_name: string;
    status: string;
    created_at: string;
  };
  onBack: () => void;
}

interface SignatureData {
  signer_role: string;
  signature_data: string;
  signed_at: string;
}

const LoanDocumentViewer = ({ loanRequest, onBack }: LoanDocumentViewerProps) => {
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<HTMLDivElement>(null);

  const monthlyRepayment = Math.ceil((loanRequest.amount / loanRequest.duration_months) * 100) / 100;
  const formattedDate = new Date(loanRequest.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    fetchSignatures();
  }, [loanRequest.id]);

  const fetchSignatures = async () => {
    setLoading(false);
    const { data } = await supabase
      .from("loan_signatures" as any)
      .select("signer_role, signature_data, signed_at")
      .eq("loan_request_id", loanRequest.id);
    setSignatures((data as any as SignatureData[]) || []);
  };

  const borrowerSig = signatures.find(s => s.signer_role === "borrower");
  const guarantorSig = signatures.find(s => s.signer_role === "guarantor");

  const handleDownloadPDF = async () => {
    const el = docRef.current;
    if (!el) return;

    // Use html2canvas + jspdf for PDF generation
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`loan-agreement-${loanRequest.borrower_name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  const getStatusInfo = () => {
    if (loanRequest.status === "approved") return { icon: CheckCircle, color: "text-success", label: "Approved" };
    if (loanRequest.status === "rejected") return { icon: XCircle, color: "text-destructive", label: "Rejected" };
    if (loanRequest.status === "pending_admin") return { icon: Clock, color: "text-primary", label: "Pending Admin Review" };
    return { icon: Clock, color: "text-muted-foreground", label: loanRequest.status.replace("_", " ") };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="font-heading text-lg font-bold flex-1">Loan Application Document</h2>
        <Button size="sm" onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-1" /> PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={docRef} className="p-6 sm:p-8 bg-white text-gray-900 space-y-6" style={{ fontFamily: "serif" }}>
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold uppercase tracking-wider">Loan Application Form</h1>
              <p className="text-sm text-gray-500">Amana Market Contribution Group</p>
              <Separator />
            </div>

            {/* Reference & Date */}
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-500">Reference No.</p>
                <p className="font-mono font-bold">{loanRequest.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Date</p>
                <p className="font-bold">{formattedDate}</p>
              </div>
            </div>

            <Separator />

            {/* Parties */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase text-gray-600">Parties</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Borrower</p>
                  <p className="font-bold">{loanRequest.borrower_name}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Guarantor</p>
                  <p className="font-bold">{loanRequest.guarantor_name}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Loan Terms */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase text-gray-600">Loan Terms</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Loan Amount</p>
                  <p className="font-bold text-lg">£{loanRequest.amount.toLocaleString()}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Duration</p>
                  <p className="font-bold">{loanRequest.duration_months} months</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Monthly Repayment</p>
                  <p className="font-bold">£{monthlyRepayment.toLocaleString()}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-gray-500 text-xs">Group</p>
                  <p className="font-bold">{loanRequest.group_name}</p>
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase text-gray-600">Purpose</h3>
              <p className="text-sm p-3 border rounded-lg">{loanRequest.purpose || "General"}</p>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase text-gray-600">Terms & Conditions</h3>
              <ol className="text-xs space-y-1.5 list-decimal list-inside text-gray-700">
                <li>The Borrower agrees to repay £{loanRequest.amount.toLocaleString()} within {loanRequest.duration_months} months.</li>
                <li>Monthly repayments of £{monthlyRepayment.toLocaleString()} are due on the 1st of each month.</li>
                <li>The Guarantor accepts liability if the Borrower defaults on repayment.</li>
                <li>Late payments may result in suspension of contribution benefits.</li>
                <li>The Borrower may not apply for another loan until this loan is fully repaid.</li>
                <li>This agreement is binding upon approval by the group administrator.</li>
              </ol>
            </div>

            <Separator />

            {/* Signatures */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase text-gray-600">Signatures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Borrower Signature */}
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">Borrower Signature</p>
                  {borrowerSig ? (
                    <>
                      <img src={borrowerSig.signature_data} alt="Borrower signature" className="w-full h-16 object-contain" />
                      <p className="text-xs text-gray-600">{loanRequest.borrower_name}</p>
                      <p className="text-[10px] text-gray-400">Signed: {new Date(borrowerSig.signed_at).toLocaleString()}</p>
                    </>
                  ) : (
                    <div className="h-16 flex items-center justify-center border-b-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-400 italic">Awaiting signature</p>
                    </div>
                  )}
                </div>

                {/* Guarantor Signature */}
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">Guarantor Signature</p>
                  {guarantorSig ? (
                    <>
                      <img src={guarantorSig.signature_data} alt="Guarantor signature" className="w-full h-16 object-contain" />
                      <p className="text-xs text-gray-600">{loanRequest.guarantor_name}</p>
                      <p className="text-[10px] text-gray-400">Signed: {new Date(guarantorSig.signed_at).toLocaleString()}</p>
                    </>
                  ) : (
                    <div className="h-16 flex items-center justify-center border-b-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-400 italic">Awaiting signature</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin stamp */}
            {loanRequest.status === "approved" && (
              <div className="text-center p-4 border-2 border-success/30 rounded-lg bg-success/5">
                <p className="text-success font-bold text-sm uppercase">✓ Approved by Administrator</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status badge */}
      <div className="flex items-center gap-2 justify-center">
        <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
        <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        {borrowerSig && <Badge variant="outline" className="text-xs">Borrower Signed</Badge>}
        {guarantorSig && <Badge variant="outline" className="text-xs">Guarantor Signed</Badge>}
      </div>
    </div>
  );
};

export default LoanDocumentViewer;
