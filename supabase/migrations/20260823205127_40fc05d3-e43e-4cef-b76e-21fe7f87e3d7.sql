CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles (lower(username));

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  base_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  IF base_name IS NULL THEN
    base_name := nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), '');
  END IF;
  IF base_name IS NULL THEN
    base_name := 'user';
  END IF;

  candidate := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(candidate)) LOOP
    suffix := suffix + 1;
    candidate := base_name || suffix::text;
  END LOOP;

  BEGIN
    INSERT INTO public.profiles (id, username) VALUES (new.id, candidate);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();