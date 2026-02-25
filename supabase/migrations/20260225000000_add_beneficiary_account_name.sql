-- Add a column to store beneficiary account name for monthly contributions
ALTER TABLE public.monthly_contributions
ADD COLUMN beneficiary_account_name TEXT;
