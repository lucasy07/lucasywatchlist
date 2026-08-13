import { useMemo } from "react";
import { User } from "lucide-react";
import type { Anime, Tier } from "@/lib/anime-storage";
import { mediaMAL, allGenres, TIER_VALUE } from "@/lib/anime-storage";
import { useAuth } from "@/auth/AuthProvider";
import { tierColor, tierBg } from "@/components/TierPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type StatsDialogProps = {
  animes: Anime[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Stats = {
  total: number;
  watchedCount: number;
  queuedCount: number;
  totalSeasons: number;
  genresCount: number;
  watchedPercent: number;
  avgMal: number | null;
  scoredCount: number;
  bestAnime: Anime | null;
  bestScore: number | null;
  mostSeasonsAnime: Anime | null;
  mostSeasons: number | null;
  dominantTier: string | null;
  dominantTierCount: number;
  topGenre: { name: string; count: number } | null;
  seasonsPerAnime: number | null;
  tierDistribution: Array<{ tier: Tier | "none"; count: number; max: number }>;
  topGenres: Array<{ name: string; count: number; max: number }>;
  seasonTypeCounts: Array<{ name: string; count: number }>;
  decadeCounts: Array<{ name: string; count: number; max: number }>;
};

export function StatsDialog({ animes, open, onOpenChange }: StatsDialogProps) {
  const { user } = useAuth();

  // All calculations are based on the entire collection, never the filtered view.
  const stats = useMemo<Stats>(() => {
    const total = animes.length;
    const watchedCount = animes.filter((a) => a.watched).length;
    const queuedCount = total - watchedCount;
    const totalSeasons = animes.reduce((sum, a) => sum + a.seasons.length, 0);
    const genres = allGenres(animes);
    const watchedPercent = total === 0 ? 0 : Math.round((watchedCount / total) * 100);

    const malScores = animes
      .map((a) => mediaMAL(a.seasons))
      .filter((s): s is number => s !== null);
    const avgMal =
      malScores.length === 0 ? null : malScores.reduce((s, x) => s + x, 0) / malScores.length;

    let bestAnime: Anime | null = null;
    let bestScore: number | null = null;
    for (const a of animes) {
      const score = mediaMAL(a.seasons);
      if (score !== null && (bestScore === null || score > bestScore)) {
        bestScore = score;
        bestAnime = a;
      }
    }

    let mostSeasonsAnime: Anime | null = null;
    let mostSeasons = -1;
    for (const a of animes) {
      if (a.seasons.length > mostSeasons) {
        mostSeasons = a.seasons.length;
        mostSeasonsAnime = a;
      }
    }
    if (mostSeasonsAnime && mostSeasons <= 0) mostSeasonsAnime = null;

    const tierCounts = new Map<string, number>();
    for (const a of animes) {
      if (!a.watched || !a.tier) continue;
      tierCounts.set(a.tier, (tierCounts.get(a.tier) ?? 0) + 1);
    }
    let dominantTier: string | null = null;
    let dominantTierCount = 0;
    for (const [tier, count] of tierCounts) {
      if (count > dominantTierCount) {
        dominantTierCount = count;
        dominantTier = tier;
      }
    }

    const topGenre = genres[0] ?? null;

    // Tier distribution among watched animes
    const tierDistribution: Array<{ tier: Tier | "none"; count: number }> = (
      Object.keys(TIER_VALUE) as Tier[]
    )
      .sort((a, b) => TIER_VALUE[b] - TIER_VALUE[a])
      .map((tier) => {
        const count = animes.filter((a) => a.watched && a.tier === tier).length;
        return { tier, count };
      });
    const unwatchedWithoutTier = animes.filter((a) => a.watched && !a.tier).length;
    tierDistribution.push({ tier: "none", count: unwatchedWithoutTier });
    const maxTierCount = Math.max(...tierDistribution.map((d) => d.count), 1);
    const tierDistributionWithMax = tierDistribution.map((d) => ({ ...d, max: maxTierCount }));

    // Top genres
    const topGenres = genres.slice(0, 8);
    const maxGenreCount = topGenres.length > 0 ? Math.max(...topGenres.map((g) => g.count), 1) : 1;
    const topGenresWithMax = topGenres.map((g) => ({ ...g, max: maxGenreCount }));

    // Season types
    const typeCounts = new Map<string, number>();
    for (const a of animes) {
      for (const s of a.seasons) {
        const type = typeof s.type === "string" && s.type.trim() !== "" ? s.type.trim() : "Sem tipo";
        typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      }
    }
    const seasonTypeCounts = [...typeCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // Decades from season years
    const decadeCounts = new Map<string, number>();
    for (const a of animes) {
      for (const s of a.seasons) {
        if (typeof s.year === "number" && !Number.isNaN(s.year)) {
          const decade = Math.floor(s.year / 10) * 10;
          const key = `${decade}s`;
          decadeCounts.set(key, (decadeCounts.get(key) ?? 0) + 1);
        }
      }
    }
    const decadeList = [...decadeCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const decadeA = parseInt(a.name, 10);
        const decadeB = parseInt(b.name, 10);
        return decadeA - decadeB;
      });
    const maxDecadeCount = decadeList.length > 0 ? Math.max(...decadeList.map((d) => d.count), 1) : 1;
    const decadeListWithMax = decadeList.map((d) => ({ ...d, max: maxDecadeCount }));

    return {
      total,
      watchedCount,
      queuedCount,
      totalSeasons,
      genresCount: genres.length,
      watchedPercent,
      avgMal,
      scoredCount: malScores.length,
      bestAnime,
      bestScore,
      mostSeasonsAnime,
      mostSeasons: mostSeasonsAnime ? mostSeasons : null,
      dominantTier,
      dominantTierCount,
      topGenre,
      seasonsPerAnime: total === 0 ? null : totalSeasons / total,
      tierDistribution: tierDistributionWithMax,
      topGenres: topGenresWithMax,
      seasonTypeCounts,
      decadeCounts: decadeListWithMax,
    };
  }, [animes]);

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const emailInitial = user?.email ? user.email.charAt(0).toUpperCase() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estatísticas</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {/* Collection header */}
          <div className="rounded-xl border border-border/60 bg-background/30 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 font-display text-lg font-bold text-primary">
                  {emailInitial ?? <User className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold">
                    {user?.email ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Conta criada em{" "}
                    {createdAt && !Number.isNaN(createdAt.getTime())
                      ? createdAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-4 border-t pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <div className="text-center">
                  <p className="font-display font-bold tabular-nums">{stats.total}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Animes</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold tabular-nums">{stats.totalSeasons}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Temporadas</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold tabular-nums">{stats.genresCount}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Gêneros</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="font-display font-bold tabular-nums text-primary">
                {stats.watchedPercent}%
              </span>
              <div className="flex-1">
                <Progress
                  value={stats.total === 0 ? 0 : stats.watchedPercent}
                  className="bg-foreground/7"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {stats.watchedCount} / {stats.total} assistidos
              </span>
            </div>
          </div>

          {/* Records grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Collection group */}
            <div className="rounded-xl border border-border/60 bg-background/30 p-4">
              <p className="mb-3 text-[9px] uppercase tracking-widest text-muted-foreground">Coleção</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Assistidos</p>
                  <p className="font-display font-bold tabular-nums">{stats.total === 0 ? "—" : stats.watchedCount}</p>
                  {stats.total > 0 && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {Math.round((stats.watchedCount / stats.total) * 100)}% da lista
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Na fila</p>
                  <p className="font-display font-bold tabular-nums">{stats.total === 0 ? "—" : stats.queuedCount}</p>
                  {stats.total > 0 && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {Math.round((stats.queuedCount / stats.total) * 100)}% da lista
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Temporadas</p>
                  <p className="font-display font-bold tabular-nums">{stats.totalSeasons === 0 ? "—" : stats.totalSeasons}</p>
                  {stats.seasonsPerAnime !== null && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stats.seasonsPerAnime.toFixed(1)} por anime
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Média MAL</p>
                  <p className={`font-display font-bold tabular-nums ${stats.avgMal === null ? "" : "text-primary"}`}>
                    {stats.avgMal === null ? "—" : stats.avgMal.toFixed(2)}
                  </p>
                  {stats.scoredCount > 0 && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stats.scoredCount} com nota
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Highlights group */}
            <div className="rounded-xl border border-border/60 bg-background/30 p-4">
              <p className="mb-3 text-[9px] uppercase tracking-widest text-muted-foreground">Destaques</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Melhor nota</p>
                  <p className={`font-display font-bold tabular-nums ${stats.bestScore === null ? "" : "text-primary"}`}>
                    {stats.bestScore === null ? "—" : stats.bestScore.toFixed(2)}
                  </p>
                  {stats.bestAnime ? (
                    <p className="truncate text-[11px] text-muted-foreground" title={stats.bestAnime.name}>
                      {stats.bestAnime.name}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Mais temporadas</p>
                  <p className="font-display font-bold tabular-nums">
                    {stats.mostSeasons === null ? "—" : stats.mostSeasons}
                  </p>
                  {stats.mostSeasonsAnime ? (
                    <p className="truncate text-[11px] text-muted-foreground" title={stats.mostSeasonsAnime.name}>
                      {stats.mostSeasonsAnime.name}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Tier dominante</p>
                  <p className={`font-display font-bold tabular-nums ${stats.dominantTier ? tierColor(stats.dominantTier as import("@/lib/anime-storage").Tier) : ""}`}>
                    {stats.dominantTier ?? "—"}
                  </p>
                  {stats.dominantTier !== null && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stats.dominantTierCount} animes
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Gênero mais comum</p>
                  <p className="font-display font-bold tabular-nums text-sm">
                    {stats.topGenre ? stats.topGenre.name : "—"}
                  </p>
                  {stats.topGenre && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {stats.topGenre.count} animes
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
