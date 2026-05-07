
ALTER TABLE public.contribution_groups
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.group_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  group_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_admin_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_requests_status_check CHECK (status IN ('pending','approved','rejected'))
);
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'group_admin');
$$;

CREATE OR REPLACE FUNCTION public.group_admin_group_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT group_id FROM public.group_admin_assignments WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_for_group(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.group_admin_assignments WHERE user_id = _user_id AND group_id = _group_id);
$$;

DROP POLICY IF EXISTS "Super admins manage assignments" ON public.group_admin_assignments;
CREATE POLICY "Super admins manage assignments" ON public.group_admin_assignments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Group admin views own assignment" ON public.group_admin_assignments;
CREATE POLICY "Group admin views own assignment" ON public.group_admin_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins manage all requests" ON public.membership_requests;
CREATE POLICY "Super admins manage all requests" ON public.membership_requests
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Group admin views own group requests" ON public.membership_requests;
CREATE POLICY "Group admin views own group requests" ON public.membership_requests
  FOR SELECT TO authenticated USING (group_id = public.group_admin_group_id(auth.uid()));

DROP POLICY IF EXISTS "Group admin inserts requests for own group" ON public.membership_requests;
CREATE POLICY "Group admin inserts requests for own group" ON public.membership_requests
  FOR INSERT TO authenticated
  WITH CHECK (group_id = public.group_admin_group_id(auth.uid()) AND requested_by = auth.uid());

DROP POLICY IF EXISTS "Group admins view their group members profiles" ON public.profiles;
CREATE POLICY "Group admins view their group members profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.user_id = profiles.user_id AND gm.is_active = true
      AND gm.group_id = public.group_admin_group_id(auth.uid())
  ));

DROP POLICY IF EXISTS "Group admins manage their group memberships" ON public.group_memberships;
CREATE POLICY "Group admins manage their group memberships" ON public.group_memberships
  FOR ALL TO authenticated
  USING (group_id = public.group_admin_group_id(auth.uid()))
  WITH CHECK (group_id = public.group_admin_group_id(auth.uid()));

DROP POLICY IF EXISTS "Group admins manage their monthly contributions" ON public.monthly_contributions;
CREATE POLICY "Group admins manage their monthly contributions" ON public.monthly_contributions
  FOR ALL TO authenticated
  USING (group_id = public.group_admin_group_id(auth.uid()))
  WITH CHECK (group_id = public.group_admin_group_id(auth.uid()));

DROP POLICY IF EXISTS "Group admins manage their group payments" ON public.contribution_payments;
CREATE POLICY "Group admins manage their group payments" ON public.contribution_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.monthly_contributions mc
    WHERE mc.id = contribution_payments.monthly_contribution_id
      AND mc.group_id = public.group_admin_group_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.monthly_contributions mc
    WHERE mc.id = contribution_payments.monthly_contribution_id
      AND mc.group_id = public.group_admin_group_id(auth.uid())));

DROP POLICY IF EXISTS "Group admins manage their group splits" ON public.contribution_splits;
CREATE POLICY "Group admins manage their group splits" ON public.contribution_splits
  FOR ALL TO authenticated
  USING (group_id = public.group_admin_group_id(auth.uid()))
  WITH CHECK (group_id = public.group_admin_group_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.approve_membership_request(_request_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.membership_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only super admins can approve requests'; END IF;
  SELECT * INTO v_req FROM public.membership_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request already %', v_req.status; END IF;
  INSERT INTO public.group_memberships (user_id, group_id, is_active, joined_at)
  VALUES (_user_id, v_req.group_id, true, now()) ON CONFLICT DO NOTHING;
  UPDATE public.membership_requests
     SET status='approved', user_id=_user_id, reviewed_by=auth.uid(), reviewed_at=now()
   WHERE id=_request_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_req.requested_by, 'Member request approved',
          v_req.full_name || ' has been added to your group.', 'success', '/group-admin');
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.reject_membership_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.membership_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only super admins can reject requests'; END IF;
  SELECT * INTO v_req FROM public.membership_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Request already %', v_req.status; END IF;
  UPDATE public.membership_requests
     SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_note=_note
   WHERE id=_request_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_req.requested_by, 'Member request rejected',
          'Request for ' || v_req.full_name || ' was rejected.' || COALESCE(' Reason: ' || _note, ''),
          'warning', '/group-admin');
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admins_on_membership_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group_name text;
BEGIN
  SELECT name INTO v_group_name FROM public.contribution_groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'New membership request',
         'Group admin requested to add ' || NEW.full_name || ' to ' || COALESCE(v_group_name,'a group') || '.',
         'info', '/admin/membership-requests'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_membership_request ON public.membership_requests;
CREATE TRIGGER trg_notify_admins_on_membership_request
AFTER INSERT ON public.membership_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_membership_request();

CREATE INDEX IF NOT EXISTS idx_membership_requests_status ON public.membership_requests(status);
CREATE INDEX IF NOT EXISTS idx_group_admin_assignments_group ON public.group_admin_assignments(group_id);
