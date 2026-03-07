import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Coins } from "lucide-react";

interface Props {
  age: number;
  retirementAge: number;
  expectedReturn: number;
}

export default function LifetimeCompounding({ age, retirementAge, expectedReturn }: Props) {
  const data = useMemo(() => {
    const r = expectedReturn / 100;
    const points: { age: number; value: number }[] = [];
    const maxAge = Math.max(retirementAge + 10, 70);
    for (let a = age; a <= maxAge; a++) {
      points.push({ age: a, value: parseFloat(Math.pow(1 + r, a - age).toFixed(2)) });
    }
    return points;
  }, [age, retirementAge, expectedReturn]);

  const milestones = data.filter((_, i) => i % 10 === 0 || i === data.length - 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="metric-card space-y-4"
    >
      <h2 className="section-title flex items-center gap-2">
        <Coins className="h-5 w-5 text-accent" />
        The Power of One Dollar Invested Today
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="dollarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(168 50% 42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(168 50% 42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
            <XAxis dataKey="age" label={{ value: "Age", position: "insideBottom", offset: -5 }} />
            <YAxis tickFormatter={(v) => `$${v}`} width={60} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Value of $1"]} labelFormatter={(l) => `Age ${l}`} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(168 50% 42%)"
              fill="url(#dollarGrad)"
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <div key={m.age} className="rounded-lg bg-muted/50 px-3 py-1.5 text-center">
            <p className="text-xs text-muted-foreground">Age {m.age}</p>
            <p className="text-sm font-bold font-heading">${m.value.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
