-- Allow anonymous reviews by making user_id optional
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;

-- Replace INSERT policy to support both authenticated and anonymous submissions
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;

-- Authenticated users can create reviews tied to themselves
CREATE POLICY "Authenticated users can create their reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Anonymous users can create reviews without a user_id
CREATE POLICY "Anonymous users can create reviews"
ON public.reviews
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
