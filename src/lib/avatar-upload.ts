import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";

/** Caminho canônico do avatar de um usuário dentro do bucket. */
export function avatarPath(userId: string) {
  return `${userId}/avatar.webp`;
}

/**
 * Envia o blob para o storage e grava o caminho (com cache-buster) em
 * profiles.avatar_url. Retorna o valor persistido.
 */
export async function uploadAvatar(
  client: SupabaseClient<any, any, any>,
  userId: string,
  blob: Blob,
  contentType = "image/webp",
): Promise<string> {
  const path = avatarPath(userId);

  const { error: upErr } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { upsert: true, contentType });
  if (upErr) throw upErr;

  const value = `${path}?v=${Date.now()}`;
  const { error: dbErr } = await client
    .from("profiles")
    .update({ avatar_url: value })
    .eq("id", userId);
  if (dbErr) throw dbErr;

  return value;
}

/** Remove o arquivo do storage e limpa profiles.avatar_url. */
export async function removeAvatar(
  client: SupabaseClient<any, any, any>,
  userId: string,
): Promise<void> {
  await client.storage.from(AVATAR_BUCKET).remove([avatarPath(userId)]);
  const { error } = await client.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
}
