import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Tv,
  Sparkles,
  Star,
  Undo2,
  Trash2,
  Pencil,
  ImagePlus,
  X,
  Plus,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  type Anime,
  type Season,
  fetchAnimes,
  setWatched,
  deleteAnime as deleteAnimeRow,
  updateAnime,
  updateSeasons,
  average,
  rankColor,
  uid,
} from "@/lib/anime-storage";
import { useAuth } from "@/auth/AuthProvider";
import { UpcomingEditDialog } from "@/components/UpcomingEditDialog";

export const Route = createFileRoute("/_authenticated/watched")({
  codeSplitGroupings: [["component"]],
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

async function fileToBase64(file: File, maxSize = 512): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function WatchedPage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAnimeId, setEditAnimeId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editCover, setEditCover] = useState<string | undefined>(undefined);
  const [editSeasons, setEditSeasons] = useState<Season[]>([]);
  const editCoverInputRef = useRef<HTMLInputElement>(null);

  // Upcoming dialog
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [upcomingAnimeId, setUpcomingAnimeId] = useState<string>("");

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

  function openEdit(animeId: string) {
    const a = animes.find((x) => x.id === animeId);
    if (!a) return;
    setEditAnimeId(a.id);
    setEditName(a.name);
    setEditCover(a.cover);
    setEditSeasons(a.seasons.map((s) => ({ ...s })));
    setEditDialogOpen(true);
  }

  async function handleEditCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setEditCover(b64);
    } catch {
      toast.error("Falha ao processar imagem");
    } finally {
      if (editCoverInputRef.current) editCoverInputRef.current.value = "";
    }
  }

  function updateEditSeason(id: string, patch: Partial<Season>) {
    setEditSeasons((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeEditSeason(id: string) {
    setEditSeasons((prev) => prev.filter((s) => s.id !== id));
  }

  function addEditSeason() {
    setEditSeasons((prev) => [...prev, { id: uid(), name: "", rating: 0 }]);
  }

  async function saveEdit() {
    if (!editAnimeId) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Informe o nome do anime");
      return;
    }
    for (const s of editSeasons) {
      if (!s.name.trim()) {
        toast.error("Toda temporada precisa de nome");
        return;
      }
      if (s.rating !== null && (Number.isNaN(s.rating) || s.rating < 0 || s.rating > 10)) {
        toast.error(`Nota inválida em "${s.name}"`);
        return;
      }
    }
    const cleaned = editSeasons.map((s) => ({ ...s, name: s.name.trim() }));
    const original = animes.find((a) => a.id === editAnimeId);
    setAnimes((prev) =>
      prev.map((a) =>
        a.id === editAnimeId ? { ...a, name, cover: editCover, seasons: cleaned } : a,
      ),
    );
    setEditDialogOpen(false);
    try {
      const tasks: Promise<void>[] = [];
      if (!original || original.name !== name || original.cover !== editCover) {
        tasks.push(updateAnime(editAnimeId, { name, cover: editCover ?? null }));
      }
      tasks.push(updateSeasons(editAnimeId, cleaned));
      await Promise.all(tasks);
      toast.success("Alterações salvas");
    } catch {
      toast.error("Falha ao salvar alterações");
      if (original) {
        setAnimes((prev) => prev.map((a) => (a.id === editAnimeId ? original : a)));
      }
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
                      onClick={() => openEdit(anime.id)}
                      className="h-8 text-xs"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUpcomingAnimeId(anime.id);
                        setUpcomingOpen(true);
                      }}
                      className="h-8 text-xs"
                    >
                      <CalendarClock className="mr-1 h-3.5 w-3.5" />
                      {anime.upcoming ? "Lançamento" : "+ Lançamento"}
                    </Button>
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

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar anime</DialogTitle>
            <DialogDescription>Atualize nome, capa e temporadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Capa</Label>
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {editCover ? (
                    <img src={editCover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Tv className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={editCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditCoverPick}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editCoverInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-1 h-4 w-4" /> Trocar capa
                  </Button>
                  {editCover && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditCover(undefined)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="mr-1 h-4 w-4" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temporadas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEditSeason}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </div>
              {editSeasons.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma temporada.</p>
              ) : (
                <ul className="space-y-2">
                  {editSeasons.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <Input
                        value={s.name}
                        onChange={(e) => updateEditSeason(s.id, { name: e.target.value })}
                        placeholder="Nome"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={s.rating == null ? "" : s.rating}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") return updateEditSeason(s.id, { rating: null });
                          const v = parseFloat(raw.replace(",", "."));
                          updateEditSeason(s.id, { rating: Number.isNaN(v) ? null : v });
                        }}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEditSeason(s.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        aria-label="Remover temporada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(() => {
        const a = animes.find((x) => x.id === upcomingAnimeId);
        if (!a) return null;
        return (
          <UpcomingEditDialog
            open={upcomingOpen}
            onOpenChange={setUpcomingOpen}
            animeId={a.id}
            animeName={a.name}
            initial={a.upcoming}
            onSaved={(id, upcoming) =>
              setAnimes((prev) =>
                prev.map((x) => (x.id === id ? { ...x, upcoming: upcoming ?? undefined } : x)),
              )
            }
          />
        );
      })()}
    </div>
  );
}
