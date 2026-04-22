
-- 1. Extend contribution_groups with rotation/progression fields
ALTER TABLE public.contribution_groups
  ADD COLUMN IF NOT EXISTS current_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS progression_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_progressed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rotation_start_date date;

-- Constrain progression_mode values
DO $$ BEGIN
  ALTER TABLE public.contribution_groups
    ADD CONSTRAINT contribution_groups_progression_mode_check
    CHECK (progression_mode IN ('auto', 'manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. contribution_splits table
CREATE TABLE IF NOT EXISTS public.contribution_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.contribution_groups(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  user_id uuid NOT NULL,
  split_amount numeric NOT NULL CHECK (split_amount > 0),
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, month, year, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contribution_splits_slot
  ON public.contribution_splits (group_id, month, year);

ALTER TABLE public.contribution_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage splits" ON public.contribution_splits;
CREATE POLICY "Admins manage splits" ON public.contribution_splits
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Members view own splits" ON public.contribution_splits;
CREATE POLICY "Members view own splits" ON public.contribution_splits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Group members view their group splits" ON public.contribution_splits;
CREATE POLICY "Group members view their group splits" ON public.contribution_splits
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE TRIGGER contribution_splits_updated_at
  BEFORE UPDATE ON public.contribution_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Validate splits: max 2 users per slot, sum == group contribution_amount
CREATE OR REPLACE FUNCTION public.validate_contribution_split()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
  v_total numeric;
  v_group_amount numeric;
BEGIN
  SELECT contribution_amount INTO v_group_amount
  FROM public.contribution_groups WHERE id = NEW.group_id;

  SELECT COUNT(*), COALESCE(SUM(split_amount), 0)
    INTO v_count, v_total
  FROM public.contribution_splits
  WHERE group_id = NEW.group_id AND month = NEW.month AND year = NEW.year
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF TG_OP = 'INSERT' THEN
    v_count := v_count + 1;
    v_total := v_total + NEW.split_amount;
  ELSE
    v_total := v_total + NEW.split_amount;
  END IF;

  IF v_count > 2 THEN
    RAISE EXCEPTION 'A contribution slot can have at most 2 split members';
  END IF;

  IF v_total > v_group_amount THEN
    RAISE EXCEPTION 'Split total (%) exceeds group contribution amount (%)', v_total, v_group_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_contribution_split ON public.contribution_splits;
CREATE TRIGGER trg_validate_contribution_split
  BEFORE INSERT OR UPDATE ON public.contribution_splits
  FOR EACH ROW EXECUTE FUNCTION public.validate_contribution_split();

-- 4. Notify users when assigned to a split
CREATE OR REPLACE FUNCTION public.notify_split_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group_name text;
  v_month_name text;
BEGIN
  SELECT name INTO v_group_name FROM public.contribution_groups WHERE id = NEW.group_id;
  v_month_name := TO_CHAR(make_date(NEW.year, NEW.month, 1), 'FMMonth YYYY');

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'Split contribution assigned',
    'You have been assigned a £' || NEW.split_amount || ' split for ' || v_month_name ||
    ' in ' || COALESCE(v_group_name, 'your group') || '.',
    'info',
    '/dashboard/contributor'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_split_assignment ON public.contribution_splits;
CREATE TRIGGER trg_notify_split_assignment
  AFTER INSERT ON public.contribution_splits
  FOR EACH ROW EXECUTE FUNCTION public.notify_split_assignment();

-- 5. Safe month progression RPC (manual + auto callers use this)
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
BEGIN
  SELECT * INTO v_group FROM public.contribution_groups WHERE id = _group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  v_next := COALESCE(v_group.current_month, 0) + 1;

  IF v_next > v_group.total_months THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Cycle complete', 'current_month', v_group.current_month);
  END IF;

  -- Idempotency for auto mode: don't advance twice in same calendar month
  IF v_group.progression_mode = 'auto'
     AND v_group.last_progressed_at IS NOT NULL
     AND date_trunc('month', v_group.last_progressed_at) = date_trunc('month', now()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already progressed this month');
  END IF;

  -- Use today's calendar month/year as the slot the rotation now points to
  v_year := EXTRACT(YEAR FROM v_today)::int;
  v_month := EXTRACT(MONTH FROM v_today)::int;

  UPDATE public.contribution_groups
    SET current_month = v_next,
        last_progressed_at = now(),
        rotation_start_date = COALESCE(rotation_start_date, v_today)
  WHERE id = _group_id;

  -- Ensure a monthly_contributions row exists for the new active period
  SELECT id INTO v_mc_id
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

  -- Audit log
  INSERT INTO public.activity_logs (action, description, entity_type, entity_id)
  VALUES (
    'group_month_progressed',
    'Group ' || v_group.name || ' advanced to month ' || v_next || ' (mode: ' || v_group.progression_mode || ')',
    'contribution_group',
    _group_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'current_month', v_next,
    'monthly_contribution_id', v_mc_id,
    'period', v_month_name_from_int(v_month) || ' ' || v_year
  );
END;
$$;

-- Helper for month name (used above)
CREATE OR REPLACE FUNCTION public.v_month_name_from_int(_m int)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT TO_CHAR(make_date(2000, _m, 1), 'FMMonth');
$$;

GRANT EXECUTE ON FUNCTION public.advance_group_month(uuid) TO authenticated;

-- 6. Enable realtime on relevant tables
ALTER TABLE public.contribution_groups REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_contributions REPLICA IDENTITY FULL;
ALTER TABLE public.contribution_splits REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contribution_groups;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_contributions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contribution_splits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
