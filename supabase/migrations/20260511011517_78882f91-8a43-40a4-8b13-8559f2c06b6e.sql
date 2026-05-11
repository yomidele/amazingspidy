
-- Fix search_path so crypt() (in extensions schema) is reachable
CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text, _duration_minutes integer DEFAULT 10, _user_agent text DEFAULT NULL::text, _ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  IF v_cfg.pin_hash = extensions.crypt(_pin, v_cfg.pin_hash) THEN
    UPDATE public.admin_security_config
       SET failed_attempts = 0, locked_until = NULL, updated_at = now()
     WHERE id = v_cfg.id;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
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
$function$;

CREATE OR REPLACE FUNCTION public.reset_admin_pin(_new_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _new_pin IS NULL OR length(_new_pin) < 4 OR _new_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN must be at least 4 digits';
  END IF;
  UPDATE public.admin_security_config
    SET pin_hash = extensions.crypt(_new_pin, extensions.gen_salt('bf', 10)),
        failed_attempts = 0,
        locked_until = NULL,
        updated_by = v_uid,
        updated_at = now();
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (v_uid, 'secure_pin_reset', 'Admin security PIN was reset', 'admin_security', v_uid);
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Re-set the PIN to 0615 to ensure the stored hash was generated with the now-resolvable crypt()
UPDATE public.admin_security_config
   SET pin_hash = extensions.crypt('0615', extensions.gen_salt('bf', 10)),
       failed_attempts = 0,
       locked_until = NULL,
       updated_at = now();
