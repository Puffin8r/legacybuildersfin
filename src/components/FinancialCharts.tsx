import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Legend,
} from "recharts";
import { formatCurrency, calcDoublingMilestones } from "@/lib/financial-calculations";
import { BarChart3 } from "lucide-react";

interface Props {
  projectionData: { year: number; value: number }[];
  currentSavings: number;
  expectedReturn: number;
  yearsToRetirement: number;
  projectedNetWorth: number;
}

const currencyFormatter = (v: number) => formatCurrency(v);

export default function Charts({
  projectionData,
  currentSavings,
  expectedReturn,
  yearsToRetirement,
  projectedNetWorth,
}: Props) {
  const doublingData = calcDoublingMilestones(
    currentSavings > 0 ? currentSavings : 10000,
    expectedReturn,
    yearsToRetirement
  );

  const retirementIncome = projectedNetWorth * 0.04;
  const incomeData = [
    { label: "Annual Income", value: retirementIncome },
    { label: "Monthly Income", value: retirementIncome / 12 },
  ];

  return (
    <div className="space-y-6">
      {/* Chart 1: Net Worth Growth */}
      <div className="metric-card">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          Net Worth Growth Projection
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
              <XAxis dataKey="year" label={{ value: "Years", position: "insideBottom", offset: -5 }} />
              <YAxis tickFormatter={currencyFormatter} width={90} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Year ${l}`} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(210 70% 38%)"
                strokeWidth={2.5}
                dot={false}
                name="Net Worth"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 2: Rule of 72 */}
        <div className="metric-card">
          <h2 className="section-title mb-4">Rule of 72 Doubling Timeline</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doublingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
                <XAxis dataKey="year" label={{ value: "Year", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={currencyFormatter} width={90} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Year ${l}`} />
                <Bar dataKey="value" fill="hsl(168 50% 42%)" radius={[4, 4, 0, 0]} name="Value" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Retirement Income */}
        <div className="metric-card">
          <h2 className="section-title mb-4">Retirement Income Projection</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
                <XAxis type="number" tickFormatter={currencyFormatter} />
                <YAxis dataKey="label" type="category" width={120} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="hsl(42 90% 55%)" radius={[0, 4, 4, 0]} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
