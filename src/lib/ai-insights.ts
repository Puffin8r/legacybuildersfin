// Deterministic AI Money Coach insights derived from app data.
// Keep this pure so it works offline; the chat layer adds free-form Q&A.

import type { Bill, Debt, Expense, IncomeSource, SavingsGoal, ExpenseCategory } from "./cashflow-types";
import { buildTimeline, calcSafeToSpend, firstOverdraft, spendingThisMonth } from "./cashflow-engine";

export interface MoneyInsight {
  id: string;
  title: string;            // What happened
  why: string;              // Why it matters
  action: string;           // What to do next
  impact: string;           // Estimated money impact
  tone: "positive" | "warning" | "danger" | "neutral";
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n));

/* ---------------- Today's Money ---------------- */
export function todaysInsights(args: {
  totalCash: number;
  income: IncomeSource[];
  bills: Bill[];
  expenses: Expense[];
}): MoneyInsight[] {
  const { totalCash, income, bills, expenses } = args;
  const out: MoneyInsight[] = [];
  const timeline = buildTimeline(totalCash, income, bills, expenses, 30);
  const od = firstOverdraft(timeline);
  const safe = calcSafeToSpend(totalCash, income, bills, 0, 0);

  if (od) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Math.round((new Date(od.date).getTime() - today.getTime()) / 86400000);
    const next = safe.nextPaycheckDate ? new Date(safe.nextPaycheckDate) : null;
    const daysBeforePay = next
      ? Math.max(Math.round((next.getTime() - new Date(od.date).getTime()) / 86400000), 0)
      : null;
    out.push({
      id: "today-overdraft",
      title: daysBeforePay && daysBeforePay > 0
        ? `You may run out of money ${daysBeforePay} day${daysBeforePay === 1 ? "" : "s"} before your next paycheck.`
        : `You may go negative in ${days} day${days === 1 ? "" : "s"}.`,
      why: `Your projected balance hits ${fmt(od.ending)} on ${new Date(od.date).toLocaleDateString("en", { month: "short", day: "numeric" })}.`,
      action: "Move a non-essential bill, delay a purchase, or shift money in before that date.",
      impact: `Avoid a likely ${fmt(35)} overdraft fee.`,
      tone: "danger",
    });
  } else if (safe.amount < 50 && safe.amount >= 0) {
    out.push({
      id: "today-thin",
      title: `Only ${fmt(safe.amount)} safe to spend until your next paycheck.`,
      why: "Bills due before payday eat most of your cash.",
      action: "Pause discretionary spending for the next few days.",
      impact: `Protects ~${fmt(safe.billsBeforeNextPaycheck)} of upcoming bills.`,
      tone: "warning",
    });
  } else if (safe.amount > 0) {
    out.push({
      id: "today-ok",
      title: `You have ${fmt(safe.amount)} safe to spend.`,
      why: "Your bills before next payday are covered.",
      action: "Send any extra to savings or your highest-rate debt.",
      impact: `Saving ${fmt(Math.min(safe.amount * 0.3, 200))} now compounds over time.`,
      tone: "positive",
    });
  }
  return out;
}

/* ---------------- Where It Went ---------------- */
export function whereInsights(expenses: Expense[]): MoneyInsight[] {
  const out: MoneyInsight[] = [];
  const month = expenses.filter(e => {
    const d = new Date(e.date); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  if (month.length === 0) return out;

  const byCat = new Map<ExpenseCategory, number>();
  month.forEach(e => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
  const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const [topCat, topAmt] = ranked[0];

  out.push({
    id: "where-top",
    title: `${topCat} is your biggest leak this month at ${fmt(topAmt)}.`,
    why: `It's ${Math.round((topAmt / spendingThisMonth(month)) * 100)}% of your spending.`,
    action: `Set a weekly cap for ${topCat} and track each purchase.`,
    impact: `Cutting it 20% saves ~${fmt(topAmt * 0.2)}/month.`,
    tone: "warning",
  });

  const fees = month.filter(e => e.category === "Fees").reduce((s, e) => s + e.amount, 0);
  if (fees > 0) {
    out.push({
      id: "where-fees",
      title: `You paid ${fmt(fees)} in fees this month.`,
      why: "Fees are usually avoidable and pure losses.",
      action: "Set low-balance alerts and turn off overdraft opt-in.",
      impact: `Avoid ~${fmt(fees * 12)} per year.`,
      tone: "danger",
    });
  }

  const subs = month.filter(e => e.category === "Subscriptions").reduce((s, e) => s + e.amount, 0);
  if (subs > 30) {
    out.push({
      id: "where-subs",
      title: `Subscriptions cost ${fmt(subs)} this month.`,
      why: "Recurring charges quietly drain cash flow.",
      action: "Cancel one you haven't used in 30 days.",
      impact: `Save ${fmt(subs * 12)}/year by trimming them.`,
      tone: "neutral",
    });
  }
  return out;
}

/* ---------------- Fix My Money ---------------- */
export function fixInsights(args: { debts: Debt[]; goals: SavingsGoal[] }): MoneyInsight[] {
  const { debts, goals } = args;
  const out: MoneyInsight[] = [];

  if (debts.length) {
    const high = [...debts].sort((a, b) => b.interest_rate - a.interest_rate)[0];
    const yearly = high.balance * (high.interest_rate / 100);
    out.push({
      id: "fix-debt",
      title: `${high.name} has the highest interest rate at ${high.interest_rate.toFixed(1)}%.`,
      why: "High-rate debt costs the most every month.",
      action: "Pay extra here first (Avalanche method).",
      impact: `Costing about ${fmt(yearly)}/year in interest.`,
      tone: "danger",
    });
  }

  const ef = goals.find(g => g.type === "Emergency fund");
  if (ef && ef.current_amount < ef.target_amount * 0.5) {
    const gap = ef.target_amount - ef.current_amount;
    out.push({
      id: "fix-ef",
      title: `Your emergency fund is at ${Math.round((ef.current_amount / ef.target_amount) * 100)}%.`,
      why: "A small cushion prevents debt when surprises hit.",
      action: `Add ${fmt(Math.max(ef.monthly_contribution, 50))}/month until you reach ${fmt(ef.target_amount)}.`,
      impact: `Closes a ${fmt(gap)} safety gap.`,
      tone: "warning",
    });
  }
  return out;
}

/* ---------------- Future Blueprint ---------------- */
export function futureInsights(args: {
  fin: number;
  currentInvestments: number;
  projected: number;
  monthlyContribution: number;
  yearsToRetire: number;
}): MoneyInsight[] {
  const { fin, currentInvestments, projected, monthlyContribution, yearsToRetire } = args;
  const out: MoneyInsight[] = [];
  const progress = fin > 0 ? (currentInvestments / fin) * 100 : 0;

  out.push({
    id: "future-progress",
    title: `You're ${progress.toFixed(0)}% toward your Financial Independence Number.`,
    why: `Your FIN is ${fmt(fin)}; you have ${fmt(currentInvestments)} invested.`,
    action: monthlyContribution < 200
      ? "Bump your monthly contribution by $50 to accelerate progress."
      : "Stay consistent — automate contributions if you haven't.",
    impact: `Adding $50/mo for ${yearsToRetire} years grows to ~${fmt(50 * 12 * yearsToRetire * 1.5)}.`,
    tone: progress < 25 ? "warning" : "positive",
  });

  if (projected < fin) {
    const shortfall = fin - projected;
    out.push({
      id: "future-shortfall",
      title: `Projected to fall ${fmt(shortfall)} short of FIN.`,
      why: "At current contributions and return, you don't reach FIN by retirement.",
      action: "Increase monthly contribution or push retirement age out 1–2 years.",
      impact: `Closes a ${fmt(shortfall)} gap.`,
      tone: "warning",
    });
  } else {
    out.push({
      id: "future-ahead",
      title: "You're on track to exceed your FIN.",
      why: "Current savings + return outpace your target.",
      action: "Consider locking in this savings rate or retiring earlier.",
      impact: `Cushion of ${fmt(projected - fin)} over FIN.`,
      tone: "positive",
    });
  }
  return out;
}
