import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTutorial } from "@/contexts/TutorialContext";

interface AdminTooltipProps {
  children: ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

const AdminTooltip = ({
  children,
  content,
  side = "top",
  delayDuration = 300,
}: AdminTooltipProps) => {
  const { tutorialEnabled } = useTutorial();

  if (!tutorialEnabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs text-sm bg-popover text-popover-foreground"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AdminTooltip;

// Tooltip content definitions for all admin dashboard elements
export const tooltipContent = {
  // Global Dashboard
  dashboardHome: "View a summary of all contributions, payments, and member activity.",
  refreshData: "Reload dashboard data to display the most recent updates.",
  search: "Search contributors, payments, or plans by name or reference ID.",
  filter: "Narrow results by date, plan, payment status, or contributor.",
  
  // Contribution Plan Management
  addNewPlan: "Create a new contribution plan with custom amount and frequency.",
  editPlan: "Modify this contribution plan's details.",
  activatePlan: "Make this plan available for contributors.",
  deactivatePlan: "Temporarily stop new contributions to this plan.",
  deletePlan: "Permanently remove this plan. This action cannot be undone.",
  newMonth: "Create a new monthly contribution period with beneficiary details.",
  
  // Contributor / Member Management
  addContributor: "Manually register a new contributor into the system.",
  editContributor: "Update this contributor's personal or contribution details.",
  suspendContributor: "Temporarily prevent this contributor from making payments.",
  reactivateContributor: "Restore contribution access for this contributor.",
  viewContributionHistory: "See full payment and contribution records for this member.",
  newGroup: "Create a new contribution group with defined monthly amounts.",
  assignToGroup: "Add this member to a contribution group.",
  removeFromGroup: "Remove this member from their assigned group.",
  
  // Payment Management
  recordPayment: "Manually log a payment made outside the platform.",
  approvePayment: "Confirm and finalize this payment entry.",
  rejectPayment: "Mark this payment as invalid or incorrect.",
  markAsPending: "Set this payment aside for later verification.",
  adjustBalance: "Correct payment discrepancies or update outstanding balances.",
  selectPeriod: "Choose which monthly contribution period to view or manage.",
  viewReceipt: "View and download the payment receipt.",
  
  // Status Badges
  statusPending: "Payment recorded but not yet verified by admin.",
  statusApproved: "Payment verified and added to contributor's total.",
  statusRejected: "Payment invalid and excluded from records.",
  statusPaid: "Payment has been confirmed and recorded.",
  activeContributor: "Contributor is currently active and allowed to pay.",
  suspendedContributor: "Contributor is temporarily restricted from making payments.",
  
  // Loan Management
  issueLoan: "Create a new loan for a member with principal and repayment terms.",
  recordRepayment: "Log a loan repayment from the member.",
  viewLoanHistory: "See all repayment transactions for this loan.",
  loanActive: "Loan is currently being repaid by the member.",
  loanPaid: "Loan has been fully repaid.",
  
  // Reports & Export
  viewReports: "Analyze contribution data over a selected period.",
  exportPdf: "Download this report as a PDF file.",
  exportCsv: "Download this report for spreadsheet use.",
  selectDateRange: "Filter records by specific start and end dates.",
  
  // Tutorial & Manual
  enableTutorial: "Turn on guided instructions throughout the dashboard.",
  disableTutorial: "Turn off guided instructions for advanced use.",
  openAdminManual: "Access the full contribution admin user manual.",
  downloadManual: "Download the admin manual as a PDF file.",
  searchManual: "Find specific topics inside the admin manual.",
  restartTutorial: "Begin the guided tutorial walkthrough again.",
  
  // Security & System
  adminRoleSettings: "Control what different admin roles can access.",
  auditLog: "View a record of all admin actions for accountability.",
  logout: "Securely log out of the admin dashboard.",
  notifications: "View and manage system alerts and member notifications.",
  settings: "Configure dashboard preferences and system settings.",
  
  // Module Switcher
  switchToAmana: "Switch to the Amana Market Contribution management module.",
  switchToTeemah: "Switch to the Teemah Travels client management module.",
};
