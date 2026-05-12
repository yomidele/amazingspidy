ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token) WHERE fcm_token IS NOT NULL;