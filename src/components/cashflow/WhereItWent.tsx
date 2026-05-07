import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import {
  Trash2, Plus, AlertTriangle, Repeat, Coffee, CreditCard, ReceiptText, TrendingUp, Copy, Lightbulb, Pencil, Check, X,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES, formatMoney, type ExpenseCategory, type Expense,
} from "@/lib/cashflow-types";
import { calcSafeToSpend } from "@/lib/cashflow-engine";
import type { CashFlow } from "@/hooks/useCashFlow";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))",
  "hsl(var(--destructive))", "hsl(var(--success))", "hsl(var(--warning))",
  "hsl(220 30% 50%)", "hsl(280 50% 55%)", "hsl(15 75% 55%)",
  "hsl(160 50% 45%)", "hsl(45 80% 50%)", "hsl(220 10% 55%)",
];

const txSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  amount: z.number({ invalid_type_error: "Enter amount" }).positive("Must be positive").max(1_000_000),
  merchant: z.string().trim().max(80).optional(),
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z.string().trim().max(200).optional(),
});

export default function WhereItWent({ cf }: { cf: CashFlow }) {
  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return cf.expenses.filter(e => new Date(e.date).getTime() >= cutoff);
  }, [cf.expenses]);

  const total30 = last30.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const m = new Map<ExpenseCategory, number>();
    last30.forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value, pct: total30 > 0 ? (value / total30) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [last30, total30]);

  const top3 = byCategory.slice(0, 3);

  const totalCash = cf.accounts.reduce((s, a) => s + a.balance, 0);
  const safe = useMemo(
    () => calcSafeToSpend(totalCash, cf.income, cf.bills, 0, 0),
    [totalCash, cf.income, cf.bills],
  );
  const risk = riskLevel(safe.amount, totalCash);
  const leaks = useMemo(() => detectLeaks(cf.expenses, cf.bills), [cf.expenses, cf.bills]);

  return (
    <div className="space-y-4">
      {/* HEADER CARD */}
      <Card className="border-2">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Where Did My Money Go?</p>
          <p className="text-4xl font-bold font-heading mt-1">{formatMoney(total30)}</p>
          <p className="text-sm text-muted-foreground">spent in the last 30 days</p>
        </CardContent>
      </Card>

      {/* RISK METER */}
      <RiskMeter risk={risk} safeAmount={safe.amount} />

      {/* TOP 3 */}
      {top3.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 3 spending</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {top3.map((c, i) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </span>
                  <span><span className="font-semibold">{formatMoney(c.value)}</span> <span className="text-muted-foreground">· {c.pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CATEGORY BREAKDOWN */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">All categories</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 4, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 mt-2">
              {byCategory.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </span>
                  <span className="text-muted-foreground">{formatMoney(c.value)} · {c.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MONEY LEAK AUDIT */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Money leak audit</CardTitle>
          <p className="text-xs text-muted-foreground">Patterns we noticed in your last 30 days.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaks.length === 0 && <p className="text-sm text-muted-foreground">No leaks found. Nice work.</p>}
          {leaks.map((l, i) => {
            const Icon = l.icon;
            return (
              <div key={i} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-sm">{l.title}</p>
                      <span className="font-bold text-destructive">{formatMoney(l.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.why}</p>
                    <p className="text-xs mt-1.5 flex items-start gap-1"><Lightbulb className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5"/><span>{l.action}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* TRANSACTION ENTRY + LIST */}
      <TransactionEntry cf={cf} />
    </div>
  );
}

/* ---------------- Risk meter ---------------- */

type Risk = "low" | "medium" | "high";

function riskLevel(safeAmount: number, cash: number): Risk {
  if (safeAmount < 0) return "high";
  if (safeAmount < Math.max(100, cash * 0.1)) return "medium";
  return "low";
}

function RiskMeter({ risk, safeAmount }: { risk: Risk; safeAmount: number }) {
  const cfg = {
    low:    { label: "Low risk",    color: "bg-success",     text: "text-success",     pos: "33%",  msg: "You should make it to your next paycheck." },
    medium: { label: "Medium risk", color: "bg-warning",     text: "text-warning",     pos: "66%",  msg: "Tight cushion. Skip non-essentials this week." },
    high:   { label: "High risk",   color: "bg-destructive", text: "text-destructive", pos: "100%", msg: "More month than money. Cut bills or boost income." },
  }[risk];
  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">More Month Than Money</p>
          <Badge className={`${cfg.color} text-white hover:${cfg.color}`}>{cfg.label}</Badge>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-muted">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-success/30" />
            <div className="flex-1 bg-warning/30" />
            <div className="flex-1 bg-destructive/30" />
          </div>
          <div
            className={`absolute top-0 h-full w-1 ${cfg.color} transition-all`}
            style={{ left: `calc(${cfg.pos} - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase text-muted-foreground mt-1">
          <span>Low</span><span>Medium</span><span>High</span>
        </div>
        <p className={`text-xs mt-2 ${cfg.text}`}>
          Projected before next paycheck: <span className="font-semibold">{formatMoney(safeAmount)}</span> · {cfg.msg}
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Leak detection ---------------- */

interface Leak {
  title: string;
  amount: number;
  why: string;
  action: string;
  icon: typeof Repeat;
}

function detectLeaks(expenses: Expense[], bills: { name: string; amount: number; frequency: string }[]): Leak[] {
  const cutoff = Date.now() - 30 * 86400000;
  const recent = expenses.filter(e => new Date(e.date).getTime() >= cutoff);
  const leaks: Leak[] = [];

  // Subscriptions
  const subs = recent.filter(e => e.category === "Subscriptions");
  const subTotal = subs.reduce((s, e) => s + e.amount, 0);
  if (subTotal > 0) {
    leaks.push({
      title: "Subscription Leak",
      amount: subTotal,
      why: `You spent ${formatMoney(subTotal)} on ${subs.length} subscription${subs.length === 1 ? "" : "s"} this month.`,
      action: "Review your subscriptions and cancel any you haven't used in 30 days.",
      icon: Repeat,
    });
  }

  // Repeated small purchases (< $15) by merchant or category
  const smallByMerchant = new Map<string, { count: number; total: number }>();
  recent.filter(e => e.amount > 0 && e.amount < 15).forEach(e => {
    const key = (e.merchant || e.category).toLowerCase();
    const cur = smallByMerchant.get(key) || { count: 0, total: 0 };
    cur.count += 1; cur.total += e.amount;
    smallByMerchant.set(key, cur);
  });
  const repeats = [...smallByMerchant.entries()].filter(([, v]) => v.count >= 4).sort((a, b) => b[1].total - a[1].total);
  if (repeats[0]) {
    const [name, info] = repeats[0];
    leaks.push({
      title: "Small Purchase Leak",
      amount: info.total,
      why: `${info.count} small charges at ${capitalize(name)} added up to ${formatMoney(info.total)}.`,
      action: "Set a weekly cap or skip 2 per week to save quickly.",
      icon: Coffee,
    });
  }

  // Overdraft / interest fees
  const fees = recent.filter(e => e.category === "Fees");
  const overdraftFees = fees.filter(e => /overdraft|nsf|insufficient/i.test(`${e.description} ${e.merchant ?? ""}`));
  const overdraftTotal = overdraftFees.reduce((s, e) => s + e.amount, 0);
  if (overdraftTotal > 0) {
    leaks.push({
      title: "Overdraft Fee Leak",
      amount: overdraftTotal,
      why: `${overdraftFees.length} overdraft fee${overdraftFees.length === 1 ? "" : "s"} cost you ${formatMoney(overdraftTotal)}.`,
      action: "Turn on low-balance alerts or switch to an account with no overdraft fees.",
      icon: CreditCard,
    });
  }
  const interestFees = fees.filter(e => /interest|finance charge|apr/i.test(`${e.description} ${e.merchant ?? ""}`));
  const interestTotal = interestFees.reduce((s, e) => s + e.amount, 0);
  if (interestTotal > 0) {
    leaks.push({
      title: "Interest Fee Leak",
      amount: interestTotal,
      why: `${formatMoney(interestTotal)} went to interest charges this month.`,
      action: "Pay more than the minimum on the highest-interest balance first.",
      icon: ReceiptText,
    });
  }

  // Dining-out spike
  const food = recent.filter(e => e.category === "Food");
  const dining = food.filter(e => !/grocery|supermarket|kroger|walmart|aldi|costco|trader/i.test(`${e.merchant ?? ""} ${e.description}`));
  const diningTotal = dining.reduce((s, e) => s + e.amount, 0);
  if (diningTotal >= 150) {
    leaks.push({
      title: "Dining Out Spike",
      amount: diningTotal,
      why: `${dining.length} restaurant/takeout charges totaled ${formatMoney(diningTotal)}.`,
      action: "Cap dining out at 2 meals per week — could save half this amount.",
      icon: TrendingUp,
    });
  }

  // Duplicate charges (same merchant + same amount on same day)
  const dupKey = new Map<string, number>();
  recent.forEach(e => {
    const k = `${(e.merchant || "").toLowerCase()}|${e.amount}|${e.date.slice(0,10)}`;
    if (!e.merchant) return;
    dupKey.set(k, (dupKey.get(k) || 0) + 1);
  });
  const dupes = [...dupKey.entries()].filter(([, n]) => n >= 2);
  if (dupes.length) {
    const dupeAmount = dupes.reduce((s, [k, n]) => {
      const amt = parseFloat(k.split("|")[1]);
      return s + amt * (n - 1);
    }, 0);
    leaks.push({
      title: "Duplicate Charges",
      amount: dupeAmount,
      why: `${dupes.length} charge${dupes.length === 1 ? "" : "s"} appear duplicated.`,
      action: "Check your statements and dispute any you didn't make twice.",
      icon: Copy,
    });
  }

  // Bills that increased: compare bill amount vs typical (use any matching expense)
  // Heuristic: if same-named expense appeared in prior 30-60d window with lower amount.
  const prior = expenses.filter(e => {
    const t = new Date(e.date).getTime();
    return t < cutoff && t >= cutoff - 30 * 86400000;
  });
  const priorByMerchant = new Map<string, number[]>();
  prior.forEach(e => {
    if (!e.merchant) return;
    const k = e.merchant.toLowerCase();
    const arr = priorByMerchant.get(k) || [];
    arr.push(e.amount); priorByMerchant.set(k, arr);
  });
  let increasedTotal = 0;
  let increasedCount = 0;
  recent.forEach(e => {
    if (!e.merchant) return;
    const arr = priorByMerchant.get(e.merchant.toLowerCase());
    if (!arr || !arr.length) return;
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    if (e.amount > avg * 1.2 && e.amount - avg >= 5) {
      increasedTotal += e.amount - avg;
      increasedCount += 1;
    }
  });
  if (increasedCount > 0) {
    leaks.push({
      title: "Bills That Increased",
      amount: increasedTotal,
      why: `${increasedCount} charge${increasedCount === 1 ? "" : "s"} were higher than usual by ${formatMoney(increasedTotal)} total.`,
      action: "Call the provider — many will lower it back if you ask.",
      icon: TrendingUp,
    });
  }

  return leaks;
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------------- Transaction entry ---------------- */

function TransactionEntry({ cf }: { cf: CashFlow }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const parsed = txSchema.safeParse({
      date,
      amount: parseFloat(amount),
      merchant: merchant || undefined,
      category,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    cf.addExpense({
      description: parsed.data.description ?? "",
      merchant: parsed.data.merchant,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: parsed.data.date,
    });
    setAmount(""); setMerchant(""); setDescription("");
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Add a transaction</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} maxLength={10}/>
          </div>
        </div>
        <div>
          <Label className="text-xs">Merchant</Label>
          <Input placeholder="e.g. Starbucks" value={merchant} onChange={e => setMerchant(e.target.value)} maxLength={80}/>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
            className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Description (optional)</Label>
          <Input placeholder="Notes" value={description} onChange={e => setDescription(e.target.value)} maxLength={200}/>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-2">
            <AlertTriangle className="h-4 w-4"/>{error}
          </div>
        )}
        <Button className="w-full" onClick={submit}><Plus className="h-4 w-4 mr-1"/>Add transaction</Button>

        <div className="pt-3">
          <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">Recent</p>
          <div className="space-y-1">
            {cf.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0, 20).map(e => (
              <TransactionRow key={e.id} expense={e} cf={cf} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
