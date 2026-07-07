import { useEffect, useState } from "react";
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
import { type UpcomingSeason, updateUpcoming } from "@/lib/anime-storage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animeId: string;
  animeName: string;
  initial?: UpcomingSeason;
  onSaved: (animeId: string, upcoming: UpcomingSeason | null) => void;
};

export function UpcomingEditDialog({
  open,
  onOpenChange,
  animeId,
  animeName,
  initial,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDate(initial?.releaseDate ?? "");
    }
  }, [open, initial]);

  async function save() {
    const t = title.trim();
    if (!t) {
      toast.error("Informe o título da próxima temporada");
      return;
    }
    if (!date) {
      toast.error("Informe a data de lançamento");
      return;
    }
    const upcoming: UpcomingSeason = { title: t, releaseDate: date, source: "manual" };
    onSaved(animeId, upcoming);
    onOpenChange(false);
    try {
      await updateUpcoming(animeId, upcoming);
      toast.success("Próxima temporada salva");
    } catch {
      toast.error("Falha ao salvar lançamento");
    }
  }

  async function clear() {
    onSaved(animeId, null);
    onOpenChange(false);
    try {
      await updateUpcoming(animeId, null);
      toast.success("Lançamento removido");
    } catch {
      toast.error("Falha ao remover lançamento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Próxima temporada</DialogTitle>
          <DialogDescription className="truncate">{animeName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="up-title">Título</Label>
            <Input
              id="up-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Temporada 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="up-date">Data de lançamento</Label>
            <Input
              id="up-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {initial ? (
            <Button
              variant="ghost"
              onClick={clear}
              className="text-destructive hover:text-destructive"
            >
              Remover
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
