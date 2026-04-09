
CREATE TABLE public.investor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all investor payments"
ON public.investor_payments FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Investors can view their own payments"
ON public.investor_payments FOR SELECT TO authenticated
USING (investor_id = auth.uid());

CREATE INDEX idx_investor_payments_investor ON public.investor_payments(investor_id);
CREATE INDEX idx_investor_payments_investment ON public.investor_payments(investment_id);
