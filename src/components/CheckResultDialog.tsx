import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateBR, formatReleaseLabel } from "@/lib/anime-storage";
import type { FoundSeason } from "@/lib/scan-types";

type CheckResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aborted: { scanned: number; total: number } | null;
  available: FoundSeason[];
  upcoming: Array<{
    parentId: string;
    parentName: string;
    title: string;
    releaseDate: string;
  }>;
  onAdd: (found: FoundSeason) => void;
};

export function CheckResultDialog({
  open,
  onOpenChange,
  aborted,
  available,
  upcoming,
  onAdd,
}: CheckResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>Novas temporadas</DialogTitle>
          <DialogDescription>
            {aborted
              ? `Verificação cancelada em ${aborted.scanned} de ${aborted.total} animes. O resultado é parcial.`
              : "Resultado da verificação a partir do MyAnimeList."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          <section className="grid gap-2">
            <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
              Já disponíveis (adicionar)
            </h3>
            {available.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Nada novo pra adicionar.
              </p>
            ) : (
              <ul className="grid gap-2">
                {available.map((f) => (
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
                    <Button size="sm" className="shrink-0" onClick={() => onAdd(f)}>
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
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma continuação futura encontrada.
              </p>
            ) : (
              <ul className="grid gap-2">
                {upcoming.map((u) => (
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
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}