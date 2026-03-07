import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { formatCurrency, calcFutureValue } from "@/lib/financial-calculations";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign } from "lucide-react";

interface Props {
  expectedReturn: number;
  yearsToRetirement: number;
  currentSavings: number;
}

export default function DollarImpactVisualizer({ expectedReturn, yearsToRetirement, currentSavings }: Props) {
  const [monthlyAmount, setMonthlyAmount] = useState(500);

  const impactData = useMemo(() => {
    const amounts = [100, 200, 300, 500, 750, 1000, monthlyAmount].filter(
      (v, i, arr) => arr.indexOf(v) === i
    ).sort((a, b) => a - b);
    return amounts.map((amt) => ({
      monthly: `$${amt}`,
      value: calcFutureValue(0, amt, expectedReturn, yearsToRetirement),
      amount: amt,
    }));
  }, [expectedReturn, yearsToRetirement, monthlyAmount]);

  const selectedProjection = calcFutureValue(currentSavings, monthlyAmount, expectedReturn, yearsToRetirement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card space-y-4"
    >
      <h2 className="section-title flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-success" />
        Monthly Investment Impact
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Monthly Investment</p>
          <p className="text-2xl font-bold font-heading text-primary">{formatCurrency(monthlyAmount)}</p>
        </div>
        <Slider
          value={[monthlyAmount]}
          min={50}
          max={5000}
          step={50}
          onValueChange={([v]) => setMonthlyAmount(v)}
        />
        <p className="text-sm text-muted-foreground text-center">
          Projected value at retirement: <strong className="text-foreground text-lg">{formatCurrency(selectedProjection)}</strong>
        </p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={impactData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
            <XAxis dataKey="monthly" />
            <YAxis tickFormatter={(v) => formatCurrency(v)} width={90} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar
              dataKey="value"
              fill="hsl(152 60% 40%)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
