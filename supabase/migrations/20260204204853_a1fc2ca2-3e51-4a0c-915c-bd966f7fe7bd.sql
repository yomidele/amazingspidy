-- Drop the restrictive anonymous INSERT policy and create a more flexible one
DROP POLICY IF EXISTS "Anonymous users can create reviews" ON public.reviews;

-- Allow anyone (including anonymous/unauthenticated) to insert reviews
CREATE POLICY "Anyone can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (true);