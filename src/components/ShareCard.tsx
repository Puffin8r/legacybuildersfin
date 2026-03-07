import { useRef } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/financial-calculations";
import { Share2, Download, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  projectedNetWorth: number;
  monthlyRetirementIncome: number;
  freedomAge: number;
  retirementAge: number;
}

export default function ShareCard({ projectedNetWorth, monthlyRetirementIncome, freedomAge, retirementAge }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const text = `🏦 My Financial Blueprint\n\n💰 Projected Net Worth: ${formatCurrency(projectedNetWorth)}\n📈 Monthly Retirement Income: ${formatCurrency(monthlyRetirementIncome)}\n🎯 Financial Freedom Age: ${freedomAge}\n\nBuild yours at Financial Blueprint!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Financial Blueprint", text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  const handleDownload = () => {
    const report = [
      "═══════════════════════════════════",
      "       MY FINANCIAL BLUEPRINT",
      "═══════════════════════════════════",
      "",
      `Projected Net Worth:      ${formatCurrency(projectedNetWorth)}`,
      `Monthly Retirement Income: ${formatCurrency(monthlyRetirementIncome)}`,
      `Financial Freedom Age:     ${freedomAge}`,
      `Retirement Age:            ${retirementAge}`,
      "",
      "═══════════════════════════════════",
      "  Built with Financial Blueprint",
      "═══════════════════════════════════",
    ].join("\n");
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-financial-blueprint.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card space-y-4"
    >
      <h2 className="section-title flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        Share My Financial Blueprint
      </h2>
      {/* Preview card */}
      <div
        ref={cardRef}
        className="rounded-xl bg-gradient-to-br from-primary via-primary to-secondary p-6 text-primary-foreground space-y-3"
      >
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          <p className="font-bold font-heading">Financial Blueprint</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs opacity-70">Net Worth</p>
            <p className="text-lg font-bold font-heading">{formatCurrency(projectedNetWorth)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Monthly Income</p>
            <p className="text-lg font-bold font-heading">{formatCurrency(monthlyRetirementIncome)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Freedom Age</p>
            <p className="text-lg font-bold font-heading">{freedomAge}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleShare} className="flex-1 gap-2">
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
    </motion.div>
  );
}
