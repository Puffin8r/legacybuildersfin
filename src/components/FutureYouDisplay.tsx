import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/financial-calculations";
import { User, Sparkles } from "lucide-react";

interface Props {
  projectedNetWorth: number;
  monthlyRetirementIncome: number;
  retirementAge: number;
  freedomAge: number;
}

export default function FutureYouDisplay({
  projectedNetWorth, monthlyRetirementIncome, retirementAge, freedomAge,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-gradient-to-br from-primary to-secondary p-8 text-primary-foreground text-center space-y-4"
    >
      <div className="flex items-center justify-center gap-2">
        <User className="h-6 w-6" />
        <h2 className="text-2xl font-bold font-heading">Meet Your Future Financial Self</h2>
      </div>
      <p className="text-sm opacity-80">At age {retirementAge}, your investments could generate</p>
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="text-5xl font-bold font-heading"
      >
        {formatCurrency(monthlyRetirementIncome)}
        <span className="text-lg opacity-70">/month</span>
      </motion.p>
      <div className="grid grid-cols-2 gap-4 pt-4">
        <div className="rounded-lg bg-primary-foreground/10 p-3">
          <p className="text-xs opacity-70">Projected Net Worth</p>
          <p className="text-lg font-bold font-heading">{formatCurrency(projectedNetWorth)}</p>
        </div>
        <div className="rounded-lg bg-primary-foreground/10 p-3">
          <p className="text-xs opacity-70">Financial Freedom Age</p>
          <p className="text-lg font-bold font-heading">{freedomAge}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 text-xs opacity-60">
        <Sparkles className="h-3 w-3" />
        Based on your current savings trajectory
      </div>
    </motion.div>
  );
}
