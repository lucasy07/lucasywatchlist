import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Tv, Sparkles, Star, Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  type Anime,
  fetchAnimes,
  setWatched,
  deleteAnime as deleteAnimeRow,
  average,
  rankColor,
} from "@/lib/anime-storage";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated/watched")({
  head: () => ({
    meta: [
      { title: "Já Assistidos — Anime Watchlist" },
      {
        name: "description",
        content: "Histórico dos animes que você já terminou de assistir.",
      },
    ],
  }),
  component: WatchedPage,
});

function WatchedPage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAnimes();
        if (!cancelled) {
          setAnimes(data);
          setHydrated(true);
        }
      } catch {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const watched = useMemo(() => {
    return animes
      .filter((a) => a.watched)
      .sort((a, b) => average(b.seasons) - average(a.seasons));
  }, [animes]);

  async function unmark(id: string) {
    const prev = animes;
    setAnimes((p) => p.map((a) => (a.id === id ? { ...a, watched: false } : a)));
    try {
      await setWatched(id, false);
      toast.success("Movido de volta para a lista");
    } catch {
      toast.error("Falha ao atualizar");
      setAnimes(prev);
    }
  }

  async function remove(id: string) {
    const prev = animes;
    setAnimes((p) => p.filter((a) => a.id !== id));
    try {
      await deleteAnimeRow(id);
      toast.success("Anime removido");
    } catch {
      toast.error("Falha ao remover");
      setAnimes(prev);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Já assistidos</h1>
          </div>
          <div className="w-16 text-right text-xs text-muted-foreground">
            {watched.length} {watched.length === 1 ? "anime" : "animes"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        {!hydrated ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : watched.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Nenhum anime concluído</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Marque um anime como assistido na sua lista para vê-lo aqui.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ir para a lista
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {watched.map((anime) => {
              const avg = average(anime.seasons);
              return (
                <li
                  key={anime.id}
                  className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-border p-3 transition-all hover:border-primary/40 sm:gap-4 sm:p-4"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-24 sm:w-16">
                    {anime.cover ? (
                      <img
                        src={anime.cover}
                        alt={anime.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Tv className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold sm:text-base">{anime.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {anime.seasons.length}{" "}
                      {anime.seasons.length === 1 ? "temporada" : "temporadas"}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className={`h-3.5 w-3.5 ${rankColor(avg)}`} fill="currentColor" />
                      <span className={`text-xs font-bold tabular-nums ${rankColor(avg)}`}>
                        {avg.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unmark(anime.id)}
                      className="h-8 text-xs"
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Reabrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(anime.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remover anime"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
