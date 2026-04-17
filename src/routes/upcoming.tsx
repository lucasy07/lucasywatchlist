import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Tv, Sparkles } from "lucide-react";
import {
  type Anime,
  loadAnimes,
  daysUntil,
  formatDateBR,
  formatReleaseLabel,
} from "@/lib/anime-storage";

export const Route = createFileRoute("/upcoming")({
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
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAnimes(loadAnimes());
    setHydrated(true);
  }, []);

  const upcoming = useMemo(() => {
    return animes
      .filter((a) => a.upcoming?.releaseDate)
      .map((a) => ({ anime: a, days: daysUntil(a.upcoming!.releaseDate) ?? 0 }))
      .sort((x, y) => x.days - y.days);
  }, [animes]);

  const future = upcoming.filter((u) => u.days >= 0);
  const past = upcoming.filter((u) => u.days < 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <Link
              to="/"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ir para a lista
            </Link>
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
                    <UpcomingRow key={anime.id} anime={anime} days={days} />
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
                    <UpcomingRow key={anime.id} anime={anime} days={days} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function UpcomingRow({ anime, days }: { anime: Anime; days: number }) {
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
        </div>
      </div>
    </li>
  );
}
