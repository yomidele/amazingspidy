-- Add new columns for explicit due tracking
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS total_return NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investor_due NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_due NUMERIC NOT NULL DEFAULT 0;

-- Track which party each payment was made to
ALTER TABLE public.investor_payments
  ADD COLUMN IF NOT EXISTS party TEXT NOT NULL DEFAULT 'investor';

ALTER TABLE public.investor_payments
  DROP CONSTRAINT IF EXISTS investor_payments_party_check;
ALTER TABLE public.investor_payments
  ADD CONSTRAINT investor_payments_party_check CHECK (party IN ('investor', 'admin'));

-- Backfill existing investments
UPDATE public.investments
SET
  total_return = ROUND(amount * COALESCE(interest_rate, 0) / 100, 2),
  investor_due = ROUND(amount * COALESCE(investor_share_rate, 0) / 100, 2),
  admin_due    = ROUND(amount * COALESCE(admin_share_rate, 0) / 100, 2);

-- Trigger to keep computed dues in sync and validate rates
CREATE OR REPLACE FUNCTION public.calculate_investment_dues()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate rate split (allow tiny rounding tolerance)
  IF COALESCE(NEW.investor_share_rate, 0) + COALESCE(NEW.admin_share_rate, 0)
     <> COALESCE(NEW.interest_rate, 0) THEN
    RAISE EXCEPTION 'investor_share_rate (%) + admin_share_rate (%) must equal total interest_rate (%)',
      NEW.investor_share_rate, NEW.admin_share_rate, NEW.interest_rate;
  END IF;

  NEW.total_return := ROUND(NEW.amount * COALESCE(NEW.interest_rate, 0) / 100, 2);
  NEW.investor_due := ROUND(NEW.amount * COALESCE(NEW.investor_share_rate, 0) / 100, 2);
  NEW.admin_due    := ROUND(NEW.amount * COALESCE(NEW.admin_share_rate, 0) / 100, 2);
  NEW.updated_at   := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_investment_dues ON public.investments;
CREATE TRIGGER trg_calculate_investment_dues
  BEFORE INSERT OR UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.calculate_investment_dues();