import type { Bill, IncomeSource, Expense, BillFrequency, IncomeFrequency } from "@/lib/cashflow-types";

const DAY = 86400000;

function ymd(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function stepDays(freq: BillFrequency | IncomeFrequency): number | null {
  switch (freq) {
    case "weekly": return 7;
    case "biweekly": return 14;
    case "monthly": return 30;
    case "yearly": return 365;
    default: return null;
  }
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function expandOccurrences(
  startIso: string,
  freq: BillFrequency | IncomeFrequency,
  days: number,
  todayIso: string,
): string[] {
  const out: string[] = [];
  const today = new Date(todayIso);
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + days * DAY);

  let cur = new Date(startIso);
  cur.setHours(0, 0, 0, 0);

  if (freq !== "once" && freq !== "one-time") {
    while (cur < today) {
      if (freq === "monthly") cur = addMonths(cur, 1);
      else if (freq === "yearly") cur = addMonths(cur, 12);
      else {
        const s = stepDays(freq);
        if (!s) break;
        cur = new Date(cur.getTime() + s * DAY);
      }
    }
  }

  while (cur <= horizon) {
    if (cur >= today) out.push(ymd(cur));
    if (freq === "once" || freq === "one-time") break;
    if (freq === "monthly") cur = addMonths(cur, 1);
    else if (freq === "yearly") cur = addMonths(cur, 12);
    else {
      const s = stepDays(freq);
      if (!s) break;
      cur = new Date(cur.getTime() + s * DAY);
    }
  }
  return out;
}

export interface DayBucket {
  date: string;
  starting: number;
  paychecks: { name: string; amount: number }[];
  bills: { name: string; amount: number; id: string }[];
  transactions: { description: string; amount: number }[];
  ending: number;
  net: number;
}

export function buildTimeline(
  startBalance: number,
  income: IncomeSource[],
  bills: Bill[],
  expenses: Expense[],
  days: number,
): DayBucket[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = ymd(today);

  const map = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getTime() + i * DAY);
    const key = ymd(d);
    map.set(key, { date: key, starting: 0, paychecks: [], bills: [], transactions: [], ending: 0, net: 0 });
  }

  income.forEach(i => {
    const occ = expandOccurrences(i.next_date, i.frequency, days - 1, todayIso);
    occ.forEach(date => {
      const b = map.get(date);
      if (b) b.paychecks.push({ name: i.name, amount: i.amount });
    });
  });

  bills.forEach(bill => {
    if (bill.paid && (bill.frequency === "once" || bill.frequency === "one-time")) return;
    const occ = expandOccurrences(bill.due_date, bill.frequency, days - 1, todayIso);
    occ.forEach(date => {
      const b = map.get(date);
      if (b) b.bills.push({ name: bill.name, amount: bill.amount, id: bill.id });
    });
  });

  expenses.forEach(e => {
    const key = e.date.slice(0, 10);
    const b = map.get(key);
    if (b) b.transactions.push({ description: e.description, amount: e.amount });
  });

  let running = startBalance;
  const out: DayBucket[] = [];
  for (let i = 0; i < days; i++) {
    const key = ymd(new Date(today.getTime() + i * DAY));
    const b = map.get(key)!;
    b.starting = running;
    const inSum = b.paychecks.reduce((s, p) => s + p.amount, 0);
    const outSum = b.bills.reduce((s, x) => s + x.amount, 0) + b.transactions.reduce((s, t) => s + t.amount, 0);
    b.net = inSum - outSum;
    b.ending = running + b.net;
    running = b.ending;
    out.push(b);
  }
  return out;
}

export function firstOverdraft(timeline: DayBucket[]): DayBucket | null {
  return timeline.find(d => d.ending < 0) ?? null;
}

export function billsThisMonth(bills: Bill[]): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = ymd(today);
  const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const days = Math.ceil((eom.getTime() - today.getTime()) / DAY) + 1;
  let total = 0;
  bills.forEach(b => {
    if (b.paid && (b.frequency === "once" || b.frequency === "one-time")) return;
    const occ = expandOccurrences(b.due_date, b.frequency, days, todayIso);
    total += occ.length * b.amount;
  });
  return total;
}

export function spendingThisMonth(expenses: Expense[]): number {
  const now = new Date();
  return expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, e) => s + e.amount, 0);
}

export interface SafeToSpend {
  amount: number;
  currentBalance: number;
  incomeBeforeNextPaycheck: number;
  billsBeforeNextPaycheck: number;
  plannedSavings: number;
  debtPayments: number;
  nextPaycheckDate: string | null;
}

export function calcSafeToSpend(
  startBalance: number,
  income: IncomeSource[],
  bills: Bill[],
  plannedSavings: number,
  debtPayments: number,
  horizonDays = 30,
): SafeToSpend {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = ymd(today);

  let nextPay: string | null = null;
  income.forEach(i => {
    const occ = expandOccurrences(i.next_date, i.frequency, horizonDays, todayIso);
    const future = occ.find(d => d > todayIso);
    if (future && (!nextPay || future < nextPay)) nextPay = future;
  });

  const horizon = nextPay ?? ymd(new Date(today.getTime() + horizonDays * DAY));
  let billsBefore = 0;
  bills.forEach(b => {
    if (b.paid && (b.frequency === "once" || b.frequency === "one-time")) return;
    const occ = expandOccurrences(b.due_date, b.frequency, horizonDays, todayIso);
    occ.forEach(d => { if (d < horizon) billsBefore += b.amount; });
  });

  let incomeBefore = 0;
  income.forEach(i => {
    const occ = expandOccurrences(i.next_date, i.frequency, horizonDays, todayIso);
    occ.forEach(d => { if (d <= todayIso) incomeBefore += i.amount; });
  });

  const amount = startBalance + incomeBefore - billsBefore - plannedSavings - debtPayments;
  return {
    amount,
    currentBalance: startBalance,
    incomeBeforeNextPaycheck: incomeBefore,
    billsBeforeNextPaycheck: billsBefore,
    plannedSavings,
    debtPayments,
    nextPaycheckDate: nextPay,
  };
}
