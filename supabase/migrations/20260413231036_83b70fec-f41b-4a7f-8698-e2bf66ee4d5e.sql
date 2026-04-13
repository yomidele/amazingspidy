
-- Add account status and locking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone;

-- Set all existing users to active so they aren't locked out
UPDATE public.profiles SET account_status = 'active' WHERE account_status = 'pending';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_created ON public.activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_contribution_payments_user_id ON public.contribution_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans (user_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON public.investments (investor_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships (group_id);
