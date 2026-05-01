
-- ============================================================
-- 1. Schema additions
-- ============================================================

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS investor_id uuid;

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS investor_id uuid;

-- ============================================================
-- 2. Migrate existing records to new status vocabulary
-- ============================================================
-- Old → New mapping:
--   pending, awaiting_guarantor             → PENDING_GUARANTOR
--   pending_admin, pending_admin_review     → GUARANTOR_APPROVED
--   assigned_to_investor, partially_funded,
--   fully_funded                            → ASSIGNED_TO_INVESTOR
--   investor_rejected                       → INVESTOR_REJECTED
--   approved, active                        → LOAN_DISBURSED
--   rejected                                → GUARANTOR_REJECTED  (best-guess; rejections were rare)

UPDATE public.loan_requests SET status = 'PENDING_GUARANTOR'
  WHERE status IN ('pending', 'awaiting_guarantor');

UPDATE public.loan_requests SET status = 'GUARANTOR_APPROVED'
  WHERE status IN ('pending_admin', 'pending_admin_review');

UPDATE public.loan_requests SET status = 'ASSIGNED_TO_INVESTOR'
  WHERE status IN ('assigned_to_investor', 'partially_funded', 'fully_funded');

UPDATE public.loan_requests SET status = 'INVESTOR_REJECTED'
  WHERE status = 'investor_rejected';

UPDATE public.loan_requests SET status = 'LOAN_DISBURSED'
  WHERE status IN ('approved', 'active');

UPDATE public.loan_requests SET status = 'GUARANTOR_REJECTED'
  WHERE status = 'rejected';

-- Backfill loans.investor_id from existing accepted assignments (single-investor takes first)
UPDATE public.loans l
   SET investor_id = sub.investor_id
  FROM (
    SELECT DISTINCT ON (ld.loan_id) ld.loan_id, ld.investor_id
    FROM public.loan_disbursements ld
    ORDER BY ld.loan_id, ld.disbursed_at ASC
  ) sub
 WHERE sub.loan_id = l.id AND l.investor_id IS NULL;

-- ============================================================
-- 3. Drop the old multi-investor sync trigger
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_loan_request_status ON public.loan_assignments;

-- ============================================================
-- 4. Central state-machine RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_loan_status(
  _loan_request_id uuid,
  _new_status text,
  _actor_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.loan_requests%ROWTYPE;
  v_legal boolean := false;
  v_borrower_name text;
  v_actor_name text;
  v_admin_id uuid;
BEGIN
  SELECT * INTO v_req FROM public.loan_requests WHERE id = _loan_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan request not found';
  END IF;

  -- Lock: cannot transition out of terminal states
  IF v_req.status IN ('LOAN_DISBURSED', 'GUARANTOR_REJECTED') THEN
    RAISE EXCEPTION 'Loan is in terminal state % and cannot change', v_req.status;
  END IF;

  -- Define legal transitions
  v_legal := CASE
    WHEN v_req.status = 'PENDING_GUARANTOR'    AND _new_status IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED') THEN true
    WHEN v_req.status = 'GUARANTOR_APPROVED'   AND _new_status IN ('ASSIGNED_TO_INVESTOR','GUARANTOR_REJECTED') THEN true
    WHEN v_req.status = 'ASSIGNED_TO_INVESTOR' AND _new_status IN ('INVESTOR_APPROVED','INVESTOR_REJECTED') THEN true
    WHEN v_req.status = 'INVESTOR_APPROVED'    AND _new_status = 'LOAN_DISBURSED' THEN true
    WHEN v_req.status = 'INVESTOR_REJECTED'    AND _new_status = 'GUARANTOR_APPROVED' THEN true  -- admin reassign
    ELSE false
  END;

  IF NOT v_legal THEN
    RAISE EXCEPTION 'Illegal transition: % → %', v_req.status, _new_status;
  END IF;

  UPDATE public.loan_requests
     SET status = _new_status,
         admin_notes = COALESCE(_note, admin_notes),
         updated_at = now()
   WHERE id = _loan_request_id;

  -- Lookup names
  SELECT full_name INTO v_borrower_name FROM public.profiles WHERE user_id = v_req.borrower_id;
  IF _actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = _actor_id;
  END IF;

  -- Activity log
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (
    _actor_id,
    'loan_status_' || lower(_new_status),
    'Loan for ' || COALESCE(v_borrower_name, 'member') || ' (£' || v_req.amount::text || ') → ' || _new_status
      || COALESCE(' • ' || _note, ''),
    'loan_request',
    _loan_request_id
  );

  -- Notifications by transition target
  IF _new_status = 'GUARANTOR_APPROVED' THEN
    -- Notify all admins
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'Loan ready for review',
      'Guarantor approved a £' || v_req.amount::text || ' loan for ' || COALESCE(v_borrower_name,'a member') || '. Assign an investor.',
      'info', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';

  ELSIF _new_status = 'GUARANTOR_REJECTED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.borrower_id, 'Loan declined by guarantor',
      'Your loan request of £' || v_req.amount::text || ' was declined by your guarantor.' || COALESCE(' Reason: ' || _note, ''),
      'error', '/dashboard/contributor');

  ELSIF _new_status = 'ASSIGNED_TO_INVESTOR' THEN
    -- Investor will be notified by the assignment trigger separately

  ELSIF _new_status = 'INVESTOR_APPROVED' THEN
    -- The investor-approval trigger handles disbursement & notifications

  ELSIF _new_status = 'INVESTOR_REJECTED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'Investor rejected loan',
      COALESCE(v_actor_name,'An investor') || ' rejected funding £' || v_req.amount::text || ' for ' || COALESCE(v_borrower_name,'a member') || '. Please reassign.',
      'warning', '/admin'
    FROM public.user_roles ur WHERE ur.role = 'admin';

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.borrower_id, 'Funding declined — admin reassigning',
      'The assigned investor declined to fund your £' || v_req.amount::text || ' loan. Admin will reassign shortly.',
      'warning', '/dashboard/contributor');

  ELSIF _new_status = 'LOAN_DISBURSED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.borrower_id, 'Loan disbursed ✅',
      'Your loan of £' || v_req.amount::text || ' has been disbursed and is now active.',
      'success', '/dashboard/contributor');
  END IF;

  RETURN jsonb_build_object('success', true, 'old_status', v_req.status, 'new_status', _new_status);
END;
$$;

-- ============================================================
-- 5. Trigger: when admin inserts a single loan_assignment, notify investor
--    and ensure loan_request moves to ASSIGNED_TO_INVESTOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_loan_assignment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.loan_requests%ROWTYPE;
  v_borrower_name text;
BEGIN
  SELECT * INTO v_req FROM public.loan_requests WHERE id = NEW.loan_request_id;

  -- Move state if not already there
  IF v_req.status = 'GUARANTOR_APPROVED' OR v_req.status = 'INVESTOR_REJECTED' THEN
    UPDATE public.loan_requests
       SET status = 'ASSIGNED_TO_INVESTOR',
           investor_id = NEW.investor_id,
           updated_at = now()
     WHERE id = NEW.loan_request_id;
  END IF;

  SELECT full_name INTO v_borrower_name FROM public.profiles WHERE user_id = v_req.borrower_id;

  -- Notify investor
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.investor_id,
    'New loan funding request',
    'You have been asked to fund a £' || NEW.assignment_share::text || ' loan for ' || COALESCE(v_borrower_name,'a member') || '. Review and approve.',
    'info',
    '/dashboard/investor'
  );

  -- Audit
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (
    NEW.assigned_by,
    'loan_assigned_to_investor',
    'Admin assigned £' || NEW.assignment_share::text || ' loan for ' || COALESCE(v_borrower_name,'member') || ' to investor.',
    'loan_request',
    NEW.loan_request_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_loan_assignment_insert ON public.loan_assignments;
CREATE TRIGGER trg_on_loan_assignment_insert
  AFTER INSERT ON public.loan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_loan_assignment_insert();

-- ============================================================
-- 6. Trigger: when investor accepts → auto-disburse
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_loan_assignment_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.loan_requests%ROWTYPE;
  v_avail numeric;
  v_loan_id uuid;
  v_monthly numeric;
  v_borrower_name text;
  v_investor_name text;
  i integer;
  v_due_date date;
  v_amount_due numeric;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_req FROM public.loan_requests WHERE id = NEW.loan_request_id FOR UPDATE;
  IF v_req.status NOT IN ('ASSIGNED_TO_INVESTOR') THEN
    RAISE EXCEPTION 'Loan not in ASSIGNED_TO_INVESTOR state (current: %)', v_req.status;
  END IF;

  -- Hard check available balance
  v_avail := public.investor_available_balance(NEW.investor_id);
  IF v_avail < NEW.assignment_share THEN
    RAISE EXCEPTION 'Insufficient available balance: £% available, £% required', v_avail, NEW.assignment_share;
  END IF;

  SELECT full_name INTO v_borrower_name FROM public.profiles WHERE user_id = v_req.borrower_id;
  SELECT full_name INTO v_investor_name FROM public.profiles WHERE user_id = NEW.investor_id;

  -- Mark request INVESTOR_APPROVED then immediately LOAN_DISBURSED
  UPDATE public.loan_requests
     SET status = 'INVESTOR_APPROVED', investor_id = NEW.investor_id, updated_at = now()
   WHERE id = NEW.loan_request_id;

  -- Create loan
  v_monthly := ceil(v_req.amount / v_req.duration_months * 100) / 100;
  INSERT INTO public.loans (user_id, group_id, principal_amount, outstanding_balance,
                            monthly_repayment, status, issued_date, investor_id)
  VALUES (v_req.borrower_id, v_req.group_id, v_req.amount, v_req.amount,
          v_monthly, 'active', now(), NEW.investor_id)
  RETURNING id INTO v_loan_id;

  -- Disbursement ledger entry (deducts available balance)
  INSERT INTO public.loan_disbursements (loan_id, loan_request_id, investor_id, amount)
  VALUES (v_loan_id, NEW.loan_request_id, NEW.investor_id, NEW.assignment_share);

  -- Repayment schedule
  FOR i IN 1..v_req.duration_months LOOP
    v_due_date := (date_trunc('month', now()) + (i || ' month')::interval)::date;
    v_amount_due := CASE WHEN i = v_req.duration_months
                         THEN v_req.amount - v_monthly * (v_req.duration_months - 1)
                         ELSE v_monthly END;
    INSERT INTO public.loan_repayments (loan_id, amount, amount_due, due_date, repayment_type, notes)
    VALUES (v_loan_id, 0, v_amount_due, v_due_date, 'manual',
            'Installment ' || i || ' of ' || v_req.duration_months);
  END LOOP;

  -- Final state
  UPDATE public.loan_requests SET status = 'LOAN_DISBURSED', updated_at = now()
   WHERE id = NEW.loan_request_id;

  -- Notifications
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES
    (v_req.borrower_id, 'Loan approved & funded ✅',
      COALESCE(v_investor_name,'An investor') || ' funded your £' || v_req.amount::text || ' loan. It is now active.',
      'success', '/dashboard/contributor');

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'Loan successfully funded',
    COALESCE(v_investor_name,'Investor') || ' funded £' || v_req.amount::text || ' loan for ' || COALESCE(v_borrower_name,'a member') || '.',
    'success', '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  -- Audit
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (NEW.investor_id, 'loan_disbursed',
    COALESCE(v_investor_name,'Investor') || ' approved and funded £' || v_req.amount::text || ' loan for ' || COALESCE(v_borrower_name,'member') || '.',
    'loan', v_loan_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_loan_assignment_accepted ON public.loan_assignments;
CREATE TRIGGER trg_on_loan_assignment_accepted
  AFTER UPDATE ON public.loan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_loan_assignment_accepted();

-- ============================================================
-- 7. Trigger: when investor rejects → move request to INVESTOR_REJECTED
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_loan_assignment_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    PERFORM public.update_loan_status(NEW.loan_request_id, 'INVESTOR_REJECTED', NEW.investor_id, NEW.response_note);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_loan_assignment_rejected ON public.loan_assignments;
CREATE TRIGGER trg_on_loan_assignment_rejected
  AFTER UPDATE ON public.loan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_loan_assignment_rejected();
