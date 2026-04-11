
-- Allow contributors to view profiles of fellow group members
CREATE POLICY "Group members can view fellow member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships gm1
    JOIN public.group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = profiles.user_id
      AND gm1.is_active = true
      AND gm2.is_active = true
  )
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_activity_logs_entity ON public.activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs (created_at DESC);

-- Add due_date, amount_due, status to loan_repayments for schedule tracking
ALTER TABLE public.loan_repayments
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC DEFAULT 0,
  ALTER COLUMN repayment_date DROP NOT NULL;

-- Update loan_repayments status default
ALTER TABLE public.loan_repayments
  ALTER COLUMN repayment_type SET DEFAULT 'scheduled';
