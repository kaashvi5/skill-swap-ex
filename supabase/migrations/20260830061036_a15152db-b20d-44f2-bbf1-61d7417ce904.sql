CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET trust_score = COALESCE((SELECT AVG(stars)::numeric(3,2) FROM public.ratings WHERE ratee_id = NEW.ratee_id), 0),
      ratings_count = (SELECT COUNT(*) FROM public.ratings WHERE ratee_id = NEW.ratee_id)
  WHERE user_id = NEW.ratee_id;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.update_trust_score() FROM PUBLIC, anon, authenticated;

UPDATE public.profiles p
SET trust_score = COALESCE(r.avg_stars, 0),
    ratings_count = COALESCE(r.cnt, 0)
FROM (
  SELECT ratee_id, AVG(stars)::numeric(3,2) AS avg_stars, COUNT(*) AS cnt
  FROM public.ratings GROUP BY ratee_id
) r
WHERE p.user_id = r.ratee_id;