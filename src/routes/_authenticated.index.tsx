import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Clapperboard,
  CalendarClock,
  LogOut,
  Check,
  CheckCircle2,
  Pencil,
  Image as ImageIcon,
  RefreshCw,
  Filter,
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
  setWatched,
  importLegacyIfNeeded,
  uid,
  average,
  mediaMAL,
  rankColor,
  formatReleaseLabel,
  formatDateBR,
} from "@/lib/anime-storage";
import { useAuth } from "@/auth/AuthProvider";
import { JikanSearch, type JikanPick } from "@/components/JikanSearch";
import { TierPicker, tierColor, tierBg } from "@/components/TierPicker";
import { buildChain, type ChainSeason } from "@/lib/jikan-chain";


const TIER_ROWS = (Object.keys(TIER_VALUE) as Tier[]).sort(
  (a, b) => TIER_VALUE[b] - TIER_VALUE[a],
);

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

function Index() {
  const { user, signOut } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [scoreMode, setScoreMode] = useState<"mal" | "gosto">("mal");
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Add Anime dialog
  const [animeDialogOpen, setAnimeDialogOpen] = useState(false);
  const [newAnimeName, setNewAnimeName] = useState("");
  const [newAnimeCover, setNewAnimeCover] = useState<string | undefined>(undefined);
  const [newAnimeMal, setNewAnimeMal] = useState<JikanPick | null>(null);
  const [chainSeasons, setChainSeasons] = useState<ChainSeason[] | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainProgress, setChainProgress] = useState<{ current: number; total: number } | null>(null);
  const chainAbortRef = useRef<AbortController | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);


  // Add Season dialog
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [seasonAnimeId, setSeasonAnimeId] = useState<string>("");
  const [seasonName, setSeasonName] = useState("");
  

  // Upcoming season dialog
  const [upcomingDialogOpen, setUpcomingDialogOpen] = useState(false);
  const [upcomingAnimeId, setUpcomingAnimeId] = useState<string>("");
  const [upcomingTitle, setUpcomingTitle] = useState("");
  const [upcomingDate, setUpcomingDate] = useState("");

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
  };
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState<{ current: number; total: number } | null>(null);
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [foundAvailable, setFoundAvailable] = useState<FoundSeason[]>([]);
  const [foundUpcoming, setFoundUpcoming] = useState<
    Array<{ parentId: string; parentName: string; title: string; releaseDate: string }>
  >([]);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const imported = await importLegacyIfNeeded(user.id);
        if (imported > 0) {
          toast.success(`${imported} anime${imported === 1 ? "" : "s"} importado${imported === 1 ? "" : "s"} do dispositivo`);
        }
        const data = await fetchAnimes();
        if (!cancelled) {
          setAnimes(data);
          setHydrated(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Falha ao carregar seus animes");
        if (!cancelled) setHydrated(true);
      }
    })();
    const savedView =
      typeof window !== "undefined" ? localStorage.getItem("anime-ranker:v1:view") : null;
    if (savedView === "grid" || savedView === "list") setViewMode(savedView);
    const savedScoreMode =
      typeof window !== "undefined" ? localStorage.getItem("anime-ranker:v1:scoreMode") : null;
    if (savedScoreMode === "mal" || savedScoreMode === "gosto") setScoreMode(savedScoreMode);
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




  // Auto-backfill missing imageUrl from Jikan for older entries
  useEffect(() => {
    if (!hydrated) return;
    const missing = animes.filter((a) => !a.imageUrl);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const anime of missing) {
        if (cancelled) return;
        try {
          let malId: number | null = null;
          let imageUrl: string | undefined;
          let malScore: number | null = null;

          let jikanOk = false;
          try {
            const res = await fetch(
              `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.name)}&limit=1&sfw=true`,
            );
            if (res.ok) {
              const json = await res.json();
              const top = json?.data?.[0];
              const img: string | undefined =
                top?.images?.jpg?.large_image_url ??
                top?.images?.jpg?.image_url;
              if (img) {
                jikanOk = true;
                imageUrl = img;
                malId = top?.mal_id ?? null;
                malScore = top?.score ?? null;
              }
            }
          } catch {
            // fall through to AniList fallback
          }

          if (!jikanOk) {
            try {
              const alRes = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  query:
                    "query ($search: String) { Page(perPage: 1) { media(search: $search, type: ANIME, isAdult: false) { idMal coverImage { large } } } }",
                  variables: { search: anime.name },
                }),
              });
              if (!alRes.ok) continue;
              const alJson = await alRes.json();
              const media = alJson?.data?.Page?.media?.[0];
              const idMal: number | null = media?.idMal ?? null;
              if (!idMal) continue;

              let gotDetails = false;
              try {
                const dRes = await fetch(
                  `https://api.jikan.moe/v4/anime/${idMal}`,
                );
                if (dRes.ok) {
                  const dJson = await dRes.json();
                  const data = dJson?.data;
                  const img: string | undefined =
                    data?.images?.jpg?.large_image_url ??
                    data?.images?.jpg?.image_url;
                  if (img) {
                    gotDetails = true;
                    malId = data?.mal_id ?? idMal;
                    imageUrl = img;
                    malScore = data?.score ?? null;
                  }
                }
              } catch {
                // fall through to AniList cover
              }

              if (!gotDetails) {
                malId = idMal;
                imageUrl = media?.coverImage?.large ?? undefined;
                malScore = null;
              }
            } catch {
              continue;
            }
          }

          if (!imageUrl) continue;
          await updateAnimeMeta(anime.id, { malId, imageUrl, malScore });
          if (cancelled) return;
          setAnimes((prev) =>
            prev.map((a) =>
              a.id === anime.id ? { ...a, malId, imageUrl, malScore } : a,
            ),
          );
        } catch {
          // ignore
        }
        // Jikan rate limit: ~3 req/sec
        await new Promise((r) => setTimeout(r, 400));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Auto-backfill missing season.type from Jikan (used to exclude OVAs from averages)
  useEffect(() => {
    if (!hydrated) return;
    const targets = animes.filter((a) =>
      a.seasons.some((s) => s.malId && (s.type == null || s.type === "")),
    );
    if (targets.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const anime of targets) {
        if (cancelled) return;
        const seasons = [...anime.seasons];
        let changed = false;
        for (let i = 0; i < seasons.length; i++) {
          if (cancelled) return;
          const s = seasons[i];
          if (!s.malId || (s.type != null && s.type !== "")) continue;
          try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${s.malId}`);
            if (res.ok) {
              const json = await res.json();
              const t: string | null = json?.data?.type ?? null;
              if (t) {
                seasons[i] = { ...s, type: t };
                changed = true;
              }
            }
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (changed && !cancelled) {
          try {
            await updateSeasons(anime.id, seasons);
            if (cancelled) return;
            setAnimes((prev) =>
              prev.map((a) => (a.id === anime.id ? { ...a, seasons } : a)),
            );
          } catch {
            // ignore
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // One-time migration: derive tier from legacy per-season ratings.
  useEffect(() => {
    if (!hydrated) return;
    const candidates = animes.filter(
      (a) => a.tier == null && a.seasons.some((s) => typeof s.rating === "number"),
    );
    if (candidates.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const a of candidates) {
        if (cancelled) return;
        const rated = a.seasons.filter(
          (s): s is Season & { rating: number } => typeof s.rating === "number",
        );
        if (rated.length === 0) continue;
        const avg = rated.reduce((sum, s) => sum + s.rating, 0) / rated.length;
        const tier = tierFromAverage(avg);
        try {
          await updateTier(a.id, tier);
          if (cancelled) return;
          setAnimes((prev) => prev.map((x) => (x.id === a.id ? { ...x, tier } : x)));
        } catch (err) {
          console.error(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const ranked = useMemo(() => {
    const filtered = animes.filter(
      (a) =>
        !a.watched &&
        a.name.toLowerCase().includes(search.toLowerCase().trim()),
    );
    if (scoreMode === "gosto") {
      return [...filtered].sort((a, b) => {
        const va = a.tier === null ? -1 : TIER_VALUE[a.tier];
        const vb = b.tier === null ? -1 : TIER_VALUE[b.tier];
        return vb - va;
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
  }, [animes, search, scoreMode]);

  const watchedCount = useMemo(() => animes.filter((a) => a.watched).length, [animes]);

  async function toggleWatched(id: string, next: boolean) {
    const prev = animes;
    setAnimes((p) => p.map((a) => (a.id === id ? { ...a, watched: next } : a)));
    try {
      await setWatched(id, next);
      toast.success(next ? "Marcado como assistido" : "Movido para a lista");
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
    setNewAnimeCover(undefined);
    setNewAnimeMal(null);
    setChainSeasons(null);
    setChainLoading(false);
    setChainProgress(null);
  }

  async function startChainFetch(pick: JikanPick) {
    chainAbortRef.current?.abort();
    const ctrl = new AbortController();
    chainAbortRef.current = ctrl;
    setChainLoading(true);
    setChainSeasons(null);
    setChainProgress({ current: 0, total: 0 });
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
              },
            ];
      setChainSeasons(finalSeasons);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error(err);
      toast.error("Falha ao buscar temporadas no MAL");
      setChainSeasons(null);
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
        const existingIds = new Set<number>();
        for (const a of animes) {
          if (a.malId) existingIds.add(a.malId);
          for (const s of a.seasons) if (s.malId) existingIds.add(s.malId);
        }
        if (chainSeasons.some((s) => existingIds.has(s.malId))) {
          toast.error("Esse anime já está na sua lista");
          return;
        }
        const first = chainSeasons[0];
        const seasons: Season[] = chainSeasons.map((s) => ({
          id: uid(),
          name: s.title,
          rating: null,
          malId: s.malId,
          year: s.year,
          malScore: s.malScore,
          type: s.type,
        }));
        const created = await createAnime({
          name: first.title,
          cover: first.imageUrl ?? undefined,
          malId: first.malId,
          imageUrl: first.imageUrl,
          malScore: first.malScore,
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
        cover: newAnimeCover ?? pick?.imageUrl ?? undefined,
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

  async function addSeason() {
    const name = seasonName.trim();
    if (!seasonAnimeId) {
      toast.error("Selecione um anime");
      return;
    }
    if (!name) {
      toast.error("Informe o nome da temporada");
      return;
    }
    const target = animes.find((a) => a.id === seasonAnimeId);
    if (!target) return;
    const newSeasons = [...target.seasons, { id: uid(), name, rating: null }];
    setAnimes((prev) =>
      prev.map((a) => (a.id === seasonAnimeId ? { ...a, seasons: newSeasons } : a)),
    );
    setSeasonDialogOpen(false);
    toast.success("Temporada adicionada");
    await persistSeasons(seasonAnimeId, newSeasons);
  }

  async function setAnimeTier(animeId: string, tier: Tier | null) {
    const prev = animes;
    setAnimes((p) => p.map((a) => (a.id === animeId ? { ...a, tier } : a)));
    try {
      await updateTier(animeId, tier);
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

  async function checkNewSeasons() {
    if (checking) return;
    const targets = animes.filter((a) => typeof a.malId === "number" && a.malId !== null);
    if (targets.length === 0) {
      toast.error("Nenhum anime com vínculo ao MAL");
      return;
    }
    const existing = new Set<number>();
    for (const a of animes) {
      if (a.malId) existing.add(a.malId);
      for (const s of a.seasons) if (s.malId) existing.add(s.malId);
    }
    const available: FoundSeason[] = [];
    const upcomingSaved: Array<{ parentId: string; parentName: string; title: string; releaseDate: string }> = [];
    setChecking(true);
    setCheckProgress({ current: 0, total: targets.length });
    try {
      for (let i = 0; i < targets.length; i++) {
        const a = targets[i];
        setCheckProgress({ current: i + 1, total: targets.length });
        try {
          const chain = await buildChain(a.malId!);
          for (const s of chain) {
            if (existing.has(s.malId)) continue;
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
              // Read latest upcoming from state via functional update pattern
              let shouldSave = false;
              const current = a.upcoming;
              const currentSource = current?.source ?? "manual";
              if (!current) {
                shouldSave = true;
              } else if (currentSource === "manual") {
                // Respect user-defined upcoming; never overwrite.
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
              });
            }
          }
        } catch (err) {
          console.error("check chain failed for", a.name, err);
          // skip and continue
        }
      }
    } finally {
      setChecking(false);
      setCheckProgress(null);
    }
    if (available.length === 0 && upcomingSaved.length === 0) {
      toast("Nenhuma temporada nova encontrada");
      return;
    }
    setFoundAvailable(available);
    setFoundUpcoming(upcomingSaved);
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

  function openUpcoming(animeId?: string) {
    if (animes.length === 0) {
      toast.error("Adicione um anime primeiro");
      return;
    }
    const id = animeId ?? animes[0].id;
    setUpcomingAnimeId(id);
    const existing = animes.find((a) => a.id === id)?.upcoming;
    setUpcomingTitle(existing?.title ?? "");
    setUpcomingDate(existing?.releaseDate ?? "");
    setUpcomingDialogOpen(true);
  }

  async function saveUpcoming() {
    if (!upcomingAnimeId) return;
    const title = upcomingTitle.trim();
    if (!title) {
      toast.error("Informe o título da próxima temporada");
      return;
    }
    if (!upcomingDate) {
      toast.error("Informe a data de lançamento");
      return;
    }
    const upcoming: UpcomingSeason = { title, releaseDate: upcomingDate, source: "manual" };
    setAnimes((prev) =>
      prev.map((a) => (a.id === upcomingAnimeId ? { ...a, upcoming } : a)),
    );
    setUpcomingDialogOpen(false);
    toast.success("Próxima temporada salva");
    try {
      await updateUpcoming(upcomingAnimeId, upcoming);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar lançamento");
    }
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
      <Toaster theme="dark" position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-primary/30"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Clapperboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                Anime <span className="text-gold-gradient">Watchlist</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sua coleção pessoal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Visualização em lista"
                aria-pressed={viewMode === "list"}
              >
                <ListIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Visualização em grade"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
              <button
                onClick={() => setScoreMode("gosto")}
                className={`flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors ${scoreMode === "gosto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={scoreMode === "gosto"}
              >
                Meu gosto
              </button>
              <button
                onClick={() => setScoreMode("mal")}
                className={`flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors ${scoreMode === "mal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-pressed={scoreMode === "mal"}
              >
                MAL
              </button>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Animes</p>
              <p className="font-display text-lg font-semibold">{animes.length}</p>
            </div>
            <Link
              to="/upcoming"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
              aria-label="Próximas temporadas"
            >
              <CalendarClock className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Em breve</span>
            </Link>
            <Link
              to="/watched"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
              aria-label="Animes já assistidos"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Assistidos{watchedCount > 0 ? ` (${watchedCount})` : ""}</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
              aria-label="Sair"
              title={user?.email ?? "Sair"}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na sua coleção..."
              className="h-11 border-border/60 bg-card pl-10 text-base placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
            />
          </div>
        </div>
      </header>


      {/* List */}
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={checkNewSeasons}
            disabled={checking || animes.length === 0}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking && checkProgress
              ? `Verificando ${checkProgress.current}/${checkProgress.total}`
              : "Verificar novas temporadas"}
          </Button>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            {ranked.length} {ranked.length === 1 ? "anime" : "animes"}
          </p>
        </div>


        {!hydrated ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : ranked.length === 0 ? (
          <EmptyState onAdd={() => setAnimeDialogOpen(true)} hasAnimes={animes.length > 0} />
        ) : scoreMode === "gosto" ? (
          <div className="overflow-hidden rounded-xl border border-border/60">
            {TIER_ROWS.map((t) => {
              const items = ranked.filter((a) => a.tier === t);
              return (
                <div key={t} className="flex items-stretch border-b border-border/60 last:border-b-0">
                  <div className={`flex w-16 shrink-0 items-center justify-center ${tierBg(t)}`}>
                    <span className="font-display text-xl font-bold text-tier-foreground">{t}</span>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2 p-2">
                    {items.map((anime) => {
                      const img = anime.imageUrl ?? anime.cover;
                      return (
                        <div key={anime.id} className="w-16" title={anime.name}>
                          {img ? (
                            <img
                              src={img}
                              alt={anime.name}
                              loading="lazy"
                              className="aspect-[2/3] w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[2/3] w-16 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{anime.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {ranked.some((a) => a.tier === null) && (
              <div className="flex items-stretch border-t border-border/60">
                <div className="flex w-16 shrink-0 items-center justify-center bg-secondary">
                  <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Sem tier
                  </span>
                </div>
                <div className="flex flex-1 flex-wrap gap-2 p-2">
                  {ranked
                    .filter((a) => a.tier === null)
                    .map((anime) => {
                      const img = anime.imageUrl ?? anime.cover;
                      return (
                        <div key={anime.id} className="w-16" title={anime.name}>
                          {img ? (
                            <img
                              src={img}
                              alt={anime.name}
                              loading="lazy"
                              className="aspect-[2/3] w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[2/3] w-16 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{anime.name}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {ranked.map((anime, idx) => {
              const malAvg = mediaMAL(anime.seasons);
              const primaryValue = malAvg != null ? malAvg.toFixed(2) : "—";
              const primaryColor = malAvg != null ? rankColor(malAvg) : "text-muted-foreground";
              return (
                <li
                  key={anime.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
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
                      <Link
                        to="/upcoming"
                        className="absolute left-2 top-11 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-lg"
                      >
                        <CalendarClock className="h-3 w-3" />
                        {formatReleaseLabel(anime.upcoming.releaseDate)}
                      </Link>
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

                  <div className="flex gap-1 p-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAddSeason(anime.id)}
                      className="h-8 flex-1 text-xs"
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
                      onClick={() => toggleWatched(anime.id, true)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Marcar como assistido"
                      title="Marcar como assistido"
                    >
                      <Check className="h-3.5 w-3.5" />
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
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid gap-4">
            {ranked.map((anime, idx) => {
              const malAvg = mediaMAL(anime.seasons);
              const primaryValue = malAvg != null ? malAvg.toFixed(2) : "—";
              const primaryColor = malAvg != null ? rankColor(malAvg) : "text-muted-foreground";
              const isOpen = expanded[anime.id] ?? false;
              return (
                <li
                  key={anime.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
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
                        <Link
                          to="/upcoming"
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                        >
                          <CalendarClock className="h-3 w-3" />
                          {formatReleaseLabel(anime.upcoming.releaseDate)}
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-display text-2xl font-bold tabular-nums sm:text-3xl ${primaryColor}`}>
                          {primaryValue}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        MAL
                      </span>
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
                        <ul className="grid gap-2">
                          {anime.seasons.map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2 transition-colors hover:bg-secondary"
                            >
                              <Tv className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-sm">{s.name}</p>
                                  {s.type && (
                                    <Badge
                                      variant="outline"
                                      title={
                                        s.type.toLowerCase() === "ova"
                                          ? "OVA — fora da média"
                                          : s.type
                                      }
                                      className={`px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider ${
                                        s.type.toLowerCase() === "ova"
                                          ? "border-border/50 bg-muted/40 text-muted-foreground"
                                          : "border-border/60 text-foreground/70"
                                      }`}
                                    >
                                      {s.type}
                                      {s.type.toLowerCase() === "ova" && (
                                        <span className="ml-1 hidden sm:inline text-[8px] font-normal normal-case tracking-normal opacity-80">
                                          fora da média
                                        </span>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {s.year ?? "Ano —"}
                                  {typeof s.malScore === "number" && (
                                    <>
                                      {" · "}
                                      <span className="inline-flex items-center gap-0.5">
                                        <Star className="h-2.5 w-2.5" />
                                        MAL {s.malScore.toFixed(2)}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
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
                          onClick={() => openUpcoming(anime.id)}
                          className="flex-1"
                        >
                          <CalendarClock className="mr-1 h-4 w-4" />
                          {anime.upcoming ? "Lançamento" : "Em breve"}
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
                          onClick={() => toggleWatched(anime.id, true)}
                          className="flex-1"
                        >
                          <Check className="mr-1 h-4 w-4" /> Assistido
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
                openUpcoming();
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
            >
              <CalendarClock className="h-4 w-4 text-primary" /> Em breve
            </button>
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
          className="flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground ring-1 ring-primary/40 transition-transform hover:scale-110 active:scale-95"
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
              <Label>Capa (opcional)</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverPick}
                className="hidden"
              />
              {newAnimeCover ? (
                <div className="relative h-32 w-24 overflow-hidden rounded-lg border border-border">
                  <img src={newAnimeCover} alt="Capa" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewAnimeCover(undefined)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remover capa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex h-32 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <ImagePlus className="h-5 w-5" />
                  Adicionar
                </button>
              )}
            </div>
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
              <p className="text-xs text-muted-foreground">
                Buscando temporadas...
                {chainProgress && chainProgress.total > 0
                  ? ` ${chainProgress.current} de ${chainProgress.total}`
                  : ""}
              </p>
            )}
            {!chainLoading && chainSeasons && chainSeasons.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {chainSeasons.length} temporada{chainSeasons.length === 1 ? "" : "s"} encontrada{chainSeasons.length === 1 ? "" : "s"} no MAL.
              </p>
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
            <Button onClick={addAnime} disabled={chainLoading}>
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
              <Label htmlFor="season-name">Temporada</Label>
              <Input
                id="season-name"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSeason()}
                placeholder="Ex: Temporada 1"
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

      {/* Upcoming Season Dialog */}
      <Dialog open={upcomingDialogOpen} onOpenChange={setUpcomingDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Próxima temporada</DialogTitle>
            <DialogDescription>
              Marque o título e a data de lançamento para destacar este anime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Anime</Label>
              <Select value={upcomingAnimeId} onValueChange={setUpcomingAnimeId}>
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
              <Label htmlFor="upcoming-title">Título da temporada</Label>
              <Input
                id="upcoming-title"
                value={upcomingTitle}
                onChange={(e) => setUpcomingTitle(e.target.value)}
                placeholder="Ex: Temporada 2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upcoming-date">Data de lançamento</Label>
              <Input
                id="upcoming-date"
                type="date"
                value={upcomingDate}
                onChange={(e) => setUpcomingDate(e.target.value)}
              />
              {upcomingDate && (
                <p className="text-xs text-muted-foreground">
                  {formatReleaseLabel(upcomingDate)} •{" "}
                  {formatDateBR(upcomingDate)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpcomingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveUpcoming}>Salvar</Button>
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
                <ul className="grid gap-2">
                  {editSeasons.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <Input
                        value={s.name}
                        onChange={(e) => updateEditSeason(s.id, { name: e.target.value })}
                        placeholder="Nome"
                        className="flex-1"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditSeasons((prev) => [...prev, { id: uid(), name: "", rating: null }])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Temporada
              </Button>
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
                      className="flex items-center gap-2 rounded-lg border border-border/60 bg-card-elevated p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          em {f.parentName}
                          {f.type ? ` • ${f.type}` : ""}
                          {f.year ? ` • ${f.year}` : ""}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => addFoundSeason(f)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="grid gap-2">
              <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                Em breve (salvas em Upcoming)
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
                      className="rounded-lg border border-border/60 bg-card-elevated p-2"
                    >
                      <p className="truncate text-sm font-medium">{u.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        em {u.parentName} • {formatDateBR(u.releaseDate)} •{" "}
                        {formatReleaseLabel(u.releaseDate)}
                      </p>
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
