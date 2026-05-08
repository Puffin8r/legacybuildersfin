
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  institution_name text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  account_subtype text,
  current_balance numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  plaid_account_id text,
  plaid_item_id text,
  plaid_access_token text,
  last_synced_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bank_accounts select" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bank_accounts insert" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bank_accounts update" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own bank_accounts delete" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE UNIQUE INDEX idx_bank_accounts_plaid ON public.bank_accounts(user_id, plaid_account_id) WHERE plaid_account_id IS NOT NULL;

ALTER TABLE public.savings_goals
  ADD COLUMN linked_bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN plaid_transaction_id text;

CREATE UNIQUE INDEX idx_tx_plaid ON public.transactions(user_id, plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
