import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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
      { title: "Anime Watchlist — Sua lista pessoal de animes" },
      {
        name: "description",
        content:
          "Crie, avalie e organize sua watchlist de animes por temporada. Tema dark moderno com persistência local.",
      },
      { name: "author", content: "Anime Watchlist" },
      { property: "og:title", content: "Anime Watchlist — Sua lista pessoal de animes" },
      {
        property: "og:description",
        content: "Sua watchlist pessoal de animes por média das temporadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Anime Watchlist — Sua lista pessoal de animes" },
      { name: "description", content: "Anime Watchlist lets you track and rank anime series, managing seasons, scores, and future releases." },
      { property: "og:description", content: "Anime Watchlist lets you track and rank anime series, managing seasons, scores, and future releases." },
      { name: "twitter:description", content: "Anime Watchlist lets you track and rank anime series, managing seasons, scores, and future releases." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e8c753ca-5b8c-4384-835a-17e5061c48fd/id-preview-8c515001--144867bf-5621-4a9a-9085-01bbc8f57495.lovable.app-1776439608891.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e8c753ca-5b8c-4384-835a-17e5061c48fd/id-preview-8c515001--144867bf-5621-4a9a-9085-01bbc8f57495.lovable.app-1776439608891.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
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
  return <Outlet />;
}
