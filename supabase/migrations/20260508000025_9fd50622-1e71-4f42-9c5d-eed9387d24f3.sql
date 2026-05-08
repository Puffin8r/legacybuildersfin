-- =========================================================
-- Shared utilities
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- profiles (extends auth.users — never reference auth.users directly elsewhere)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  starting_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Generic helper to create owner-only RLS for any table
-- (we just inline policies per table for clarity)
-- =========================================================

-- =========================================================
-- paychecks
-- =========================================================
CREATE TABLE public.paychecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  pay_date DATE NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'biweekly', -- once|weekly|biweekly|monthly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.paychecks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own paychecks select" ON public.paychecks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own paychecks insert" ON public.paychecks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own paychecks update" ON public.paychecks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own paychecks delete" ON public.paychecks FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_paychecks_user_date ON public.paychecks(user_id, pay_date);
CREATE TRIGGER paychecks_updated_at BEFORE UPDATE ON public.paychecks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- bills
-- =========================================================
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  due_date DATE NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid|paid|skipped
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bills select" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bills insert" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bills update" ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own bills delete" ON public.bills FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_bills_user_due ON public.bills(user_id, due_date);
CREATE TRIGGER bills_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- transactions
-- =========================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  merchant TEXT,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tx insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tx update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own tx delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_tx_user_category ON public.transactions(user_id, category);
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- debts
-- =========================================================
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  minimum_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own debts select" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own debts insert" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own debts update" ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own debts delete" ON public.debts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_debts_user ON public.debts(user_id);
CREATE TRIGGER debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- savings_goals
-- =========================================================
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_saved NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals select" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own goals insert" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own goals update" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own goals delete" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_goals_user ON public.savings_goals(user_id);
CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- integrations
-- =========================================================
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- n8n|gohighlevel|google_calendar|plaid|github
  webhook_url TEXT,
  connected_status TEXT NOT NULL DEFAULT 'disconnected', -- connected|disconnected|error
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type)
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations select" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own integrations insert" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own integrations update" ON public.integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own integrations delete" ON public.integrations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- appointments
-- =========================================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested', -- requested|confirmed|completed|cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appts select" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own appts insert" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own appts update" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own appts delete" ON public.appointments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_appts_user_date ON public.appointments(user_id, preferred_date);
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- financial_blueprints
-- =========================================================
CREATE TABLE public.financial_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annual_expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
  fin_number NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_investments NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_return NUMERIC(6,3) NOT NULL DEFAULT 8,
  retirement_age INT NOT NULL DEFAULT 65,
  projected_retirement_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blueprints select" ON public.financial_blueprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own blueprints insert" ON public.financial_blueprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own blueprints update" ON public.financial_blueprints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own blueprints delete" ON public.financial_blueprints FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_blueprints_user ON public.financial_blueprints(user_id);
CREATE TRIGGER financial_blueprints_updated_at BEFORE UPDATE ON public.financial_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();