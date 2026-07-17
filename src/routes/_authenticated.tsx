import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  return <Outlet />;
}
