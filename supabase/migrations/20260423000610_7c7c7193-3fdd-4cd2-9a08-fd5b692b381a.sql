-- Add separate beneficiary identity + bank fields to monthly_contributions
ALTER TABLE public.monthly_contributions
  ADD COLUMN IF NOT EXISTS beneficiary_account_name text,
  ADD COLUMN IF NOT EXISTS beneficiary_sort_code text;

-- account_number is already text in schema; ensure it's text (no-op if already)
-- (skipping ALTER TYPE since types.ts already shows it as string)

-- Validation trigger for sort code format and account number format
CREATE OR REPLACE FUNCTION public.validate_beneficiary_bank()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.beneficiary_account_number IS NOT NULL
     AND NEW.beneficiary_account_number !~ '^[0-9]{6,10}$' THEN
    RAISE EXCEPTION 'Account number must be 6-10 digits';
  END IF;

  IF NEW.beneficiary_sort_code IS NOT NULL
     AND NEW.beneficiary_sort_code !~ '^[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Sort code must be in format XX-XX-XX';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_beneficiary_bank ON public.monthly_contributions;
CREATE TRIGGER trg_validate_beneficiary_bank
  BEFORE INSERT OR UPDATE ON public.monthly_contributions
  FOR EACH ROW EXECUTE FUNCTION public.validate_beneficiary_bank();