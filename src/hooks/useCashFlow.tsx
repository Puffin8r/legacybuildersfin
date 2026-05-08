import { useEffect, useState, useCallback, useRef } from "react";
import type { Account, IncomeSource, Bill, Expense, Debt, SavingsGoal } from "@/lib/cashflow-types";

const KEY = "cashflow-blueprint-v1";

interface CashFlowState {
  accounts: Account[];
  income: IncomeSource[];
  bills: Bill[];
  expenses: Expense[];
  debts: Debt[];
  goals: SavingsGoal[];
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
    { id: "e1", description: "Groceries", merchant: "Kroger", amount: 64, category: "Food", date: isoInDays(-1) },
    { id: "e2", description: "Coffee", merchant: "Starbucks", amount: 6, category: "Food", date: isoInDays(-1) },
    { id: "e3", description: "Gas", merchant: "Shell", amount: 38, category: "Gas", date: isoInDays(-2) },
    { id: "e4", description: "Takeout", merchant: "Chipotle", amount: 22, category: "Food", date: isoInDays(-3) },
    { id: "e5", description: "Online order", merchant: "Amazon", amount: 45, category: "Shopping", date: isoInDays(-5) },
    { id: "e6", description: "Netflix", merchant: "Netflix", amount: 16, category: "Subscriptions", date: isoInDays(-7) },
    { id: "e7", description: "Spotify", merchant: "Spotify", amount: 12, category: "Subscriptions", date: isoInDays(-9) },
    { id: "e8", description: "Overdraft fee", merchant: "Bank", amount: 35, category: "Fees", date: isoInDays(-10) },
  ],
  debts: [
    { id: "d1", name: "Credit Card", balance: 2400, min_payment: 60, interest_rate: 24, due_date: isoInDays(15) },
    { id: "d2", name: "Car Loan", balance: 8200, min_payment: 240, interest_rate: 7, due_date: isoInDays(18) },
  ],
  goals: [
    { id: "g1", name: "Emergency fund", type: "Emergency fund", target_amount: 1000, current_amount: 220, monthly_contribution: 100, target_date: isoInDays(240) },
  ],
};

function migrate(s: any): CashFlowState {
  return {
    accounts: s.accounts ?? [],
    income: s.income ?? [],
    bills: s.bills ?? [],
    expenses: s.expenses ?? [],
    debts: s.debts ?? [],
    goals: s.goals ?? [],
  };
}

export function useCashFlow() {
  const [state, _setState] = useState<CashFlowState>(() => {
    if (typeof window === "undefined") return seed;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? migrate(JSON.parse(raw)) : seed;
    } catch {
      return seed;
    }
  });

  // Undo stack: snapshots of prior state, capped to 20 entries.
  const historyRef = useRef<CashFlowState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  const setState = useCallback((updater: (s: CashFlowState) => CashFlowState) => {
    _setState(prev => {
      const next = updater(prev);
      historyRef.current.push(prev);
      if (historyRef.current.length > 20) historyRef.current.shift();
      setUndoCount(historyRef.current.length);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    setUndoCount(historyRef.current.length);
    if (prev) _setState(prev);
    return !!prev;
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const addAccount = useCallback((a: Omit<Account, "id">) =>
    setState(s => ({ ...s, accounts: [...s.accounts, { ...a, id: crypto.randomUUID() }] })), [setState]);
  const updateAccount = useCallback((id: string, patch: Partial<Account>) =>
    setState(s => ({ ...s, accounts: s.accounts.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeAccount = useCallback((id: string) =>
    setState(s => ({ ...s, accounts: s.accounts.filter(x => x.id !== id) })), [setState]);

  const addIncome = useCallback((i: Omit<IncomeSource, "id">) =>
    setState(s => ({ ...s, income: [...s.income, { ...i, id: crypto.randomUUID() }] })), [setState]);
  const updateIncome = useCallback((id: string, patch: Partial<IncomeSource>) =>
    setState(s => ({ ...s, income: s.income.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeIncome = useCallback((id: string) =>
    setState(s => ({ ...s, income: s.income.filter(x => x.id !== id) })), [setState]);

  const addBill = useCallback((b: Omit<Bill, "id">) =>
    setState(s => ({ ...s, bills: [...s.bills, { ...b, id: crypto.randomUUID() }] })), [setState]);
  const updateBill = useCallback((id: string, patch: Partial<Bill>) =>
    setState(s => ({ ...s, bills: s.bills.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeBill = useCallback((id: string) =>
    setState(s => ({ ...s, bills: s.bills.filter(x => x.id !== id) })), [setState]);

  const addExpense = useCallback((e: Omit<Expense, "id">) =>
    setState(s => ({ ...s, expenses: [...s.expenses, { ...e, id: crypto.randomUUID() }] })), [setState]);
  const updateExpense = useCallback((id: string, patch: Partial<Expense>) =>
    setState(s => ({ ...s, expenses: s.expenses.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeExpense = useCallback((id: string) =>
    setState(s => ({ ...s, expenses: s.expenses.filter(x => x.id !== id) })), [setState]);

  const addDebt = useCallback((d: Omit<Debt, "id">) =>
    setState(s => ({ ...s, debts: [...s.debts, { ...d, id: crypto.randomUUID() }] })), [setState]);
  const updateDebt = useCallback((id: string, patch: Partial<Debt>) =>
    setState(s => ({ ...s, debts: s.debts.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeDebt = useCallback((id: string) =>
    setState(s => ({ ...s, debts: s.debts.filter(x => x.id !== id) })), [setState]);

  const addGoal = useCallback((g: Omit<SavingsGoal, "id">) =>
    setState(s => ({ ...s, goals: [...s.goals, { ...g, id: crypto.randomUUID() }] })), [setState]);
  const updateGoal = useCallback((id: string, patch: Partial<SavingsGoal>) =>
    setState(s => ({ ...s, goals: s.goals.map(x => x.id === id ? { ...x, ...patch } : x) })), [setState]);
  const removeGoal = useCallback((id: string) =>
    setState(s => ({ ...s, goals: s.goals.filter(x => x.id !== id) })), [setState]);

  return {
    ...state,
    addAccount, updateAccount, removeAccount,
    addIncome, updateIncome, removeIncome,
    addBill, updateBill, removeBill,
    addExpense, updateExpense, removeExpense,
    addDebt, updateDebt, removeDebt,
    addGoal, updateGoal, removeGoal,
    undo,
    canUndo: undoCount > 0,
    resetAll: () => setState(() => seed),
    clearAll: () => setState(() => ({ accounts: [], income: [], bills: [], expenses: [], debts: [], goals: [] })),
  };
}

export type CashFlow = ReturnType<typeof useCashFlow>;
