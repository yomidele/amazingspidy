
-- Tighten contribution_groups visibility
DROP POLICY IF EXISTS "Anyone can view active groups" ON public.contribution_groups;

CREATE POLICY "Visible groups by role"
ON public.contribution_groups
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_group_member(auth.uid(), id)
  OR id = public.group_admin_group_id(auth.uid())
);
