// Walks the Sequel/Prequel relation graph on Jikan (MAL) for an anime, then
// fetches details for each related entry. Used to import an entire series
// as one anime grouped by its seasons.

export type ChainSeason = {
  malId: number;
  title: string;
  year: number | null;
  malScore: number | null;
  imageUrl: string | null;
  type: string | null;
  status: string | null;
  airedFrom: string | null;
};

type JikanRelation = {
  relation: string;
  entry: Array<{ mal_id: number; type: string }>;
};

type JikanFull = {
  mal_id: number;
  title: string;
  type: string | null;
  status: string | null;
  year: number | null;
  score: number | null;
  aired?: { from?: string | null } | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
};

const KEEP_TYPES = new Set(["TV", "ONA", "Movie"]);
const MAX_ENTRIES = 15;
const DELAY_MS = 400;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  return (await res.json()) as T;
}

async function getRelations(malId: number, signal?: AbortSignal): Promise<number[]> {
  const json = await fetchJson<{ data: JikanRelation[] }>(
    `https://api.jikan.moe/v4/anime/${malId}/relations`,
    signal,
  );
  const ids: number[] = [];
  for (const rel of json.data ?? []) {
    if (rel.relation !== "Sequel" && rel.relation !== "Prequel") continue;
    for (const e of rel.entry ?? []) {
      if (e.type === "anime") ids.push(e.mal_id);
    }
  }
  return ids;
}

async function getDetails(malId: number, signal?: AbortSignal): Promise<JikanFull | null> {
  try {
    const json = await fetchJson<{ data: JikanFull }>(
      `https://api.jikan.moe/v4/anime/${malId}`,
      signal,
    );
    return json.data;
  } catch {
    return null;
  }
}

export type ChainProgress = {
  current: number;
  total: number;
};

/**
 * Build the season chain for a given malId by walking Sequel/Prequel
 * relations recursively. Sequential requests with rate-limit delay.
 *
 * Returns seasons of type TV/ONA, sorted by year ascending.
 */
export async function buildChain(
  rootMalId: number,
  onProgress?: (p: ChainProgress) => void,
  signal?: AbortSignal,
): Promise<ChainSeason[]> {
  const visited = new Set<number>([rootMalId]);
  const queue: number[] = [rootMalId];
  const idsToFetch: number[] = [];

  // Discovery phase: BFS the relation graph collecting unique ids.
  while (queue.length > 0 && idsToFetch.length < MAX_ENTRIES) {
    const id = queue.shift()!;
    idsToFetch.push(id);
    if (idsToFetch.length >= MAX_ENTRIES) break;
    try {
      const related = await getRelations(id, signal);
      for (const r of related) {
        if (visited.has(r)) continue;
        if (visited.size >= MAX_ENTRIES) break;
        visited.add(r);
        queue.push(r);
      }
    } catch {
      // ignore relation errors for a single node
    }
    await sleep(DELAY_MS);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  }

  const total = idsToFetch.length;
  onProgress?.({ current: 0, total });

  const seasons: ChainSeason[] = [];
  for (let i = 0; i < idsToFetch.length; i++) {
    const id = idsToFetch[i];
    const d = await getDetails(id, signal);
    if (d && d.type && KEEP_TYPES.has(d.type)) {
      const year =
        d.year ?? (d.aired?.from ? new Date(d.aired.from).getFullYear() : null);
      seasons.push({
        malId: d.mal_id,
        title: d.title,
        year: Number.isFinite(year as number) ? (year as number) : null,
        malScore: d.score ?? null,
        imageUrl:
          d.images?.jpg?.large_image_url ?? d.images?.jpg?.image_url ?? null,
        type: d.type,
        status: d.status ?? null,
        airedFrom: d.aired?.from ?? null,
      });
    }
    onProgress?.({ current: i + 1, total });
    if (i < idsToFetch.length - 1) await sleep(DELAY_MS);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  }

  seasons.sort((a, b) => {
    const ay = a.year ?? Number.POSITIVE_INFINITY;
    const by = b.year ?? Number.POSITIVE_INFINITY;
    if (ay !== by) return ay - by;
    return a.malId - b.malId;
  });
  return seasons;
}
