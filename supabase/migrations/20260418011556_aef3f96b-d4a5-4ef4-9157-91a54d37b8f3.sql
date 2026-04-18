ALTER TABLE public.animes ADD COLUMN IF NOT EXISTS watched boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_animes_user_watched ON public.animes(user_id, watched);