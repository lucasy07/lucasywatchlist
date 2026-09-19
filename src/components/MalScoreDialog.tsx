import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UpdatedSeason } from "@/lib/scan-types";

type MalScoreDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updated: UpdatedSeason[];
};

export function MalScoreDialog({ open, onOpenChange, updated }: MalScoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>Notas atualizadas</DialogTitle>
          <DialogDescription>Alterações encontradas nas temporadas vinculadas ao MyAnimeList.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {updated.map((updatedSeason) => (
            <li
              key={`${updatedSeason.parentId}-${updatedSeason.malId}`}
              className="overflow-hidden rounded-lg border border-border/60 bg-card-elevated p-2 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{updatedSeason.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  em {updatedSeason.parentName} •{" "}
                  {typeof updatedSeason.oldScore === "number" ? updatedSeason.oldScore.toFixed(2) : "—"} →{" "}
                  {typeof updatedSeason.newScore === "number" ? updatedSeason.newScore.toFixed(2) : "—"}
                  {updatedSeason.filledFields.includes("year") ? " • ano preenchido" : ""}
                  {updatedSeason.filledFields.includes("type") ? " • tipo preenchido" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}