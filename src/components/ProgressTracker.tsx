import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/financial-calculations";
import { Flag } from "lucide-react";

interface Props {
  currentNetWorth: number;
  fin: number;
}

export default function ProgressTracker({ currentNetWorth, fin }: Props) {
  const progress = fin > 0 ? Math.min((currentNetWorth / fin) * 100, 100) : 0;

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          Progress to Financial Independence
        </h2>
        <span className="text-2xl font-bold font-heading text-primary">
          {progress.toFixed(1)}%
        </span>
      </div>
      <Progress value={progress} className="h-3" />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatCurrency(currentNetWorth)}</span>
        <span>{formatCurrency(fin)}</span>
      </div>
    </div>
  );
}
