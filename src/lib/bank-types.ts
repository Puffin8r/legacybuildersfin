// Plaid-ready bank account types. Mirrors the public.bank_accounts table
// so the same shapes work in localStorage today and in Supabase tomorrow.

export type BankAccountType = "depository" | "credit" | "loan" | "investment";
export type BankAccountSubtype =
  | "checking"
  | "savings"
  | "credit card"
  | "money market"
  | "cd"
  | "auto"
  | "mortgage"
  | "other";

export interface BankAccount {
  id: string;
  institution_name: string;
  account_name: string;
  account_type: BankAccountType;
  account_subtype: BankAccountSubtype;
  current_balance: number;
  available_balance: number;
  plaid_account_id?: string;
  plaid_item_id?: string;
  last_synced_at?: string; // ISO
  is_active: boolean;
  created_at: string;
}

export interface PlaidTxn {
  plaid_transaction_id: string;
  account_id: string;          // plaid_account_id
  date: string;                // ISO yyyy-mm-dd
  amount: number;              // positive = outflow, negative = inflow (Plaid convention)
  name: string;                // merchant / description
  category?: string[];         // Plaid category path
}

export const ACCOUNT_TYPE_LABEL: Record<BankAccountSubtype, string> = {
  checking:      "Checking",
  savings:       "Savings",
  "credit card": "Credit card",
  "money market":"Money market",
  cd:            "CD",
  auto:          "Auto loan",
  mortgage:      "Mortgage",
  other:         "Other",
};
