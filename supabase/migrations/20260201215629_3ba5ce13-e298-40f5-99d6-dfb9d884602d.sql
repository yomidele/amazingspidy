
-- Update reviews table to auto-approve reviews (no admin approval needed)
ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT true;

-- Update RLS policy to allow viewing all reviews (not just approved ones)
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;

CREATE POLICY "Anyone can view all reviews" 
ON public.reviews 
FOR SELECT 
USING (true);
