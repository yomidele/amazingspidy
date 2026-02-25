-- add per_member_amount to monthly_contributions table
ALTER TABLE public.monthly_contributions
ADD COLUMN per_member_amount DECIMAL(10,2) DEFAULT 0;