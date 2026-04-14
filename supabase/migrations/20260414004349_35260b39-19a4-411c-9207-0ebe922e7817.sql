CREATE POLICY "Authenticated users can read module status"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (true);