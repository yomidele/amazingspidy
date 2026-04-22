CREATE OR REPLACE FUNCTION public.v_month_name_from_int(_m int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT TO_CHAR(make_date(2000, _m, 1), 'FMMonth');
$$;