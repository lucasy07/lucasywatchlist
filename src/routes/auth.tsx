import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import umiLockup from "@/assets/umi-lockup.png";
import loginArt from "@/assets/login-art-900.webp.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Umi Watchlist" },
      { name: "description", content: "Entre ou crie sua conta para sincronizar seus animes." },
    ],
  }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) {
    return "Esse e-mail já tem conta. Tente entrar.";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes")) {
    return "Muitas tentativas. Aguarde alguns instantes.";
  }
  return "Não foi possível concluir. Tente novamente em instantes.";
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/" });
    }
  }, [loading, session, navigate]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setConfirmPassword("");
    setErrors({});
  }

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Formato de e-mail inválido.";
    if (!password) next.password = "Informe sua senha.";
    else if (password.length < 6) next.password = "A senha deve ter pelo menos 6 caracteres.";
    if (mode === "signup" && password !== confirmPassword) {
      next.confirmPassword = "As senhas não coincidem.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Bem-vindo!");
          navigate({ to: "/" });
        } else {
          setPendingEmail(email);
          setPassword("");
          setConfirmPassword("");
          switchMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/" });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      toast.error(translateAuthError(raw));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Toaster theme="dark" position="top-center" />
      <div
        className="w-full max-w-sm rounded-2xl border border-border p-6 sm:p-8"
        style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={umiLockup}
            alt="Umi Watchlist"
            className="h-auto w-40 object-contain sm:w-48"
          />
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        {pendingEmail && (
          <div
            className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Enviamos um e-mail de confirmação para{" "}
            <span className="font-semibold text-foreground">{pendingEmail}</span>. Confira sua caixa
            de entrada e também a pasta de spam antes de entrar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive">
                {errors.password}
              </p>
            )}
          </div>
          {mode === "signup" && (
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                className="focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}
          <Button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="mt-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {submitting ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="rounded-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="rounded-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
