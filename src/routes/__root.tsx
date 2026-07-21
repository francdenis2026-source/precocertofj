import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { IdleLogoutMonitor } from "@/components/auth/IdleLogoutMonitor";

import { UnlockConversionTracker } from "@/components/analytics/UnlockConversionTracker";

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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "PreçoCerto — Compare preços, economize de verdade" },
      {
        name: "description",
        content:
          "A plataforma feijoense que compara preços em tempo real nos mercados perto de você. Descubra onde comprar mais barato e economize em cada compra.",
      },
      { name: "author", content: "PreçoCerto" },
      { name: "theme-color", content: "#0b1220" },
      { property: "og:title", content: "PreçoCerto — Compare preços, economize de verdade" },
      {
        property: "og:description",
        content:
          "A plataforma feijoense que compara preços em tempo real nos mercados perto de você. Descubra onde comprar mais barato e economize em cada compra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PreçoCerto — Compare preços, economize de verdade" },
      { name: "twitter:description", content: "A plataforma feijoense que compara preços em tempo real nos mercados perto de você. Descubra onde comprar mais barato e economize em cada compra." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/QspkZx5RoJdpHvZTsLjUo0lBWOv2/social-images/social-1783878109027-ChatGPT_Image_12_de_jul._de_2026,_09_41_39.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/QspkZx5RoJdpHvZTsLjUo0lBWOv2/social-images/social-1783878109027-ChatGPT_Image_12_de_jul._de_2026,_09_41_39.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/brand-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/brand-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        children:
          "try{var t=localStorage.getItem('pc-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){document.documentElement.classList.add('dark');}",
      },
      {
        children:
          "(function(){try{var V='signal-white-2026-07-19';if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){})}if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}if(localStorage.getItem('pc-theme-version')!==V){localStorage.setItem('pc-theme-version',V);if(!sessionStorage.getItem('pc-theme-reloaded-sw')){sessionStorage.setItem('pc-theme-reloaded-sw','1');location.reload()}}}catch(e){}})();",
      },
    ],


  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
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
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const removeBadge = () => {
      const selectors = [
        "#lovable-badge",
        "#lovable-badge-v2",
        '[id^="lovable-badge"]',
        'a[href*="lovable.dev"][target="_blank"]',
      ];
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      }
    };

    removeBadge();

    const observer = new MutationObserver(() => removeBadge());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Sync router/query cache with auth identity transitions
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (
          event !== "SIGNED_IN" &&
          event !== "SIGNED_OUT" &&
          event !== "USER_UPDATED"
        )
          return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      return () => sub.subscription.unsubscribe();
    });
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <IdleLogoutMonitor />
        <UnlockConversionTracker />
        
        <Toaster richColors position="top-right" />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
