import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { formatMoney, daysUntil } from "@/lib/cashflow-types";
import type { CashFlow } from "@/hooks/useCashFlow";

interface Tip {
  icon: typeof Sparkles;
  title: string;
  body: string;
  tone: "warn" | "tip" | "win";
}

export default function FixMyMoney({ cf }: { cf: CashFlow }) {
  const tips = useMemo<Tip[]>(() => {
    const out: Tip[] = [];
    const cash = cf.accounts.reduce((s, a) => s + a.balance, 0);
    const next14Bills = cf.bills.filter(b => !b.paid && daysUntil(b.due_date) <= 14);
    const next14Total = next14Bills.reduce((s, b) => s + b.amount, 0);
    const next14Income = cf.income.filter(i => daysUntil(i.next_date) <= 14 && daysUntil(i.next_date) >= 0).reduce((s, i) => s + i.amount, 0);
    const projected = cash + next14Income - next14Total;

    if (projected < 0) {
      out.push({
        icon: AlertTriangle, tone: "warn",
        title: `Overdraft risk in next 2 weeks`,
        body: `You're projected to be ${formatMoney(Math.abs(projected))} short. Move non-essential bills or pause spending in your top category.`,
      });
    } else if (projected < 100) {
      out.push({
        icon: AlertTriangle, tone: "warn",
        title: "Tight cushion ahead",
        body: `Only ${formatMoney(projected)} buffer after bills. Hold off on extras this week.`,
      });
    } else {
      out.push({
        icon: Target, tone: "win",
        title: "You have breathing room",
        body: `${formatMoney(projected)} left after the next 2 weeks of bills. Consider stashing ${formatMoney(Math.round(projected * 0.2))} for emergencies.`,
      });
    }

    // Category leak
    const cutoff = Date.now() - 30 * 86400000;
    const recent = cf.expenses.filter(e => new Date(e.date).getTime() >= cutoff);
    const byCat = new Map<string, number>();
    recent.forEach(e => byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      const [cat, amt] = sorted[0];
      out.push({
        icon: Lightbulb, tone: "tip",
        title: `Cut ${cat} by 25%`,
        body: `You spent ${formatMoney(amt)} on ${cat} in 30 days. Cutting a quarter saves ${formatMoney(amt * 0.25)}/month.`,
      });
    }

    // Optional bills
    const optional = cf.bills.filter(b => !b.is_essential);
    if (optional.length) {
      const total = optional.reduce((s, b) => s + b.amount, 0);
      out.push({
        icon: Lightbulb, tone: "tip",
        title: "Pause optional bills",
        body: `${optional.map(b => b.name).join(", ")} = ${formatMoney(total)}/month. Pausing for 1 month adds that to your cushion.`,
      });
    }

    // Bills before paycheck
    const sortedBills = [...cf.bills].sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));
    const nextPay = cf.income.map(i => daysUntil(i.next_date)).filter(d => d >= 0).sort((a, b) => a - b)[0];
    if (nextPay !== undefined) {
      const before = sortedBills.filter(b => daysUntil(b.due_date) < nextPay && daysUntil(b.due_date) >= 0);
      const beforeTotal = before.reduce((s, b) => s + b.amount, 0);
      if (beforeTotal > cash) {
        out.push({
          icon: AlertTriangle, tone: "warn",
          title: "Bills due before next paycheck",
          body: `${formatMoney(beforeTotal)} in bills hit before payday in ${nextPay}d, but you only have ${formatMoney(cash)}. Call providers to push due dates.`,
        });
      }
    }

    return out;
  }, [cf]);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-5 flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1"/>
          <div>
            <p className="font-heading text-lg font-semibold">Your money coach</p>
            <p className="text-sm text-muted-foreground">Personal tips based on your cash, bills and spending patterns.</p>
          </div>
        </CardContent>
      </Card>

      {tips.map((t, i) => {
        const Icon = t.icon;
        const colors = t.tone === "warn"
          ? "bg-destructive/5 border-destructive/30 text-destructive"
          : t.tone === "win"
          ? "bg-success/5 border-success/30 text-success"
          : "bg-accent/10 border-accent/30 text-accent-foreground";
        return (
          <Card key={i} className={`border ${colors}`}>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Icon className="h-5 w-5"/>{t.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground/90">{t.body}</p></CardContent>
          </Card>
        );
      })}
    </div>
  );
}
