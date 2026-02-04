import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
          "The beneficiary's bank details are visible to all members, enabling them to make direct transfers. Ensure this information is accurate and up to date.",
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
          "All data is encrypted in transit and at rest. Member information is only accessible to authenticated administrators.",
        ],
        tips: [
          "Never share your admin login credentials",
          "Log out when leaving your workstation",
          "Use a strong, unique password for your admin account",
        ],
      },
      {
        heading: "Session Security",
        paragraphs: [
          "Admin sessions automatically expire after a period of inactivity. You will be prompted to log in again when returning to the dashboard.",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Admin Settings",
    icon: Settings,
    content: [
      {
        heading: "Tutorial Controls",
        paragraphs: [
          "You can enable or disable the interactive tutorial from the Settings section. When enabled, helpful tooltips and guided prompts appear throughout the dashboard.",
        ],
        steps: [
          "Go to Settings from the sidebar",
          "Find the 'Tutorial Settings' section",
          "Toggle 'Enable Tutorials' on or off",
          "Use 'Restart Tutorial' to see the onboarding guide again",
        ],
      },
      {
        heading: "Auto-Show Tutorial",
        paragraphs: [
          "When 'Show Tutorial on First Load' is enabled, new admins will automatically see the tutorial when they first access the dashboard. This helps with onboarding but can be disabled once you're familiar with the system.",
        ],
      },
      {
        heading: "Accessing This Manual",
        paragraphs: [
          "This manual is always available from the 'Manual' button in the dashboard header or from the Settings section. You can also download a PDF version for offline reference.",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: HelpCircle,
    content: [
      {
        heading: "Common Issues and Solutions",
        paragraphs: [
          "This section covers frequently encountered issues and their solutions.",
        ],
      },
      {
        heading: "Payment Not Showing in Total",
        paragraphs: [
          "If a recorded payment is not reflected in the monthly total:",
        ],
        steps: [
          "Check that the payment status is set to 'Paid' (not 'Pending')",
          "Verify the correct contribution period is selected",
          "Refresh the page to ensure data is current",
          "If the issue persists, contact technical support",
        ],
      },
      {
        heading: "Member Cannot Log In",
        paragraphs: [
          "When a member reports login issues:",
        ],
        steps: [
          "Verify their email address is correctly entered in the system",
          "Ask them to use the 'Forgot Password' function",
          "Check if their account is active (not suspended)",
          "Ensure they are using the correct login page (Contributor Login)",
        ],
      },
      {
        heading: "Incorrect Balance Displayed",
        paragraphs: [
          "If a member's balance appears incorrect:",
        ],
        steps: [
          "Review all payments for that member in the current period",
          "Check for any rejected or pending payments",
          "Verify partial payments are correctly recorded",
          "Review loan deductions if applicable",
        ],
        warnings: [
          "Never adjust balances without proper documentation",
          "Keep a record of any manual corrections made",
        ],
      },
      {
        heading: "Need Further Assistance",
        paragraphs: [
          "If you encounter an issue not covered in this manual, document the problem with screenshots if possible and contact technical support. Include details about what action you were performing and any error messages displayed.",
        ],
      },
    ],
  },
];

const AdminManualPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["overview"]);
  const [activeSection, setActiveSection] = useState("overview");

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
    setActiveSection(sectionId);
  };

  const filteredSections = manualSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.some(content =>
      content.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.paragraphs.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const handleDownloadPdf = () => {
    let content = "AMANA MARKET CONTRIBUTION SYSTEM\nADMIN USER MANUAL\n";
    content += "=".repeat(50) + "\n\n";
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    manualSections.forEach(section => {
      content += "\n" + "=".repeat(50) + "\n";
      content += section.title.toUpperCase() + "\n";
      content += "=".repeat(50) + "\n\n";

      section.content.forEach(item => {
        content += item.heading + "\n";
        content += "-".repeat(item.heading.length) + "\n\n";

        item.paragraphs.forEach(p => {
          content += p + "\n\n";
        });

        if (item.steps) {
          content += "Steps:\n";
          item.steps.forEach((step, i) => {
            content += `  ${i + 1}. ${step}\n`;
          });
          content += "\n";
        }

        if (item.tips) {
          content += "Tips:\n";
          item.tips.forEach(tip => {
            content += `  • ${tip}\n`;
          });
          content += "\n";
        }

        if (item.warnings) {
          content += "Warnings:\n";
          item.warnings.forEach(warning => {
            content += `  ⚠ ${warning}\n`;
          });
          content += "\n";
        }
      });
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amana-market-admin-manual.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Manual downloaded successfully");
  };

  const renderContent = (content: ManualContent[]) => (
    <div className="space-y-6">
      {content.map((item, index) => (
        <div key={index} className="space-y-3">
          <h4 className="font-semibold text-foreground text-lg">{item.heading}</h4>
          
          {item.paragraphs.map((p, pIndex) => (
            <p key={pIndex} className="text-muted-foreground leading-relaxed">
              {p}
            </p>
          ))}

          {item.steps && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Steps:
              </p>
              <ol className="list-decimal list-inside space-y-1.5">
                {item.steps.map((step, sIndex) => (
                  <li key={sIndex} className="text-sm text-muted-foreground pl-2">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {item.tips && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm text-primary flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Tips:
              </p>
              <ul className="space-y-1.5">
                {item.tips.map((tip, tIndex) => (
                  <li key={tIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Info className="w-3 h-3 mt-1 flex-shrink-0 text-primary" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.warnings && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings:
              </p>
              <ul className="space-y-1.5">
                {item.warnings.map((warning, wIndex) => (
                  <li key={wIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-1 flex-shrink-0 text-destructive" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-contribution flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl text-foreground">
                  Admin User Manual
                </h1>
                <p className="text-sm text-muted-foreground">
                  Amana Market Contribution System
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Download Manual
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Section Navigation */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              <nav className="space-y-1 pr-4">
                {filteredSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? "bg-contribution text-white"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{section.title}</span>
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-8 pr-4 pb-8">
              {filteredSections.map(section => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-contribution/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-contribution" />
                    </div>
                    <h3 className="font-heading font-bold text-xl text-foreground">
                      {section.title}
                    </h3>
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {expandedSections.includes(section.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-13 border-l-2 border-contribution/20 ml-5 pl-8"
                    >
                      {renderContent(section.content)}
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {filteredSections.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No matching sections found</p>
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default AdminManualPage;
