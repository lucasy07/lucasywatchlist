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
import loginArt900 from "@/assets/login-art-900.webp";
import loginArt450 from "@/assets/login-art-450.webp";

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

const ART_SRCSET = `${loginArt450} 450w, ${loginArt900} 900w`;

const FIELD_CLASS =
  "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0 aria-[invalid=true]:border-destructive motion-safe:transition-colors";

const LABEL_CLASS = "text-[0.68rem] uppercase tracking-wide text-muted-foreground";

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

/** Curva S vertical: divisória entre formulário e ilustração (desktop). */
function VerticalWave() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-[140px]"
      viewBox="0 0 140 1000"
      preserveAspectRatio="none"
    >
      <path
        fill="var(--card)"
        d="M0,0 L60,0 C60,180 130,260 130,420 C130,580 20,620 20,760 C20,880 70,940 70,1000 L0,1000 Z"
      />
    </svg>
  );
}

/** Onda horizontal: base da faixa de ilustração (mobile). */
function HorizontalWave() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 w-full"
      viewBox="0 0 1000 80"
      preserveAspectRatio="none"
    >
      <path
        fill="var(--card)"
        d="M0,44 C180,4 330,74 520,52 C700,32 850,64 1000,30 L1000,80 L0,80 Z"
      />
    </svg>
  );
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

  const formPanel = (
    <div className="relative z-30 flex w-full flex-col justify-center gap-5 px-5 py-7 sm:px-8 lg:px-10 lg:py-12">
      <div className="flex flex-col items-start gap-2">
        <img src={umiLockup} alt="Umi Watchlist" className="h-auto w-28 object-contain sm:w-32" />
        <h1 className="font-display text-2xl text-foreground">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}
        </p>
      </div>

      {pendingEmail && (
        <div
          className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Enviamos um e-mail de confirmação para{" "}
          <span className="font-semibold text-foreground">{pendingEmail}</span>. Confira sua caixa de
          entrada e também a pasta de spam antes de entrar.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="email" className={LABEL_CLASS}>
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`${FIELD_CLASS} focus-ring`}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-destructive">
              {errors.email}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password" className={LABEL_CLASS}>
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${FIELD_CLASS} focus-ring`}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive">
              {errors.password}
            </p>
          )}
        </div>
        {mode === "signup" && (
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password" className={LABEL_CLASS}>
              Confirmar senha
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              className={`${FIELD_CLASS} focus-ring`}
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
          className="focus-ring mt-2 w-full bg-primary text-primary-foreground motion-safe:transition-shadow hover:[box-shadow:var(--shadow-glow)]"
        >
          {submitting ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <div className="text-xs text-muted-foreground">
        {mode === "signin" ? (
          <>
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="focus-ring rounded-sm font-semibold text-primary hover:underline"
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
              className="focus-ring rounded-sm font-semibold text-primary hover:underline"
            >
              Entrar
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <Toaster theme="dark" position="top-center" />

      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-border lg:max-w-[1000px] lg:rounded-[2rem]"
        style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}
      >
        {/* ——— Mobile: faixa de ilustração no topo ——— */}
        <div className="relative h-44 w-full overflow-hidden lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 70% at 60% 30%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
            }}
          />
          <img
            src={loginArt450}
            srcSet={ART_SRCSET}
            sizes="420px"
            alt=""
            aria-hidden="true"
            draggable={false}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{
              objectPosition: "60% 12%",
              maskImage:
                "radial-gradient(120% 110% at 55% 40%, var(--foreground) 55%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(120% 110% at 55% 40%, var(--foreground) 55%, transparent 100%)",
            }}
          />
          <HorizontalWave />
        </div>

        {/* ——— Desktop: ilustração à direita + onda vertical ——— */}
        <div className="hidden lg:block">
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[60%] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(55% 60% at 55% 55%, color-mix(in oklab, var(--primary) 24%, transparent), transparent 72%)",
              }}
            />
            <img
              src={loginArt900}
              srcSet={ART_SRCSET}
              sizes="600px"
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full select-none object-contain"
              style={{
                objectPosition: "78% 100%",
                maskImage:
                  "radial-gradient(105% 100% at 55% 55%, var(--foreground) 60%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(105% 100% at 55% 55%, var(--foreground) 60%, transparent 100%)",
              }}
            />
          </div>

          {/* onda: sobreposta à borda esquerda da ilustração */}
          <div aria-hidden="true" className="absolute inset-y-0 left-[40%] z-10 w-[22%] -translate-x-1/2">
            <VerticalWave />
          </div>

          {/* cabeça e ombro cruzam a divisória */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 z-20 w-[60%] overflow-hidden"
            style={{
              maskImage: "linear-gradient(to bottom, var(--foreground) 0%, var(--foreground) 46%, transparent 62%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, var(--foreground) 0%, var(--foreground) 46%, transparent 62%)",
            }}
          >
            <img
              src={loginArt900}
              srcSet={ART_SRCSET}
              sizes="600px"
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full select-none object-contain"
              style={{
                objectPosition: "78% 100%",
                maskImage:
                  "radial-gradient(105% 100% at 55% 55%, var(--foreground) 60%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(105% 100% at 55% 55%, var(--foreground) 60%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ——— Formulário ——— */}
        <div className="relative z-30 lg:aspect-[16/10] lg:w-[40%]">{formPanel}</div>
      </div>
    </div>
  );
}
