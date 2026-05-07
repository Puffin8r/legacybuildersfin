import { useEffect, useState, useCallback } from "react";
import type { Account, IncomeSource, Bill, Expense } from "@/lib/cashflow-types";

const KEY = "cashflow-blueprint-v1";

interface CashFlowState {
  accounts: Account[];
  income: IncomeSource[];
  bills: Bill[];
  expenses: Expense[];
}

function isoInDays(d: number): string {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
}

const seed: CashFlowState = {
  accounts: [{ id: "a1", name: "Checking", balance: 420 }],
  income: [
    { id: "i1", name: "Paycheck", amount: 1450, frequency: "biweekly", next_date: isoInDays(5) },
  ],
  bills: [
    { id: "b1", name: "Rent", amount: 950, due_date: isoInDays(8), frequency: "monthly", is_essential: true },
    { id: "b2", name: "Electric", amount: 85, due_date: isoInDays(3), frequency: "monthly", is_essential: true },
    { id: "b3", name: "Phone", amount: 60, due_date: isoInDays(12), frequency: "monthly", is_essential: true },
    { id: "b4", name: "Streaming", amount: 18, due_date: isoInDays(20), frequency: "monthly", is_essential: false },
  ],
  expenses: [
    { id: "e1", description: "Groceries", amount: 64, category: "Food", date: isoInDays(-1) },
    { id: "e2", description: "Coffee", amount: 6, category: "Food", date: isoInDays(-1) },
    { id: "e3", description: "Gas", amount: 38, category: "Transport", date: isoInDays(-2) },
    { id: "e4", description: "Takeout", amount: 22, category: "Food", date: isoInDays(-3) },
    { id: "e5", description: "Online order", amount: 45, category: "Shopping", date: isoInDays(-5) },
  ],
};

export function useCashFlow() {
  const [state, setState] = useState<CashFlowState>(() => {
    if (typeof window === "undefined") return seed;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CashFlowState) : seed;
    } catch {
      return seed;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const addAccount = useCallback((a: Omit<Account, "id">) =>
    setState(s => ({ ...s, accounts: [...s.accounts, { ...a, id: crypto.randomUUID() }] })), []);
  const updateAccount = useCallback((id: string, patch: Partial<Account>) =>
    setState(s => ({ ...s, accounts: s.accounts.map(x => x.id === id ? { ...x, ...patch } : x) })), []);
  const removeAccount = useCallback((id: string) =>
    setState(s => ({ ...s, accounts: s.accounts.filter(x => x.id !== id) })), []);

  const addIncome = useCallback((i: Omit<IncomeSource, "id">) =>
    setState(s => ({ ...s, income: [...s.income, { ...i, id: crypto.randomUUID() }] })), []);
  const removeIncome = useCallback((id: string) =>
    setState(s => ({ ...s, income: s.income.filter(x => x.id !== id) })), []);

  const addBill = useCallback((b: Omit<Bill, "id">) =>
    setState(s => ({ ...s, bills: [...s.bills, { ...b, id: crypto.randomUUID() }] })), []);
  const updateBill = useCallback((id: string, patch: Partial<Bill>) =>
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, ...patch } : x) })), []);
  const removeBill = useCallback((id: string) =>
    setState(s => ({ ...s, bills: s.bills.filter(x => x.id !== id) })), []);

  const addExpense = useCallback((e: Omit<Expense, "id">) =>
    setState(s => ({ ...s, expenses: [...s.expenses, { ...e, id: crypto.randomUUID() }] })), []);
  const removeExpense = useCallback((id: string) =>
    setState(s => ({ ...s, expenses: s.expenses.filter(x => x.id !== id) })), []);

  return {
    ...state,
    addAccount, updateAccount, removeAccount,
    addIncome, removeIncome,
    addBill, updateBill, removeBill,
    addExpense, removeExpense,
  };
}

export type CashFlow = ReturnType<typeof useCashFlow>;
