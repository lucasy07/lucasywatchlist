import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolve um valor salvo em profiles.avatar_url para uma URL exibível. */
export function useAvatarSrc(avatarUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!avatarUrl) {
      setSrc(null);
      return;
    }
    if (/^https?:\/\//.test(avatarUrl)) {
      setSrc(avatarUrl);
      return;
    }
    const [path] = avatarUrl.split("?");
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setSrc(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [avatarUrl]);
  return src;
}
