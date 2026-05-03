
-- Authoritative recalculation: per-member obligations + confirmed payments
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
BEGIN
  SELECT contribution_amount INTO v_default
    FROM public.contribution_groups WHERE id = _group_id;

  -- Per-member obligation = COALESCE(split for this month, group default)
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

  -- Confirmed payments only (status = 'paid')
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

-- Replace the old BEFORE INSERT trigger fn so new rows get dynamic total_expected
CREATE OR REPLACE FUNCTION public.trg_set_monthly_expected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_default numeric;
  v_expected numeric := 0;
BEGIN
  SELECT contribution_amount INTO v_default
    FROM public.contribution_groups WHERE id = NEW.group_id;

  SELECT COALESCE(SUM(
    COALESCE(
      (SELECT cs.split_amount
         FROM public.contribution_splits cs
        WHERE cs.group_id = NEW.group_id
          AND cs.month = NEW.month
          AND cs.year = NEW.year
          AND cs.user_id = gm.user_id
        LIMIT 1),
      v_default
    )
  ), 0)
  INTO v_expected
  FROM public.group_memberships gm
  WHERE gm.group_id = NEW.group_id AND gm.is_active = true;

  NEW.total_expected := v_expected;
  IF NEW.total_collected IS NULL THEN
    NEW.total_collected := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger fn for payments
CREATE OR REPLACE FUNCTION public.trg_recalc_on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mc_id uuid;
  v_group uuid;
  v_month int;
  v_year int;
BEGIN
  v_mc_id := COALESCE(NEW.monthly_contribution_id, OLD.monthly_contribution_id);
  SELECT group_id, month, year INTO v_group, v_month, v_year
    FROM public.monthly_contributions WHERE id = v_mc_id;
  IF v_group IS NOT NULL THEN
    PERFORM public.recalc_monthly_totals(v_group, v_month, v_year);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_recalc ON public.contribution_payments;
CREATE TRIGGER trg_payment_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.contribution_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_payment_change();

-- Trigger fn for splits
CREATE OR REPLACE FUNCTION public.trg_recalc_on_split_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group uuid; v_month int; v_year int;
BEGIN
  v_group := COALESCE(NEW.group_id, OLD.group_id);
  v_month := COALESCE(NEW.month, OLD.month);
  v_year := COALESCE(NEW.year, OLD.year);
  PERFORM public.recalc_monthly_totals(v_group, v_month, v_year);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_split_recalc ON public.contribution_splits;
CREATE TRIGGER trg_split_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.contribution_splits
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_split_change();

-- Replace membership trigger to use the new authoritative recalc (covers add/remove/activate)
CREATE OR REPLACE FUNCTION public.trg_recalc_on_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_group uuid;
BEGIN
  v_group := COALESCE(NEW.group_id, OLD.group_id);
  FOR r IN
    SELECT month, year FROM public.monthly_contributions
    WHERE group_id = v_group AND is_finalized = false
  LOOP
    PERFORM public.recalc_monthly_totals(v_group, r.month, r.year);
  END LOOP;
  RETURN NULL;
END;
$$;

-- Ensure realtime for contribution_payments
ALTER TABLE public.contribution_payments REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contribution_payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contribution_payments';
  END IF;
END $$;

-- Backfill: recompute every non-finalized monthly contribution with the new logic
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT group_id, month, year FROM public.monthly_contributions WHERE is_finalized = false LOOP
    PERFORM public.recalc_monthly_totals(r.group_id, r.month, r.year);
  END LOOP;
END $$;
