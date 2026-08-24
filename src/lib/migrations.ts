import {
  type Anime,
  type Season,
  tierFromAverage,
  updateAnimeMeta,
  updateSeasons,
  updateTier,
  parseJikanDuration,
} from "@/lib/anime-storage";

const MIGRATIONS_KEY_PREFIX = "anime-watchlist:migrations:";
const IMG_TRIED_KEY_PREFIX = "anime-watchlist:img-tried:";

const TIER_MIGRATION_VERSION = 1;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function readVersion(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(MIGRATIONS_KEY_PREFIX + userId);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeVersion(userId: string, version: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MIGRATIONS_KEY_PREFIX + userId, String(version));
  } catch {
    // ignore
  }
}

function readImgTried(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(IMG_TRIED_KEY_PREFIX + userId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeImgTried(userId: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IMG_TRIED_KEY_PREFIX + userId, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export type MigrationParams = {
  userId: string;
  animes: Anime[];
  onPatch: (id: string, patch: Partial<Anime>) => void;
  signal: AbortSignal;
};

async function backfillImageUrl({ userId, animes, onPatch, signal }: MigrationParams): Promise<void> {
  const tried = readImgTried(userId);
  const missing = animes.filter((a) => !a.imageUrl && !tried.has(a.name));
  if (missing.length === 0) return;

  for (const anime of missing) {
    if (signal.aborted) return;
    try {
      let malId: number | null = null;
      let imageUrl: string | undefined;
      let malScore: number | null = null;

      let jikanOk = false;
      try {
        const res = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.name)}&limit=1&sfw=true`,
        );
        if (res.ok) {
          const json = await res.json();
          const top = json?.data?.[0];
          const img: string | undefined =
            top?.images?.jpg?.large_image_url ?? top?.images?.jpg?.image_url;
          if (img) {
            jikanOk = true;
            imageUrl = img;
            malId = top?.mal_id ?? null;
            malScore = top?.score ?? null;
          }
        }
      } catch {
        // fall through to AniList fallback
      }

      if (!jikanOk) {
        try {
          const alRes = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              query:
                "query ($search: String) { Page(perPage: 1) { media(search: $search, type: ANIME, isAdult: false) { idMal coverImage { large } } } }",
              variables: { search: anime.name },
            }),
          });
          if (!alRes.ok) {
            tried.add(anime.name);
            writeImgTried(userId, tried);
            continue;
          }
          const alJson = await alRes.json();
          const media = alJson?.data?.Page?.media?.[0];
          const idMal: number | null = media?.idMal ?? null;
          if (!idMal) {
            tried.add(anime.name);
            writeImgTried(userId, tried);
            continue;
          }

          let gotDetails = false;
          try {
            const dRes = await fetch(`https://api.jikan.moe/v4/anime/${idMal}`);
            if (dRes.ok) {
              const dJson = await dRes.json();
              const data = dJson?.data;
              const img: string | undefined =
                data?.images?.jpg?.large_image_url ?? data?.images?.jpg?.image_url;
              if (img) {
                gotDetails = true;
                malId = data?.mal_id ?? idMal;
                imageUrl = img;
                malScore = data?.score ?? null;
              }
            }
          } catch {
            // fall through to AniList cover
          }

          if (!gotDetails) {
            malId = idMal;
            imageUrl = media?.coverImage?.large ?? undefined;
            malScore = null;
          }
        } catch {
          tried.add(anime.name);
          writeImgTried(userId, tried);
          continue;
        }
      }

      if (!imageUrl) {
        tried.add(anime.name);
        writeImgTried(userId, tried);
        continue;
      }
      await updateAnimeMeta(anime.id, { malId, imageUrl, malScore });
      if (signal.aborted) return;
      onPatch(anime.id, { malId, imageUrl, malScore });
    } catch {
      // ignore
    }
    await sleep(400);
  }
}

async function backfillSeasonType({ animes, onPatch, signal }: MigrationParams): Promise<void> {
  const targets = animes.filter((a) =>
    a.seasons.some((s) => s.malId && (s.type == null || s.type === "")),
  );
  if (targets.length === 0) return;

  for (const anime of targets) {
    if (signal.aborted) return;
    const seasons = [...anime.seasons];
    let changed = false;
    for (let i = 0; i < seasons.length; i++) {
      if (signal.aborted) return;
      const s = seasons[i];
      if (!s.malId || (s.type != null && s.type !== "")) continue;
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${s.malId}`);
        if (res.ok) {
          const json = await res.json();
          const t: string | null = json?.data?.type ?? null;
          if (t) {
            seasons[i] = { ...s, type: t };
            changed = true;
          }
        }
      } catch {
        // ignore
      }
      await sleep(400);
    }
    if (changed && !signal.aborted) {
      try {
        await updateSeasons(anime.id, seasons);
        // Keep the shared snapshot in sync so later backfills don't write stale seasons back.
        anime.seasons = seasons;
        if (signal.aborted) return;
        onPatch(anime.id, { seasons });
      } catch {
        // ignore
      }
    }
  }
}

async function backfillSeasonEpisodes({ animes, onPatch, signal }: MigrationParams): Promise<void> {
  const targets = animes.filter((a) =>
    a.seasons.some((s) => s.malId && s.episodes === undefined),
  );
  if (targets.length === 0) return;

  for (const anime of targets) {
    if (signal.aborted) return;
    const seasons = [...anime.seasons];
    let changed = false;
    for (let i = 0; i < seasons.length; i++) {
      if (signal.aborted) return;
      const s = seasons[i];
      if (!s.malId || s.episodes !== undefined) continue;
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${s.malId}`);
        if (res.ok) {
          const json = await res.json();
          seasons[i] = {
            ...s,
            episodes: json?.data?.episodes ?? null,
            durationMin: parseJikanDuration(json?.data?.duration),
          };
          changed = true;
        }
      } catch {
        // ignore; retried in a future session
      }
      await sleep(400);
    }
    if (changed && !signal.aborted) {
      try {
        await updateSeasons(anime.id, seasons);
        // Keep the shared snapshot in sync so later backfills don't write stale seasons back.
        anime.seasons = seasons;
        if (signal.aborted) return;
        onPatch(anime.id, { seasons });
      } catch {
        // ignore
      }
    }
  }
}

async function backfillGenres({ animes, onPatch, signal }: MigrationParams): Promise<void> {
  const targets = animes.filter((a) => a.genres == null && typeof a.malId === "number");
  if (targets.length === 0) return;

  for (const anime of targets) {
    if (signal.aborted) return;
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.malId}`);
      if (signal.aborted) return;
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data?.genres;
        const genres = [
          ...new Set(
            (Array.isArray(raw) ? raw : [])
              .map((g: { name?: unknown }) => (typeof g?.name === "string" ? g.name.trim() : ""))
              .filter((n: string) => n.length > 0),
          ),
        ] as string[];
        await updateAnimeMeta(anime.id, { genres });
        if (signal.aborted) return;
        onPatch(anime.id, { genres });
      }
    } catch {
      // ignore; retried in a future session
    }
    await sleep(400);
  }
}

async function migrateTierFromRatings({ userId, animes, onPatch, signal }: MigrationParams): Promise<void> {
  if (readVersion(userId) >= TIER_MIGRATION_VERSION) return;
  const candidates = animes.filter(
    (a) => a.tier == null && a.seasons.some((s) => typeof s.rating === "number"),
  );
  for (const a of candidates) {
    if (signal.aborted) return;
    const rated = a.seasons.filter(
      (s): s is Season & { rating: number } => typeof s.rating === "number",
    );
    if (rated.length === 0) continue;
    const avg = rated.reduce((sum, s) => sum + s.rating, 0) / rated.length;
    const tier = tierFromAverage(avg);
    try {
      await updateTier(a.id, tier);
      if (signal.aborted) return;
      onPatch(a.id, { tier });
    } catch (err) {
      console.error(err);
    }
  }
  if (!signal.aborted) writeVersion(userId, TIER_MIGRATION_VERSION);
}

export async function runMigrations(params: MigrationParams): Promise<void> {
  await backfillImageUrl(params);
  if (params.signal.aborted) return;
  await backfillSeasonType(params);
  if (params.signal.aborted) return;
  await backfillSeasonEpisodes(params);
  if (params.signal.aborted) return;
  await backfillGenres(params);
  if (params.signal.aborted) return;
  await migrateTierFromRatings(params);
}
