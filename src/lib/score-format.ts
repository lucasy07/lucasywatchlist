import { rankColor } from "@/lib/anime-storage";

export function formatScore(n: number | null): string {
  return n !== null && n !== undefined ? n.toFixed(2) : "—";
}

export function scoreColor(n: number | null): string {
  return n === null || n === undefined ? "text-muted-foreground" : rankColor(n);
}
