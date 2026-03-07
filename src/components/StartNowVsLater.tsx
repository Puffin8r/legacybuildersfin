import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency, calcFutureValue } from "@/lib/financial-calculations";
import { Timer } from "lucide-react";

interface Props {
  monthlyContribution: number;
  expectedReturn: number;
  age: number;
  retirementAge: number;
}

export default function StartNowVsLater({ monthlyContribution, expectedReturn, age, retirementAge }: Props) {
  const yearsToRetirement = Math.max(retirementAge - age, 1);
  const delayYears = 10;

  const data = useMemo(() => {
    const startNow = calcFutureValue(0, monthlyContribution, expectedReturn, yearsToRetirement);
    const startLater = calcFutureValue(0, monthlyContribution, expectedReturn, Math.max(yearsToRetirement - delayYears, 1));
    return { startNow, startLater, cost: startNow - startLater };
  }, [monthlyContribution, expectedReturn, yearsToRetirement]);

  const chartData = [
    { label: "Start Today", value: data.startNow },
    { label: `Start in ${delayYears} Years`, value: data.startLater },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card space-y-4"
    >
      <h2 className="section-title flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        Start Now vs. Start Later
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-success/10 p-4 text-center">
          <p className="text-xs text-muted-foreground">Start Today</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(monthlyContribution)}/mo</p>
          <p className="text-xl font-bold font-heading text-success">{formatCurrency(data.startNow)}</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-4 text-center">
          <p className="text-xs text-muted-foreground">Start {delayYears} Years Later</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(monthlyContribution)}/mo</p>
          <p className="text-xl font-bold font-heading text-destructive">{formatCurrency(data.startLater)}</p>
        </div>
      </div>
      <div className="rounded-lg border-2 border-accent bg-accent/10 p-4 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost of Waiting</p>
        <p className="text-3xl font-bold font-heading text-accent-foreground">{formatCurrency(data.cost)}</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
            <YAxis dataKey="label" type="category" width={130} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="value" fill="hsl(210 70% 38%)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
