import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, TrendingUp, Users } from "lucide-react";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { Button } from "@/components/ui/button";

interface Props {
  variant?: "compact" | "full";
  className?: string;
}

const RoleSwitcher = ({ variant = "full", className = "" }: Props) => {
  const navigate = useNavigate();
  const { hasContributor, hasInvestor, activeRole, setActiveRole } = useActiveRole();

  // Only show if user truly has BOTH roles
  if (!(hasContributor && hasInvestor)) return null;

  const target = activeRole === "contributor" ? "investor" : "contributor";
  const TargetIcon = target === "investor" ? TrendingUp : Users;
  const label = target === "investor" ? "Switch to Investor" : "Switch to Contributor";

  const handleClick = () => {
    setActiveRole(target);
    navigate(target === "investor" ? "/investor-dashboard" : "/dashboard/contributor");
  };

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        title={label}
        className={`text-white/70 hover:text-white hover:bg-white/10 ${className}`}
      >
        <ArrowLeftRight className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
        ${target === "investor"
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"}
        ${className}`}
    >
      <TargetIcon className="w-4 h-4" />
      {label}
    </button>
  );
};

export default RoleSwitcher;
