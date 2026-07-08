ALTER POLICY "Users can update their own animes"
  ON public.animes
  WITH CHECK (auth.uid() = user_id);