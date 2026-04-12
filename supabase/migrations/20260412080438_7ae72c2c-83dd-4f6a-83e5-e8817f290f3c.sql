
-- Admin settings table for interest rate configuration
CREATE TABLE public.admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  total_interest_rate numeric NOT NULL DEFAULT 5,
  investor_share_rate numeric NOT NULL DEFAULT 3,
  admin_share_rate numeric NOT NULL DEFAULT 2,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL USING (is_admin(auth.uid()));

-- Validation trigger: investor_share + admin_share must equal total
CREATE OR REPLACE FUNCTION public.validate_interest_rates()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.investor_share_rate + NEW.admin_share_rate != NEW.total_interest_rate THEN
    RAISE EXCEPTION 'investor_share_rate (%) + admin_share_rate (%) must equal total_interest_rate (%)',
      NEW.investor_share_rate, NEW.admin_share_rate, NEW.total_interest_rate;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_interest_rates_trigger
BEFORE INSERT OR UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_interest_rates();

-- Seed default settings
INSERT INTO public.admin_settings (setting_key, total_interest_rate, investor_share_rate, admin_share_rate)
VALUES ('investment_interest', 5, 3, 2);

-- Investment transactions table
CREATE TABLE public.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  investment_id uuid REFERENCES public.investments(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'investment', 'interest', 'admin_fee'
  amount numeric NOT NULL,
  reference text,
  payout_status text NOT NULL DEFAULT 'pending', -- 'pending', 'processed'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all transactions" ON public.investment_transactions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view their own transactions" ON public.investment_transactions FOR SELECT USING (user_id = auth.uid());

-- Admin earnings table
CREATE TABLE public.admin_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'investment_interest',
  amount numeric NOT NULL,
  investment_id uuid REFERENCES public.investments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage earnings" ON public.admin_earnings FOR ALL USING (is_admin(auth.uid()));

-- Add snapshot columns to investments table
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS investor_share_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_share_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending';
