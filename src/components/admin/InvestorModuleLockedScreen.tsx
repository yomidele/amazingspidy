import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  variant?: "admin" | "investor";
}

const InvestorModuleLockedScreen = ({ variant = "admin" }: Props) => {
  const isAdmin = variant === "admin";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-10 pb-10 px-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            {isAdmin ? "Investor Management" : "Account Access Limited"}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isAdmin
              ? "This module is awaiting activation. Once enabled, full access will be granted."
              : "Investor features are not yet enabled. Your account is awaiting activation."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorModuleLockedScreen;
