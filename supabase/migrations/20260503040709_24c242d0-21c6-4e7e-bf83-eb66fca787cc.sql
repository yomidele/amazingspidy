
-- 1) Backfill: recompute every monthly_contributions row using new ledger logic
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT group_id, month, year FROM public.monthly_contributions LOOP
    PERFORM public.recalc_monthly_totals(r.group_id, r.month, r.year);
  END LOOP;
END $$;

-- 2) RPC to fetch group members (name + role + contribution amount) with access control
CREATE OR REPLACE FUNCTION public.get_group_members(_group_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  membership_number text,
  role text,
  contribution_amount numeric,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default numeric;
  v_month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_year  int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  -- access control: only group members or admins
  IF NOT (public.is_admin(auth.uid()) OR public.is_group_member(auth.uid(), _group_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT contribution_amount INTO v_default
    FROM public.contribution_groups WHERE id = _group_id;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.membership_number,
    CASE WHEN public.is_admin(p.user_id) THEN 'admin' ELSE 'member' END AS role,
    COALESCE(
      (SELECT cs.split_amount FROM public.contribution_splits cs
        WHERE cs.group_id = _group_id AND cs.month = v_month AND cs.year = v_year
          AND cs.user_id = p.user_id LIMIT 1),
      v_default
    ) AS contribution_amount,
    gm.joined_at
  FROM public.group_memberships gm
  JOIN public.profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = _group_id AND gm.is_active = true
  ORDER BY (CASE WHEN public.is_admin(p.user_id) THEN 0 ELSE 1 END),
           p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_members(uuid) TO authenticated;
