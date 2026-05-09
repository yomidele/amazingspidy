
-- Audit table for monthly contribution amount changes
CREATE TABLE public.contribution_amount_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  old_amount numeric NOT NULL,
  new_amount numeric NOT NULL,
  applied_retroactively boolean NOT NULL DEFAULT false,
  changed_by uuid,
  changed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cah_group ON public.contribution_amount_history(group_id, created_at DESC);

ALTER TABLE public.contribution_amount_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage amount history"
  ON public.contribution_amount_history
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Group admins view their group amount history"
  ON public.contribution_amount_history
  FOR SELECT TO authenticated
  USING (group_id = public.group_admin_group_id(auth.uid()));

CREATE POLICY "Group members view amount history"
  ON public.contribution_amount_history
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- RPC: change a group's monthly contribution amount with audit + optional retroactive recalc
CREATE OR REPLACE FUNCTION public.update_group_contribution_amount(
  _group_id uuid,
  _new_amount numeric,
  _apply_retroactive boolean DEFAULT false,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group public.contribution_groups%ROWTYPE;
  v_old numeric;
  v_actor_name text;
  r RECORD;
  v_today date := CURRENT_DATE;
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _new_amount IS NULL OR _new_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive number';
  END IF;

  SELECT * INTO v_group FROM public.contribution_groups WHERE id = _group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Authorization: super admin OR group admin assigned to this group
  IF NOT (public.is_admin(v_uid) OR public.group_admin_group_id(v_uid) = _group_id) THEN
    RAISE EXCEPTION 'Not authorized to modify this group';
  END IF;

  v_old := v_group.contribution_amount;
  IF v_old = _new_amount THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true);
  END IF;

  UPDATE public.contribution_groups
     SET contribution_amount = _new_amount, updated_at = now()
   WHERE id = _group_id;

  SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = v_uid;

  INSERT INTO public.contribution_amount_history
    (group_id, old_amount, new_amount, applied_retroactively, changed_by, changed_by_name, note)
  VALUES
    (_group_id, v_old, _new_amount, COALESCE(_apply_retroactive, false), v_uid, v_actor_name, _note);

  -- Recalculate unfinalized monthly contributions
  IF COALESCE(_apply_retroactive, false) THEN
    -- All non-finalized periods for this group
    FOR r IN
      SELECT month, year FROM public.monthly_contributions
       WHERE group_id = _group_id AND is_finalized = false
    LOOP
      PERFORM public.recalc_monthly_totals(_group_id, r.month, r.year);
    END LOOP;
  ELSE
    -- Only current and future non-finalized periods
    FOR r IN
      SELECT month, year FROM public.monthly_contributions
       WHERE group_id = _group_id AND is_finalized = false
         AND (year > v_year OR (year = v_year AND month >= v_month))
    LOOP
      PERFORM public.recalc_monthly_totals(_group_id, r.month, r.year);
    END LOOP;
  END IF;

  -- Audit log
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id)
  VALUES (
    v_uid,
    'contribution_amount_changed',
    'Monthly contribution amount for ' || v_group.name || ' changed from £' || v_old || ' to £' || _new_amount
      || CASE WHEN COALESCE(_apply_retroactive,false) THEN ' (applied retroactively)' ELSE ' (future months only)' END,
    'contribution_group',
    _group_id
  );

  -- Notify all active members of the group
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT gm.user_id,
         'Monthly contribution updated',
         'The monthly contribution for ' || v_group.name || ' is now £' || _new_amount || '.',
         'info',
         '/dashboard/contributor'
    FROM public.group_memberships gm
   WHERE gm.group_id = _group_id AND gm.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'old_amount', v_old,
    'new_amount', _new_amount,
    'applied_retroactively', COALESCE(_apply_retroactive, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_group_contribution_amount(uuid, numeric, boolean, text) TO authenticated;
