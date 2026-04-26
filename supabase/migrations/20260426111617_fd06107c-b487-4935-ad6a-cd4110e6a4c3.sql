
-- Per-group settings
CREATE TABLE public.group_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL UNIQUE,
  notify_beneficiary_change boolean NOT NULL DEFAULT true,
  notify_split_assignment boolean NOT NULL DEFAULT true,
  beneficiary_template text,
  split_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage group notification settings"
  ON public.group_notification_settings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_group_notification_settings_updated_at
  BEFORE UPDATE ON public.group_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduled reminders (manually triggered from panel)
CREATE TABLE public.group_scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  day_of_month integer,
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage group scheduled reminders"
  ON public.group_scheduled_reminders FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_group_scheduled_reminders_updated_at
  BEFORE UPDATE ON public.group_scheduled_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replace beneficiary-change trigger to honor settings + template
CREATE OR REPLACE FUNCTION public.notify_group_beneficiary_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_beneficiary_name TEXT;
  v_month_name TEXT;
  v_title TEXT;
  v_message TEXT;
  v_changed BOOLEAN := FALSE;
  v_settings public.group_notification_settings%ROWTYPE;
  v_group_name TEXT;
BEGIN
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

  SELECT * INTO v_settings FROM public.group_notification_settings WHERE group_id = NEW.group_id;
  IF FOUND AND v_settings.notify_beneficiary_change = false THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_beneficiary_name FROM public.profiles WHERE user_id = NEW.beneficiary_user_id;
  v_beneficiary_name := COALESCE(v_beneficiary_name, 'A group member');
  v_month_name := TO_CHAR(make_date(NEW.year, NEW.month, 1), 'FMMonth YYYY');
  SELECT name INTO v_group_name FROM public.contribution_groups WHERE id = NEW.group_id;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New monthly beneficiary assigned';
  ELSE
    v_title := 'Monthly beneficiary updated';
  END IF;

  IF v_settings.beneficiary_template IS NOT NULL AND length(trim(v_settings.beneficiary_template)) > 0 THEN
    v_message := v_settings.beneficiary_template;
    v_message := replace(v_message, '{name}', v_beneficiary_name);
    v_message := replace(v_message, '{month}', v_month_name);
    v_message := replace(v_message, '{group}', COALESCE(v_group_name, ''));
    v_message := replace(v_message, '{bank}', COALESCE(NEW.beneficiary_bank_name, ''));
    v_message := replace(v_message, '{account}', COALESCE(NEW.beneficiary_account_number, ''));
  ELSE
    v_message := v_beneficiary_name || ' is the beneficiary for ' || v_month_name ||
                 COALESCE(' • Bank: ' || NULLIF(NEW.beneficiary_bank_name, ''), '') ||
                 COALESCE(' • Acct: ' || NULLIF(NEW.beneficiary_account_number, ''), '');
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT gm.user_id, v_title, v_message, 'info', '/dashboard/contributor'
  FROM public.group_memberships gm
  WHERE gm.group_id = NEW.group_id AND gm.is_active = true;

  RETURN NEW;
END;
$function$;

-- Replace split-assignment notification to honor settings + template
CREATE OR REPLACE FUNCTION public.notify_split_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_name text;
  v_month_name text;
  v_settings public.group_notification_settings%ROWTYPE;
  v_member_name text;
  v_message text;
BEGIN
  SELECT * INTO v_settings FROM public.group_notification_settings WHERE group_id = NEW.group_id;
  IF FOUND AND v_settings.notify_split_assignment = false THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_group_name FROM public.contribution_groups WHERE id = NEW.group_id;
  v_month_name := TO_CHAR(make_date(NEW.year, NEW.month, 1), 'FMMonth YYYY');
  SELECT full_name INTO v_member_name FROM public.profiles WHERE user_id = NEW.user_id;

  IF v_settings.split_template IS NOT NULL AND length(trim(v_settings.split_template)) > 0 THEN
    v_message := v_settings.split_template;
    v_message := replace(v_message, '{name}', COALESCE(v_member_name, ''));
    v_message := replace(v_message, '{month}', v_month_name);
    v_message := replace(v_message, '{amount}', NEW.split_amount::text);
    v_message := replace(v_message, '{group}', COALESCE(v_group_name, ''));
  ELSE
    v_message := 'You have been assigned a £' || NEW.split_amount || ' split for ' || v_month_name ||
                 ' in ' || COALESCE(v_group_name, 'your group') || '.';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, 'Split contribution assigned', v_message, 'info', '/dashboard/contributor');
  RETURN NEW;
END;
$function$;
