import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarClock, Clapperboard, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const tabInactive =
  "relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const tabActive =
  "relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary transition-colors after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-primary";

function AuthenticatedLayout() {
  const { session, loading, signOut, user } = useAuth();
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

  return (
    <>
      <Toaster
        theme="dark"
        position="top-right"
        offset={{ top: "80px" }}
        mobileOffset={{ top: "80px" }}
      />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-primary/30"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Clapperboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Anime <span className="text-gold-gradient">Watchlist</span>
            </h1>
          </div>

          <nav className="flex flex-1 items-center gap-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className={tabInactive}
              activeProps={{ className: tabActive, "aria-current": "page" }}
            >
              Ranking
            </Link>
            <Link
              to="/upcoming"
              className={tabInactive}
              activeProps={{ className: tabActive, "aria-current": "page" }}
            >
              <CalendarClock className="h-4 w-4" />
              Em breve
            </Link>
          </nav>

          <button
            onClick={() => signOut()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
            aria-label="Sair"
            title={user?.email ?? "Sair"}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <Outlet />
    </>
  );
}
