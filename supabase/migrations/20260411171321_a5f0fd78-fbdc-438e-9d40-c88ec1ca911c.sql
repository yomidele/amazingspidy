
-- Create SECURITY DEFINER function to check if user is a guarantor for a loan request
CREATE OR REPLACE FUNCTION public.is_guarantor_for_request(_user_id uuid, _loan_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loan_guarantors
    WHERE guarantor_id = _user_id AND loan_request_id = _loan_request_id
  )
$$;

-- Create SECURITY DEFINER function to check if user is borrower of a loan request
CREATE OR REPLACE FUNCTION public.is_loan_borrower(_user_id uuid, _loan_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE borrower_id = _user_id AND id = _loan_request_id
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Guarantors can view related requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Borrowers can insert guarantor records" ON public.loan_guarantors;
DROP POLICY IF EXISTS "Borrowers can view guarantors for their requests" ON public.loan_guarantors;

-- Recreate policies using SECURITY DEFINER functions (no cross-table RLS evaluation)
CREATE POLICY "Guarantors can view related requests"
ON public.loan_requests
FOR SELECT
TO authenticated
USING (is_guarantor_for_request(auth.uid(), id));

CREATE POLICY "Borrowers can insert guarantor records"
ON public.loan_guarantors
FOR INSERT
TO authenticated
WITH CHECK (is_loan_borrower(auth.uid(), loan_request_id));

CREATE POLICY "Borrowers can view guarantors for their requests"
ON public.loan_guarantors
FOR SELECT
TO authenticated
USING (is_loan_borrower(auth.uid(), loan_request_id));
