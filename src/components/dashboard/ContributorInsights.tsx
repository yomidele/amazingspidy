import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";

interface ContributorInsightsProps {
  totalContributed: number;
  monthlyContribution: number;
  hasCurrentMonthPaid: boolean;
  loanBalance: number;
  beneficiaryMonth: string;
  contributionHistory: { month: string; amount: number }[];
}

const ContributorInsights = ({
  totalContributed,
  monthlyContribution,
  hasCurrentMonthPaid,
  loanBalance,
  beneficiaryMonth,
  contributionHistory,
}: ContributorInsightsProps) => {
  const insights: { icon: React.ReactNode; text: string; type: "success" | "warning" | "info" }[] = [];

  // Payment status
  if (hasCurrentMonthPaid) {
    insights.push({
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
      text: "You're up to date with this month's payment",
      type: "success",
    });
  } else if (monthlyContribution > 0) {
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    insights.push({
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      text: `Payment due — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left this month`,
      type: "warning",
    });
  }

  // Contribution trend
  if (contributionHistory.length >= 2) {
    const last = contributionHistory[contributionHistory.length - 1]?.amount || 0;
    const prev = contributionHistory[contributionHistory.length - 2]?.amount || 0;
    if (prev > 0) {
      const change = ((last - prev) / prev) * 100;
      if (change > 0) {
        insights.push({
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          text: `${Math.round(change)}% increase from last period`,
          type: "success",
        });
      } else if (change < 0) {
        insights.push({
          icon: <TrendingDown className="w-3.5 h-3.5 text-amber-400" />,
          text: `${Math.abs(Math.round(change))}% less than last period`,
          type: "warning",
        });
      }
    }
  }

  // Loan status
  if (loanBalance > 0) {
    insights.push({
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
      text: `Outstanding loan: £${loanBalance.toLocaleString()}`,
      type: "warning",
    });
  } else {
    insights.push({
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
      text: "No outstanding loans — you're eligible to borrow",
      type: "success",
    });
  }

  // Beneficiary
  if (beneficiaryMonth) {
    insights.push({
      icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
      text: `Payout scheduled for ${beneficiaryMonth}`,
      type: "info",
    });
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
            insight.type === "success"
              ? "bg-emerald-500/[0.05] border-emerald-500/10"
              : insight.type === "warning"
              ? "bg-amber-500/[0.05] border-amber-500/10"
              : "bg-blue-500/[0.05] border-blue-500/10"
          }`}
        >
          <div className="mt-0.5 flex-shrink-0">{insight.icon}</div>
          <p className="text-xs text-white/60 leading-relaxed">{insight.text}</p>
        </div>
      ))}
    </div>
  );
};

export default ContributorInsights;
