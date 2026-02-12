
-- Add join_month and join_year columns to group_memberships
ALTER TABLE public.group_memberships
ADD COLUMN join_month integer,
ADD COLUMN join_year integer;
