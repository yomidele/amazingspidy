import { useState } from "react";
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
  X,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  tips: string[];
  module: "contribution" | "travel" | "general";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to Admin Dashboard",
    description: "This comprehensive admin panel lets you manage both Amana Market Contributions and Teemah Travels services from a single interface.",
    icon: LayoutDashboard,
    tips: [
      "Use the module switcher in the sidebar to toggle between Amana and Teemah",
      "The dashboard shows real-time statistics from your database",
      "All data is automatically synced across the platform",
    ],
    module: "general",
  },
  {
    id: 2,
    title: "Member Management",
    description: "Add, edit, and manage contribution group members. Assign members to groups and track their participation status.",
    icon: Users,
    tips: [
      "Click 'Add Member' to register new contributors",
      "Each member is assigned to a contribution group with set monthly amounts",
      "Toggle member status between active and inactive",
      "Members receive their own login credentials to track payments",
    ],
    module: "contribution",
  },
  {
    id: 3,
    title: "Monthly Contributions Setup",
    description: "Configure monthly contribution cycles, set beneficiaries, and manage the rotation schedule for payouts.",
    icon: Wallet,
    tips: [
      "Set the current month's beneficiary and their bank details",
      "The beneficiary info is visible to all group members",
      "Track expected vs collected amounts in real-time",
      "Finalize months when all payments are received",
    ],
    module: "contribution",
  },
  {
    id: 4,
    title: "Payment Recording",
    description: "Record member payments and track payment status. Members receive instant notifications when payments are confirmed.",
    icon: Receipt,
    tips: [
      "Select a member and mark their payment as 'Paid'",
      "Real-time notifications are sent to members upon payment confirmation",
      "View payment history and generate receipts",
      "Filter by month and payment status",
    ],
    module: "contribution",
  },
  {
    id: 5,
    title: "Loan Management",
    description: "Issue loans to members, track outstanding balances, and record repayments with automatic balance updates.",
    icon: CreditCard,
    tips: [
      "Issue new loans with principal amount and monthly repayment terms",
      "Outstanding balances are automatically calculated",
      "Record partial or full loan repayments",
      "Loan status appears on member dashboards",
    ],
    module: "contribution",
  },
  {
    id: 6,
    title: "Teemah Travels Module",
    description: "Manage travel consultation clients, visa cases, and appointments from the Teemah module.",
    icon: Plane,
    tips: [
      "Switch to Teemah Travels using the module switcher",
      "Track visa application progress and client cases",
      "Manage consultation appointments",
      "View and moderate client reviews",
    ],
    module: "travel",
  },
];

interface AdminTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminTutorial = ({ open, onOpenChange }: AdminTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-5 h-5 text-primary" />
              Admin Dashboard Tutorial
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {tutorialSteps.length}
            </span>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep
                    ? "bg-primary"
                    : "bg-muted"
                }`}
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
            className="p-6"
          >
            {/* Step Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getModuleColor(step.module)}`}>
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

            {/* Tips Section */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="font-medium mb-3 text-sm">Key Tips:</h4>
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

            {/* Step Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
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
        <div className="flex items-center justify-between p-6 pt-0">
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip Tutorial
            </Button>
            {isLastStep ? (
              <Button onClick={handleFinish} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Finish
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
