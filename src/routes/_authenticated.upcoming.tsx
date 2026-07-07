import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Tv, Sparkles, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  type Anime,
  type UpcomingSeason,
  fetchAnimes,
  daysUntil,
  formatDateBR,
  formatReleaseLabel,
} from "@/lib/anime-storage";
import { useAuth } from "@/auth/AuthProvider";
import { UpcomingEditDialog } from "@/components/UpcomingEditDialog";

export const Route = createFileRoute("/_authenticated/upcoming")({
  head: () => ({
    meta: [
      { title: "Próximas Temporadas — Anime Watchlist" },
      {
        name: "description",
        content: "Cronograma das próximas temporadas dos seus animes favoritos.",
      },
      { property: "og:title", content: "Próximas Temporadas — Anime Watchlist" },
      {
        property: "og:description",
        content: "Cronograma das próximas temporadas dos seus animes favoritos.",
      },
    ],
  }),
  component: UpcomingPage,
});

function UpcomingPage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editAnimeId, setEditAnimeId] = useState<string>("");

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

  const upcoming = useMemo(() => {
    return animes
      .filter((a) => a.upcoming?.releaseDate)
      .map((a) => ({ anime: a, days: daysUntil(a.upcoming!.releaseDate) ?? 0 }))
      .sort((x, y) => x.days - y.days);
  }, [animes]);

  const future = upcoming.filter((u) => u.days >= 0);
  const past = upcoming.filter((u) => u.days < 0);

  const animesWithoutUpcoming = useMemo(
    () => animes.filter((a) => !a.upcoming),
    [animes],
  );

  function openEdit(animeId: string) {
    setEditAnimeId(animeId);
    setEditOpen(true);
  }

  function handleSaved(animeId: string, upcoming: UpcomingSeason | null) {
    setAnimes((prev) =>
      prev.map((a) => (a.id === animeId ? { ...a, upcoming: upcoming ?? undefined } : a)),
    );
  }

  const editingAnime = animes.find((a) => a.id === editAnimeId);

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
            <CalendarClock className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Em breve</h1>
          </div>
          <div className="w-16 text-right text-xs text-muted-foreground">
            {future.length} {future.length === 1 ? "anime" : "animes"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        {!hydrated ? null : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Nada agendado</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Adicione uma data de lançamento em algum anime para ver o cronograma
              aqui.
            </p>
            {animesWithoutUpcoming.length > 0 ? (
              <Button className="mt-6" onClick={() => openEdit(animesWithoutUpcoming[0].id)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar lançamento
              </Button>
            ) : (
              <Link
                to="/"
                className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ir para a lista
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {future.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Próximos lançamentos
                </h2>
                <ul className="grid gap-3">
                  {future.map(({ anime, days }) => (
                    <UpcomingRow
                      key={anime.id}
                      anime={anime}
                      days={days}
                      onEdit={() => openEdit(anime.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Já lançados
                </h2>
                <ul className="grid gap-3 opacity-70">
                  {past.map(({ anime, days }) => (
                    <UpcomingRow
                      key={anime.id}
                      anime={anime}
                      days={days}
                      onEdit={() => openEdit(anime.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      {editingAnime && (
        <UpcomingEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          animeId={editingAnime.id}
          animeName={editingAnime.name}
          initial={editingAnime.upcoming}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function UpcomingRow({
  anime,
  days,
  onEdit,
}: {
  anime: Anime;
  days: number;
  onEdit: () => void;
}) {
  const isSoon = days >= 0 && days <= 30;
  return (
    <li
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
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          {anime.upcoming?.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isSoon
                ? "bg-primary/15 text-primary"
                : days < 0
                  ? "bg-secondary text-muted-foreground"
                  : "bg-secondary text-foreground"
            }`}
          >
            <CalendarClock className="h-3 w-3" />
            {formatReleaseLabel(anime.upcoming?.releaseDate)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDateBR(anime.upcoming?.releaseDate)}
          </span>
          {anime.upcoming?.source === "auto" && (
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Detectado
            </span>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit} className="h-8 text-xs">
        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
      </Button>
    </li>
  );
}
