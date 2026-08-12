import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  name: string;
  /** User score 0-10. null until the user rates it. */
  rating: number | null;
  malId?: number | null;
  year?: number | null;
  malScore?: number | null;
  /** Jikan/MAL type: TV, Movie, OVA, ONA, Special, Music, etc. */
  type?: string | null;
  /** Override explícito de inclusão na média. undefined = usa o default por tipo. */
  includeInAverage?: boolean;
};

export function isExcludedFromAverage(season: Season): boolean {
  if (season.includeInAverage === true) return false;
  if (season.includeInAverage === false) return true;

  const t = typeof season.type === "string" ? season.type.toLowerCase() : "";
  return t === "ova" || t === "special";
}

export type Tier = "S" | "A" | "B" | "C" | "D" | "E";

export const TIER_VALUE: Record<Tier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0 };

export function tierFromAverage(avg: number): Tier {
  if (avg >= 9) return "S";
  if (avg >= 8) return "A";
  if (avg >= 7) return "B";
  if (avg >= 5) return "C";
  return "D";
}

export type UpcomingSeason = {
  title: string;
  /** ISO date string (YYYY-MM-DD) */
  releaseDate: string;
  /** Origin: "auto" from continuation scan, "manual" from user. Missing = manual (legacy). */
  source?: "auto" | "manual";
  /** MAL id of the detected continuation season (only when source === "auto"). */
  malId?: number | null;
};

export type Anime = {
  id: string;
  name: string;
  seasons: Season[];
  cover?: string;
  upcoming?: UpcomingSeason;
  watched: boolean;
  malId?: number | null;
  imageUrl?: string | null;
  malScore?: number | null;
  tier: Tier | null;
  /** Manual position inside the tier row. null = unpositioned (falls back to created_at order). */
  tierPosition: number | null;
  /** ISO timestamp of the last new-seasons check. null = never checked. */
  lastCheckedAt: string | null;
  /** MAL genres. null = never fetched; [] = fetched and none. */
  genres: string[] | null;
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
  mal_id: number | null;
  image_url: string | null;
  mal_score: number | null;
  tier: string | null;
  tier_position: number | null;
  last_checked_at: string | null;
  genres: string[] | null;
};

function rowToAnime(row: DbRow): Anime {
  const seasons = Array.isArray(row.seasons) ? (row.seasons as Season[]) : [];
  const upcoming = (row.upcoming ?? undefined) as UpcomingSeason | undefined;
  const tier =
    row.tier === "S" || row.tier === "A" || row.tier === "B" || row.tier === "C" || row.tier === "D" || row.tier === "E"
      ? (row.tier as Tier)
      : null;
  return {
    id: row.id,
    name: row.name,
    cover: row.cover ?? undefined,
    seasons,
    upcoming,
    watched: row.watched ?? false,
    malId: row.mal_id ?? null,
    imageUrl: row.image_url ?? null,
    malScore: row.mal_score ?? null,
    tier,
    tierPosition: row.tier_position ?? null,
    lastCheckedAt: row.last_checked_at ?? null,
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
    .select("id, name, cover, seasons, upcoming, watched, mal_id, image_url, mal_score, tier, tier_position, last_checked_at")
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
  malId?: number | null;
  imageUrl?: string | null;
  malScore?: number | null;
  seasons?: Season[];
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
      seasons: input.seasons ?? [],
      upcoming: null,
      mal_id: input.malId ?? null,
      image_url: input.imageUrl ?? null,
      mal_score: input.malScore ?? null,
      tier: null,
      tier_position: null,
      last_checked_at: null,
    })
    .select("id, name, cover, seasons, upcoming, watched, mal_id, image_url, mal_score, tier, tier_position, last_checked_at")
    .single();
  if (error) throw error;
  return rowToAnime(data as DbRow);
}


export async function updateTier(id: string, tier: Tier | null): Promise<void> {
  const { error } = await supabase
    .from("animes")
    .update({ tier, tier_position: null })
    .eq("id", id);
  if (error) throw error;
}

/** Persist manual positions inside tier rows. One update per entry. */
export async function updateTierPositions(
  entries: Array<{ id: string; tierPosition: number | null }>,
): Promise<void> {
  await Promise.all(
    entries.map(async ({ id, tierPosition }) => {
      const { error } = await supabase
        .from("animes")
        .update({ tier_position: tierPosition })
        .eq("id", id);
      if (error) throw error;
    }),
  );
}



export async function setWatched(id: string, watched: boolean): Promise<void> {
  const { error } = await supabase
    .from("animes")
    .update({ watched })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAnime(id: string): Promise<void> {
  const { error } = await supabase.from("animes").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAnime(
  id: string,
  patch: { name?: string; cover?: string | null },
): Promise<void> {
  const update: { name?: string; cover?: string | null } = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.cover !== undefined) update.cover = patch.cover;
  const { error } = await supabase.from("animes").update(update).eq("id", id);
  if (error) throw error;
}

export async function updateAnimeMeta(
  id: string,
  meta: { malId?: number | null; imageUrl?: string | null; malScore?: number | null },
): Promise<void> {
  const update: { mal_id?: number | null; image_url?: string | null; mal_score?: number | null } = {};
  if (meta.malId !== undefined) update.mal_id = meta.malId;
  if (meta.imageUrl !== undefined) update.image_url = meta.imageUrl;
  if (meta.malScore !== undefined) update.mal_score = meta.malScore;
  const { error } = await supabase.from("animes").update(update).eq("id", id);
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
  const rated = seasons.filter((s): s is Season & { rating: number } => typeof s.rating === "number");
  if (rated.length === 0) return 0;
  return rated.reduce((s, x) => s + x.rating, 0) / rated.length;
}

/** Arithmetic mean of user scores across rated seasons. OVAs excluded. null if none rated. */
export function mediaPessoal(seasons: Season[]): number | null {
  const rated = seasons.filter(
    (s): s is Season & { rating: number } =>
      typeof s.rating === "number" && !isExcludedFromAverage(s),
  );
  if (rated.length === 0) return null;
  return rated.reduce((s, x) => s + x.rating, 0) / rated.length;
}

/** Arithmetic mean of MAL scores across seasons. OVAs excluded. null if none. */
export function mediaMAL(seasons: Season[]): number | null {
  const scored = seasons.filter(
    (s): s is Season & { malScore: number } =>
      typeof s.malScore === "number" && !isExcludedFromAverage(s),
  );
  if (scored.length === 0) return null;
  return scored.reduce((s, x) => s + x.malScore, 0) / scored.length;
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

export async function updateLastCheckedAt(id: string, iso: string): Promise<void> {
  const { error } = await supabase
    .from("animes")
    .update({ last_checked_at: iso })
    .eq("id", id);
  if (error) throw error;
}

export function formatLastChecked(iso?: string | null): string {
  if (!iso) return "Nunca verificado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days <= 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
