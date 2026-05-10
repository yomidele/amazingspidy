
-- Make the BEFORE INSERT trigger respect a manual override on expected total
CREATE OR REPLACE FUNCTION public.trg_set_monthly_expected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_default numeric;
  v_expected numeric := 0;
BEGIN
  -- If a manual override is provided, honor it and skip auto-calc
  IF NEW.expected_total_override IS NOT NULL THEN
    NEW.total_expected := NEW.expected_total_override;
    IF NEW.total_collected IS NULL THEN
      NEW.total_collected := 0;
    END IF;
    RETURN NEW;
  END IF;

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
$function$;
