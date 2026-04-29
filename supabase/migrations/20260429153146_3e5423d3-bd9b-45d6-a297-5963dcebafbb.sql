-- =========================================================
-- 1. MEMBERSHIP NUMBERS
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START WITH 1001;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.assign_membership_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_number IS NULL THEN
    NEW.membership_number := 'MEM-' || nextval('public.membership_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_membership_number ON public.profiles;
CREATE TRIGGER trg_assign_membership_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_membership_number();

-- Backfill existing profiles in creation order
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE membership_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.profiles
      SET membership_number = 'MEM-' || nextval('public.membership_number_seq')::text
      WHERE id = r.id;
  END LOOP;
END $$;

-- =========================================================
-- 2. AUTO-CALC monthly_contributions.total_expected
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalc_monthly_expected(_group_id uuid, _month int, _year int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_count  integer;
BEGIN
  SELECT contribution_amount INTO v_amount
    FROM public.contribution_groups WHERE id = _group_id;

  SELECT COUNT(*) INTO v_count
    FROM public.group_memberships
    WHERE group_id = _group_id AND is_active = true;

  UPDATE public.monthly_contributions
    SET total_expected = COALESCE(v_amount, 0) * COALESCE(v_count, 0),
        updated_at = now()
    WHERE group_id = _group_id AND month = _month AND year = _year;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_set_monthly_expected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_count  integer;
BEGIN
  SELECT contribution_amount INTO v_amount
    FROM public.contribution_groups WHERE id = NEW.group_id;

  SELECT COUNT(*) INTO v_count
    FROM public.group_memberships
    WHERE group_id = NEW.group_id AND is_active = true;

  NEW.total_expected := COALESCE(v_amount, 0) * COALESCE(v_count, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_expected ON public.monthly_contributions;
CREATE TRIGGER trg_monthly_expected
  BEFORE INSERT OR UPDATE OF group_id ON public.monthly_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_monthly_expected();

CREATE OR REPLACE FUNCTION public.trg_recalc_on_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  g_id uuid;
BEGIN
  g_id := COALESCE(NEW.group_id, OLD.group_id);
  FOR r IN
    SELECT month, year FROM public.monthly_contributions
    WHERE group_id = g_id AND is_finalized = false
  LOOP
    PERFORM public.recalc_monthly_expected(g_id, r.month, r.year);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_recalc ON public.group_memberships;
CREATE TRIGGER trg_membership_recalc
  AFTER INSERT OR UPDATE OF is_active OR DELETE ON public.group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_on_membership_change();

-- Backfill existing open monthly contributions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT group_id, month, year FROM public.monthly_contributions WHERE is_finalized = false LOOP
    PERFORM public.recalc_monthly_expected(r.group_id, r.month, r.year);
  END LOOP;
END $$;

-- =========================================================
-- 3. LOAN INVESTOR ASSIGNMENT
-- =========================================================
ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS funding_source TEXT NOT NULL DEFAULT 'pool'
    CHECK (funding_source IN ('pool', 'investor'));

CREATE TABLE IF NOT EXISTS public.loan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_request_id UUID NOT NULL REFERENCES public.loan_requests(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  amount NUMERIC NOT NULL,
  response_note TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loan_request_id)
);

CREATE INDEX IF NOT EXISTS idx_loan_assignments_investor ON public.loan_assignments(investor_id);
CREATE INDEX IF NOT EXISTS idx_loan_assignments_status   ON public.loan_assignments(status);

ALTER TABLE public.loan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage loan assignments"
  ON public.loan_assignments FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Investor views own assignments"
  ON public.loan_assignments FOR SELECT TO authenticated
  USING (investor_id = auth.uid());

CREATE POLICY "Investor updates own assignments"
  ON public.loan_assignments FOR UPDATE TO authenticated
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

CREATE POLICY "Borrower views own loan assignment"
  ON public.loan_assignments FOR SELECT TO authenticated
  USING (is_loan_borrower(auth.uid(), loan_request_id));

CREATE TRIGGER trg_loan_assignments_updated
  BEFORE UPDATE ON public.loan_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. SCHEDULED MONTHLY AUTO-PROGRESSION
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-progress-groups-daily') THEN
    PERFORM cron.unschedule('auto-progress-groups-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'auto-progress-groups-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wwtkejyxzllucfsksypn.supabase.co/functions/v1/auto-progress-groups',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dGtlanl4emxsdWNmc2tzeXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDYzMDMsImV4cCI6MjA4NTUyMjMwM30.TdghqN0Rxl0lCMp1r-eMSV-gCezOM6g40TEz2oogE04"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);