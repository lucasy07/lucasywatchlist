import { useEffect, useState } from "react";
import { LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const USERNAME_RE = /^[A-Za-z0-9._-]+$/;

export function ProfileMenu() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(profile?.username ?? "");
      setError(undefined);
    }
  }, [open, profile?.username]);

  const email = user?.email ?? "";
  const initial = (profile?.username?.[0] ?? email[0] ?? "?").toUpperCase();

  async function save() {
    const u = value.trim();
    if (!u) return setError("Informe um nome de usuário.");
    if (u.length < 3 || u.length > 20)
      return setError("O nome de usuário deve ter de 3 a 20 caracteres.");
    if (!USERNAME_RE.test(u))
      return setError("Use apenas letras, números, ponto, hífen e underscore.");
    if (!user) return;

    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ username: u })
      .eq("id", user.id);
    setSaving(false);

    if (err) {
      if (err.code === "23505") setError("Esse nome de usuário já está em uso.");
      else setError(err.message);
      return;
    }
    await refreshProfile();
    setOpen(false);
    toast.success("Perfil atualizado!");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menu do perfil"
            className="focus-ring flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/50"
          >
            <Avatar className="h-7 w-7 sm:h-6 sm:w-6">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
              )}
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.username ?? "Sem nome de usuário"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 sm:min-h-0" onSelect={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11 text-destructive focus:text-destructive sm:min-h-0"
            onSelect={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Escolha como você aparece no Umi Watchlist.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="profile-username">Nome de usuário</Label>
            <Input
              id="profile-username"
              value={value}
              autoComplete="username"
              onChange={(e) => {
                setValue(e.target.value);
                setError(undefined);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "profile-username-error" : undefined}
            />
            {error && (
              <p id="profile-username-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
