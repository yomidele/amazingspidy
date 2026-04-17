
-- Function: notify all active group members when beneficiary is set/updated on monthly_contributions
CREATE OR REPLACE FUNCTION public.notify_group_beneficiary_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_beneficiary_name TEXT;
  v_month_name TEXT;
  v_title TEXT;
  v_message TEXT;
  v_changed BOOLEAN := FALSE;
BEGIN
  -- Determine if beneficiary info actually changed (for UPDATE)
  IF TG_OP = 'INSERT' THEN
    v_changed := NEW.beneficiary_user_id IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_changed := (
      COALESCE(NEW.beneficiary_user_id::text, '') IS DISTINCT FROM COALESCE(OLD.beneficiary_user_id::text, '')
      OR COALESCE(NEW.beneficiary_bank_name, '') IS DISTINCT FROM COALESCE(OLD.beneficiary_bank_name, '')
      OR COALESCE(NEW.beneficiary_account_number, '') IS DISTINCT FROM COALESCE(OLD.beneficiary_account_number, '')
    ) AND NEW.beneficiary_user_id IS NOT NULL;
  END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  -- Resolve beneficiary name
  SELECT full_name INTO v_beneficiary_name
  FROM public.profiles
  WHERE user_id = NEW.beneficiary_user_id;

  v_beneficiary_name := COALESCE(v_beneficiary_name, 'A group member');

  v_month_name := TO_CHAR(make_date(NEW.year, NEW.month, 1), 'FMMonth YYYY');

  IF TG_OP = 'INSERT' THEN
    v_title := 'New monthly beneficiary assigned';
  ELSE
    v_title := 'Monthly beneficiary updated';
  END IF;

  v_message := v_beneficiary_name || ' is the beneficiary for ' || v_month_name ||
               COALESCE(' • Bank: ' || NULLIF(NEW.beneficiary_bank_name, ''), '') ||
               COALESCE(' • Acct: ' || NULLIF(NEW.beneficiary_account_number, ''), '');

  -- Insert one notification per active member of the group (scales via single bulk insert)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT
    gm.user_id,
    v_title,
    v_message,
    'info',
    '/dashboard/contributor'
  FROM public.group_memberships gm
  WHERE gm.group_id = NEW.group_id
    AND gm.is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_beneficiary_change ON public.monthly_contributions;
CREATE TRIGGER trg_notify_beneficiary_change
AFTER INSERT OR UPDATE OF beneficiary_user_id, beneficiary_bank_name, beneficiary_account_number
ON public.monthly_contributions
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_beneficiary_change();

-- Index to speed up group-member fan-out
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_active
  ON public.group_memberships(group_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Allow the SECURITY DEFINER function to insert notifications even though the
-- existing RLS policy restricts INSERTs to admins. SECURITY DEFINER bypasses
-- RLS when the function owner has direct table privileges, which it does as
-- a postgres-owned function. No policy change is needed.
