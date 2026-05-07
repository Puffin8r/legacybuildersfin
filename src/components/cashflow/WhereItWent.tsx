import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { EXPENSE_CATEGORIES, formatMoney, type ExpenseCategory } from "@/lib/cashflow-types";
import type { CashFlow } from "@/hooks/useCashFlow";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

export default function WhereItWent({ cf }: { cf: CashFlow }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<ExpenseCategory>("Food");

  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return cf.expenses.filter(e => new Date(e.date).getTime() >= cutoff);
  }, [cf.expenses]);

  const total30 = last30.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    last30.forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [last30]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      m.set(d.toISOString().slice(0, 10), 0);
    }
    last30.forEach(e => {
      const k = e.date.slice(0, 10);
      if (m.has(k)) m.set(k, (m.get(k) || 0) + e.amount);
    });
    return Array.from(m.entries()).map(([date, value]) => ({
      day: new Date(date).toLocaleDateString("en", { weekday: "short" }),
      value,
    }));
  }, [last30]);

  const topLeak = byCategory[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Spent in last 30 days</p>
          <p className="text-4xl font-bold font-heading">{formatMoney(total30)}</p>
          {topLeak && (
            <p className="text-sm text-muted-foreground mt-2">
              Biggest leak: <span className="font-semibold text-foreground">{topLeak.name}</span> · {formatMoney(topLeak.value)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Where it went</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {byCategory.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{background: COLORS[i % COLORS.length]}}/>{c.name}</span>
                <span className="font-medium">{formatMoney(c.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Last 7 days</CardTitle></CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]} isAnimationActive={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Add expense</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="What did you buy?" value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="$" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <select
              value={cat}
              onChange={e => setCat(e.target.value as ExpenseCategory)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={() => {
            if (!desc || !amount) return;
            cf.addExpense({ description: desc, amount: parseFloat(amount), category: cat, date: new Date().toISOString() });
            setDesc(""); setAmount("");
          }}><Plus className="h-4 w-4 mr-1"/>Log it</Button>

          <div className="pt-3 space-y-2">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">Recent</p>
            {cf.expenses.slice().reverse().slice(0, 8).map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm border-b pb-1">
                <div className="min-w-0">
                  <p className="truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {new Date(e.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">-{formatMoney(e.amount)}</span>
                  <Button size="icon" variant="ghost" onClick={() => cf.removeExpense(e.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
