import { Award, Image as ImageIcon, Pencil, RefreshCw } from "lucide-react";

import { SeasonThumb } from "@/components/SeasonThumb";
import { tierColor } from "@/components/TierPicker";
import { WatchedIcon } from "@/components/WatchedIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Anime,
  AWARD_GENRE,
  formatLastChecked,
  isAwardWinning,
  isExcludedFromAverage,
  mediaMAL,
} from "@/lib/anime-storage";
import { formatScore, scoreColor } from "@/lib/score-format";

type AnimeDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anime: Anime | null;
  scoreMode: "mal" | "gosto";
  checking: boolean;
  checkingId: string | null;
  updatingMalScores: boolean;
  onCheckSeasons: (animeId: string) => void;
  onToggleWatched: (animeId: string, next: boolean) => void;
  onEdit: (animeId: string) => void;
  onSelectGenre: (genre: string) => void;
};

export function AnimeDetailDialog({
  open,
  onOpenChange,
  anime,
  scoreMode,
  checking,
  checkingId,
  updatingMalScores,
  onCheckSeasons,
  onToggleWatched,
  onEdit,
  onSelectGenre,
}: AnimeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] sm:max-w-2xl overflow-y-auto overflow-x-hidden border-border bg-card">
        <DialogHeader>
          <DialogTitle>Detalhes do anime</DialogTitle>
        </DialogHeader>
        {anime ? (
          <div className="grid gap-4">
            <div className="flex gap-4">
              {anime.cover || anime.imageUrl ? (
                <img
                  src={anime.cover ?? anime.imageUrl ?? undefined}
                  alt={anime.name}
                  className="aspect-[2/3] w-28 shrink-0 rounded-lg object-cover ring-1 ring-border/50"
                />
              ) : (
                <div className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="font-display text-base font-semibold leading-tight tracking-tight break-words sm:text-lg">
                  {anime.name}
                </h3>
                <Badge variant="outline" className="w-fit gap-1 border-primary/30 px-2 py-0.5">
                  <span className={`font-display font-bold ${tierColor(anime.tier)}`}>
                    {anime.tier ?? "—"}
                  </span>
                </Badge>
                <div className="mt-1 flex flex-wrap gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      MAL
                    </span>
                    <span
                      className={`font-display text-xl font-bold tabular-nums ${scoreColor(mediaMAL(anime.seasons))}`}
                    >
                      {formatScore(mediaMAL(anime.seasons))}
                      {mediaMAL(anime.seasons) !== null && (
                        <span className="ml-0.5 text-[10px] text-muted-foreground">/10</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Gêneros
              </h4>
              {anime.genres === null || anime.genres === undefined ? (
                <p className="text-sm text-muted-foreground">Sem gêneros</p>
              ) : anime.genres.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum gênero no MAL</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {isAwardWinning(anime) && (
                    <button
                      key={AWARD_GENRE}
                      type="button"
                      aria-label="Filtrar por Award Winning"
                      title="Award Winning (MAL)"
                      onClick={() => onSelectGenre(AWARD_GENRE)}
                      className="focus-ring inline-flex items-center gap-1 rounded-md bg-award px-2 py-1 text-[11px] font-medium text-award-foreground transition-colors hover:brightness-110"
                    >
                      <Award className="h-3 w-3" />
                      Award Winning
                    </button>
                  )}
                  {anime.genres
                    .filter((g) => g.trim().toLowerCase() !== AWARD_GENRE.toLowerCase())
                    .map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-label={`Filtrar por ${g}`}
                        onClick={() => onSelectGenre(g)}
                        className="focus-ring rounded-md bg-foreground/5 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                      >
                        {g}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Temporadas
              </h4>
              {anime.seasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma temporada</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3">
                  {anime.seasons.map((season) => {
                    const excluded = isExcludedFromAverage(season);
                    return (
                      <div
                        key={season.id}
                        className={`flex flex-col gap-1 ${excluded ? "opacity-60" : ""}`}
                      >
                        <SeasonThumb
                          season={season}
                          className="aspect-[2/3] w-full rounded"
                          alt={season.name}
                        />
                        <p
                          className="line-clamp-2 text-xs font-medium leading-tight"
                          title={season.name}
                        >
                          {season.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {[
                            season.type,
                            season.year,
                            typeof season.malScore === "number" &&
                              `MAL ${season.malScore.toFixed(2)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          {excluded && <span className="block">fora da média</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        <DialogFooter>
          {scoreMode !== "gosto" && (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => anime && onCheckSeasons(anime.id)}
                disabled={checking || checkingId !== null || updatingMalScores || !anime?.malId}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${anime && checkingId === anime.id ? "animate-spin" : ""}`}
                />
                Verificar novas temporadas
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {formatLastChecked(anime?.lastCheckedAt)}
              </span>
            </div>
          )}
          {anime && (
            <Button variant="outline" onClick={() => onToggleWatched(anime.id, !anime.watched)}>
              <WatchedIcon watched={anime.watched} />
              {anime.watched ? "Desmarcar" : "Assistido"}
            </Button>
          )}
          <Button onClick={() => (anime ? onEdit(anime.id) : onOpenChange(false))}>
            <Pencil className="mr-1 h-4 w-4" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
