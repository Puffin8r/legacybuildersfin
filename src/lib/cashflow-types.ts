// Supabase-ready data structures for LegacyBuilders.
// When Lovable Cloud is enabled, mirror these as tables with the same columns.

export interface Account {
  id: string;
  name: string;          // e.g. "Checking", "Cash"
  balance: number;       // current balance
  created_at?: string;
}

export type IncomeFrequency = "once" | "weekly" | "biweekly" | "monthly" | "one-time";

export interface IncomeSource {
  id: string;
  name: string;          // e.g. "Paycheck", "Side gig"
  amount: number;
  frequency: IncomeFrequency;
  next_date: string;     // ISO date of next pay
  created_at?: string;
}

export type BillFrequency = "once" | "monthly" | "weekly" | "biweekly" | "yearly" | "one-time";

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
  | "Housing"
  | "Food"
  | "Gas"
  | "Transportation"
  | "Insurance"
  | "Debt"
  | "Subscriptions"
  | "Entertainment"
  | "Shopping"
  | "Savings"
  | "Fees"
  | "Other";

export interface Expense {
  id: string;
  description: string;   // notes
  merchant?: string;
  amount: number;
  category: ExpenseCategory;
  date: string;          // ISO date
  created_at?: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Housing",
  "Food",
  "Gas",
  "Transportation",
  "Insurance",
  "Debt",
  "Subscriptions",
  "Entertainment",
  "Shopping",
  "Savings",
  "Fees",
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

/* ---------------- Debt & Savings ---------------- */

export interface Debt {
  id: string;
  name: string;
  balance: number;
  min_payment: number;
  interest_rate: number; // APR %
  due_date: string;      // ISO
  created_at?: string;
}

export type SavingsGoalType =
  | "Emergency fund"
  | "Car"
  | "Home"
  | "Vacation"
  | "Business"
  | "Retirement"
  | "Custom";

export interface SavingsGoal {
  id: string;
  name: string;
  type: SavingsGoalType;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  target_date: string;   // ISO
  /** Optional link to a connected savings bank account. When set, deposits
   *  into that account auto-bump current_amount. */
  linked_bank_account_id?: string;
  created_at?: string;
}

export const SAVINGS_GOAL_TYPES: SavingsGoalType[] = [
  "Emergency fund", "Car", "Home", "Vacation", "Business", "Retirement", "Custom",
];
