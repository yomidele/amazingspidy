
-- Update notification links so admins jump straight to the loan request
CREATE OR REPLACE FUNCTION public.update_loan_status(_loan_request_id uuid, _new_status text, _actor_id uuid DEFAULT NULL::uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.loan_requests%ROWTYPE;
  v_legal boolean := false;
  v_borrower_name text;
  v_actor_name text;
  v_admin_link text;
BEGIN
  SELECT * INTO v_req FROM public.loan_requests WHERE id = _loan_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan request not found';
  END IF;

  IF v_req.status IN ('LOAN_DISBURSED', 'GUARANTOR_REJECTED') THEN
    RAISE EXCEPTION 'Loan is in terminal state % and cannot change', v_req.status;
  END IF;

  v_legal := CASE
    WHEN v_req.status = 'PENDING_GUARANTOR'    AND _new_status IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED') THEN true
    WHEN v_req.status = 'GUARANTOR_APPROVED'   AND _new_status IN ('ASSIGNED_TO_INVESTOR','GUARANTOR_REJECTED') THEN true
    WHEN v_req.status = 'ASSIGNED_TO_INVESTOR' AND _new_status IN ('INVESTOR_APPROVED','INVESTOR_REJECTED') THEN true
    WHEN v_req.status = 'INVESTOR_APPROVED'    AND _new_status = 'LOAN_DISBURSED' THEN true
    WHEN v_req.status = 'INVESTOR_REJECTED'    AND _new_status = 'GUARANTOR_APPROVED' THEN true
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

  SELECT full_name INTO v_borrower_name FROM public.profiles WHERE user_id = v_req.borrower_id;
  IF _actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = _actor_id;
  END IF;

  v_admin_link := '/admin/loan-requests/' || _loan_request_id::text;

  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (
    _actor_id,
    'loan_status_' || lower(_new_status),
    'Loan for ' || COALESCE(v_borrower_name, 'member') || ' (£' || v_req.amount::text || ') → ' || _new_status
      || COALESCE(' • ' || _note, ''),
    'loan_request',
    _loan_request_id
  );

  IF _new_status = 'GUARANTOR_APPROVED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'Loan ready for review',
      'Guarantor approved a £' || v_req.amount::text || ' loan for ' || COALESCE(v_borrower_name,'a member') || '. Tap to open the request.',
      'info', v_admin_link
    FROM public.user_roles ur WHERE ur.role = 'admin';

  ELSIF _new_status = 'GUARANTOR_REJECTED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.borrower_id, 'Loan declined by guarantor',
      'Your loan request of £' || v_req.amount::text || ' was declined by your guarantor.' || COALESCE(' Reason: ' || _note, ''),
      'error', '/dashboard/contributor');

  ELSIF _new_status = 'INVESTOR_REJECTED' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'Investor rejected loan',
      COALESCE(v_actor_name,'An investor') || ' rejected funding £' || v_req.amount::text || ' for ' || COALESCE(v_borrower_name,'a member') || '. Tap to reassign.',
      'warning', v_admin_link
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
$function$;

-- Also ensure the borrower → loan request notification triggered on INSERT goes to admin direct link.
-- (Find or create the trigger that fires on PENDING_GUARANTOR insert; otherwise add a generic notify trigger.)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_loan_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_borrower_name text;
BEGIN
  SELECT full_name INTO v_borrower_name FROM public.profiles WHERE user_id = NEW.borrower_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
         'New loan request',
         COALESCE(v_borrower_name,'A member') || ' submitted a £' || NEW.amount::text || ' loan request. Tap to review.',
         'info',
         '/admin/loan-requests/' || NEW.id::text
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_loan_request ON public.loan_requests;
CREATE TRIGGER trg_notify_admins_on_new_loan_request
AFTER INSERT ON public.loan_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_loan_request();
