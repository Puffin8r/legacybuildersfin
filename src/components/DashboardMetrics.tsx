import { formatCurrency } from "@/lib/financial-calculations";
import { Target, Shield, TrendingUp, Wallet } from "lucide-react";

interface Props {
  fin: number;
  ipn: number;
  projectedNetWorth: number;
  monthlyRetirementIncome: number;
}

const metrics = [
  { key: "fin" as const, label: "Financial Independence Number", icon: Target, color: "text-primary" },
  { key: "ipn" as const, label: "Income Protection Number", icon: Shield, color: "text-secondary" },
  { key: "projectedNetWorth" as const, label: "Projected Net Worth at Retirement", icon: TrendingUp, color: "text-success" },
  { key: "monthlyRetirementIncome" as const, label: "Monthly Retirement Income", icon: Wallet, color: "text-accent" },
];

export default function DashboardMetrics(props: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div key={m.key} className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 ${m.color}`} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {m.label}
              </span>
            </div>
            <p className="text-2xl font-bold font-heading animate-count-up">
              {formatCurrency(props[m.key])}
            </p>
          </div>
        );
      })}
    </div>
  );
}
