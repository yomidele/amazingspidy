
CREATE OR REPLACE FUNCTION public.notify_personalized_contribution(_group_id uuid, _month int, _year int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group_name text;
  v_default numeric;
  v_beneficiary_name text;
  v_beneficiary_id uuid;
  v_month_label text := TO_CHAR(make_date(_year, _month, 1), 'FMMonth YYYY');
  v_deadline date := (date_trunc('month', make_date(_year, _month, 1)) + interval '1 month - 1 day')::date;
  m RECORD;
  v_amount numeric;
  v_msg text;
BEGIN
  SELECT name, contribution_amount INTO v_group_name, v_default
    FROM public.contribution_groups WHERE id = _group_id;

  SELECT beneficiary_user_id INTO v_beneficiary_id
    FROM public.monthly_contributions
    WHERE group_id = _group_id AND month = _month AND year = _year;

  IF v_beneficiary_id IS NOT NULL THEN
    SELECT full_name INTO v_beneficiary_name FROM public.profiles WHERE user_id = v_beneficiary_id;
  END IF;

  FOR m IN
    SELECT gm.user_id FROM public.group_memberships gm
    WHERE gm.group_id = _group_id AND gm.is_active = true
  LOOP
    v_amount := COALESCE(
      (SELECT split_amount FROM public.contribution_splits
        WHERE group_id = _group_id AND month = _month AND year = _year AND user_id = m.user_id LIMIT 1),
      v_default
    );
    v_msg := 'You are to contribute this month to ' || COALESCE(v_beneficiary_name, 'the beneficiary') ||
             '. Your expected contribution: £' || v_amount::text ||
             '. Deadline: ' || TO_CHAR(v_deadline, 'DD Mon YYYY') || '.';
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (m.user_id, 'New contribution cycle: ' || v_month_label, v_msg, 'info', '/dashboard/contributor');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_group_month(_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group public.contribution_groups%ROWTYPE;
  v_next integer;
  v_today date := CURRENT_DATE;
  v_year integer;
  v_month integer;
  v_mc_id uuid;
  v_member_count integer;
  v_next_beneficiary uuid;
  v_existing_beneficiary uuid;
BEGIN
  SELECT * INTO v_group FROM public.contribution_groups WHERE id = _group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found'; END IF;

  v_next := COALESCE(v_group.current_month, 0) + 1;
  IF v_next > v_group.total_months THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Cycle complete', 'current_month', v_group.current_month);
  END IF;

  IF v_group.progression_mode = 'auto'
     AND v_group.last_progressed_at IS NOT NULL
     AND date_trunc('month', v_group.last_progressed_at) = date_trunc('month', now()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already progressed this month');
  END IF;

  v_year  := EXTRACT(YEAR  FROM v_today)::int;
  v_month := EXTRACT(MONTH FROM v_today)::int;

  -- Lock all earlier periods for this group
  UPDATE public.monthly_contributions
     SET is_finalized = true, updated_at = now()
   WHERE group_id = _group_id
     AND is_finalized = false
     AND (year < v_year OR (year = v_year AND month < v_month));

  UPDATE public.contribution_groups
     SET current_month = v_next,
         last_progressed_at = now(),
         rotation_start_date = COALESCE(rotation_start_date, v_today)
   WHERE id = _group_id;

  SELECT id, beneficiary_user_id INTO v_mc_id, v_existing_beneficiary
    FROM public.monthly_contributions
   WHERE group_id = _group_id AND month = v_month AND year = v_year;

  IF v_mc_id IS NULL THEN
    SELECT COUNT(*) INTO v_member_count
      FROM public.group_memberships
     WHERE group_id = _group_id AND is_active = true;

    INSERT INTO public.monthly_contributions
      (group_id, month, year, total_expected, total_collected, is_finalized)
    VALUES
      (_group_id, v_month, v_year, v_member_count * v_group.contribution_amount, 0, false)
    RETURNING id INTO v_mc_id;
  END IF;

  -- Auto-assign next beneficiary if none set yet
  IF v_existing_beneficiary IS NULL THEN
    SELECT gm.user_id INTO v_next_beneficiary
      FROM public.group_memberships gm
     WHERE gm.group_id = _group_id AND gm.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM public.monthly_contributions mc
          WHERE mc.group_id = _group_id
            AND mc.beneficiary_user_id = gm.user_id
            AND NOT (mc.month = v_month AND mc.year = v_year)
       )
     ORDER BY gm.joined_at ASC
     LIMIT 1;

    IF v_next_beneficiary IS NULL THEN
      SELECT gm.user_id INTO v_next_beneficiary
        FROM public.group_memberships gm
       WHERE gm.group_id = _group_id AND gm.is_active = true
       ORDER BY gm.joined_at ASC
       LIMIT 1;
    END IF;

    IF v_next_beneficiary IS NOT NULL THEN
      UPDATE public.monthly_contributions
         SET beneficiary_user_id = v_next_beneficiary, updated_at = now()
       WHERE id = v_mc_id;
    END IF;
  END IF;

  -- Personalized cycle notifications
  PERFORM public.notify_personalized_contribution(_group_id, v_month, v_year);

  INSERT INTO public.activity_logs (action, description, entity_type, entity_id)
  VALUES ('group_month_progressed',
    'Group ' || v_group.name || ' advanced to month ' || v_next || ' (' || v_group.progression_mode || ')',
    'contribution_group', _group_id);

  RETURN jsonb_build_object(
    'success', true,
    'current_month', v_next,
    'monthly_contribution_id', v_mc_id,
    'period', v_month_name_from_int(v_month) || ' ' || v_year
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_unpaid_reminders()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_year  int := EXTRACT(YEAR  FROM CURRENT_DATE)::int;
  v_day   int := EXTRACT(DAY   FROM CURRENT_DATE)::int;
  v_deadline date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  v_count int := 0;
  r RECORD;
  v_amount numeric;
BEGIN
  IF v_day NOT IN (7, 14, 21, 28) THEN
    RETURN jsonb_build_object('skipped', true, 'day', v_day);
  END IF;

  FOR r IN
    SELECT mc.group_id, mc.id AS mc_id, gm.user_id,
           cg.contribution_amount, cg.name AS group_name
      FROM public.monthly_contributions mc
      JOIN public.contribution_groups cg ON cg.id = mc.group_id
      JOIN public.group_memberships gm
        ON gm.group_id = mc.group_id AND gm.is_active = true
     WHERE mc.month = v_month AND mc.year = v_year AND mc.is_finalized = false
       AND NOT EXISTS (
         SELECT 1 FROM public.contribution_payments cp
          WHERE cp.monthly_contribution_id = mc.id
            AND cp.user_id = gm.user_id
            AND cp.status = 'paid'
       )
  LOOP
    v_amount := COALESCE(
      (SELECT split_amount FROM public.contribution_splits
        WHERE group_id = r.group_id AND month = v_month AND year = v_year AND user_id = r.user_id LIMIT 1),
      r.contribution_amount
    );
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (r.user_id, 'Contribution reminder',
      'Reminder: your £' || v_amount::text || ' contribution to ' || r.group_name ||
      ' is still outstanding. Deadline: ' || TO_CHAR(v_deadline, 'DD Mon YYYY') || '.',
      'warning', '/dashboard/contributor');
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('reminded', v_count, 'day', v_day);
END;
$$;
