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
  const { step, setStep, done } = useBootPacer();
  const [overlayGone, setOverlayGone] = useState(false);

  useEffect(() => {
    if (!loading && session) setStep(1);
  }, [loading, session, setStep]);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setOverlayGone(true), 350);
    return () => clearTimeout(t);
  }, [done]);

  const value = useMemo(() => ({ step, setStep }), [step, setStep]);

  if (loading || !session) {
    return <BootSplash progress={1 / 3} label="restaurando sessão" />;
  }

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
