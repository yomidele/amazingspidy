
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared admin PIN config (single row)
CREATE TABLE IF NOT EXISTS public.admin_security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_security_config ENABLE ROW LEVEL SECURITY;

-- No direct table access — only via SECURITY DEFINER RPCs
CREATE POLICY "Admins can read config meta"
ON public.admin_security_config
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Secure sessions, one row per active session
CREATE TABLE IF NOT EXISTS public.admin_secure_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  user_agent text,
  ip text
);

CREATE INDEX IF NOT EXISTS idx_secure_sessions_admin ON public.admin_secure_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_secure_sessions_token ON public.admin_secure_sessions(token);

ALTER TABLE public.admin_secure_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own secure sessions"
ON public.admin_secure_sessions
FOR SELECT
TO authenticated
USING (admin_id = auth.uid() AND public.is_admin(auth.uid()));

-- Seed PIN = 0615 (idempotent)
INSERT INTO public.admin_security_config (pin_hash)
SELECT crypt('0615', gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM public.admin_security_config);

-- Verify PIN and create session
CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text, _duration_minutes int DEFAULT 10, _user_agent text DEFAULT NULL, _ip text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cfg public.admin_security_config%ROWTYPE;
  v_token text;
  v_expires timestamptz;
  v_dur int := COALESCE(_duration_minutes, 10);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Only super admins may access secure data';
  END IF;
  IF v_dur NOT IN (5, 10, 15) THEN v_dur := 10; END IF;

  SELECT * INTO v_cfg FROM public.admin_security_config LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Security PIN not configured'; END IF;

  IF v_cfg.locked_until IS NOT NULL AND v_cfg.locked_until > now() THEN
    INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
    VALUES (v_uid, 'secure_pin_locked', 'PIN entry blocked — temporarily locked', 'admin_security', v_uid);
    RETURN jsonb_build_object('success', false, 'locked', true, 'locked_until', v_cfg.locked_until);
  END IF;

  IF v_cfg.pin_hash = crypt(_pin, v_cfg.pin_hash) THEN
    UPDATE public.admin_security_config
       SET failed_attempts = 0, locked_until = NULL, updated_at = now()
     WHERE id = v_cfg.id;

    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires := now() + make_interval(mins => v_dur);

    INSERT INTO public.admin_secure_sessions (admin_id, token, expires_at, user_agent, ip)
    VALUES (v_uid, v_token, v_expires, _user_agent, _ip);

    INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
    VALUES (v_uid, 'secure_pin_verified',
      'Secure session opened (' || v_dur || ' min)' || COALESCE(' • ' || _user_agent, ''),
      'admin_security', v_uid);

    RETURN jsonb_build_object('success', true, 'token', v_token, 'expires_at', v_expires, 'duration_minutes', v_dur);
  ELSE
    UPDATE public.admin_security_config
       SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
           locked_until = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 5
                               THEN now() + interval '15 minutes' ELSE locked_until END,
           updated_at = now()
     WHERE id = v_cfg.id
     RETURNING * INTO v_cfg;

    INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
    VALUES (v_uid, 'secure_pin_failed',
      'Wrong PIN (' || v_cfg.failed_attempts || '/5)' || COALESCE(' • ' || _user_agent, ''),
      'admin_security', v_uid);

    RETURN jsonb_build_object('success', false,
      'failed_attempts', v_cfg.failed_attempts,
      'locked', v_cfg.locked_until IS NOT NULL AND v_cfg.locked_until > now(),
      'locked_until', v_cfg.locked_until);
  END IF;
END;
$$;

-- Validate session
CREATE OR REPLACE FUNCTION public.check_secure_session(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.admin_secure_sessions%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  SELECT * INTO v_row FROM public.admin_secure_sessions
   WHERE token = _token AND admin_id = v_uid AND revoked = false LIMIT 1;
  IF NOT FOUND OR v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  RETURN jsonb_build_object('valid', true, 'expires_at', v_row.expires_at);
END;
$$;

-- Revoke session (logout from secure mode)
CREATE OR REPLACE FUNCTION public.revoke_secure_session(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.admin_secure_sessions
    SET revoked = true
    WHERE token = _token AND admin_id = v_uid;
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (v_uid, 'secure_session_closed', 'Admin closed secure session', 'admin_security', v_uid);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Log a secure access event (called from frontend after session is verified)
CREATE OR REPLACE FUNCTION public.log_secure_access(_token text, _action text, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_check jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  v_check := public.check_secure_session(_token);
  IF NOT (v_check->>'valid')::boolean THEN
    RAISE EXCEPTION 'Secure session invalid or expired';
  END IF;
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (v_uid, 'secure_' || _action, _description, 'admin_security', v_uid);
END;
$$;

-- Aggregated secure stats (only callable with valid session)
CREATE OR REPLACE FUNCTION public.get_secure_stats(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_check jsonb;
  v_total_users int;
  v_total_groups int;
  v_total_collected numeric;
  v_total_expected numeric;
  v_total_loans numeric;
  v_outstanding_loans numeric;
  v_total_investments numeric;
  v_pending_requests int;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  v_check := public.check_secure_session(_token);
  IF NOT (v_check->>'valid')::boolean THEN
    RAISE EXCEPTION 'Secure session invalid or expired';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_groups FROM public.contribution_groups WHERE is_active = true;
  SELECT COALESCE(SUM(total_collected),0), COALESCE(SUM(total_expected),0)
    INTO v_total_collected, v_total_expected FROM public.monthly_contributions;
  SELECT COALESCE(SUM(principal_amount),0), COALESCE(SUM(outstanding_balance),0)
    INTO v_total_loans, v_outstanding_loans FROM public.loans;
  SELECT COALESCE(SUM(amount),0) INTO v_total_investments FROM public.investments WHERE status='active';
  SELECT COUNT(*) INTO v_pending_requests FROM public.loan_requests WHERE status NOT IN ('LOAN_DISBURSED','GUARANTOR_REJECTED');

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_groups', v_total_groups,
    'total_collected', v_total_collected,
    'total_expected', v_total_expected,
    'total_loans', v_total_loans,
    'outstanding_loans', v_outstanding_loans,
    'total_investments', v_total_investments,
    'pending_loan_requests', v_pending_requests
  );
END;
$$;

-- Reset PIN (admin only, also wipes failed attempts)
CREATE OR REPLACE FUNCTION public.reset_admin_pin(_new_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _new_pin IS NULL OR length(_new_pin) < 4 OR _new_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN must be at least 4 digits';
  END IF;
  UPDATE public.admin_security_config
    SET pin_hash = crypt(_new_pin, gen_salt('bf', 10)),
        failed_attempts = 0,
        locked_until = NULL,
        updated_by = v_uid,
        updated_at = now();
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (v_uid, 'secure_pin_reset', 'Admin security PIN was reset', 'admin_security', v_uid);
  RETURN jsonb_build_object('success', true);
END;
$$;
