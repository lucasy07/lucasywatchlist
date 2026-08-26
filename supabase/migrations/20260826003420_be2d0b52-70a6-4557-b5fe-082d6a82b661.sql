DO $$
DECLARE
  u RECORD;
  base_name TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
    ORDER BY au.created_at
  LOOP
    base_name := nullif(btrim(coalesce(u.raw_user_meta_data->>'username', '')), '');
    IF base_name IS NULL THEN
      base_name := nullif(btrim(split_part(coalesce(u.email, ''), '@', 1)), '');
    END IF;
    IF base_name IS NULL THEN
      base_name := 'user';
    END IF;

    candidate := base_name;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.username) = lower(candidate)) LOOP
      suffix := suffix + 1;
      candidate := base_name || suffix::text;
    END LOOP;

    INSERT INTO public.profiles (id, username) VALUES (u.id, candidate);
  END LOOP;
END $$;