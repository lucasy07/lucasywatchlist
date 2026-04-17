import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tv,
  Trophy,
  Sparkles,
  ImagePlus,
  X,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

type Season = {
  id: string;
  name: string;
  rating: number;
};

type Anime = {
  id: string;
  name: string;
  seasons: Season[];
  cover?: string;
};

async function fileToBase64(file: File, maxSize = 512): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  // Resize via canvas to keep LocalStorage light
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const STORAGE_KEY = "anime-ranker:v1";

function loadAnimes(): Anime[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Anime[];
  } catch {
    return [];
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function average(seasons: Season[]) {
  if (seasons.length === 0) return 0;
  return seasons.reduce((s, x) => s + x.rating, 0) / seasons.length;
}

function rankColor(avg: number) {
  if (avg >= 9) return "text-primary";
  if (avg >= 7) return "text-foreground";
  if (avg >= 5) return "text-muted-foreground";
  return "text-destructive";
}

function Index() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Add Anime dialog
  const [animeDialogOpen, setAnimeDialogOpen] = useState(false);
  const [newAnimeName, setNewAnimeName] = useState("");
  const [newAnimeCover, setNewAnimeCover] = useState<string | undefined>(undefined);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Add Season dialog
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonAnimeId, setSeasonAnimeId] = useState<string>("");
  const [seasonName, setSeasonName] = useState("");
  const [seasonRating, setSeasonRating] = useState("");

  // FAB menu
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    setAnimes(loadAnimes());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(animes));
  }, [animes, hydrated]);

  const ranked = useMemo(() => {
    const filtered = animes.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase().trim()),
    );
    return [...filtered].sort((a, b) => average(b.seasons) - average(a.seasons));
  }, [animes, search]);

  function addAnime() {
    const name = newAnimeName.trim();
    if (!name) {
      toast.error("Informe o nome do anime");
      return;
    }
    const anime: Anime = { id: uid(), name, seasons: [], cover: newAnimeCover };
    setAnimes((prev) => [...prev, anime]);
    setNewAnimeName("");
    setNewAnimeCover(undefined);
    setAnimeDialogOpen(false);
    toast.success(`"${name}" adicionado`);
  }

  async function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setNewAnimeCover(b64);
    } catch {
      toast.error("Falha ao processar imagem");
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  function openAddSeason(animeId?: string) {
    if (animes.length === 0) {
      toast.error("Adicione um anime primeiro");
      return;
    }
    setSeasonAnimeId(animeId ?? animes[0].id);
    setSeasonName("");
    setSeasonRating("");
    setSeasonDialogOpen(true);
  }

  function addSeason() {
    const name = seasonName.trim();
    const rating = parseFloat(seasonRating.replace(",", "."));
    if (!seasonAnimeId) {
      toast.error("Selecione um anime");
      return;
    }
    if (!name) {
      toast.error("Informe o nome da temporada");
      return;
    }
    if (Number.isNaN(rating) || rating < 0 || rating > 10) {
      toast.error("A nota deve estar entre 0 e 10");
      return;
    }
    setAnimes((prev) =>
      prev.map((a) =>
        a.id === seasonAnimeId
          ? { ...a, seasons: [...a.seasons, { id: uid(), name, rating }] }
          : a,
      ),
    );
    setSeasonDialogOpen(false);
    toast.success("Temporada adicionada");
  }

  function deleteAnime(id: string) {
    setAnimes((prev) => prev.filter((a) => a.id !== id));
    toast.success("Anime removido");
  }

  function deleteSeason(animeId: string, seasonId: string) {
    setAnimes((prev) =>
      prev.map((a) =>
        a.id === animeId
          ? { ...a, seasons: a.seasons.filter((s) => s.id !== seasonId) }
          : a,
      ),
    );
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Anime Ranker</h1>
              <p className="text-xs text-muted-foreground">Seu ranking pessoal</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted-foreground">Animes</p>
            <p className="text-lg font-semibold">{animes.length}</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar anime..."
              className="h-11 border-border bg-card pl-10 text-base"
            />
          </div>
        </div>
      </header>

      {/* List */}
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6">
        {ranked.length === 0 ? (
          <EmptyState onAdd={() => setAnimeDialogOpen(true)} hasAnimes={animes.length > 0} />
        ) : (
          <ul className="grid gap-4">
            {ranked.map((anime, idx) => {
              const avg = average(anime.seasons);
              const isOpen = expanded[anime.id] ?? false;
              return (
                <li
                  key={anime.id}
                  className="group relative overflow-hidden rounded-2xl border border-border transition-all hover:border-primary/40"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
                    <div className="flex h-10 w-8 shrink-0 items-center justify-center text-sm font-bold text-muted-foreground sm:h-14 sm:w-10 sm:text-lg">
                      #{idx + 1}
                    </div>
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-20 sm:w-14">
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
                      <h3 className="truncate text-sm font-semibold sm:text-lg">{anime.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {anime.seasons.length}{" "}
                        {anime.seasons.length === 1 ? "temporada" : "temporadas"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <Star className={`h-5 w-5 ${rankColor(avg)}`} fill="currentColor" />
                        <span className={`text-xl font-bold tabular-nums sm:text-2xl ${rankColor(avg)}`}>
                          {avg.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Média
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(anime.id)}
                      className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      aria-label={isOpen ? "Recolher" : "Expandir"}
                    >
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border bg-background/30 px-4 py-3 sm:px-5">
                      {anime.seasons.length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">
                          Nenhuma temporada ainda
                        </p>
                      ) : (
                        <ul className="grid gap-2">
                          {anime.seasons.map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2 transition-colors hover:bg-secondary"
                            >
                              <Tv className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 truncate text-sm">{s.name}</span>
                              <span
                                className={`text-sm font-semibold tabular-nums ${rankColor(s.rating)}`}
                              >
                                {s.rating.toFixed(1)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSeason(anime.id, s.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                aria-label="Remover temporada"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAddSeason(anime.id)}
                          className="flex-1"
                        >
                          <Plus className="mr-1 h-4 w-4" /> Temporada
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAnime(anime.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {fabOpen && (
          <>
            <button
              onClick={() => {
                setFabOpen(false);
                openAddSeason();
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
            >
              <Tv className="h-4 w-4 text-primary" /> Temporada
            </button>
            <button
              onClick={() => {
                setFabOpen(false);
                setAnimeDialogOpen(true);
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Anime
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-110 active:scale-95"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          aria-label="Adicionar"
        >
          <Plus
            className={`h-7 w-7 transition-transform ${fabOpen ? "rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Add Anime Dialog */}
      <Dialog open={animeDialogOpen} onOpenChange={setAnimeDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Novo Anime</DialogTitle>
            <DialogDescription>Adicione um anime ao seu ranking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="anime-name">Nome</Label>
            <Input
              id="anime-name"
              autoFocus
              value={newAnimeName}
              onChange={(e) => setNewAnimeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAnime()}
              placeholder="Ex: Frieren"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnimeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addAnime}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Season Dialog */}
      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Nova Temporada</DialogTitle>
            <DialogDescription>Atribua uma nota de 0 a 10.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Anime</Label>
              <Select value={seasonAnimeId} onValueChange={setSeasonAnimeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {animes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="season-name">Temporada</Label>
              <Input
                id="season-name"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                placeholder="Ex: Temporada 1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="season-rating">Nota (0 - 10)</Label>
              <Input
                id="season-rating"
                value={seasonRating}
                onChange={(e) => setSeasonRating(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSeason()}
                inputMode="decimal"
                placeholder="8.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSeasonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addSeason}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onAdd, hasAnimes }: { onAdd: () => void; hasAnimes: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-semibold">
        {hasAnimes ? "Nenhum resultado" : "Comece seu ranking"}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasAnimes
          ? "Tente buscar por outro nome."
          : "Adicione seu primeiro anime e comece a notar as temporadas."}
      </p>
      {!hasAnimes && (
        <Button onClick={onAdd} className="mt-6">
          <Plus className="mr-1 h-4 w-4" /> Adicionar anime
        </Button>
      )}
    </div>
  );
}
