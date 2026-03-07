import { formatCurrency } from "@/lib/financial-calculations";
import { AlertTriangle } from "lucide-react";

interface Props {
  projectedNetWorth: number;
  fin: number;
  monthlyContributions: number;
}

export default function RiskAnalysis({ projectedNetWorth, fin, monthlyContributions }: Props) {
  if (projectedNetWorth >= fin) return null;

  const shortfall = fin - projectedNetWorth;

  return (
    <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-6 space-y-2">
      <h2 className="section-title flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        Risk Analysis
      </h2>
      <p className="text-sm text-foreground leading-relaxed">
        You are currently projected to reach{" "}
        <span className="font-semibold">{formatCurrency(projectedNetWorth)}</span> by retirement.
        Your Financial Independence Number is{" "}
        <span className="font-semibold">{formatCurrency(fin)}</span>.
      </p>
      <p className="text-sm font-semibold text-destructive">
        Shortfall: {formatCurrency(shortfall)}
      </p>
      <p className="text-sm text-muted-foreground">
        Consider increasing your monthly contributions beyond{" "}
        {formatCurrency(monthlyContributions)} to stay on track.
      </p>
    </div>
  );
}
