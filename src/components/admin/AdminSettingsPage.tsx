import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  RefreshCcw,
  Shield,
  Bell,
  Download,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTutorial } from "@/contexts/TutorialContext";
import { toast } from "sonner";
import AdminTooltip, { tooltipContent } from "./AdminTooltip";

interface AdminSettingsPageProps {
  onOpenTutorial: () => void;
  onOpenManual: () => void;
}

const AdminSettingsPage = ({ onOpenTutorial, onOpenManual }: AdminSettingsPageProps) => {
  const {
    tutorialEnabled,
    setTutorialEnabled,
    showTutorialOnFirstLoad,
    setShowTutorialOnFirstLoad,
    resetTutorial,
  } = useTutorial();

  const handleResetTutorial = () => {
    resetTutorial();
    toast.success("Tutorial has been reset. It will show on your next login.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Admin Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure dashboard preferences, tutorial settings, and access documentation
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tutorial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-contribution" />
              Tutorial Settings
            </CardTitle>
            <CardDescription>
              Control the guided tutorial experience for admin users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tutorial-enabled" className="font-medium">
                  Enable Tutorials
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show contextual tooltips and guidance throughout the dashboard
                </p>
              </div>
              <AdminTooltip content={tutorialEnabled ? tooltipContent.disableTutorial : tooltipContent.enableTutorial}>
                <Switch
                  id="tutorial-enabled"
                  checked={tutorialEnabled}
                  onCheckedChange={setTutorialEnabled}
                />
              </AdminTooltip>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="first-load-tutorial" className="font-medium">
                  Auto-Start for New Admins
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically show the tutorial walkthrough for first-time admin users
                </p>
              </div>
              <Switch
                id="first-load-tutorial"
                checked={showTutorialOnFirstLoad}
                onCheckedChange={setShowTutorialOnFirstLoad}
              />
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-3">
              <AdminTooltip content={tooltipContent.restartTutorial}>
                <Button variant="outline" onClick={onOpenTutorial} className="flex-1">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Start Tutorial
                </Button>
              </AdminTooltip>
              <Button variant="ghost" onClick={handleResetTutorial} className="flex-1">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reset Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-contribution" />
              Admin Documentation
            </CardTitle>
            <CardDescription>
              Access the comprehensive admin user manual and guides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-contribution-light border border-contribution/20">
              <h4 className="font-semibold mb-2">Contribution Admin Manual</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Complete documentation covering all admin features, workflows, and best practices
                for managing the Amana Market Contribution system.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <AdminTooltip content={tooltipContent.openAdminManual}>
                  <Button variant="contribution" onClick={onOpenManual} className="flex-1">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Open Manual
                  </Button>
                </AdminTooltip>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Manual Contents:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>System overview and admin responsibilities</li>
                <li>Member and group management</li>
                <li>Monthly contribution setup</li>
                <li>Payment recording and verification</li>
                <li>Loan management and repayments</li>
                <li>Reports and data export</li>
                <li>Security and audit procedures</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-contribution" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Manage how you receive alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new payments are recorded
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Member Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Alerts for new member registrations and status changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Loan Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders for overdue loan repayments
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-contribution" />
              Security & Access
            </CardTitle>
            <CardDescription>
              Manage security settings and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <h4 className="font-semibold text-sm mb-2">Current Session</h4>
              <p className="text-sm text-muted-foreground">
                You are logged in as an administrator with full access to all contribution
                management features.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Admin Permissions:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Manage all members and groups</li>
                <li>Record and approve payments</li>
                <li>Issue and manage loans</li>
                <li>Access all reports and exports</li>
                <li>Configure system settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
