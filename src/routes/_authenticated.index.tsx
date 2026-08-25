import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBootProgress } from "@/boot/BootProgress";

import { BrandLockup } from "@/components/BrandLockup";
import { useTilt } from "@/hooks/use-tilt";
import {
  Plus,
  Search,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tv,
  Sparkles,
  ImagePlus,
  X,
  LayoutGrid,
  List as ListIcon,
  CalendarClock,
  LogOut,
  Check,
  RotateCcw,

  Pencil,
  Image as ImageIcon,
  RefreshCw,
  Filter,
  AlertCircle,
  BarChart3,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

import {
  type Anime,
  type Season,
  type Tier,
  type UpcomingSeason,
  
  TIER_VALUE,
  tierFromAverage,
  fetchAnimes,
  createAnime,
  deleteAnime as deleteAnimeRow,
  updateSeasons,
  updateUpcoming,
  updateAnime,
  updateAnimeMeta,
  updateTier,
  updateTierPositions,
  updateLastCheckedAt,
  setWatched,
  importLegacyIfNeeded,
  uid,
  average,
  mediaMAL,
  mediaPessoal,
  rankColor,
  formatReleaseLabel,
  formatDateBR,
  formatLastChecked,
  isExcludedFromAverage,
  allGenres,
  parseJikanDuration,
} from "@/lib/anime-storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/auth/AuthProvider";
import { JikanSearch, type JikanPick } from "@/components/JikanSearch";
import { TierPicker, tierColor, tierBg } from "@/components/TierPicker";
import { StatsDialog } from "@/components/StatsDialog";
import { SortableSeasonList } from "@/components/SortableSeasonList";
import { SortableCardSeasons } from "@/components/SortableCardSeasons";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CoverArt, DraggableCover, TierDropRow } from "@/components/TierlistDnD";

import { buildChain, type ChainSeason } from "@/lib/jikan-chain";
import { runMigrations } from "@/lib/migrations";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";


const TIER_ROWS = (Object.keys(TIER_VALUE) as Tier[]).sort(
  (a, b) => TIER_VALUE[b] - TIER_VALUE[a],
);

const ROW_IDS = new Set<string>([...TIER_ROWS, "none"]);

/** Multi-container: ponteiro manda; cards têm prioridade sobre fileiras. */
const tierCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const collisions = pointer.length > 0 ? pointer : rectIntersection(args);
  const cards = collisions.filter((c) => !ROW_IDS.has(String(c.id)));
  return cards.length > 0 ? cards : collisions;
};

export const Route = createFileRoute("/_authenticated/")({
  codeSplitGroupings: [["component"]],
  component: Index,
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

function TiltCardInner({ children }: { children: React.ReactNode }) {
  const tilt = useTilt();
  return (
    <div
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group relative overflow-hidden rounded-2xl border border-border/60 transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]"
      style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)", transformOrigin: "center" }}
    >
      {children}
    </div>
  );
}

function formatScore(n: number | null): string {
  return n !== null && n !== undefined ? n.toFixed(2) : "—";
}

function scoreColor(n: number | null): string {
  return n === null || n === undefined ? "text-muted-foreground" : rankColor(n);
}



function Index() {
  const { user, signOut } = useAuth();
  const { setStep } = useBootProgress();

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [scoreMode, setScoreMode] = useState<"mal" | "gosto">("mal");
  const [tierFilter, setTierFilter] = useState<Set<Tier>>(() => new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(() => new Set());
  const [genreFilter, setGenreFilter] = useState<Set<string>>(() => new Set());
  const [semDadosFilter, setSemDadosFilter] = useState(false);
  const [watchedFilter, setWatchedFilter] = useState<"todos" | "nao" | "sim">("nao");
  const [draggingAnimeId, setDraggingAnimeId] = useState<string | null>(null);
  const tierSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const draggingAnime = draggingAnimeId
    ? (animes.find((a) => a.id === draggingAnimeId) ?? null)
    : null;


  const [showFilters, setShowFilters] = useState(false);
  
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Add Anime dialog
  const [animeDialogOpen, setAnimeDialogOpen] = useState(false);
  const [newAnimeName, setNewAnimeName] = useState("");
  
  const [newAnimeMal, setNewAnimeMal] = useState<JikanPick | null>(null);
  const [chainSeasons, setChainSeasons] = useState<ChainSeason[] | null>(null);
  const [selectedChainIds, setSelectedChainIds] = useState<Set<number>>(() => new Set());
  const [chainLoading, setChainLoading] = useState(false);
  const [chainProgress, setChainProgress] = useState<{ current: number; total: number } | null>(null);
  const [chainError, setChainError] = useState(false);
  const chainAbortRef = useRef<AbortController | null>(null);
  


  // Add Season dialog
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonAnimeId, setSeasonAnimeId] = useState<string>("");
  const [seasonSearch, setSeasonSearch] = useState("");
  const [seasonPick, setSeasonPick] = useState<JikanPick | null>(null);
  const [seasonDetailsLoading, setSeasonDetailsLoading] = useState(false);
  const [seasonDetails, setSeasonDetails] = useState<{ malId: number; type: string | null; year: number | null; episodes: number | null; durationMin: number | null } | null>(null);
  
  


  // FAB menu
  const [fabOpen, setFabOpen] = useState(false);

  // Edit Anime dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAnimeId, setEditAnimeId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editCover, setEditCover] = useState<string | undefined>(undefined);
  const [editSeasons, setEditSeasons] = useState<Season[]>([]);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const editCoverInputRef = useRef<HTMLInputElement>(null);


  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAnimeId, setDetailAnimeId] = useState<string>("");

  // Stats dialog
  const [statsOpen, setStatsOpen] = useState(false);

  // Check for new seasons

  type FoundSeason = {
    parentId: string;
    parentName: string;
    malId: number;
    title: string;
    malScore: number | null;
    imageUrl: string | null;
    type: string | null;
    year: number | null;
    episodes: number | null;
    durationMin: number | null;
  };
  type UpdatedSeason = {
    parentId: string;
    parentName: string;
    title: string;
    malId: number;
    oldScore: number | null;
    newScore: number | null;
    filledFields: string[];
  };
  const [checking, setChecking] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkProgress, setCheckProgress] = useState<{ current: number; total: number } | null>(null);
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [foundAvailable, setFoundAvailable] = useState<FoundSeason[]>([]);
  const [foundUpcoming, setFoundUpcoming] = useState<
    Array<{ parentId: string; parentName: string; title: string; releaseDate: string }>
  >([]);
  const [foundUpdated, setFoundUpdated] = useState<UpdatedSeason[]>([]);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const imported = await importLegacyIfNeeded(user.id);
        setStep(2);
        if (imported > 0) {
          toast.success(`${imported} anime${imported === 1 ? "" : "s"} importado${imported === 1 ? "" : "s"} do dispositivo`);
        }
        const data = await fetchAnimes();
        if (!cancelled) {
          setAnimes(data);
          setHydrated(true);
          setStep(3);
        }
      } catch (err) {
        console.error(err);
        toast.error("Falha ao carregar seus animes");
        if (!cancelled) setHydrated(true);
        setStep(3);

      }
    })();
    const savedView =
      typeof window !== "undefined" ? localStorage.getItem("anime-ranker:v1:view") : null;
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
    const savedScoreMode =
      typeof window !== "undefined" ? localStorage.getItem("anime-ranker:v1:scoreMode") : null;
    if (savedScoreMode === "mal" || savedScoreMode === "gosto") setScoreMode(savedScoreMode);
    const savedWatchedFilter =
      typeof window !== "undefined" ? localStorage.getItem("anime-ranker:v1:watchedFilter") : null;
    if (savedWatchedFilter === "todos" || savedWatchedFilter === "nao" || savedWatchedFilter === "sim") {
      setWatchedFilter(savedWatchedFilter);
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("anime-ranker:v1:view", viewMode);
  }, [viewMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("anime-ranker:v1:scoreMode", scoreMode);
  }, [scoreMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("anime-ranker:v1:watchedFilter", watchedFilter);
  }, [watchedFilter, hydrated]);




  // Run all data migrations/backfills once after hydration.
  useEffect(() => {
    if (!hydrated || !user) return;
    const ctrl = new AbortController();
    const onPatch = (id: string, patch: Partial<Anime>) => {
      setAnimes((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    };
    runMigrations({ userId: user.id, animes, onPatch, signal: ctrl.signal }).catch(() => {
      // ignore
    });
    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const lastCheckedGlobal = useMemo(() => {
    let latest: string | null = null;
    for (const a of animes) {
      if (a.lastCheckedAt && (latest === null || a.lastCheckedAt > latest)) latest = a.lastCheckedAt;
    }
    return latest;
  }, [animes]);

  const genreOptions = useMemo(() => allGenres(animes), [animes]);
  const genreFilterLower = useMemo(
    () => new Set([...genreFilter].map((g) => g.toLowerCase())),
    [genreFilter],
  );

  const ranked = useMemo(() => {
    const q = search.toLowerCase().trim();
    const wantedTypes = new Set(
      [...typeFilter].map((t) => t.toLowerCase()),
    );
    const wantedGenres = [...genreFilter].map((g) => g.toLowerCase());
    const filtered = animes.filter((a) => {
      if (scoreMode !== "gosto") {
        if (watchedFilter === "nao" && a.watched) return false;
        if (watchedFilter === "sim" && !a.watched) return false;
      }
      if (!a.name.toLowerCase().includes(q)) return false;
      if (tierFilter.size > 0 && (a.tier === null || !tierFilter.has(a.tier))) return false;
      if (
        wantedTypes.size > 0 &&
        !a.seasons.some((s) => s.type && wantedTypes.has(s.type.toLowerCase()))
      ) {
        return false;
      }
      if (wantedGenres.length > 0) {
        const have = new Set((a.genres ?? []).map((g) => g.toLowerCase()));
        if (have.size === 0) return false;
        if (!wantedGenres.every((g) => have.has(g))) return false;
      }
      if (semDadosFilter && !(a.tier === null || mediaMAL(a.seasons) === null)) return false;
      return true;
    });
    if (scoreMode === "gosto") {
      return [...filtered].sort((a, b) => {
        const va = a.tier === null ? -1 : TIER_VALUE[a.tier];
        const vb = b.tier === null ? -1 : TIER_VALUE[b.tier];
        if (vb !== va) return vb - va;
        const pa = a.tierPosition;
        const pb = b.tierPosition;
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      });
    }

    return [...filtered].sort((a, b) => {
      const ma = mediaMAL(a.seasons);
      const mb = mediaMAL(b.seasons);
      if (ma === null && mb === null) return 0;
      if (ma === null) return 1;
      if (mb === null) return -1;
      return mb - ma;
    });
  }, [animes, search, scoreMode, tierFilter, typeFilter, genreFilter, semDadosFilter, watchedFilter]);

  const watchedFilterActive = scoreMode !== "gosto" && watchedFilter !== "nao";
  const filtersActive =
    tierFilter.size > 0 || typeFilter.size > 0 || genreFilter.size > 0 || semDadosFilter || watchedFilterActive;
  const filtersActiveCount =
    tierFilter.size + typeFilter.size + genreFilter.size + (semDadosFilter ? 1 : 0) + (watchedFilterActive ? 1 : 0);
  function clearFilters() {
    setTierFilter(new Set());
    setTypeFilter(new Set());
    setGenreFilter(new Set());
    setSemDadosFilter(false);
    setWatchedFilter("nao");
  }
  function toggleTier(t: Tier) {
    setTierFilter((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }
  function toggleType(t: string) {
    setTypeFilter((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  }
  function toggleGenre(g: string) {
    setGenreFilter((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g); else n.add(g);
      return n;
    });
  }


  const watchedCount = useMemo(() => animes.filter((a) => a.watched).length, [animes]);
  const displayedCount = useMemo(() => {
    return scoreMode === "gosto" ? ranked.filter((a) => a.watched).length : ranked.length;
  }, [ranked, scoreMode]);
  const displayedTotal = useMemo(() => {
    return scoreMode === "gosto" ? watchedCount : animes.length;
  }, [scoreMode, watchedCount, animes.length]);
  const detailAnime = useMemo(
    () => animes.find((a) => a.id === detailAnimeId),
    [animes, detailAnimeId],
  );

  async function toggleWatched(id: string, next: boolean) {
    const prev = animes;
    setAnimes((p) => p.map((a) => (a.id === id ? { ...a, watched: next } : a)));
    try {
      await setWatched(id, next);
      toast.success(next ? "Marcado como assistido" : "Movido para a lista", {
        action: { label: "Desfazer", onClick: () => toggleWatched(id, !next) },
      });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao atualizar");
      setAnimes(prev);
    }
  }

  function resetAddAnime() {
    chainAbortRef.current?.abort();
    chainAbortRef.current = null;
    setNewAnimeName("");
    setNewAnimeMal(null);
    setChainSeasons(null);
    setChainLoading(false);
    setChainProgress(null);
    setChainError(false);
    setSelectedChainIds(new Set());
  }


  async function startChainFetch(pick: JikanPick) {
    chainAbortRef.current?.abort();
    const ctrl = new AbortController();
    chainAbortRef.current = ctrl;
    setChainLoading(true);
    setChainSeasons(null);
    setSelectedChainIds(new Set());
    setChainProgress({ current: 0, total: 0 });
    setChainError(false);
    try {
      const seasons = await buildChain(
        pick.malId,
        (p) => setChainProgress(p),
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      // Ensure the picked anime itself is included (in case it was filtered or
      // the API returned nothing): fall back to the pick details.
      const finalSeasons =
        seasons.length > 0
          ? seasons
          : [
              {
                malId: pick.malId,
                title: pick.title,
                year: null,
                malScore: pick.score,
                imageUrl: pick.imageUrl,
                type: null,
                status: null,
                airedFrom: null,
                genres: [],
                episodes: null,
                durationMin: null,
              },
            ];
      setChainSeasons(finalSeasons);
      setSelectedChainIds(new Set(finalSeasons.map((s) => s.malId)));
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error(err);
      toast.error("Falha ao buscar temporadas no MAL");
      setChainSeasons(null);
      setChainError(true);
    } finally {
      if (!ctrl.signal.aborted) setChainLoading(false);
    }
  }

  async function addAnime() {
    const name = newAnimeName.trim();
    if (!name) {
      toast.error("Informe o nome do anime");
      return;
    }
    if (chainLoading) return;
    const pick = newAnimeMal && newAnimeMal.title === name ? newAnimeMal : null;
    try {
      // MAL pick → save as one anime with full season chain
      if (pick && chainSeasons && chainSeasons.length > 0) {
        const selected = chainSeasons.filter((s) => selectedChainIds.has(s.malId));
        if (selected.length === 0) {
          toast.error("Selecione ao menos uma temporada");
          return;
        }
        const existingIds = new Set<number>();
        for (const a of animes) {
          if (a.malId) existingIds.add(a.malId);
          for (const s of a.seasons) if (s.malId) existingIds.add(s.malId);
        }
        if (selected.some((s) => existingIds.has(s.malId))) {
          toast.error("Esse anime já está na sua lista");
          return;
        }
        const first = selected[0];
        const seasons: Season[] = selected.map((s) => ({
          id: uid(),
          name: s.title,
          rating: null,
          malId: s.malId,
          year: s.year,
          malScore: s.malScore,
          type: s.type,
          episodes: s.episodes,
          durationMin: s.durationMin,
        }));
        const created = await createAnime({
          name: first.title,
          cover: first.imageUrl ?? undefined,
          malId: first.malId,
          imageUrl: first.imageUrl,
          malScore: first.malScore,
          genres: first.genres,
          seasons,
        });
        setAnimes((prev) => [...prev, created]);
        resetAddAnime();
        setAnimeDialogOpen(false);
        toast.success(
          `"${first.title}" adicionado com ${seasons.length} temporada${seasons.length === 1 ? "" : "s"}`,
        );
        return;
      }
      // Manual creation (no MAL chain)
      const created = await createAnime({
        name,
        cover: pick?.imageUrl ?? undefined,
        malId: pick?.malId ?? null,
        imageUrl: pick?.imageUrl ?? null,
        malScore: pick?.score ?? null,
      });
      setAnimes((prev) => [...prev, created]);
      resetAddAnime();
      setAnimeDialogOpen(false);
      toast.success(`"${name}" adicionado`);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar anime");
    }
  }


  function openAddSeason(animeId?: string) {
    if (animes.length === 0) {
      toast.error("Adicione um anime primeiro");
      return;
    }
    setSeasonAnimeId(animeId ?? animes[0].id);
    setSeasonSearch("");
    setSeasonPick(null);
    setSeasonDetails(null);
    setSeasonDetailsLoading(false);
    setSeasonDialogOpen(true);
  }

  async function persistSeasons(animeId: string, seasons: Season[]) {
    try {
      await updateSeasons(animeId, seasons);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar temporadas");
    }
  }

  async function pickSeasonEntry(pick: JikanPick) {
    setSeasonPick(pick);
    setSeasonDetails(null);
    setSeasonDetailsLoading(true);
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${pick.malId}`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        const t: string | null = data?.type ?? null;
        const y: number | null =
          data?.year ??
          (data?.aired?.from ? new Date(data.aired.from).getFullYear() : null);
        setSeasonDetails({
          malId: pick.malId,
          type: t,
          year: Number.isFinite(y as number) ? (y as number) : null,
          episodes: data?.episodes ?? null,
          durationMin: parseJikanDuration(data?.duration),
        });
      } else {
        setSeasonDetails({ malId: pick.malId, type: null, year: null, episodes: null, durationMin: null });
      }
    } catch {
      setSeasonDetails({ malId: pick.malId, type: null, year: null, episodes: null, durationMin: null });
    } finally {
      setSeasonDetailsLoading(false);
    }
  }




  async function addSeason() {
    if (!seasonAnimeId) {
      toast.error("Selecione um anime");
      return;
    }
    if (!seasonPick || seasonDetailsLoading) {
      toast.error("Escolha uma entrada");
      return;
    }
    const target = animes.find((a) => a.id === seasonAnimeId);
    if (!target) return;
    if (target.seasons.some((s) => s.malId === seasonPick.malId)) {
      toast.error("Essa entrada já está no anime");
      return;
    }
    const newSeason: Season = {
      id: uid(),
      name: seasonPick.title,
      rating: null,
      malId: seasonPick.malId,
      malScore: seasonPick.score ?? null,
      year: seasonDetails?.year ?? null,
      type: seasonDetails?.type ?? null,
      episodes: seasonDetails?.episodes ?? null,
      durationMin: seasonDetails?.durationMin ?? null,
    };
    const newSeasons = [...target.seasons, newSeason];
    const prev = animes;
    setAnimes((p) =>
      p.map((a) => (a.id === seasonAnimeId ? { ...a, seasons: newSeasons } : a)),
    );
    setSeasonDialogOpen(false);
    try {
      await updateSeasons(seasonAnimeId, newSeasons);
      toast.success("Temporada adicionada");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar temporada");
      setAnimes(prev);
    }
  }


  async function setAnimeTier(animeId: string, tier: Tier | null) {
    const prev = animes;
    setAnimes((p) => p.map((a) => (a.id === animeId ? { ...a, tier, tierPosition: null } : a)));
    try {
      await updateTier(animeId, tier);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar tier");
      setAnimes(prev);
    }
  }

  function tierRowOrdered(list: Anime[], destTier: Tier | null) {
    return list
      .filter((a) => a.watched && a.tier === destTier)
      .map((a, i) => ({ a, i }))
      .sort((x, y) => {
        const px = x.a.tierPosition;
        const py = y.a.tierPosition;
        if (px !== py) {
          if (px === null || px === undefined) return 1;
          if (py === null || py === undefined) return -1;
          return px - py;
        }
        return x.i - y.i;
      })
      .map(({ a }) => a);
  }

  async function moveAnimeInTierlist(
    animeId: string,
    destTier: Tier | null,
    overAnimeId: string | null,
  ) {
    const prev = animes;
    const dragged = prev.find((a) => a.id === animeId);
    if (!dragged) return;

    const tierChanged = dragged.tier !== destTier;

    let row: Anime[];
    if (!tierChanged) {
      const current = tierRowOrdered(prev, destTier);
      const oldIndex = current.findIndex((a) => a.id === animeId);
      let newIndex = current.length - 1;
      if (overAnimeId) {
        const idx = current.findIndex((a) => a.id === overAnimeId);
        if (idx !== -1) newIndex = idx;
      }
      row = oldIndex === -1 ? current : arrayMove(current, oldIndex, newIndex);
    } else {
      row = tierRowOrdered(prev, destTier).filter((a) => a.id !== animeId);
      let insertAt = row.length;
      if (overAnimeId) {
        const idx = row.findIndex((a) => a.id === overAnimeId);
        if (idx !== -1) insertAt = idx;
      }
      row.splice(insertAt, 0, dragged);
    }

    const positions = new Map(row.map((a, i) => [a.id, i] as const));

    setAnimes((p) =>
      p.map((a) => {
        const pos = positions.get(a.id);
        if (pos === undefined) return a;
        return {
          ...a,
          tier: a.id === animeId ? destTier : a.tier,
          tierPosition: pos,
        };
      }),
    );

    try {
      if (tierChanged) await updateTier(animeId, destTier);
      await updateTierPositions(row.map((a, i) => ({ id: a.id, tierPosition: i })));
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar tier");
      setAnimes(prev);
    }
  }

  async function deleteAnime(id: string) {
    const prev = animes;
    setAnimes((p) => p.filter((a) => a.id !== id));
    try {
      await deleteAnimeRow(id);
      toast.success("Anime removido");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao remover");
      setAnimes(prev);
    }
  }

  async function reorderSeasons(animeId: string, from: number, to: number) {
    const target = animes.find((a) => a.id === animeId);
    if (!target) return;
    if (from === to) return;
    const originalSeasons = target.seasons;
    const newSeasons = arrayMove(originalSeasons, from, to);
    setAnimes((prev) =>
      prev.map((a) => (a.id === animeId ? { ...a, seasons: newSeasons } : a)),
    );
    try {
      await updateSeasons(animeId, newSeasons);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao reordenar temporadas");
      setAnimes((prev) =>
        prev.map((a) => (a.id === animeId ? { ...a, seasons: originalSeasons } : a)),
      );
    }
  }

  async function deleteSeason(animeId: string, seasonId: string) {
    const target = animes.find((a) => a.id === animeId);
    if (!target) return;
    const index = target.seasons.findIndex((s) => s.id === seasonId);
    if (index === -1) return;
    const removed = target.seasons[index];
    const originalSeasons = target.seasons;
    const newSeasons = target.seasons.filter((s) => s.id !== seasonId);
    setAnimes((prev) =>
      prev.map((a) => (a.id === animeId ? { ...a, seasons: newSeasons } : a)),
    );
    try {
      await updateSeasons(animeId, newSeasons);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao remover temporada");
      setAnimes((prev) =>
        prev.map((a) => (a.id === animeId ? { ...a, seasons: originalSeasons } : a)),
      );
      return;
    }
    toast("Temporada removida", {
      duration: 6000,
      action: {
        label: "Desfazer",
        onClick: async () => {
          let restored: Season[] = [];
          let base: Season[] = [];
          setAnimes((prev) =>
            prev.map((a) => {
              if (a.id !== animeId) return a;
              base = a.seasons;
              restored = [...a.seasons.slice(0, index), removed, ...a.seasons.slice(index)];
              return { ...a, seasons: restored };
            }),
          );
          try {
            await updateSeasons(animeId, restored);
          } catch (err) {
            console.error(err);
            toast.error("Falha ao desfazer");
            setAnimes((prev) =>
              prev.map((a) => (a.id === animeId ? { ...a, seasons: base } : a)),
            );
          }
        },
      },
    });
  }

  async function scanTargets(targets: Anime[], onProgress?: (current: number, total: number) => void) {
    const existing = new Set<number>();
    for (const a of animes) {
      if (a.malId) existing.add(a.malId);
      for (const s of a.seasons) if (s.malId) existing.add(s.malId);
    }
    const available: FoundSeason[] = [];
    const upcomingSaved: Array<{ parentId: string; parentName: string; title: string; releaseDate: string }> = [];
    const updated: UpdatedSeason[] = [];
    for (let i = 0; i < targets.length; i++) {
      const a = targets[i];
      onProgress?.(i + 1, targets.length);
      try {
        const chain = await buildChain(a.malId!);
        const seasonsDraft = a.seasons.map((s) => ({ ...s }));
        let seasonsChanged = false;
        for (const s of chain) {
          if (existing.has(s.malId)) {
            const idx = seasonsDraft.findIndex((x) => x.malId === s.malId);
            if (idx >= 0) {
              const cur = seasonsDraft[idx];
              const next = { ...cur };
              let changed = false;
              const filledFields: string[] = [];
              const oldScore = typeof cur.malScore === "number" ? cur.malScore : null;
              if (typeof s.malScore === "number" && s.malScore !== oldScore) {
                next.malScore = s.malScore;
                changed = true;
              }
              if ((cur.year === null || cur.year === undefined) && s.year !== null && s.year !== undefined) {
                next.year = s.year;
                changed = true;
                filledFields.push("year");
              }
              if ((cur.type === null || cur.type === undefined) && s.type !== null && s.type !== undefined) {
                next.type = s.type;
                changed = true;
                filledFields.push("type");
              }
              if (changed) {
                seasonsDraft[idx] = next;
                seasonsChanged = true;
                updated.push({
                  parentId: a.id,
                  parentName: a.name,
                  title: cur.name,
                  malId: s.malId,
                  oldScore,
                  newScore: typeof next.malScore === "number" ? next.malScore : null,
                  filledFields,
                });
              }
            }
            continue;
          }
          existing.add(s.malId);
          const notAired =
            typeof s.status === "string" && s.status.toLowerCase().includes("not yet");
          if (notAired) {
            const iso = s.airedFrom
              ? s.airedFrom.slice(0, 10)
              : s.year
                ? `${s.year}-01-01`
                : null;
            if (!iso) continue;
            let shouldSave = false;
            const current = a.upcoming;
            const currentSource = current?.source ?? "manual";
            if (!current) {
              shouldSave = true;
            } else if (currentSource === "manual") {
              shouldSave = false;
            } else {
              const cur = new Date(current.releaseDate).getTime();
              const nu = new Date(iso).getTime();
              if (Number.isFinite(nu) && Number.isFinite(cur) && nu < cur) shouldSave = true;
            }
            if (shouldSave) {
              const upcoming: UpcomingSeason = {
                title: s.title,
                releaseDate: iso,
                source: "auto",
                malId: s.malId,
              };
              try {
                await updateUpcoming(a.id, upcoming);
                setAnimes((prev) => prev.map((x) => (x.id === a.id ? { ...x, upcoming } : x)));
                a.upcoming = upcoming;
                upcomingSaved.push({
                  parentId: a.id,
                  parentName: a.name,
                  title: s.title,
                  releaseDate: iso,
                });
              } catch (err) {
                console.error(err);
              }
            }
          } else {
            available.push({
              parentId: a.id,
              parentName: a.name,
              malId: s.malId,
              title: s.title,
              malScore: s.malScore,
              imageUrl: s.imageUrl,
              type: s.type,
              year: s.year,
              episodes: s.episodes,
              durationMin: s.durationMin,
            });
          }
        }
        if (seasonsChanged) {
          try {
            await updateSeasons(a.id, seasonsDraft);
            setAnimes((prev) =>
              prev.map((x) => (x.id === a.id ? { ...x, seasons: seasonsDraft } : x)),
            );
            a.seasons = seasonsDraft;
          } catch (err) {
            console.error("failed to persist season updates for", a.name, err);
          }
        }
        try {
          const iso = new Date().toISOString();
          await updateLastCheckedAt(a.id, iso);
          setAnimes((prev) =>
            prev.map((x) => (x.id === a.id ? { ...x, lastCheckedAt: iso } : x)),
          );
        } catch (err) {
          console.error("failed to persist last checked for", a.name, err);
        }
      } catch (err) {
        console.error("check chain failed for", a.name, err);
      }
    }
    return { available, upcomingSaved, updated };
  }

  async function checkNewSeasons() {
    if (checking || checkingId) return;
    const targets = animes.filter((a) => typeof a.malId === "number" && a.malId !== null);
    if (targets.length === 0) {
      toast.error("Nenhum anime com vínculo ao MAL");
      return;
    }
    setChecking(true);
    setCheckProgress({ current: 0, total: targets.length });
    let result: { available: FoundSeason[]; upcomingSaved: Array<{ parentId: string; parentName: string; title: string; releaseDate: string }>; updated: UpdatedSeason[] };
    try {
      result = await scanTargets(targets, (current, total) =>
        setCheckProgress({ current, total }),
      );
    } finally {
      setChecking(false);
      setCheckProgress(null);
    }
    if (
      result.available.length === 0 &&
      result.upcomingSaved.length === 0 &&
      result.updated.length === 0
    ) {
      toast("Nenhuma temporada nova encontrada");
      return;
    }
    setFoundAvailable(result.available);
    setFoundUpcoming(result.upcomingSaved);
    setFoundUpdated(result.updated);
    setCheckDialogOpen(true);
  }

  async function checkNewSeasonsForAnime(animeId: string) {
    if (checking || checkingId) return;
    const anime = animes.find((a) => a.id === animeId);
    if (!anime) return;
    if (typeof anime.malId !== "number" || anime.malId === null) {
      toast.error("Sem vínculo ao MAL");
      return;
    }
    setCheckingId(animeId);
    let result: { available: FoundSeason[]; upcomingSaved: Array<{ parentId: string; parentName: string; title: string; releaseDate: string }>; updated: UpdatedSeason[] };
    try {
      result = await scanTargets([anime]);
    } finally {
      setCheckingId(null);
    }
    if (
      result.available.length === 0 &&
      result.upcomingSaved.length === 0 &&
      result.updated.length === 0
    ) {
      toast("Nenhuma temporada nova encontrada");
      return;
    }
    setFoundAvailable(result.available);
    setFoundUpcoming(result.upcomingSaved);
    setFoundUpdated(result.updated);
    setCheckDialogOpen(true);
  }


  async function addFoundSeason(found: FoundSeason) {
    const target = animes.find((a) => a.id === found.parentId);
    if (!target) return;
    if (target.seasons.some((s) => s.malId === found.malId)) {
      setFoundAvailable((prev) => prev.filter((f) => f.malId !== found.malId));
      return;
    }
    const newSeason: Season = {
      id: uid(),
      name: found.title,
      rating: null,
      malId: found.malId,
      year: found.year,
      malScore: found.malScore,
      type: found.type,
      episodes: found.episodes,
      durationMin: found.durationMin,
    };
    const newSeasons = [...target.seasons, newSeason];
    setAnimes((prev) =>
      prev.map((a) => (a.id === found.parentId ? { ...a, seasons: newSeasons } : a)),
    );
    setFoundAvailable((prev) => prev.filter((f) => f.malId !== found.malId));
    try {
      await updateSeasons(found.parentId, newSeasons);
      toast.success(`"${found.title}" adicionada`);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar temporada");
      setAnimes((prev) =>
        prev.map((a) => (a.id === found.parentId ? { ...a, seasons: target.seasons } : a)),
      );
    }
  }




  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }


  async function clearUpcoming(animeId: string) {
    setAnimes((prev) =>
      prev.map((a) => (a.id === animeId ? { ...a, upcoming: undefined } : a)),
    );
    toast.success("Lançamento removido");
    try {
      await updateUpcoming(animeId, null);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao remover lançamento");
    }
  }

  function openEdit(animeId: string) {
    const a = animes.find((x) => x.id === animeId);
    if (!a) return;
    setEditAnimeId(a.id);
    setEditName(a.name);
    setEditCover(a.cover);
    setEditSeasons(a.seasons.map((s) => ({ ...s })));
    setEditTier(a.tier);
    setEditDialogOpen(true);
  }

  function openDetail(animeId: string) {
    setDetailAnimeId(animeId);
    setDetailOpen(true);
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
    const nextTier = editTier;
    setAnimes((prev) =>
      prev.map((a) =>
        a.id === editAnimeId
          ? { ...a, name, cover: editCover, seasons: cleaned, tier: nextTier }
          : a,
      ),
    );
    setEditDialogOpen(false);
    try {
      const tasks: Promise<void>[] = [];
      if (!original || original.name !== name || original.cover !== editCover) {
        tasks.push(updateAnime(editAnimeId, { name, cover: editCover ?? null }));
      }
      tasks.push(updateSeasons(editAnimeId, cleaned));
      if (!original || original.tier !== nextTier) {
        tasks.push(updateTier(editAnimeId, nextTier));
      }
      await Promise.all(tasks);
      toast.success("Alterações salvas");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar alterações");
      if (original) {
        setAnimes((prev) => prev.map((a) => (a.id === editAnimeId ? original : a)));
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-right" offset={{ top: "96px" }} mobileOffset={{ top: "80px" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] sm:h-[88px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <h1 className="min-w-0 shrink-0">
            <span className="sr-only">Umi Watchlist</span>
            <BrandLockup size="sm" className="h-11 sm:h-16" />
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            {scoreMode !== "gosto" && (
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`focus-ring flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Visualização em lista"
                aria-pressed={viewMode === "list"}
              >
                <ListIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`focus-ring flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Visualização em grade"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            )}
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
              <button
                onClick={() => setScoreMode("mal")}
                className={`focus-ring flex h-11 sm:h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors ${scoreMode === "mal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={scoreMode === "mal"}
              >
                MAL
              </button>
              <button
                onClick={() => setScoreMode("gosto")}
                className={`focus-ring flex h-11 sm:h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors ${scoreMode === "gosto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={scoreMode === "gosto"}
              >
                Meu gosto
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-label="Filtros"
              className={`focus-ring flex h-11 sm:h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                showFilters || filtersActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-foreground hover:border-primary/60 hover:text-primary"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {filtersActive && (
                <span
                  className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    showFilters
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {filtersActiveCount}
                </span>
              )}
            </button>
            <ProfileMenu />

          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setSearch("");
                  searchInputRef.current?.focus();
                }
              }}
              placeholder="Buscar na sua coleção..."
              className="h-11 border-border/60 bg-card pl-10 pr-12 text-base placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
            />
            {search !== "" && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
                className="focus-ring absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:h-8 sm:w-8"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>


      {/* List */}
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6">
        <div
          className={`mb-4 flex items-center gap-3 ${scoreMode === "gosto" ? "justify-end" : "justify-between"}`}
        >
          {scoreMode !== "gosto" && (
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={checkNewSeasons}
                disabled={checking || animes.length === 0}
                className="h-8 gap-1.5 text-xs"
                aria-label="Verificar novas temporadas"
                title="Verificar novas temporadas"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                {checking && checkProgress ? (
                  `Verificando ${checkProgress.current}/${checkProgress.total}`
                ) : (
                  <span className="hidden sm:inline">Verificar novas temporadas</span>
                )}
              </Button>
              {!checking && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {formatLastChecked(lastCheckedGlobal)}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
              {filtersActive || search.trim() !== ""
                ? `${displayedCount} de ${displayedTotal} animes`
                : `${displayedCount} ${displayedCount === 1 ? "anime" : "animes"}`}
            </p>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              aria-label="Estatísticas"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showFilters && (
        <div className="mb-4 flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Tier
            </div>
            {TIER_ROWS.map((t) => {
              const active = tierFilter.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTier(t)}
                  aria-pressed={active}
                  className={`focus-ring h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            <div className="ml-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tipo
            </div>
            {["TV", "Movie", "ONA"].map((t) => {
              const active = typeFilter.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  className={`focus-ring h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            {genreOptions.length > 0 && (
              <>
                <div className="ml-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Gênero
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`focus-ring inline-flex items-center gap-1 h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border text-xs font-medium transition-colors ${
                        genreFilter.size > 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Selecionar
                      {genreFilter.size > 0 && <span>({genreFilter.size})</span>}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar gênero..." />
                      <CommandList>
                        <CommandEmpty>Nenhum gênero encontrado.</CommandEmpty>
                        <CommandGroup>
                          {genreOptions.map((g) => {
                            const active = genreFilter.has(g.name);
                            return (
                              <CommandItem
                                key={g.name}
                                value={g.name}
                                onSelect={() => toggleGenre(g.name)}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${active ? "opacity-100 text-primary" : "opacity-0"}`}
                                />
                                <span className="flex-1 truncate">{g.name}</span>
                                <span className="ml-2 text-[11px] tabular-nums text-muted-foreground">
                                  {g.count}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {genreFilter.size > 0 && (
                      <div className="border-t border-border/60 p-2">
                        <button
                          type="button"
                          onClick={() => setGenreFilter(new Set())}
                          className="focus-ring w-full rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                        >
                          Limpar gêneros
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {[...genreFilter].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    aria-label={`Remover filtro ${g}`}
                    className="focus-ring inline-flex items-center gap-1 h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border border-primary bg-primary text-xs font-medium text-primary-foreground transition-colors"
                  >
                    {g}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </>
            )}
            {scoreMode !== "gosto" && (
              <>
                <div className="ml-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Assistidos
                </div>
                {([
                  { v: "todos", label: "Todos" },
                  { v: "nao", label: "Não assistidos" },
                  { v: "sim", label: `Assistidos${watchedCount > 0 ? ` (${watchedCount})` : ""}` },
                ] as const).map((opt) => {
                  const active = watchedFilter === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setWatchedFilter(opt.v)}
                      aria-pressed={active}
                      className={`focus-ring h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </>
            )}
            <button
              type="button"
              onClick={() => setSemDadosFilter((v) => !v)}
              aria-pressed={semDadosFilter}
              className={`focus-ring ml-2 h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border text-xs font-medium transition-colors ${
                semDadosFilter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Sem dados
            </button>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="focus-ring shrink-0 h-11 px-4 sm:h-7 sm:px-2.5 rounded-full border border-border/60 bg-card text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Limpar
            </button>
          )}
        </div>
        )}




        {!hydrated ? (
          <RankingSkeleton scoreMode={scoreMode} viewMode={viewMode} />
        ) : ranked.length === 0 && filtersActive ? (
          <EmptyState
            icon={Filter}
            title="Nenhum anime com esses filtros."
            description="Tente afrouxar os filtros para ver mais resultados."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : ranked.length === 0 && animes.length > 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Tente buscar por outro nome."
          />
        ) : ranked.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Comece seu ranking"
            description="Adicione seu primeiro anime e comece a notar as temporadas."
            action={
              <Button onClick={() => setAnimeDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar anime
              </Button>
            }
          />


        ) : scoreMode === "gosto" ? (
          watchedCount === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nenhum anime assistido"
              description="Marque animes como assistidos para vê-los na sua tierlist."
            />
          ) : (
          <div key={`${scoreMode}-${viewMode}`} className="space-y-2">
            <DndContext
              sensors={tierSensors}
              collisionDetection={tierCollisionDetection}
              onDragStart={(e: DragStartEvent) => setDraggingAnimeId(String(e.active.id))}
              onDragCancel={() => setDraggingAnimeId(null)}
              onDragEnd={(e: DragEndEvent) => {
                setDraggingAnimeId(null);
                const overId = e.over?.id;
                if (!overId) return;
                const activeId = String(e.active.id);
                if (String(overId) === activeId) return;
                const anime = animes.find((a) => a.id === activeId);
                if (!anime) return;
                const overAnime = animes.find((a) => a.id === String(overId));
                if (overAnime) {
                  void moveAnimeInTierlist(anime.id, overAnime.tier, overAnime.id);
                  return;
                }
                const target = overId === "none" ? null : (String(overId) as Tier);
                void moveAnimeInTierlist(anime.id, target, null);
              }}
            >
            <div className="overflow-hidden rounded-xl border border-border/60">
            {TIER_ROWS.map((t) => {
              const items = ranked.filter((a) => a.tier === t && a.watched);
              const hasItems = items.length > 0;
              return (
                <TierDropRow
                  key={t}
                  id={t}
                  items={items.map((a) => a.id)}
                  className={`border-b border-border/60 last:border-b-0 ${hasItems ? "min-h-32" : "min-h-20"}`}
                  label={
                    <div className="relative flex w-12 sm:w-16 shrink-0 items-center justify-center bg-card">
                      <div className={`absolute inset-y-0 left-0 w-1.5 ${tierBg(t)}`} />
                      <span className={`font-display text-2xl font-bold sm:text-3xl ${tierColor(t)}`}>{t}</span>
                    </div>
                  }
                >
                  {items.map((anime, idx) => (
                    <DraggableCover key={anime.id} anime={anime} idx={idx} onOpen={openDetail} />
                  ))}
                </TierDropRow>
              );
            })}
            {(draggingAnimeId !== null || ranked.some((a) => a.tier === null && a.watched)) && (
              <TierDropRow
                id="none"
                items={ranked.filter((a) => a.tier === null && a.watched).map((a) => a.id)}
                className="min-h-32 border-t border-border/60"
                label={
                  <div className="relative flex w-12 sm:w-16 shrink-0 items-center justify-center bg-card">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-muted-foreground/30" />
                    <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Sem tier
                    </span>
                  </div>
                }
              >
                {ranked
                  .filter((a) => a.tier === null && a.watched)
                  .map((anime, idx) => (
                    <DraggableCover key={anime.id} anime={anime} idx={idx} onOpen={openDetail} />
                  ))}
              </TierDropRow>
            )}
          </div>
            <DragOverlay>
              {draggingAnime ? (
                <div className="group w-20 scale-105 rounded-lg ring-2 ring-primary/50">
                  <CoverArt anime={draggingAnime} />
                </div>
              ) : null}
            </DragOverlay>
            </DndContext>
          </div>

          )
        ) : viewMode === "grid" ? (
          <ul key={`${scoreMode}-${viewMode}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {ranked.map((anime, idx) => {
              const malAvg = mediaMAL(anime.seasons);
              const primaryValue = malAvg != null ? malAvg.toFixed(2) : "—";
              const primaryColor = malAvg != null ? rankColor(malAvg) : "text-muted-foreground";
              return (
                <li
                  key={anime.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none [transform-style:preserve-3d]"
                  style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                >
                <TiltCardInner>
                  <button
                    type="button"
                    onClick={() => openDetail(anime.id)}
                    aria-label={anime.name}
                    title={anime.name}
                    className="block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-card-elevated">
                      {anime.imageUrl || anime.cover ? (
                        <img
                          src={anime.imageUrl ?? anime.cover}
                          alt={anime.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary/40">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                      <div
                        className={`font-display absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-bold backdrop-blur ${
                          idx === 0
                            ? "border-primary/60 bg-primary/20 text-primary"
                            : "border-border/60 bg-background/70 text-foreground/80"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                        <div className="flex items-baseline gap-1 rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 backdrop-blur">
                          <span className={`font-display text-sm font-bold tabular-nums ${primaryColor}`}>
                            {primaryValue}
                          </span>
                          <span className="text-[9px] text-muted-foreground">/10</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="gap-1 border-border/60 bg-background/80 px-1.5 py-0 text-[10px] backdrop-blur"
                        >
                          <span className={`font-display font-bold ${tierColor(anime.tier)}`}>
                            {anime.tier ?? "—"}
                          </span>
                        </Badge>
                      </div>
                      {anime.upcoming?.releaseDate && (
                        <span
                          className="absolute left-2 top-11 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-lg"
                        >
                          <CalendarClock className="h-3 w-3" />
                          {formatReleaseLabel(anime.upcoming.releaseDate)}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <h3 className="font-display line-clamp-2 text-sm font-semibold leading-tight tracking-tight">
                          {anime.name}
                        </h3>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {anime.seasons.length}{" "}
                          {anime.seasons.length === 1 ? "temporada" : "temporadas"}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="flex gap-1 p-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAddSeason(anime.id)}
                      className="h-8 flex-1 text-xs transition-[color,box-shadow] duration-200 hover:bg-primary/15 hover:text-primary hover:ring-1 hover:ring-primary/40 focus-visible:bg-primary/15 focus-visible:text-primary focus-visible:ring-1 focus-visible:ring-primary/40 active:bg-primary/25"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Temp.
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(anime.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => checkNewSeasonsForAnime(anime.id)}
                      disabled={checking || checkingId !== null}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Verificar novas temporadas"
                      title="Verificar novas temporadas"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingId === anime.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleWatched(anime.id, !anime.watched)}
                      className={`h-8 w-8 hover:text-primary ${anime.watched ? "text-primary" : "text-muted-foreground"}`}
                      aria-label={anime.watched ? "Desmarcar assistido" : "Marcar como assistido"}
                      title={anime.watched ? "Desmarcar assistido" : "Marcar como assistido"}
                    >
                      {anime.watched ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete({ id: anime.id, name: anime.name })}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remover anime"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TiltCardInner>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul key={`${scoreMode}-${viewMode}`} className="grid gap-4">
            {ranked.map((anime, idx) => {
              const malAvg = mediaMAL(anime.seasons);
              const primaryValue = malAvg != null ? malAvg.toFixed(2) : "—";
              const primaryColor = malAvg != null ? rankColor(malAvg) : "text-muted-foreground";
              const isOpen = expanded[anime.id] ?? false;
              return (
                <li
                  key={anime.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 transition-all animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)", animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                >
                  <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
                    <div
                      className={`font-display flex h-10 w-8 shrink-0 items-center justify-center text-sm font-bold sm:h-14 sm:w-10 sm:text-xl ${
                        idx === 0
                          ? "text-primary"
                          : idx === 1
                            ? "text-foreground/80"
                            : idx === 2
                              ? "text-primary/60"
                              : "text-muted-foreground/70"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div className="relative self-stretch min-h-[120px] w-20 shrink-0 overflow-hidden rounded-lg bg-card-elevated ring-1 ring-border/40 sm:min-h-[168px] sm:w-28">
                      {anime.imageUrl || anime.cover ? (
                        <img
                          src={anime.imageUrl ?? anime.cover}
                          alt={anime.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-7 w-7 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display truncate text-base font-semibold tracking-tight sm:text-lg">
                        {anime.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {anime.seasons.length}{" "}
                        {anime.seasons.length === 1 ? "temporada" : "temporadas"}
                      </p>
                      {anime.upcoming?.releaseDate && (
                        <span
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                        >
                          <CalendarClock className="h-3 w-3" />
                          {formatReleaseLabel(anime.upcoming.releaseDate)}
                        </span>
                      )}
                      {anime.genres && anime.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {anime.genres.map((g) => {
                            const on = genreFilterLower.has(g.toLowerCase());
                            return (
                              <span
                                key={g}
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  on
                                    ? "bg-primary/15 text-primary"
                                    : "bg-foreground/5 text-muted-foreground"
                                }`}
                              >
                                {g}
                              </span>
                            );
                          })}
                        </div>
                      )}

                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-display text-2xl font-bold tabular-nums sm:text-3xl ${primaryColor}`}>
                          {primaryValue}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </div>
                      <Badge variant="outline" className="gap-1 border-primary/30 px-1.5 py-0 text-[10px] text-foreground/80">
                        <span className={`font-display font-bold ${tierColor(anime.tier)}`}>
                          {anime.tier ?? "—"}
                        </span>
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(anime.id)}
                      className="shrink-0 rounded-full text-muted-foreground hover:text-primary"
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
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Meu tier
                        </span>
                        <TierPicker
                          value={anime.tier}
                          onChange={(t) => setAnimeTier(anime.id, t)}
                        />
                      </div>
                      {anime.seasons.length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">
                          Nenhuma temporada ainda
                        </p>
                      ) : (
                        <SortableCardSeasons
                          seasons={anime.seasons}
                          onReorder={(from, to) => reorderSeasons(anime.id, from, to)}
                          onDelete={(seasonId) => deleteSeason(anime.id, seasonId)}
                        />

                      )}
                      {anime.upcoming?.releaseDate && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatReleaseLabel(anime.upcoming.releaseDate)}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {anime.upcoming.title} •{" "}
                              {formatDateBR(anime.upcoming.releaseDate)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => clearUpcoming(anime.id)}
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Remover lançamento"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAddSeason(anime.id)}
                          className="flex-1"
                        >
                          <Plus className="mr-1 h-4 w-4" /> Temporada
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(anime.id)}
                          className="flex-1"
                        >
                          <Pencil className="mr-1 h-4 w-4" /> Editar anime
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWatched(anime.id, !anime.watched)}
                          className="flex-1"
                        >
                          {anime.watched ? (
                            <><RotateCcw className="mr-1 h-4 w-4" /> Desmarcar</>
                          ) : (
                            <><Check className="mr-1 h-4 w-4" /> Assistido</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => checkNewSeasonsForAnime(anime.id)}
                          disabled={checking || checkingId !== null}
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Verificar novas temporadas"
                          title="Verificar novas temporadas"
                        >
                          <RefreshCw className={`h-4 w-4 ${checkingId === anime.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete({ id: anime.id, name: anime.name })}
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
              className="focus-ring flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
            >
              <Tv className="h-4 w-4 text-primary" /> Temporada
            </button>
            <button
              onClick={() => {
                setFabOpen(false);
                setAnimeDialogOpen(true);
              }}
              className="focus-ring flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Anime
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="focus-ring flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground ring-1 ring-primary/40 transition-transform hover:scale-110 active:scale-95"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          aria-label="Adicionar"
        >
          <Plus
            className={`h-7 w-7 transition-transform ${fabOpen ? "rotate-45" : ""}`}
          />
        </button>

      </div>

      {/* Add Anime Dialog */}
      <Dialog
        open={animeDialogOpen}
        onOpenChange={(open) => {
          setAnimeDialogOpen(open);
          if (!open) resetAddAnime();
        }}
      >
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Novo Anime</DialogTitle>
            <DialogDescription>Adicione um anime ao seu ranking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="anime-name">Nome</Label>
              <JikanSearch
                id="anime-name"
                autoFocus
                value={newAnimeName}
                onChange={(v) => {
                  setNewAnimeName(v);
                  if (newAnimeMal && newAnimeMal.title !== v) {
                    setNewAnimeMal(null);
                    setChainSeasons(null);
                    setChainProgress(null);
                    setChainError(false);
                    chainAbortRef.current?.abort();
                    setChainLoading(false);
                  }
                }}
                onPick={(pick) => {
                  setNewAnimeMal(pick);
                  startChainFetch(pick);
                }}
                onEnter={addAnime}
                placeholder="Ex: Frieren"
              />
            </div>

            {chainLoading && (
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Buscando temporadas...</span>
                  {chainProgress && chainProgress.total > 0 && (
                    <span>{chainProgress.current} de {chainProgress.total}</span>
                  )}
                </div>
                {chainProgress && chainProgress.total > 0 ? (
                  <Progress
                    value={(chainProgress.current / chainProgress.total) * 100}
                    className="h-2"
                  />
                ) : (
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
                  </div>
                )}
              </div>
            )}
            {!chainLoading && chainError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="grid gap-1.5">
                  <p className="text-xs text-destructive">
                    Não foi possível buscar as temporadas no MAL.
                  </p>
                  {newAnimeMal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startChainFetch(newAnimeMal)}
                      className="h-7 w-fit gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tentar novamente
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!chainLoading && !chainError && chainSeasons && chainSeasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {selectedChainIds.size} de {chainSeasons.length} selecionada{chainSeasons.length === 1 ? "" : "s"}
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {chainSeasons.map((s) => {
                    const checked = selectedChainIds.has(s.malId);
                    return (
                      <li key={s.malId} className="flex items-center gap-2">
                        <Checkbox
                          id={`chain-${s.malId}`}
                          checked={checked}
                          onCheckedChange={(v) => {
                            setSelectedChainIds((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(s.malId);
                              else next.delete(s.malId);
                              return next;
                            });
                          }}
                        />
                        <label
                          htmlFor={`chain-${s.malId}`}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          {s.year != null && (
                            <span className="text-xs text-muted-foreground">{s.year}</span>
                          )}
                          {s.type && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                              {s.type}
                            </Badge>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAnimeDialogOpen(false);
                resetAddAnime();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={addAnime}
              disabled={
                chainLoading ||
                (!!chainSeasons && chainSeasons.length > 0 && selectedChainIds.size === 0)
              }
            >
              Adicionar
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Add Season Dialog */}
      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Nova Temporada</DialogTitle>
            <DialogDescription>Nomeie a nova temporada.</DialogDescription>
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
              <Label htmlFor="season-search">Temporada</Label>
              <JikanSearch
                id="season-search"
                value={seasonSearch}
                onChange={(v) => {
                  setSeasonSearch(v);
                  if (seasonPick && seasonPick.title !== v) {
                    setSeasonPick(null);
                    setSeasonDetails(null);
                    setSeasonDetailsLoading(false);
                  }
                }}
                onPick={(pick) => {
                  setSeasonSearch(pick.title);
                  void pickSeasonEntry(pick);
                }}
                placeholder="Buscar temporada, OVA, filme..."
              />
              {seasonDetailsLoading && (
                <p className="text-xs text-muted-foreground">Buscando detalhes...</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSeasonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addSeason} disabled={!seasonPick || seasonDetailsLoading}>
              Adicionar
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit Anime Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>Editar anime</DialogTitle>
            <DialogDescription>
              Atualize o nome, a capa e as temporadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Capa</Label>
              <input
                ref={editCoverInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditCoverPick}
                className="hidden"
              />
              <div className="flex items-start gap-3">
                {editCover ? (
                  <div className="relative h-32 w-24 overflow-hidden rounded-lg border border-border">
                    <img src={editCover} alt="Capa" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditCover(undefined)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Remover capa"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editCoverInputRef.current?.click()}
                    className="flex h-32 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <ImagePlus className="h-5 w-5" />
                    Adicionar
                  </button>
                )}
                {editCover && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editCoverInputRef.current?.click()}
                  >
                    Trocar
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-anime-name">Nome</Label>
              <Input
                id="edit-anime-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Meu tier</Label>
              <TierPicker value={editTier} onChange={setEditTier} />
            </div>
            <div className="grid gap-2">
              <Label>Temporadas</Label>
              {editSeasons.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma temporada
                </p>
              ) : (
                <SortableSeasonList seasons={editSeasons} setSeasons={setEditSeasons} />
              )}

            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check new seasons summary */}
      <Dialog open={checkDialogOpen} onOpenChange={setCheckDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle>Novas temporadas</DialogTitle>
            <DialogDescription>
              Resultado da verificação a partir do MyAnimeList.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
            <section className="grid gap-2">
              <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                Já disponíveis (adicionar)
              </h3>
              {foundAvailable.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nada novo pra adicionar.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {foundAvailable.map((f) => (
                    <li
                      key={`${f.parentId}-${f.malId}`}
                      className="flex items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-card-elevated p-2 min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{f.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          em {f.parentName}
                          {f.type ? ` • ${f.type}` : ""}
                          {f.year ? ` • ${f.year}` : ""}
                        </p>
                      </div>
                      <Button size="sm" className="shrink-0" onClick={() => addFoundSeason(f)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="grid gap-2">
              <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                Em breve (marcadas nos cards)
              </h3>
              {foundUpcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma continuação futura encontrada.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {foundUpcoming.map((u) => (
                    <li
                      key={`${u.parentId}-${u.title}`}
                      className="overflow-hidden rounded-lg border border-border/60 bg-card-elevated p-2 min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{u.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          em {u.parentName} • {formatDateBR(u.releaseDate)} •{" "}
                          {formatReleaseLabel(u.releaseDate)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="grid gap-2">
              <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                Notas atualizadas
              </h3>
              {foundUpdated.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nada atualizado.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {foundUpdated.map((u) => (
                    <li
                      key={`${u.parentId}-${u.malId}`}
                      className="overflow-hidden rounded-lg border border-border/60 bg-card-elevated p-2 min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{u.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          em {u.parentName} •{" "}
                          {typeof u.oldScore === "number" ? u.oldScore.toFixed(2) : "—"} →{" "}
                          {typeof u.newScore === "number" ? u.newScore.toFixed(2) : "—"}
                          {u.filledFields.includes("year") ? " • ano preenchido" : ""}
                          {u.filledFields.includes("type") ? " • tipo preenchido" : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <DialogFooter>
            <Button onClick={() => setCheckDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anime?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove &quot;{confirmDelete?.name}&quot; e todas as suas temporadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteAnime(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Anime detail dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailAnimeId("");
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden border-border bg-card">
          <DialogHeader>
            <DialogTitle>Detalhes do anime</DialogTitle>
            
          </DialogHeader>
          {detailAnime ? (
            <div className="grid gap-4">
              <div className="flex gap-4">
                {detailAnime.imageUrl || detailAnime.cover ? (
                  <img
                    src={detailAnime.imageUrl ?? detailAnime.cover}
                    alt={detailAnime.name}
                    className="aspect-[2/3] w-28 shrink-0 rounded-lg object-cover ring-1 ring-border/50"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="font-display text-base font-semibold leading-tight tracking-tight break-words sm:text-lg">
                    {detailAnime.name}
                  </h3>
                  <Badge variant="outline" className="w-fit gap-1 border-primary/30 px-2 py-0.5">
                    <span className={`font-display font-bold ${tierColor(detailAnime.tier)}`}>
                      {detailAnime.tier ?? "—"}
                    </span>
                  </Badge>
                  <div className="mt-1 flex flex-wrap gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        MAL
                      </span>
                      <span className={`font-display text-xl font-bold tabular-nums ${scoreColor(mediaMAL(detailAnime.seasons))}`}>
                        {formatScore(mediaMAL(detailAnime.seasons))}
                        {mediaMAL(detailAnime.seasons) !== null && (
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
                {detailAnime.genres === null || detailAnime.genres === undefined ? (
                  <p className="text-sm text-muted-foreground">Sem gêneros</p>
                ) : detailAnime.genres.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum gênero no MAL</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detailAnime.genres.map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-label={`Filtrar por ${g}`}
                        onClick={() => {
                          setDetailOpen(false);
                          setDetailAnimeId("");
                          setGenreFilter(new Set([g]));
                          setShowFilters(true);
                        }}
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
                {detailAnime.seasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma temporada</p>
                ) : (
                  <ul className="grid gap-2">
                    {detailAnime.seasons.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words text-sm font-medium" title={s.name}>
                            {s.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[11px] text-muted-foreground">
                              {[s.type, s.year].filter(Boolean).join(" • ")}
                            </p>
                            {isExcludedFromAverage(s) && (
                              <Badge
                                variant="outline"
                                title="Não entra no cálculo da média"
                                className="border-border/50 bg-muted/40 text-muted-foreground px-1.5 py-0 text-[9px] font-normal tracking-normal"
                              >
                                fora da média
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <span className="text-[10px] text-muted-foreground">MAL</span>
                          <span className="font-display text-sm font-bold tabular-nums">
                            {s.malScore !== null && s.malScore !== undefined ? s.malScore.toFixed(2) : "—"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
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
                  onClick={() => detailAnimeId && checkNewSeasonsForAnime(detailAnimeId)}
                  disabled={checking || checkingId !== null || !detailAnime?.malId}
                >
                  <RefreshCw className={`mr-1 h-4 w-4 ${detailAnimeId && checkingId === detailAnimeId ? "animate-spin" : ""}`} />
                  Verificar novas temporadas
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {formatLastChecked(detailAnime?.lastCheckedAt)}
                </span>
              </div>
            )}
            {detailAnime && (
              <Button
                variant="outline"
                onClick={() => toggleWatched(detailAnime.id, !detailAnime.watched)}
              >
                {detailAnime.watched ? (
                  <><RotateCcw className="mr-1 h-4 w-4" /> Desmarcar</>
                ) : (
                  <><Check className="mr-1 h-4 w-4" /> Assistido</>
                )}
              </Button>
            )}
            <Button
              onClick={() => {
                setDetailOpen(false);
                if (detailAnimeId) openEdit(detailAnimeId);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats dialog */}
      <StatsDialog animes={animes} open={statsOpen} onOpenChange={setStatsOpen} />
    </div>
  );
}


function RankingSkeleton({
  scoreMode,
  viewMode,
}: {
  scoreMode: "mal" | "gosto";
  viewMode: "grid" | "list";
}) {
  if (scoreMode === "gosto") {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">Carregando…</span>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {TIER_ROWS.map((t) => (
            <div
              key={t}
              className="flex min-h-32 items-stretch border-b border-border/60 last:border-b-0"
            >
              <div className="relative flex w-12 sm:w-16 shrink-0 items-center justify-center bg-card">
                <div className={`absolute inset-y-0 left-0 w-1.5 ${tierBg(t)}`} />
                <span className={`font-display text-2xl font-bold sm:text-3xl ${tierColor(t)}`}>
                  {t}
                </span>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2.5 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    aria-hidden
                    className="aspect-[2/3] w-20 rounded-lg"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">Carregando…</span>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <div
                className="overflow-hidden rounded-2xl border border-border/60"
                style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
              >
                <Skeleton aria-hidden className="aspect-[2/3] w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton aria-hidden className="h-4 w-3/4" />
                  <Skeleton aria-hidden className="h-3 w-1/2" />
                </div>
                <div className="flex gap-1 p-2">
                  <Skeleton aria-hidden className="h-8 flex-1" />
                  <Skeleton aria-hidden className="h-8 w-8" />
                  <Skeleton aria-hidden className="h-8 w-8" />
                  <Skeleton aria-hidden className="h-8 w-8" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <ul className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-2xl border border-border/60"
            style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
              <Skeleton aria-hidden className="h-10 w-8 sm:h-14 sm:w-10" />
              <Skeleton
                aria-hidden
                className="self-stretch min-h-[120px] w-20 rounded-lg sm:min-h-[168px] sm:w-28"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton aria-hidden className="h-5 w-3/4" />
                <Skeleton aria-hidden className="h-3 w-1/3" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton aria-hidden className="h-7 w-14" />
                <Skeleton aria-hidden className="h-3 w-8" />
                <Skeleton aria-hidden className="h-4 w-8" />
              </div>
              <Skeleton aria-hidden className="h-9 w-9 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}




