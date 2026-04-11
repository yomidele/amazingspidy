import { useState, useEffect, useRef } from "react";
import { Download, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [generating, setGenerating] = useState(false);
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
    setGenerating(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pw - margin * 2;
      let y = margin;

      const addText = (text: string, x: number, size: number, style: "normal" | "bold" = "normal", color = [30, 30, 50]) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", style);
        pdf.setTextColor(color[0], color[1], color[2]);
      };

      const checkPage = (needed: number) => {
        if (y + needed > ph - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // Header
      addText("", 0, 18, "bold");
      pdf.text("LOAN APPLICATION FORM", pw / 2, y, { align: "center" });
      y += 7;
      addText("", 0, 10, "normal", [120, 120, 120]);
      pdf.text("Amana Market Contribution Group", pw / 2, y, { align: "center" });
      y += 4;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pw - margin, y);
      y += 8;

      // Reference & Date
      addText("", 0, 9, "normal", [120, 120, 120]);
      pdf.text("Reference No.", margin, y);
      pdf.text("Date", pw - margin, y, { align: "right" });
      y += 5;
      addText("", 0, 11, "bold");
      pdf.text(loanRequest.id.slice(0, 8).toUpperCase(), margin, y);
      pdf.text(formattedDate, pw - margin, y, { align: "right" });
      y += 4;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pw - margin, y);
      y += 8;

      // Parties Section
      addText("", 0, 11, "bold", [80, 80, 80]);
      pdf.text("PARTIES", margin, y);
      y += 7;

      const boxH = 18;
      const halfW = (contentWidth - 6) / 2;

      // Borrower box
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(248, 248, 252);
      pdf.roundedRect(margin, y, halfW, boxH, 2, 2, "FD");
      addText("", 0, 8, "normal", [120, 120, 120]);
      pdf.text("Borrower", margin + 4, y + 6);
      addText("", 0, 11, "bold");
      pdf.text(loanRequest.borrower_name, margin + 4, y + 13);

      // Guarantor box
      pdf.setFillColor(248, 248, 252);
      pdf.roundedRect(margin + halfW + 6, y, halfW, boxH, 2, 2, "FD");
      addText("", 0, 8, "normal", [120, 120, 120]);
      pdf.text("Guarantor", margin + halfW + 10, y + 6);
      addText("", 0, 11, "bold");
      pdf.text(loanRequest.guarantor_name, margin + halfW + 10, y + 13);
      y += boxH + 6;

      pdf.line(margin, y, pw - margin, y);
      y += 8;

      // Loan Terms
      addText("", 0, 11, "bold", [80, 80, 80]);
      pdf.text("LOAN TERMS", margin, y);
      y += 7;

      const terms = [
        ["Loan Amount", `£${loanRequest.amount.toLocaleString()}`],
        ["Duration", `${loanRequest.duration_months} months`],
        ["Monthly Repayment", `£${monthlyRepayment.toLocaleString()}`],
        ["Group", loanRequest.group_name],
      ];

      const termBoxW = (contentWidth - 6) / 2;
      const termBoxH = 16;

      for (let i = 0; i < terms.length; i += 2) {
        checkPage(termBoxH + 4);
        for (let j = 0; j < 2 && i + j < terms.length; j++) {
          const xPos = margin + j * (termBoxW + 6);
          pdf.setFillColor(248, 248, 252);
          pdf.setDrawColor(200, 200, 200);
          pdf.roundedRect(xPos, y, termBoxW, termBoxH, 2, 2, "FD");
          addText("", 0, 8, "normal", [120, 120, 120]);
          pdf.text(terms[i + j][0], xPos + 4, y + 6);
          addText("", 0, 12, "bold");
          pdf.text(terms[i + j][1], xPos + 4, y + 13);
        }
        y += termBoxH + 4;
      }
      y += 4;

      // Purpose
      checkPage(20);
      addText("", 0, 11, "bold", [80, 80, 80]);
      pdf.text("PURPOSE", margin, y);
      y += 6;
      pdf.setFillColor(248, 248, 252);
      pdf.setDrawColor(200, 200, 200);
      pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, "FD");
      addText("", 0, 10, "normal");
      pdf.text(loanRequest.purpose || "General", margin + 4, y + 8);
      y += 16;

      pdf.line(margin, y, pw - margin, y);
      y += 8;

      // Terms & Conditions
      checkPage(60);
      addText("", 0, 11, "bold", [80, 80, 80]);
      pdf.text("TERMS & CONDITIONS", margin, y);
      y += 7;

      const conditions = [
        `1. The Borrower agrees to repay £${loanRequest.amount.toLocaleString()} within ${loanRequest.duration_months} months.`,
        `2. Monthly repayments of £${monthlyRepayment.toLocaleString()} are due on the 1st of each month.`,
        `3. The Guarantor accepts liability if the Borrower defaults on repayment.`,
        `4. Late payments may result in suspension of contribution benefits.`,
        `5. The Borrower may not apply for another loan until this loan is fully repaid.`,
        `6. This agreement is binding upon approval by the group administrator.`,
      ];

      addText("", 0, 9, "normal", [60, 60, 60]);
      for (const cond of conditions) {
        checkPage(6);
        const lines = pdf.splitTextToSize(cond, contentWidth - 4);
        for (const line of lines) {
          pdf.text(line, margin + 2, y);
          y += 5;
        }
      }
      y += 4;

      pdf.line(margin, y, pw - margin, y);
      y += 8;

      // Signatures
      checkPage(50);
      addText("", 0, 11, "bold", [80, 80, 80]);
      pdf.text("SIGNATURES", margin, y);
      y += 7;

      const sigBoxH = 35;

      // Borrower signature
      pdf.setDrawColor(200, 200, 200);
      pdf.roundedRect(margin, y, halfW, sigBoxH, 2, 2);
      addText("", 0, 8, "bold", [120, 120, 120]);
      pdf.text("Borrower Signature", margin + 4, y + 6);

      if (borrowerSig) {
        try {
          pdf.addImage(borrowerSig.signature_data, "PNG", margin + 4, y + 9, halfW - 8, 14);
          addText("", 0, 8, "normal", [60, 60, 60]);
          pdf.text(loanRequest.borrower_name, margin + 4, y + 27);
          addText("", 0, 7, "normal", [150, 150, 150]);
          pdf.text(`Signed: ${new Date(borrowerSig.signed_at).toLocaleDateString()}`, margin + 4, y + 32);
        } catch (e) {
          addText("", 0, 9, "normal", [150, 150, 150]);
          pdf.text("Signature on file", margin + 4, y + 20);
        }
      } else {
        addText("", 0, 9, "normal", [180, 180, 180]);
        pdf.text("Awaiting signature", margin + 4, y + 20);
      }

      // Guarantor signature
      pdf.roundedRect(margin + halfW + 6, y, halfW, sigBoxH, 2, 2);
      addText("", 0, 8, "bold", [120, 120, 120]);
      pdf.text("Guarantor Signature", margin + halfW + 10, y + 6);

      if (guarantorSig) {
        try {
          pdf.addImage(guarantorSig.signature_data, "PNG", margin + halfW + 10, y + 9, halfW - 8, 14);
          addText("", 0, 8, "normal", [60, 60, 60]);
          pdf.text(loanRequest.guarantor_name, margin + halfW + 10, y + 27);
          addText("", 0, 7, "normal", [150, 150, 150]);
          pdf.text(`Signed: ${new Date(guarantorSig.signed_at).toLocaleDateString()}`, margin + halfW + 10, y + 32);
        } catch (e) {
          addText("", 0, 9, "normal", [150, 150, 150]);
          pdf.text("Signature on file", margin + halfW + 10, y + 20);
        }
      } else {
        addText("", 0, 9, "normal", [180, 180, 180]);
        pdf.text("Awaiting signature", margin + halfW + 10, y + 20);
      }

      y += sigBoxH + 8;

      // Admin stamp
      if (loanRequest.status === "approved") {
        checkPage(16);
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(34, 197, 94);
        pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");
        addText("", 0, 12, "bold", [34, 197, 94]);
        pdf.text("✓ APPROVED BY ADMINISTRATOR", pw / 2, y + 9, { align: "center" });
      }

      pdf.save(`loan-agreement-${loanRequest.borrower_name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
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
        <Button size="sm" onClick={handleDownloadPDF} disabled={generating}>
          <Download className="w-4 h-4 mr-1" /> {generating ? "Generating..." : "PDF"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={docRef} className="p-6 sm:p-8 bg-white text-gray-900 space-y-6" style={{ fontFamily: "serif" }}>
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold uppercase tracking-wider">Loan Application Form</h1>
              <p className="text-sm text-gray-500">Amana Market Contribution Group</p>
              <hr className="border-gray-200" />
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

            <hr className="border-gray-200" />

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

            <hr className="border-gray-200" />

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

            <hr className="border-gray-200" />

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

            <hr className="border-gray-200" />

            {/* Signatures */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase text-gray-600">Signatures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="text-center p-4 border-2 border-green-300 rounded-lg bg-green-50">
                <p className="text-green-600 font-bold text-sm uppercase">✓ Approved by Administrator</p>
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
