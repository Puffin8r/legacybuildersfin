// Supabase-ready data structures for CashFlow Blueprint.
// When Lovable Cloud is enabled, mirror these as tables with the same columns.

export interface Account {
  id: string;
  name: string;          // e.g. "Checking", "Cash"
  balance: number;       // current balance
  created_at?: string;
}

export type IncomeFrequency = "weekly" | "biweekly" | "monthly" | "one-time";

export interface IncomeSource {
  id: string;
  name: string;          // e.g. "Paycheck", "Side gig"
  amount: number;
  frequency: IncomeFrequency;
  next_date: string;     // ISO date of next pay
  created_at?: string;
}

export type BillFrequency = "monthly" | "weekly" | "biweekly" | "yearly" | "one-time";

export interface Bill {
  id: string;
  name: string;          // "Rent", "Electric"
  amount: number;
  due_date: string;      // ISO of next due date
  frequency: BillFrequency;
  is_essential: boolean; // helps Fix My Money
  paid?: boolean;
  created_at?: string;
}

export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Subscriptions"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Other";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;          // ISO date
  created_at?: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Entertainment",
  "Health",
  "Other",
];

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
