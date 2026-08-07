import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { BootSplash } from "@/components/BootSplash";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(true), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    if (!showSplash) return null;
    return <BootSplash progress={1 / 3} label="restaurando sessão" />;
  }

  return <Outlet />;
}
