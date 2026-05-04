-- Function: notify admins when current-month beneficiaries are missing
CREATE OR REPLACE FUNCTION public.check_missing_beneficiaries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_year  int := EXTRACT(YEAR  FROM CURRENT_DATE)::int;
  v_month_label text := TO_CHAR(make_date(v_year, v_month, 1), 'FMMonth YYYY');
  v_group RECORD;
  v_admin RECORD;
  v_link text;
  v_title text;
  v_message text;
  v_count int := 0;
  v_existing uuid;
BEGIN
  FOR v_group IN
    SELECT g.id, g.name
      FROM public.contribution_groups g
     WHERE g.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM public.monthly_contributions mc
          WHERE mc.group_id = g.id
            AND mc.month = v_month
            AND mc.year  = v_year
            AND mc.beneficiary_user_id IS NOT NULL
       )
  LOOP
    v_link := '/admin/contributions?group=' || v_group.id::text;
    v_title := 'Beneficiary not set for ' || v_month_label;
    v_message := 'No beneficiary has been set for ' || v_group.name || ' this month. Please assign one to continue contributions.';

    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      -- One outstanding reminder per admin/group/month: refresh it instead of duplicating
      SELECT id INTO v_existing
        FROM public.notifications
       WHERE user_id = v_admin.user_id
         AND link = v_link
         AND title = v_title
       LIMIT 1;

      IF v_existing IS NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (v_admin.user_id, v_title, v_message, 'warning', v_link, false);
        v_count := v_count + 1;
      ELSE
        UPDATE public.notifications
           SET is_read = false, message = v_message, created_at = now()
         WHERE id = v_existing;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_count, 'month', v_month_label);
END;
$$;

-- Trigger: when a beneficiary IS assigned, clear matching outstanding admin reminders
CREATE OR REPLACE FUNCTION public.clear_beneficiary_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_label text;
BEGIN
  IF NEW.beneficiary_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.beneficiary_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_link := '/admin/contributions?group=' || NEW.group_id::text;
  v_label := TO_CHAR(make_date(NEW.year, NEW.month, 1), 'FMMonth YYYY');

  UPDATE public.notifications
     SET is_read = true
   WHERE link = v_link
     AND title = 'Beneficiary not set for ' || v_label;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_beneficiary_reminders ON public.monthly_contributions;
CREATE TRIGGER trg_clear_beneficiary_reminders
AFTER INSERT OR UPDATE OF beneficiary_user_id ON public.monthly_contributions
FOR EACH ROW
EXECUTE FUNCTION public.clear_beneficiary_reminders();