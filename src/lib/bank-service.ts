// Plaid-ready bank service. Currently backed by localStorage (matches the
// rest of CashFlow Blueprint). The function shapes mirror what a Supabase
// + Plaid implementation would look like, so the UI layer never changes.
//
// To go live with Plaid:
//   1. Replace `loadAccounts` / `saveAccounts` with Supabase `bank_accounts` queries.
//   2. In `connectAccount`, swap the demo seeder for a Plaid Link → /token/exchange flow.
//   3. In `syncAccount`, call `/transactions/sync` and feed results to `applyPlaidTransactions`.

import type { BankAccount, BankAccountSubtype, PlaidTxn } from "./bank-types";
import type { Expense, ExpenseCategory, SavingsGoal } from "./cashflow-types";
import { fireEvent } from "./integrations";

const ACCOUNTS_KEY = "cashflow-bank-accounts-v1";
const SEEN_TX_KEY  = "cashflow-bank-seen-tx-v1";

export function loadAccounts(): BankAccount[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
  catch { return []; }
}
export function saveAccounts(list: BankAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

function loadSeen(): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(SEEN_TX_KEY) || "{}"); }
  catch { return {}; }
}
function saveSeen(map: Record<string, true>) {
  localStorage.setItem(SEEN_TX_KEY, JSON.stringify(map));
}

/** Demo connect — pretends Plaid Link finished and returns a fake account. */
export function connectAccount(input: {
  institution_name: string;
  account_name: string;
  subtype: BankAccountSubtype;
  current_balance: number;
}): BankAccount {
  const type = input.subtype === "credit card" ? "credit" : "depository";
  const acct: BankAccount = {
    id: crypto.randomUUID(),
    institution_name: input.institution_name,
    account_name:     input.account_name,
    account_type:     type,
    account_subtype:  input.subtype,
    current_balance:  input.current_balance,
    available_balance:input.current_balance,
    plaid_account_id: `demo_${crypto.randomUUID().slice(0, 8)}`,
    plaid_item_id:    `item_${crypto.randomUUID().slice(0, 8)}`,
    last_synced_at:   new Date().toISOString(),
    is_active:        true,
    created_at:       new Date().toISOString(),
  };
  saveAccounts([...loadAccounts(), acct]);
  return acct;
}

export function removeAccount(id: string) {
  saveAccounts(loadAccounts().filter(a => a.id !== id));
}

/** Map Plaid category arrays → our internal ExpenseCategory. */
export function categorizeFromPlaid(plaidCategory?: string[]): ExpenseCategory {
  if (!plaidCategory?.length) return "Other";
  const path = plaidCategory.join(" ").toLowerCase();
  if (path.includes("rent") || path.includes("mortgage") || path.includes("housing")) return "Housing";
  if (path.includes("food") || path.includes("restaurant") || path.includes("grocer")) return "Food";
  if (path.includes("gas") || path.includes("fuel")) return "Gas";
  if (path.includes("transport") || path.includes("uber") || path.includes("lyft")) return "Transportation";
  if (path.includes("insurance")) return "Insurance";
  if (path.includes("loan") || path.includes("debt") || path.includes("credit card payment")) return "Debt";
  if (path.includes("subscription") || path.includes("streaming")) return "Subscriptions";
  if (path.includes("entertainment") || path.includes("movie")) return "Entertainment";
  if (path.includes("shop") || path.includes("merchandise")) return "Shopping";
  if (path.includes("transfer") || path.includes("savings") || path.includes("deposit")) return "Savings";
  if (path.includes("fee") || path.includes("overdraft")) return "Fees";
  return "Other";
}

export interface ApplyResult {
  added: number;
  skipped: number;
  savingsDeposits: { goalId: string; amount: number }[];
}

/** Apply a batch of Plaid transactions: dedupe → categorize → addExpense.
 *  Returns counts and any savings deposits routed to linked goals. */
export function applyPlaidTransactions(
  txns: PlaidTxn[],
  accounts: BankAccount[],
  goals: SavingsGoal[] & { linked_bank_account_id?: string }[],
  addExpense: (e: Omit<Expense, "id">) => void,
  bumpGoal: (goalId: string, amount: number) => void,
): ApplyResult {
  const seen = loadSeen();
  const result: ApplyResult = { added: 0, skipped: 0, savingsDeposits: [] };

  for (const t of txns) {
    if (seen[t.plaid_transaction_id]) { result.skipped++; continue; }
    const acct = accounts.find(a => a.plaid_account_id === t.account_id);
    const isInflow = t.amount < 0; // Plaid: positive = money out
    const amount   = Math.abs(t.amount);
    const category = categorizeFromPlaid(t.category);

    // Outflows tracked as expenses. Inflows skipped unless they're savings deposits.
    if (!isInflow) {
      addExpense({
        date: t.date,
        amount,
        description: t.name,
        merchant: t.name,
        category,
      });
      result.added++;
      fireEvent("transaction.added", { source: "plaid", account: acct?.account_name, amount, name: t.name });
    } else if (acct?.account_subtype === "savings") {
      // Inflow into a savings account → bump linked goal if any.
      const goal = (goals as any[]).find(g => g.linked_bank_account_id === acct.id);
      if (goal) {
        bumpGoal(goal.id, amount);
        result.savingsDeposits.push({ goalId: goal.id, amount });
      }
    }
    seen[t.plaid_transaction_id] = true;
  }

  saveSeen(seen);
  return result;
}

/** Simulate a Plaid /transactions/sync call. Returns 0–3 fake new transactions. */
export function fetchDemoTransactions(account: BankAccount): PlaidTxn[] {
  const today = new Date().toISOString().slice(0, 10);
  const samples: Omit<PlaidTxn, "plaid_transaction_id" | "account_id" | "date">[] = [
    { amount: 12.40, name: "Starbucks",  category: ["Food and Drink", "Coffee Shop"] },
    { amount: 48.10, name: "Shell",      category: ["Travel", "Gas"] },
    { amount: 22.00, name: "Netflix",    category: ["Service", "Subscription"] },
    { amount: -250,  name: "Transfer to Savings", category: ["Transfer", "Deposit"] },
    { amount: 9.99,  name: "Spotify",    category: ["Service", "Subscription"] },
  ];
  const count = Math.floor(Math.random() * 3) + 1;
  return samples.slice(0, count).map(s => ({
    ...s,
    plaid_transaction_id: `demo_tx_${crypto.randomUUID()}`,
    account_id: account.plaid_account_id || account.id,
    date: today,
  }));
}

/** Re-sync one account's balance + recent transactions. */
export function syncAccount(account: BankAccount): { account: BankAccount; txns: PlaidTxn[] } {
  const txns = account.account_subtype === "savings"
    ? fetchDemoTransactions(account).filter(t => t.amount < 0) // savings: inflows only
    : fetchDemoTransactions(account);

  // Update balance from net of new transactions (demo arithmetic).
  const net = txns.reduce((sum, t) => sum + t.amount, 0);
  const updated: BankAccount = {
    ...account,
    current_balance: Math.max(0, +(account.current_balance - net).toFixed(2)),
    available_balance: Math.max(0, +(account.available_balance - net).toFixed(2)),
    last_synced_at: new Date().toISOString(),
  };

  const all = loadAccounts().map(a => a.id === account.id ? updated : a);
  saveAccounts(all);
  return { account: updated, txns };
}
