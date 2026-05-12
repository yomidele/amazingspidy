
-- Helper: assert secure session is valid; raise otherwise
CREATE OR REPLACE FUNCTION public._assert_secure(_token text)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.admin_secure_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.admin_secure_sessions
   WHERE token = _token AND admin_id = v_uid AND revoked = false LIMIT 1;
  IF NOT FOUND OR v_row.expires_at <= now() THEN
    RAISE EXCEPTION 'Secure session invalid or expired' USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END;
$$;

-- Users with role, balances, joined groups
CREATE OR REPLACE FUNCTION public.get_secure_users_full(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)) FROM (
      SELECT
        p.user_id, p.membership_number, p.full_name, p.email, p.phone,
        p.account_status, p.created_at,
        (SELECT array_agg(DISTINCT r2::text) FROM public.user_roles ur, unnest(ARRAY[ur.role]) r2 WHERE ur.user_id = p.user_id) AS roles,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.user_id = p.user_id AND gm.is_active) AS active_groups,
        (SELECT COALESCE(SUM(cp.amount),0) FROM public.contribution_payments cp WHERE cp.user_id = p.user_id AND cp.status='paid') AS total_contributed,
        (SELECT COALESCE(SUM(l.outstanding_balance),0) FROM public.loans l WHERE l.user_id = p.user_id AND l.status='active') AS outstanding_loans
      FROM public.profiles p
      ORDER BY p.created_at DESC
    ) r
  ), '[]'::jsonb);
END; $$;

-- Groups with members, totals, admins
CREATE OR REPLACE FUNCTION public.get_secure_groups_full(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)) FROM (
      SELECT
        g.id, g.name, g.description, g.contribution_amount, g.current_month, g.total_months, g.is_active, g.created_at,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.group_id = g.id AND gm.is_active) AS member_count,
        (SELECT COALESCE(SUM(mc.total_expected),0) FROM public.monthly_contributions mc WHERE mc.group_id = g.id) AS total_expected,
        (SELECT COALESCE(SUM(mc.total_collected),0) FROM public.monthly_contributions mc WHERE mc.group_id = g.id) AS total_collected,
        (SELECT array_agg(p.full_name) FROM public.group_admin_assignments ga JOIN public.profiles p ON p.user_id = ga.user_id WHERE ga.group_id = g.id) AS group_admins
      FROM public.contribution_groups g
      ORDER BY g.created_at DESC
    ) r
  ), '[]'::jsonb);
END; $$;

-- Loans
CREATE OR REPLACE FUNCTION public.get_secure_loans_full(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)) FROM (
      SELECT
        lr.id, lr.amount, lr.duration_months, lr.purpose, lr.status, lr.created_at,
        bp.full_name AS borrower_name, bp.membership_number AS borrower_membership,
        ip.full_name AS investor_name,
        l.outstanding_balance, l.monthly_repayment, l.issued_date,
        (SELECT COALESCE(SUM(amount),0) FROM public.loan_repayments lr2 WHERE lr2.loan_id = l.id) AS total_repaid
      FROM public.loan_requests lr
      LEFT JOIN public.profiles bp ON bp.user_id = lr.borrower_id
      LEFT JOIN public.profiles ip ON ip.user_id = lr.investor_id
      LEFT JOIN public.loans l ON l.user_id = lr.borrower_id AND l.principal_amount = lr.amount
      ORDER BY lr.created_at DESC
    ) r
  ), '[]'::jsonb);
END; $$;

-- Investments
CREATE OR REPLACE FUNCTION public.get_secure_investments_full(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)) FROM (
      SELECT
        i.id, p.full_name AS investor_name, p.email AS investor_email,
        i.amount, i.interest_rate, i.investor_share_rate, i.admin_share_rate,
        i.total_return, i.investor_due, i.admin_due,
        i.duration_months, i.start_date, i.end_date, i.status, i.payout_status, i.created_at,
        (SELECT COALESCE(SUM(amount_paid),0) FROM public.investor_payments ip2 WHERE ip2.investment_id = i.id) AS paid_to_investor
      FROM public.investments i
      LEFT JOIN public.profiles p ON p.user_id = i.investor_id
      ORDER BY i.created_at DESC
    ) r
  ), '[]'::jsonb);
END; $$;

-- Audit logs (full)
CREATE OR REPLACE FUNCTION public.get_secure_audit_logs_full(_token text, _limit int DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)) FROM (
      SELECT
        a.id, a.action, a.description, a.entity_type, a.entity_id, a.created_at,
        a.user_id, p.full_name AS user_name
      FROM public.activity_logs a
      LEFT JOIN public.profiles p ON p.user_id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT GREATEST(1, LEAST(_limit, 1000))
    ) r
  ), '[]'::jsonb);
END; $$;

-- Log secure export events
CREATE OR REPLACE FUNCTION public.log_secure_export(_token text, _dataset text, _format text, _row_count int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid;
BEGIN
  v_uid := public._assert_secure(_token);
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (v_uid, 'secure_export',
    'Exported ' || _dataset || ' as ' || _format || ' (' || _row_count || ' rows)',
    'admin_security', v_uid);
END; $$;
