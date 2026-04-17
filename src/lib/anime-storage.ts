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
};

export const STORAGE_KEY = "anime-ranker:v1";

export function loadAnimes(): Anime[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Anime[];
  } catch {
    return [];
  }
}

export function saveAnimes(animes: Anime[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(animes));
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

/**
 * Returns days until release. Negative = already released.
 * null if no upcoming or invalid date.
 */
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
