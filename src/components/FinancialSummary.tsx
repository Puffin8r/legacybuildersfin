import { formatCurrency } from "@/lib/financial-calculations";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  ipn: number;
  fin: number;
  projectedNetWorth: number;
  monthlyRetirementIncome: number;
  progress: number;
}

export default function FinancialSummary({ ipn, fin, projectedNetWorth, monthlyRetirementIncome, progress }: Props) {
  const rows = [
    { label: "Income Protection Number", value: formatCurrency(ipn) },
    { label: "Financial Independence Number", value: formatCurrency(fin) },
    { label: "Projected Retirement Net Worth", value: formatCurrency(projectedNetWorth) },
    { label: "Monthly Retirement Income", value: formatCurrency(monthlyRetirementIncome) },
    { label: "Savings Progress", value: `${progress.toFixed(1)}%` },
  ];

  const handleExport = () => {
    const text = [
      "═══════════════════════════════════════",
      "        YOUR FINANCIAL BLUEPRINT",
      "  Visualize Your Path to Financial Independence",
      "═══════════════════════════════════════",
      "",
      ...rows.map((r) => `${r.label.padEnd(35)} ${r.value}`),
      "",
      `Generated on ${new Date().toLocaleDateString()}`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial-blueprint-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="metric-card space-y-4">
      <h2 className="section-title flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Your Financial Blueprint
      </h2>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between py-3">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="font-semibold font-heading">{r.value}</span>
          </div>
        ))}
      </div>
      <Button onClick={handleExport} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download Financial Blueprint Report
      </Button>
    </div>
  );
}
