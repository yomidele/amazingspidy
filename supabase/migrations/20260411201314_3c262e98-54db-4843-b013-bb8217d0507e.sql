
CREATE TABLE public.investor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can submit investor requests
CREATE POLICY "Anyone can submit investor requests"
ON public.investor_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Admins can manage all requests
CREATE POLICY "Admins can manage investor requests"
ON public.investor_requests
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_investor_requests_updated_at
BEFORE UPDATE ON public.investor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
