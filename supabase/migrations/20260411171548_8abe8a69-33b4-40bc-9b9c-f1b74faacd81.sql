
CREATE OR REPLACE FUNCTION public.get_same_group_guarantors(_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  INNER JOIN public.group_memberships gm ON gm.user_id = p.user_id
  WHERE gm.is_active = true
    AND gm.group_id IN (
      SELECT g.group_id
      FROM public.group_memberships g
      WHERE g.user_id = _user_id AND g.is_active = true
    )
    AND p.user_id != _user_id
  ORDER BY p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_same_group_guarantors FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_same_group_guarantors TO authenticated;
