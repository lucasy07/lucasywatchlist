ALTER TABLE public.animes DROP CONSTRAINT IF EXISTS animes_tier_check;
ALTER TABLE public.animes ADD CONSTRAINT animes_tier_check CHECK (tier IS NULL OR tier IN ('S','A','B','C','D','E'));