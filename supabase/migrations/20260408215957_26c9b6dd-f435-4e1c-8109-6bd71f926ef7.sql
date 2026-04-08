
-- Add 'investor' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'investor';

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 12,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all investments"
ON public.investments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Investors can view their own
CREATE POLICY "Investors can view their own investments"
ON public.investments
FOR SELECT
TO authenticated
USING (investor_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
