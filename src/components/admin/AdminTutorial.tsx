import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  CreditCard,
  Plane,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Settings,
  BookOpen,
  Bell,
  BarChart3,
  Shield,
} from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  tips: string[];
  module: "contribution" | "travel" | "general";
  detailedInstructions?: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to the Admin Dashboard",
    description: "This comprehensive admin panel lets you manage the Amana Market Contribution system and Teemah Travels services from a single interface. Let's walk through each feature to help you get started.",
    icon: LayoutDashboard,
    tips: [
      "Use the module switcher in the sidebar to toggle between Amana and Teemah",
      "The dashboard shows real-time statistics from your database",
      "All data is automatically synced across the platform",
      "Check the dashboard daily for an overview of activities",
    ],
    module: "general",
    detailedInstructions: [
      "The Dashboard Home shows key metrics: total members, monthly contributions, outstanding loans, and current beneficiary",
      "Each card updates in real-time as you make changes",
      "Recent contributions and outstanding loans are listed for quick access",
    ],
  },
  {
    id: 2,
    title: "Member Management",
    description: "Add, edit, and manage contribution group members. Assign members to groups and track their participation status throughout the contribution cycle.",
    icon: Users,
    tips: [
      "Click 'Add Member' to register new contributors with email and temporary password",
      "Each member is assigned to a contribution group with set monthly amounts",
      "Toggle member status between active and inactive as needed",
      "Members receive their own login credentials to track payments",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: Click 'Add Member' button in the header",
      "Step 2: Enter the contributor's full name, email, and phone",
      "Step 3: Set a temporary password (they can change it later)",
      "Step 4: After creation, assign them to a contribution group",
      "Step 5: The member will receive an email with login instructions",
    ],
  },
  {
    id: 3,
    title: "Creating Contribution Groups",
    description: "Before adding members, create contribution groups. Each group defines the monthly contribution amount and organizes members into manageable units.",
    icon: Users,
    tips: [
      "Click 'New Group' to create a contribution group",
      "Set a descriptive name like 'Monthly Savings - £500'",
      "Define the monthly contribution amount in British Pounds",
      "Groups remain active for all future contribution periods",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: In Member Management, click 'New Group'",
      "Step 2: Enter a group name (e.g., 'Premium Contributors')",
      "Step 3: Add an optional description",
      "Step 4: Set the monthly contribution amount",
      "Step 5: Click 'Create Group' to save",
    ],
  },
  {
    id: 4,
    title: "Monthly Contribution Setup",
    description: "Configure monthly contribution cycles, set the beneficiary who will receive the pooled funds, and manage the rotation schedule for payouts.",
    icon: Wallet,
    tips: [
      "Click 'New Month' to create a new contribution period",
      "Select the beneficiary and enter their bank details",
      "The beneficiary info is visible to all group members for direct payment",
      "Track expected vs collected amounts in real-time",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: Navigate to 'Contributions' in the sidebar",
      "Step 2: Click 'New Month' to create a period",
      "Step 3: Select month, year, and the beneficiary member",
      "Step 4: Enter the beneficiary's bank name and account number",
      "Step 5: Confirm the per-member contribution amount",
      "Step 6: Click 'Create Monthly Contribution' to finalize",
    ],
  },
  {
    id: 5,
    title: "Recording Payments",
    description: "Record member payments and track payment status. Members receive instant real-time notifications when their payments are confirmed.",
    icon: Receipt,
    tips: [
      "Select a contribution period before recording payments",
      "Click 'Record Payment' and select the member",
      "Set status as Paid, Pending, or Partial",
      "Members receive automatic notifications upon confirmation",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: Go to 'Payments' section in the sidebar",
      "Step 2: Select the contribution period from the dropdown",
      "Step 3: Click 'Record Payment' button",
      "Step 4: Select the member from the dropdown",
      "Step 5: Enter the payment amount",
      "Step 6: Set status to 'Paid' for confirmed payments",
      "Step 7: The member will receive a real-time notification",
    ],
  },
  {
    id: 6,
    title: "Payment Status Management",
    description: "Update payment statuses as needed. Use Pending for unverified payments, Paid for confirmed payments, and Partial for incomplete payments.",
    icon: Receipt,
    tips: [
      "Green checkmark: Mark as Paid (confirmed)",
      "Red X: Mark as Rejected (invalid payment)",
      "Pending payments don't count toward the monthly total",
      "You can view and download payment receipts",
    ],
    module: "contribution",
    detailedInstructions: [
      "PAID: Payment confirmed, added to monthly total, member notified",
      "PENDING: Awaiting verification, not added to total yet",
      "PARTIAL: Less than required amount paid, balance outstanding",
      "REJECTED: Invalid payment, excluded from all calculations",
    ],
  },
  {
    id: 7,
    title: "Loan Management",
    description: "Issue loans to members, track outstanding balances, and record repayments. The system automatically updates balances when repayments are made.",
    icon: CreditCard,
    tips: [
      "Click 'Issue Loan' to create a new loan for a member",
      "Set principal amount and optional monthly repayment terms",
      "Outstanding balances are calculated automatically",
      "Loan status appears on member dashboards with warning indicators",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: Navigate to 'Loans' in the sidebar",
      "Step 2: Click 'Issue Loan' to create a new loan",
      "Step 3: Select the member and their contribution group",
      "Step 4: Enter the principal (loan) amount",
      "Step 5: Optionally set a monthly repayment amount",
      "Step 6: Click 'Issue Loan' to create the record",
    ],
  },
  {
    id: 8,
    title: "Recording Loan Repayments",
    description: "When members repay their loans, record the repayment to update their outstanding balance. The loan automatically closes when fully repaid.",
    icon: CreditCard,
    tips: [
      "Click 'Repay' button on any active loan",
      "Enter the repayment amount (up to outstanding balance)",
      "Select repayment type: Manual, Contribution Deduction, or Bank Transfer",
      "The system automatically updates the balance and status",
    ],
    module: "contribution",
    detailedInstructions: [
      "Step 1: Find the loan in the Loans table",
      "Step 2: Click 'Repay' button in the Actions column",
      "Step 3: Enter the repayment amount",
      "Step 4: Select how the repayment was made",
      "Step 5: Add optional notes for record-keeping",
      "Step 6: Click 'Record Repayment' to save",
    ],
  },
  {
    id: 9,
    title: "Dashboard Settings & Tutorial Control",
    description: "Access settings to control tutorials, manage preferences, and view the comprehensive admin user manual.",
    icon: Settings,
    tips: [
      "Enable/disable tutorial tooltips throughout the dashboard",
      "Set tutorials to auto-start for new admin users",
      "Access the full admin user manual from settings",
      "Download the manual as a file for offline reference",
    ],
    module: "general",
    detailedInstructions: [
      "Toggle 'Enable Tutorials' to show/hide contextual tooltips",
      "Toggle 'Auto-Start for New Admins' to control first-login behavior",
      "Click 'Start Tutorial' to replay this walkthrough anytime",
      "Click 'Open Manual' to access complete documentation",
    ],
  },
  {
    id: 10,
    title: "Admin User Manual",
    description: "The comprehensive user manual contains detailed documentation for every feature, workflow, and best practice. It's designed to help you operate the system independently.",
    icon: BookOpen,
    tips: [
      "Access the manual from Settings or the Tutorial button",
      "Search within the manual to find specific topics quickly",
      "Download the manual as a file for offline access",
      "The manual covers security, auditing, and troubleshooting",
    ],
    module: "general",
    detailedInstructions: [
      "The manual is organized into sections: Overview, Members, Contributions, Payments, Loans, Reports, Notifications, Security",
      "Each section contains step-by-step instructions with tips and warnings",
      "Use the search function to find specific procedures",
      "Download for offline reference when needed",
    ],
  },
  {
    id: 11,
    title: "Teemah Travels Module",
    description: "Switch to the Teemah Travels module to manage travel consultation clients, visa cases, and appointments. The same dashboard serves both business units.",
    icon: Plane,
    tips: [
      "Use the module switcher in the sidebar to switch to Teemah",
      "Track visa application progress and client cases",
      "Manage consultation appointments and schedules",
      "View and moderate client reviews",
    ],
    module: "travel",
    detailedInstructions: [
      "Click 'Teemah' in the module switcher at the top of the sidebar",
      "The dashboard transforms to show travel-specific metrics",
      "Access Clients, Cases, Consultations, and Reviews sections",
      "Switch back to Amana anytime using the same switcher",
    ],
  },
];

interface AdminTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminTutorial = ({ open, onOpenChange }: AdminTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { markTutorialAsSeen } = useTutorial();

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    markTutorialAsSeen();
    onOpenChange(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    markTutorialAsSeen();
    onOpenChange(false);
    setCurrentStep(0);
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case "contribution":
        return "text-contribution bg-contribution/10";
      case "travel":
        return "text-travel bg-travel/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  const getModuleBadge = (module: string) => {
    switch (module) {
      case "contribution":
        return "Amana Market";
      case "travel":
        return "Teemah Travels";
      default:
        return "General";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-5 h-5 text-primary" />
              Admin Dashboard Tutorial
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getModuleColor(step.module)}`}>
                {getModuleBadge(step.module)}
              </span>
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} of {tutorialSteps.length}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-0.5">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors cursor-pointer ${
                  index <= currentStep
                    ? "bg-primary"
                    : "bg-muted"
                }`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6 overflow-y-auto max-h-[60vh]"
          >
            {/* Step Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${getModuleColor(step.module)}`}>
                <step.icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  {completedSteps.includes(step.id - 1) && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                </div>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Key Tips */}
            <div className="bg-muted/50 rounded-xl p-4 mb-4">
              <h4 className="font-medium mb-3 text-sm">Key Points:</h4>
              <ul className="space-y-2">
                {step.tips.map((tip, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 shrink-0">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                    <span className="text-muted-foreground">{tip}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Detailed Instructions */}
            {step.detailedInstructions && (
              <div className="bg-contribution/5 border border-contribution/20 rounded-xl p-4">
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Detailed Instructions:
                </h4>
                <ul className="space-y-1.5">
                  {step.detailedInstructions.map((instruction, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-contribution shrink-0">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "bg-primary w-6"
                      : completedSteps.includes(index)
                      ? "bg-success"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 pt-0 border-t mt-2">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip Tutorial
            </Button>
            {isLastStep ? (
              <Button onClick={handleFinish} className="gap-2" variant="contribution">
                <CheckCircle className="w-4 h-4" />
                Finish Tutorial
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTutorial;
