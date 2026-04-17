-- Animes table per user
CREATE TABLE public.animes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover TEXT,
  seasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  upcoming JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animes_user_id ON public.animes(user_id);

ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own animes"
  ON public.animes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own animes"
  ON public.animes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own animes"
  ON public.animes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own animes"
  ON public.animes FOR DELETE
  USING (auth.uid() = user_id);

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_animes_updated_at
  BEFORE UPDATE ON public.animes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();