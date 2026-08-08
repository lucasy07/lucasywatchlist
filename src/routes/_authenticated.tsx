import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { BootSplash } from "@/components/BootSplash";
import { BootProgressProvider } from "@/boot/BootProgress";

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
  const [step, setStepState] = useState(0);
  const [overlayGone, setOverlayGone] = useState(false);

  const setStep = useCallback((n: number) => {
    setStepState((prev) => Math.max(prev, n));
  }, []);

  useEffect(() => {
    if (!loading && session) setStep(1);
  }, [loading, session, setStep]);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (step < 3) return;
    const t = setTimeout(() => setOverlayGone(true), 350);
    return () => clearTimeout(t);
  }, [step]);

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
            opacity: step >= 3 ? 0 : 1,
            transition: "opacity 350ms ease",
            pointerEvents: step >= 3 ? "none" : "auto",
          }}
        >
          <BootSplash progress={step / 3} label={LABELS[Math.min(step, 3)]} />
        </div>
      )}
    </BootProgressProvider>
  );
}
