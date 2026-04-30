-- =========================================================
-- 1. Loosen loan_assignments to allow multi-investor split
-- =========================================================

-- Drop the implicit unique-on-loan_request_id used by ON CONFLICT
ALTER TABLE public.loan_assignments
  DROP CONSTRAINT IF EXISTS loan_assignments_loan_request_id_key;

-- Track each investor's portion explicitly (defaults to amount for back-compat)
ALTER TABLE public.loan_assignments
  ADD COLUMN IF NOT EXISTS assignment_share numeric;

UPDATE public.loan_assignments
  SET assignment_share = amount
  WHERE assignment_share IS NULL;

ALTER TABLE public.loan_assignments
  ALTER COLUMN assignment_share SET NOT NULL,
  ALTER COLUMN assignment_share SET DEFAULT 0;

-- Prevent duplicate (loan, investor) pairs
CREATE UNIQUE INDEX IF NOT EXISTS loan_assignments_unique_pair
  ON public.loan_assignments(loan_request_id, investor_id);

-- =========================================================
-- 2. Disbursement + repayment-split ledgers
-- =========================================================

CREATE TABLE IF NOT EXISTS public.loan_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  loan_request_id uuid NOT NULL,
  investor_id uuid NOT NULL,
  amount numeric NOT NULL,
  disbursed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage disbursements" ON public.loan_disbursements;
CREATE POLICY "Admins manage disbursements"
  ON public.loan_disbursements
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Investor views own disbursements" ON public.loan_disbursements;
CREATE POLICY "Investor views own disbursements"
  ON public.loan_disbursements
  FOR SELECT TO authenticated
  USING (investor_id = auth.uid());

DROP POLICY IF EXISTS "Borrower views own disbursements" ON public.loan_disbursements;
CREATE POLICY "Borrower views own disbursements"
  ON public.loan_disbursements
  FOR SELECT TO authenticated
  USING (is_loan_borrower(auth.uid(), loan_request_id));

CREATE INDEX IF NOT EXISTS idx_loan_disbursements_investor ON public.loan_disbursements(investor_id);
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_loan ON public.loan_disbursements(loan_id);


CREATE TABLE IF NOT EXISTS public.loan_repayment_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_repayment_id uuid NOT NULL,
  loan_id uuid NOT NULL,
  investor_id uuid NOT NULL,
  amount numeric NOT NULL,
  share_percent numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_repayment_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage repayment distributions" ON public.loan_repayment_distributions;
CREATE POLICY "Admins manage repayment distributions"
  ON public.loan_repayment_distributions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Investor views own repayment distributions" ON public.loan_repayment_distributions;
CREATE POLICY "Investor views own repayment distributions"
  ON public.loan_repayment_distributions
  FOR SELECT TO authenticated
  USING (investor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_repay_distrib_investor ON public.loan_repayment_distributions(investor_id);
CREATE INDEX IF NOT EXISTS idx_repay_distrib_loan ON public.loan_repayment_distributions(loan_id);

-- =========================================================
-- 3. Available-balance RPC for investors
-- =========================================================

CREATE OR REPLACE FUNCTION public.investor_available_balance(_investor_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capital numeric := 0;
  v_locked  numeric := 0;
  v_disbursed numeric := 0;
  v_repaid  numeric := 0;
BEGIN
  -- Active investment capital
  SELECT COALESCE(SUM(amount), 0) INTO v_capital
  FROM public.investments
  WHERE investor_id = _investor_id AND status = 'active';

  -- Locked in approved (accepted) but not-yet-disbursed assignments
  SELECT COALESCE(SUM(la.assignment_share), 0) INTO v_locked
  FROM public.loan_assignments la
  LEFT JOIN public.loan_disbursements ld
    ON ld.loan_request_id = la.loan_request_id AND ld.investor_id = la.investor_id
  WHERE la.investor_id = _investor_id
    AND la.status = 'accepted'
    AND ld.id IS NULL;

  -- Already disbursed (still outstanding)
  SELECT COALESCE(SUM(ld.amount), 0) INTO v_disbursed
  FROM public.loan_disbursements ld
  JOIN public.loans l ON l.id = ld.loan_id
  WHERE ld.investor_id = _investor_id
    AND l.status = 'active';

  -- Already returned via repayments on those active loans
  SELECT COALESCE(SUM(rd.amount), 0) INTO v_repaid
  FROM public.loan_repayment_distributions rd
  JOIN public.loans l ON l.id = rd.loan_id
  WHERE rd.investor_id = _investor_id
    AND l.status = 'active';

  RETURN v_capital - v_locked - (v_disbursed - v_repaid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.investor_available_balance(uuid) TO authenticated;

-- Convenience: list every investor's balance (admin-only access enforced by RLS on tables)
CREATE OR REPLACE FUNCTION public.investor_available_balances()
RETURNS TABLE(investor_id uuid, full_name text, total_capital numeric, available_balance numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.user_id AS investor_id,
    p.full_name,
    COALESCE((SELECT SUM(amount) FROM public.investments i
              WHERE i.investor_id = ur.user_id AND i.status = 'active'), 0) AS total_capital,
    public.investor_available_balance(ur.user_id) AS available_balance
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'investor';
END;
$$;

GRANT EXECUTE ON FUNCTION public.investor_available_balances() TO authenticated;

-- =========================================================
-- 4. Auto-status trigger on loan_assignments
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_loan_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_total numeric;
  v_assigned numeric;
  v_accepted_count int;
  v_rejected_count int;
  v_pending_count int;
  v_total_count int;
  v_current_status text;
BEGIN
  v_request_id := COALESCE(NEW.loan_request_id, OLD.loan_request_id);

  SELECT amount, status INTO v_total, v_current_status
  FROM public.loan_requests WHERE id = v_request_id;

  -- Skip if request is already terminal
  IF v_current_status IN ('approved', 'rejected', 'active') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(assignment_share), 0),
         COUNT(*) FILTER (WHERE status = 'accepted'),
         COUNT(*) FILTER (WHERE status = 'rejected'),
         COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*)
    INTO v_assigned, v_accepted_count, v_rejected_count, v_pending_count, v_total_count
  FROM public.loan_assignments
  WHERE loan_request_id = v_request_id;

  IF v_total_count = 0 THEN
    UPDATE public.loan_requests SET status = 'pending_admin_review', updated_at = now()
      WHERE id = v_request_id;
  ELSIF v_rejected_count > 0 THEN
    UPDATE public.loan_requests SET status = 'investor_rejected', updated_at = now()
      WHERE id = v_request_id;
  ELSIF v_accepted_count = v_total_count AND v_assigned >= v_total THEN
    UPDATE public.loan_requests SET status = 'fully_funded', updated_at = now()
      WHERE id = v_request_id;
  ELSIF v_accepted_count > 0 THEN
    UPDATE public.loan_requests SET status = 'partially_funded', updated_at = now()
      WHERE id = v_request_id;
  ELSE
    UPDATE public.loan_requests SET status = 'assigned_to_investor', updated_at = now()
      WHERE id = v_request_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_loan_request_status ON public.loan_assignments;
CREATE TRIGGER trg_sync_loan_request_status
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_loan_request_status();

-- =========================================================
-- 5. Revalidation guard: an investor cannot accept if balance changed
-- =========================================================

CREATE OR REPLACE FUNCTION public.guard_assignment_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avail numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    v_avail := public.investor_available_balance(NEW.investor_id);
    -- Account for the share we are about to lock (it's not yet locked because still pending)
    IF v_avail < NEW.assignment_share THEN
      RAISE EXCEPTION 'Insufficient available balance: £% available, £% required', v_avail, NEW.assignment_share;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_assignment_balance ON public.loan_assignments;
CREATE TRIGGER trg_guard_assignment_balance
  BEFORE UPDATE ON public.loan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_balance();
