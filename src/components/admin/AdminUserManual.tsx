import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  X,
  Users,
  Wallet,
  Receipt,
  CreditCard,
  Shield,
  BarChart3,
  Bell,
  Settings,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: ManualContent[];
}

interface ManualContent {
  heading: string;
  paragraphs: string[];
  tips?: string[];
  warnings?: string[];
  steps?: string[];
}

const manualSections: ManualSection[] = [
  {
    id: "overview",
    title: "System Overview",
    icon: LayoutDashboard,
    content: [
      {
        heading: "Purpose of the Amana Market Contribution System",
        paragraphs: [
          "The Amana Market Contribution System is a rotating savings and credit association (ROSCA) management platform designed specifically for the Amana Market community. This system enables groups of contributors to pool their monthly contributions and rotate payouts to members on a scheduled basis.",
          "The platform provides complete transparency and accountability for all financial transactions, ensuring every contribution, payment, and loan is properly documented and traceable.",
        ],
      },
      {
        heading: "Admin Responsibilities",
        paragraphs: [
          "As an administrator, you are responsible for maintaining the integrity and smooth operation of the contribution system. Your duties include:",
        ],
        steps: [
          "Managing member registrations and group assignments",
          "Setting up monthly contribution periods with designated beneficiaries",
          "Recording and verifying all member payments",
          "Issuing and tracking member loans",
          "Generating reports for transparency and auditing",
          "Resolving payment disputes and discrepancies",
          "Maintaining accurate records of all transactions",
        ],
      },
      {
        heading: "Data Flow Overview",
        paragraphs: [
          "The system follows a clear data flow: Contributors make payments, which you (the admin) record and verify. Once verified, payments are added to the monthly pool. At the end of each contribution period, the total collected amount is disbursed to the designated beneficiary.",
          "All transactions are logged with timestamps, creating a complete audit trail. The dashboard reflects real-time data, so any changes you make are immediately visible to both you and the contributors.",
        ],
        tips: [
          "Always verify payment evidence before marking contributions as paid",
          "Keep beneficiary bank details up to date to avoid disbursement delays",
          "Review the dashboard daily during active contribution periods",
        ],
      },
    ],
  },
  {
    id: "members",
    title: "Member Management",
    icon: Users,
    content: [
      {
        heading: "Adding New Contributors",
        paragraphs: [
          "To add a new contributor to the system, navigate to the Members section in the sidebar. Click the 'Add Member' button to open the registration form.",
        ],
        steps: [
          "Click 'Add Member' in the Members section header",
          "Enter the contributor's full name as it appears on official documents",
          "Provide their email address (this will be their login credential)",
          "Add their phone number for communication purposes",
          "Set a temporary password (they can change this after first login)",
          "Click 'Add Member' to complete registration",
        ],
        tips: [
          "The contributor will receive an email confirmation with login instructions",
          "Ensure email addresses are accurate as they cannot be changed later",
          "Use strong temporary passwords containing letters, numbers, and symbols",
        ],
      },
      {
        heading: "Editing Contributor Details",
        paragraphs: [
          "You can update a contributor's name and phone number at any time. Email addresses are fixed once registered to maintain data integrity.",
        ],
        steps: [
          "Find the member in the Contributors table",
          "Click the 'Edit' (pencil icon) button in the Actions column",
          "Modify the name or phone number as needed",
          "Save changes to update the record",
        ],
      },
      {
        heading: "Group Assignments",
        paragraphs: [
          "Contributors must be assigned to a contribution group to participate in the monthly rotation. Each group has its own contribution amount and member roster.",
        ],
        steps: [
          "First, ensure a contribution group exists (create one if needed)",
          "Click the 'Assign' button for the desired member",
          "Select the appropriate contribution group from the dropdown",
          "Confirm the assignment",
        ],
        warnings: [
          "Removing a member from a group during an active contribution period may affect payment calculations",
          "Each member can only belong to one group at a time",
        ],
      },
      {
        heading: "Creating Contribution Groups",
        paragraphs: [
          "Contribution groups define the monthly amount and organize members into manageable units. Create groups before adding members to ensure proper organization.",
        ],
        steps: [
          "Click 'New Group' in the Members section",
          "Enter a descriptive group name (e.g., 'Monthly Savings - £500')",
          "Add an optional description for internal reference",
          "Set the monthly contribution amount in British Pounds",
          "Click 'Create Group' to save",
        ],
        tips: [
          "Use clear, descriptive names that indicate the contribution amount",
          "You can have multiple groups with different contribution levels",
          "Groups remain available for future contribution periods",
        ],
      },
    ],
  },
  {
    id: "contributions",
    title: "Monthly Contributions",
    icon: Wallet,
    content: [
      {
        heading: "Creating a Monthly Contribution Period",
        paragraphs: [
          "Each month requires a new contribution period to be set up. This defines the beneficiary who will receive the pooled funds and tracks expected versus collected amounts.",
        ],
        steps: [
          "Navigate to the Contributions section from the sidebar",
          "Click 'New Month' to create a new period",
          "Select the month and year for this contribution period",
          "Choose the beneficiary from the member list",
          "Enter the beneficiary's bank name and account number",
          "Confirm the per-member contribution amount",
          "Click 'Create Monthly Contribution' to finalize",
        ],
        tips: [
          "Set up the new month before the first day to give members time to pay",
          "Double-check bank details with the beneficiary to prevent errors",
          "The system automatically calculates total expected based on active members",
        ],
      },
      {
        heading: "Viewing Contribution Progress",
        paragraphs: [
          "Select any contribution period from the Monthly Periods list to view its details. The system shows real-time progress including expected total, collected amount, and outstanding balance.",
        ],
      },
      {
        heading: "Managing Beneficiary Information",
        paragraphs: [
          "The beneficiary's bank details (bank name, account number and sort code) are visible to all members, enabling them to make direct transfers. Ensure this information is accurate and up to date.",
        ],
        warnings: [
          "Changes to beneficiary details after contributions have started may cause confusion",
          "Verify account numbers carefully - incorrect details may result in failed transfers",
        ],
      },
      {
        heading: "Finalizing a Contribution Period",
        paragraphs: [
          "Once all payments are collected and verified, you should finalize the contribution period. This locks the period from further changes and marks it as complete.",
        ],
        tips: [
          "Only finalize after confirming all payments have been received",
          "Review the payment list one final time before finalizing",
          "Finalized periods cannot be reopened without support intervention",
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payment Recording",
    icon: Receipt,
    content: [
      {
        heading: "Recording a Payment",
        paragraphs: [
          "When a member makes their monthly contribution, you must record it in the system. This updates their payment status and adds to the monthly total.",
        ],
        steps: [
          "Go to the Payments section from the sidebar",
          "Select the correct contribution period from the dropdown",
          "Click 'Record Payment' to open the recording form",
          "Select the member from the dropdown list",
          "Enter the payment amount (defaults to the group contribution amount)",
          "Set the status: Paid, Pending, or Partial",
          "Click 'Record Payment' to save",
        ],
        tips: [
          "The member will receive an automatic notification when payment is marked as Paid",
          "Use 'Pending' for payments that need verification",
          "Use 'Partial' when a member pays less than the full amount",
        ],
      },
      {
        heading: "Payment Status Meanings",
        paragraphs: [
          "Understanding payment statuses is crucial for accurate record-keeping:",
        ],
        steps: [
          "PAID: Payment confirmed and verified. Added to the monthly total.",
          "PENDING: Payment recorded but awaiting verification. Not yet added to total.",
          "PARTIAL: Member paid less than the required amount. Balance remains outstanding.",
        ],
      },
      {
        heading: "Updating Payment Status",
        paragraphs: [
          "You can change a payment's status at any time before the period is finalized. Use the action buttons in the payment table to approve, reject, or set as pending.",
        ],
        steps: [
          "Locate the payment in the records table",
          "Click the green checkmark to approve (mark as Paid)",
          "Click the red X to reject (mark as Rejected)",
          "The system automatically recalculates totals",
        ],
        warnings: [
          "Rejecting a payment removes it from the collected total",
          "Always document the reason for rejection for audit purposes",
        ],
      },
      {
        heading: "Editing or Deleting Payments",
        paragraphs: [
          "Admins can correct mistakes by editing or removing recorded payments. Any change is immediately visible in totals and on contributor dashboards.",
        ],
        steps: [
          "Click the pencil icon beside a payment to open the edit dialog",
          "Modify the amount, member or status as needed and click 'Update'",
          "To remove a record entirely, click the trash icon and confirm",
        ],
        tips: [
          "Contributors receive notifications when their payment is changed or deleted",
          "Totals are recalculated automatically once you save or delete",
        ],
      },
      {
        heading: "Viewing Payment Receipts",
        paragraphs: [
          "Each payment generates a receipt that can be viewed and downloaded. Use the 'View' button to open the receipt dialog.",
        ],
        tips: [
          "Members can also view their own receipts in their dashboard",
          "Receipts include transaction ID, date, amount, and confirmation status",
        ],
      },
    ],
  },
  {
    id: "loans",
    title: "Loan Management",
    icon: CreditCard,
    content: [
      {
        heading: "Issuing a New Loan",
        paragraphs: [
          "Members may request loans against their contributions. As admin, you can issue loans and set repayment terms.",
        ],
        steps: [
          "Navigate to the Loans section from the sidebar",
          "Click 'Issue Loan' to open the loan form",
          "Select the member receiving the loan",
          "Choose their contribution group (for reference)",
          "Enter the principal amount being loaned",
          "Optionally set a monthly repayment amount",
          "Click 'Issue Loan' to create the record",
        ],
        tips: [
          "The loan appears on the member's dashboard immediately",
          "Outstanding balance starts equal to the principal amount",
          "Monthly repayment is optional but helps with tracking",
        ],
      },
      {
        heading: "Recording Loan Repayments",
        paragraphs: [
          "When a member makes a loan repayment, record it to reduce their outstanding balance.",
        ],
        steps: [
          "Find the loan in the Loans table",
          "Click the 'Repay' button for that loan",
          "Enter the repayment amount",
          "Select the repayment type (Manual, Contribution Deduction, or Bank Transfer)",
          "Add any notes about the repayment",
          "Click 'Record Repayment' to save",
        ],
        tips: [
          "The system automatically updates the outstanding balance",
          "When balance reaches zero, the loan status changes to 'Paid'",
          "All repayments are logged for audit purposes",
        ],
      },
      {
        heading: "Loan Status Tracking",
        paragraphs: [
          "Loans have two main statuses:",
        ],
        steps: [
          "ACTIVE: Loan has an outstanding balance and repayments are ongoing",
          "PAID: Loan has been fully repaid and is closed",
        ],
      },
      {
        heading: "Deducting Loans from Contributions",
        paragraphs: [
          "For members who are the current beneficiary, you may deduct their loan balance from their payout. This is handled through the repayment recording with 'Contribution Deduction' as the type.",
        ],
        warnings: [
          "Communicate clearly with members about deduction amounts",
          "Ensure deductions are agreed upon before processing",
          "Keep documentation of deduction agreements",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports & Audits",
    icon: BarChart3,
    content: [
      {
        heading: "Dashboard Overview",
        paragraphs: [
          "The main dashboard provides a real-time summary of key metrics: total members, monthly contributions collected, outstanding loans, and the current beneficiary.",
        ],
        tips: [
          "Review the dashboard at the start of each day",
          "Watch for unusual patterns in payment or loan activity",
          "Use the data to identify members who may need payment reminders",
        ],
      },
      {
        heading: "Generating Reports",
        paragraphs: [
          "For detailed analysis and record-keeping, you can generate reports in PDF or CSV format.",
        ],
        steps: [
          "Navigate to the relevant section (Payments, Loans, or Members)",
          "Use the filter options to select the date range or status",
          "Click 'Export PDF' for formatted reports or 'Export CSV' for spreadsheet data",
          "The file will download to your device",
        ],
      },
      {
        heading: "Audit Trail",
        paragraphs: [
          "All admin actions are logged with timestamps and user identification. This provides accountability and helps resolve any disputes about when changes were made.",
        ],
        tips: [
          "Review audit logs periodically for unusual activity",
          "Keep exported reports as backup documentation",
          "The audit trail is read-only and cannot be modified",
        ],
      },
      {
        heading: "Reconciliation",
        paragraphs: [
          "At the end of each contribution period, reconcile the collected amount with the expected total. Any discrepancies should be investigated before finalizing the period.",
        ],
        steps: [
          "Compare total collected vs. total expected",
          "Identify any unpaid or partially paid members",
          "Follow up on outstanding payments",
          "Document any write-offs or adjustments",
          "Finalize the period only when fully reconciled",
        ],
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    content: [
      {
        heading: "Automatic Notifications",
        paragraphs: [
          "The system automatically sends notifications to members when specific events occur. These notifications appear in the member's dashboard and help keep everyone informed.",
        ],
        steps: [
          "Payment confirmation: Sent when you mark a payment as Paid",
          "New contribution period: Members are notified of new monthly cycles",
          "Loan status updates: Members receive updates on loan activities",
        ],
      },
      {
        heading: "Payment Confirmation Notifications",
        paragraphs: [
          "When you record a payment with status 'Paid', the system automatically sends a confirmation to the member. This notification includes the amount paid and the contribution period.",
        ],
        tips: [
          "Notifications are delivered in real-time",
          "Members see a toast notification if they're online",
          "Past notifications are stored for later viewing",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Security & Permissions",
    icon: Shield,
    content: [
      {
        heading: "Admin Access Levels",
        paragraphs: [
          "The system currently supports a single admin role with full access to all features. Future updates may include differentiated roles for staff with limited permissions.",
        ],
      },
      {
        heading: "Data Protection",
        paragraphs: [
          "All data is encrypted and stored securely. Access requires authentication, and sessions expire after periods of inactivity.",
        ],
        tips: [
          "Always log out when leaving your workstation",
          "Use a strong, unique password for your admin account",
          "Do not share your login credentials with others",
          "Report any suspicious activity immediately",
        ],
      },
      {
        heading: "Member Data Privacy",
        paragraphs: [
          "Member financial data is sensitive and should be handled with care. Only share information on a need-to-know basis and never display member data in public settings.",
        ],
        warnings: [
          "Do not share screenshots containing member financial data",
          "Bank details should only be visible to relevant parties",
          "Follow data protection regulations for your jurisdiction",
        ],
      },
    ],
  },
];

interface AdminUserManualProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminUserManual = ({ open, onOpenChange }: AdminUserManualProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["overview"]);
  const [activeSection, setActiveSection] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
    setActiveSection(sectionId);
  };

  const filteredSections = manualSections.filter((section) => {
    const sectionText = JSON.stringify(section).toLowerCase();
    return sectionText.includes(searchQuery.toLowerCase());
  });

  const handleDownloadPdf = () => {
    // Create a printable version for PDF export
    const printContent = manualSections
      .map((section) => {
        const content = section.content
          .map((c) => {
            let text = `\n${c.heading}\n${"=".repeat(c.heading.length)}\n\n`;
            text += c.paragraphs.join("\n\n");
            if (c.steps) {
              text += "\n\nSteps:\n" + c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
            }
            if (c.tips) {
              text += "\n\nTips:\n" + c.tips.map((t) => `• ${t}`).join("\n");
            }
            if (c.warnings) {
              text += "\n\nWarnings:\n" + c.warnings.map((w) => `⚠ ${w}`).join("\n");
            }
            return text;
          })
          .join("\n\n");
        return `\n${"#".repeat(60)}\n${section.title.toUpperCase()}\n${"#".repeat(60)}\n${content}`;
      })
      .join("\n\n");

    const fullContent = `AMANA MARKET CONTRIBUTION ADMIN MANUAL\n${"=".repeat(50)}\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${printContent}`;

    // Create blob and download
    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Amana_Admin_Manual.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Manual downloaded successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-contribution" />
                Admin Manual
              </h3>
            </div>
            
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search manual..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Section List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center gap-2 p-3 rounded-lg text-left text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-contribution-light text-contribution font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <section.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{section.title}</span>
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Download Button */}
            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDownloadPdf}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Manual
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">
                  {manualSections.find((s) => s.id === activeSection)?.title || "Admin Manual"}
                </DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6" ref={contentRef}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {manualSections
                    .find((s) => s.id === activeSection)
                    ?.content.map((content, index) => (
                      <div key={index} className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                          {content.heading}
                        </h3>

                        {content.paragraphs.map((paragraph, pIndex) => (
                          <p key={pIndex} className="text-muted-foreground leading-relaxed">
                            {paragraph}
                          </p>
                        ))}

                        {content.steps && (
                          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Steps:
                            </h4>
                            <ol className="space-y-2">
                              {content.steps.map((step, sIndex) => (
                                <li key={sIndex} className="flex gap-3 text-sm">
                                  <span className="w-6 h-6 rounded-full bg-contribution/10 text-contribution flex items-center justify-center shrink-0 text-xs font-medium">
                                    {sIndex + 1}
                                  </span>
                                  <span className="text-muted-foreground pt-0.5">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {content.tips && (
                          <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-success">
                              <CheckCircle className="w-4 h-4" />
                              Tips:
                            </h4>
                            <ul className="space-y-1.5">
                              {content.tips.map((tip, tIndex) => (
                                <li key={tIndex} className="flex gap-2 text-sm text-muted-foreground">
                                  <span className="text-success">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {content.warnings && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-destructive">
                              <AlertTriangle className="w-4 h-4" />
                              Important Warnings:
                            </h4>
                            <ul className="space-y-1.5">
                              {content.warnings.map((warning, wIndex) => (
                                <li key={wIndex} className="flex gap-2 text-sm text-muted-foreground">
                                  <span className="text-destructive">⚠</span>
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </motion.div>
              </AnimatePresence>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserManual;
