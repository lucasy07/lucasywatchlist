import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  name: string;
  rating: number;
};

export type UpcomingSeason = {
  title: string;
  /** ISO date string (YYYY-MM-DD) */
  releaseDate: string;
};

export type Anime = {
  id: string;
  name: string;
  seasons: Season[];
  cover?: string;
  upcoming?: UpcomingSeason;
  watched: boolean;
};

/** Legacy localStorage key — used only for one-time auto-import. */
export const LEGACY_STORAGE_KEY = "anime-ranker:v1";
const IMPORT_FLAG_PREFIX = "anime-watchlist:imported:";

type DbRow = {
  id: string;
  name: string;
  cover: string | null;
  seasons: unknown;
  upcoming: unknown;
  watched: boolean | null;
};

function rowToAnime(row: DbRow): Anime {
  const seasons = Array.isArray(row.seasons) ? (row.seasons as Season[]) : [];
  const upcoming = (row.upcoming ?? undefined) as UpcomingSeason | undefined;
  return {
    id: row.id,
    name: row.name,
    cover: row.cover ?? undefined,
    seasons,
    upcoming,
    watched: row.watched ?? false,
  };
}

function readLegacyLocal(): Anime[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Anime[]) : [];
  } catch {
    return [];
  }
}

/** Fetch all animes for the current user. */
export async function fetchAnimes(): Promise<Anime[]> {
  const { data, error } = await supabase
    .from("animes")
    .select("id, name, cover, seasons, upcoming")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DbRow[]).map(rowToAnime);
}

/** One-time import of localStorage data into Supabase for the current user. */
export async function importLegacyIfNeeded(userId: string): Promise<number> {
  if (typeof window === "undefined") return 0;
  const flagKey = IMPORT_FLAG_PREFIX + userId;
  if (localStorage.getItem(flagKey)) return 0;
  const legacy = readLegacyLocal();
  if (legacy.length === 0) {
    localStorage.setItem(flagKey, "1");
    return 0;
  }
  const rows = legacy.map((a) => ({
    user_id: userId,
    name: a.name,
    cover: a.cover ?? null,
    seasons: a.seasons ?? [],
    upcoming: a.upcoming ?? null,
  }));
  const { error } = await supabase.from("animes").insert(rows);
  if (error) throw error;
  localStorage.setItem(flagKey, "1");
  return rows.length;
}

export async function createAnime(input: {
  name: string;
  cover?: string;
}): Promise<Anime> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("animes")
    .insert({
      user_id: userId,
      name: input.name,
      cover: input.cover ?? null,
      seasons: [],
      upcoming: null,
    })
    .select("id, name, cover, seasons, upcoming")
    .single();
  if (error) throw error;
  return rowToAnime(data as DbRow);
}

export async function deleteAnime(id: string): Promise<void> {
  const { error } = await supabase.from("animes").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSeasons(id: string, seasons: Season[]): Promise<void> {
  const { error } = await supabase
    .from("animes")
    .update({ seasons })
    .eq("id", id);
  if (error) throw error;
}

export async function updateUpcoming(
  id: string,
  upcoming: UpcomingSeason | null,
): Promise<void> {
  const { error } = await supabase
    .from("animes")
    .update({ upcoming })
    .eq("id", id);
  if (error) throw error;
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function average(seasons: Season[]) {
  if (seasons.length === 0) return 0;
  return seasons.reduce((s, x) => s + x.rating, 0) / seasons.length;
}

export function rankColor(avg: number) {
  if (avg >= 9) return "text-primary";
  if (avg >= 7) return "text-foreground";
  if (avg >= 5) return "text-muted-foreground";
  return "text-destructive";
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / 86400000);
}

export function formatReleaseLabel(dateStr?: string): string {
  const d = daysUntil(dateStr);
  if (d === null) return "";
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d > 1) return `Em ${d} dias`;
  if (d === -1) return "Ontem";
  return `Há ${Math.abs(d)} dias`;
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
