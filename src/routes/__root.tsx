import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/auth/AuthProvider";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Umi Watchlist — Sua lista pessoal de animes" },
      {
        name: "description",
        content:
          "Organize sua watchlist de animes: acompanhe temporadas, veja o ranking pela nota do MAL e classifique seus favoritos em tiers.",
      },
      { name: "author", content: "Umi Watchlist" },
      { property: "og:title", content: "Umi Watchlist — Sua lista pessoal de animes" },
      {
        property: "og:description",
        content:
          "Organize sua watchlist de animes: acompanhe temporadas, veja o ranking pela nota do MAL e classifique seus favoritos em tiers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Umi Watchlist — Sua lista pessoal de animes" },
      {
        name: "twitter:description",
        content:
          "Organize sua watchlist de animes: acompanhe temporadas, veja o ranking pela nota do MAL e classifique seus favoritos em tiers.",
      },
      { property: "og:image", content: "https://umiwatchlist.lovable.app/umi-og.png" },
      { name: "twitter:image", content: "https://umiwatchlist.lovable.app/umi-og.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/umi-mark.png" },
      { rel: "apple-touch-icon", href: "/umi-mark.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

