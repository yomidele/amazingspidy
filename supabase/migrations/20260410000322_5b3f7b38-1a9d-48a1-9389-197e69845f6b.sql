
-- Create loan_requests table
CREATE TABLE public.loan_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID NOT NULL,
  group_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 6,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan_guarantors table
CREATE TABLE public.loan_guarantors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_request_id UUID NOT NULL REFERENCES public.loan_requests(id) ON DELETE CASCADE,
  guarantor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_note TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_guarantors ENABLE ROW LEVEL SECURITY;

-- RLS for loan_requests
CREATE POLICY "Admins can manage all loan requests"
  ON public.loan_requests FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Borrowers can view their own requests"
  ON public.loan_requests FOR SELECT TO authenticated
  USING (borrower_id = auth.uid());

CREATE POLICY "Borrowers can create their own requests"
  ON public.loan_requests FOR INSERT TO authenticated
  WITH CHECK (borrower_id = auth.uid());

-- Allow contributors to see requests where they are guarantor
CREATE POLICY "Guarantors can view related requests"
  ON public.loan_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loan_guarantors
    WHERE loan_guarantors.loan_request_id = loan_requests.id
    AND loan_guarantors.guarantor_id = auth.uid()
  ));

-- RLS for loan_guarantors
CREATE POLICY "Admins can manage all guarantors"
  ON public.loan_guarantors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Guarantors can view their own records"
  ON public.loan_guarantors FOR SELECT TO authenticated
  USING (guarantor_id = auth.uid());

CREATE POLICY "Guarantors can update their own records"
  ON public.loan_guarantors FOR UPDATE TO authenticated
  USING (guarantor_id = auth.uid());

CREATE POLICY "Borrowers can insert guarantor records"
  ON public.loan_guarantors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE loan_requests.id = loan_guarantors.loan_request_id
    AND loan_requests.borrower_id = auth.uid()
  ));

CREATE POLICY "Borrowers can view guarantors for their requests"
  ON public.loan_guarantors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE loan_requests.id = loan_guarantors.loan_request_id
    AND loan_requests.borrower_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_loan_requests_updated_at
  BEFORE UPDATE ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
