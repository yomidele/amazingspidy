
CREATE TABLE public.loan_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_request_id UUID NOT NULL REFERENCES public.loan_requests(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('borrower', 'guarantor')),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(loan_request_id, signer_role)
);

ALTER TABLE public.loan_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all signatures"
ON public.loan_signatures FOR ALL TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Borrowers can view their loan signatures"
ON public.loan_signatures FOR SELECT TO authenticated
USING (is_loan_borrower(auth.uid(), loan_request_id));

CREATE POLICY "Guarantors can view their loan signatures"
ON public.loan_signatures FOR SELECT TO authenticated
USING (is_guarantor_for_request(auth.uid(), loan_request_id));

CREATE POLICY "Borrowers can insert their own signature"
ON public.loan_signatures FOR INSERT TO authenticated
WITH CHECK (signer_id = auth.uid() AND signer_role = 'borrower' AND is_loan_borrower(auth.uid(), loan_request_id));

CREATE POLICY "Guarantors can insert their own signature"
ON public.loan_signatures FOR INSERT TO authenticated
WITH CHECK (signer_id = auth.uid() AND signer_role = 'guarantor' AND is_guarantor_for_request(auth.uid(), loan_request_id));
