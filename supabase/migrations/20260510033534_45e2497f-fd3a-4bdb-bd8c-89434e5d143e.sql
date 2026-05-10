
-- 1. Add override fields
ALTER TABLE public.monthly_contributions
  ADD COLUMN IF NOT EXISTS expected_total_override numeric,
  ADD COLUMN IF NOT EXISTS expected_override_set_by uuid,
  ADD COLUMN IF NOT EXISTS expected_override_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_override_note text;

-- 2. Recalc respects override when present
CREATE OR REPLACE FUNCTION public.recalc_monthly_totals(_group_id uuid, _month integer, _year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_default numeric;
  v_expected numeric := 0;
  v_collected numeric := 0;
  v_override numeric;
BEGIN
  SELECT contribution_amount INTO v_default
    FROM public.contribution_groups WHERE id = _group_id;

  SELECT expected_total_override INTO v_override
    FROM public.monthly_contributions
    WHERE group_id = _group_id AND month = _month AND year = _year;

  IF v_override IS NOT NULL THEN
    v_expected := v_override;
  ELSE
    SELECT COALESCE(SUM(
      COALESCE(
        (SELECT cs.split_amount
           FROM public.contribution_splits cs
          WHERE cs.group_id = _group_id
            AND cs.month = _month
            AND cs.year = _year
            AND cs.user_id = gm.user_id
          LIMIT 1),
        v_default
      )
    ), 0)
    INTO v_expected
    FROM public.group_memberships gm
    WHERE gm.group_id = _group_id AND gm.is_active = true;
  END IF;

  SELECT COALESCE(SUM(cp.amount), 0) INTO v_collected
  FROM public.contribution_payments cp
  JOIN public.monthly_contributions mc ON mc.id = cp.monthly_contribution_id
  WHERE mc.group_id = _group_id
    AND mc.month = _month
    AND mc.year = _year
    AND cp.status = 'paid';

  UPDATE public.monthly_contributions
     SET total_expected = v_expected,
         total_collected = v_collected,
         updated_at = now()
   WHERE group_id = _group_id AND month = _month AND year = _year;
END;
$$;

-- 3. RPC to set/clear override with permission check
CREATE OR REPLACE FUNCTION public.set_monthly_expected_total(
  _group_id uuid,
  _month integer,
  _year integer,
  _amount numeric,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_admin(v_uid) THEN
    v_allowed := true;
  ELSIF public.group_admin_group_id(v_uid) = _group_id THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to edit this group';
  END IF;

  IF _amount IS NOT NULL AND _amount < 0 THEN
    RAISE EXCEPTION 'Amount must be zero or positive';
  END IF;

  -- Ensure row exists
  INSERT INTO public.monthly_contributions (group_id, month, year, total_expected, total_collected)
    VALUES (_group_id, _month, _year, 0, 0)
    ON CONFLICT DO NOTHING;

  UPDATE public.monthly_contributions
    SET expected_total_override = _amount,
        expected_override_set_by = CASE WHEN _amount IS NULL THEN NULL ELSE v_uid END,
        expected_override_set_at = CASE WHEN _amount IS NULL THEN NULL ELSE now() END,
        expected_override_note = CASE WHEN _amount IS NULL THEN NULL ELSE _note END
    WHERE group_id = _group_id AND month = _month AND year = _year;

  PERFORM public.recalc_monthly_totals(_group_id, _month, _year);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_monthly_expected_total(uuid, integer, integer, numeric, text) TO authenticated;
