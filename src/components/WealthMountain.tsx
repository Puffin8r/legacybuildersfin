import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatCurrency, calcFutureValue } from "@/lib/financial-calculations";
import { Mountain } from "lucide-react";

interface Props {
  age: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContributions: number;
  expectedReturn: number;
  fin: number;
}

export default function WealthMountain({
  age, retirementAge, currentSavings, monthlyContributions, expectedReturn, fin,
}: Props) {
  const data = useMemo(() => {
    const points: { age: number; netWorth: number }[] = [];
    const maxAge = Math.max(retirementAge + 5, 70);
    for (let a = age; a <= maxAge; a++) {
      const years = a - age;
      points.push({
        age: a,
        netWorth: calcFutureValue(currentSavings, monthlyContributions, expectedReturn, years),
      });
    }
    return points;
  }, [age, retirementAge, currentSavings, monthlyContributions, expectedReturn]);

  const milestones = useMemo(() => {
    const targets = [
      { value: 100000, label: "$100K" },
      { value: 500000, label: "$500K" },
      { value: 1000000, label: "$1M" },
      { value: fin, label: "FIN" },
    ];
    return targets
      .map((t) => {
        const point = data.find((d) => d.netWorth >= t.value);
        return point ? { ...t, age: point.age } : null;
      })
      .filter(Boolean) as { value: number; label: string; age: number }[];
  }, [data, fin]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card space-y-4"
    >
      <h2 className="section-title flex items-center gap-2">
        <Mountain className="h-5 w-5 text-primary" />
        Wealth Mountain
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210 70% 38%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(210 70% 38%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
            <XAxis dataKey="age" label={{ value: "Age", position: "insideBottom", offset: -5 }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} width={90} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
            {milestones.map((m) => (
              <ReferenceLine
                key={m.label}
                x={m.age}
                stroke="hsl(42 90% 55%)"
                strokeDasharray="4 4"
                label={{ value: m.label, position: "top", fill: "hsl(220 30% 12%)", fontSize: 12 }}
              />
            ))}
            <ReferenceLine
              x={retirementAge}
              stroke="hsl(0 72% 51%)"
              strokeDasharray="4 4"
              label={{ value: "Retire", position: "top", fill: "hsl(0 72% 51%)", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="hsl(210 70% 38%)"
              fill="url(#mountainGrad)"
              strokeWidth={2.5}
              isAnimationActive={false}
              name="Net Worth"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {milestones.map((m) => (
          <div key={m.label} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium">
            {m.label} at age <strong>{m.age}</strong>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
