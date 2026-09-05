import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { BootSplash } from "@/components/BootSplash";
import { BootProgressProvider, useBootPacer } from "@/boot/BootProgress";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const LABELS = [
  "restaurando sessão",
  "restaurando sessão",
  "importando dados antigos",
  "carregando seus animes",
];

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  // Enquanto a sessão não resolve (ou não existe): tela neutra, nunca o tubarão.
  if (loading || !session) {
    return <div className="min-h-screen bg-background" />;
  }

  // Com sessão: monta a experiência de boot. Não depende da identidade do
  // objeto session — refresh de token não remonta o BootedShell.
  return <BootedShell />;
}

function BootedShell() {
  const { step, setStep, done } = useBootPacer();
  const [overlayGone, setOverlayGone] = useState(false);

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  useEffect(() => {
    if (!done || overlayGone) return;
    const t = setTimeout(() => setOverlayGone(true), 350);
    return () => clearTimeout(t);
  }, [done, overlayGone]);

  const value = useMemo(() => ({ step, setStep }), [step, setStep]);

  return (
    <BootProgressProvider value={value}>
      <Outlet />
      {!overlayGone && (
        <div
          className="fixed inset-0 z-50"
          style={{
            opacity: done ? 0 : 1,
            transition: "opacity 350ms ease",
            pointerEvents: done ? "none" : "auto",
          }}
        >
          <BootSplash progress={step / 3} label={LABELS[Math.min(step, 3)]} />
        </div>
      )}
    </BootProgressProvider>
  );
}
