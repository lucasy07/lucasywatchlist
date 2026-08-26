import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { AVATAR_BUCKET, avatarPath, removeAvatar, uploadAvatar } from "./avatar-upload";

/**
 * Teste de integração real: envia uma imagem para o bucket "avatars" e
 * verifica que profiles.avatar_url foi atualizado para o caminho enviado.
 *
 * Requer uma sessão autenticada injetada no ambiente
 * (LOVABLE_BROWSER_SUPABASE_SESSION_JSON). Sem ela o teste é ignorado.
 */
const url = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
const key =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
const sessionJson = process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"];

const canRun = Boolean(url && key && sessionJson);

// PNG 1x1 válido (base64).
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function pngBlob() {
  const bin = Buffer.from(PNG_1x1, "base64");
  return new Blob([bin], { type: "image/png" });
}

const client = canRun
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

let userId = "";
let previousAvatarUrl: string | null = null;

describe.skipIf(!canRun)("upload de avatar → profiles.avatar_url", () => {
  afterAll(async () => {
    if (!client || !userId) return;
    // restaura o estado anterior do perfil
    if (previousAvatarUrl) {
      await client.from("profiles").update({ avatar_url: previousAvatarUrl }).eq("id", userId);
    } else {
      await removeAvatar(client, userId);
    }
  });

  it("envia o arquivo e persiste o caminho em profiles.avatar_url", async () => {
    const session = JSON.parse(sessionJson!);
    const { data: authData, error: authError } = await client!.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    expect(authError).toBeNull();
    userId = authData.user!.id;

    const { data: before } = await client!
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    previousAvatarUrl = (before?.avatar_url as string | null) ?? null;

    const saved = await uploadAvatar(client!, userId, pngBlob(), "image/png");

    // 1) o arquivo existe no bucket, na pasta do próprio usuário
    const { data: listed, error: listError } = await client!.storage
      .from(AVATAR_BUCKET)
      .list(userId);
    expect(listError).toBeNull();
    expect(listed?.some((f) => f.name === "avatar.webp")).toBe(true);

    // 2) profiles.avatar_url aponta para esse arquivo
    const { data: after, error: readError } = await client!
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    expect(readError).toBeNull();
    expect(after?.avatar_url).toBe(saved);
    expect(after?.avatar_url as string).toContain(avatarPath(userId));
    expect(after?.avatar_url).not.toBe(previousAvatarUrl);

    // 3) o caminho salvo é resolvível como URL assinada
    const path = (after!.avatar_url as string).split("?")[0]!;
    const { data: signed, error: signError } = await client!.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, 60);
    expect(signError).toBeNull();
    expect(signed?.signedUrl).toBeTruthy();
  }, 30_000);

  it("remover a foto limpa profiles.avatar_url", async () => {
    await removeAvatar(client!, userId);
    const { data } = await client!.from("profiles").select("avatar_url").eq("id", userId).single();
    expect(data?.avatar_url).toBeNull();
    previousAvatarUrl = null;
  }, 30_000);
});
