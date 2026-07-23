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
import { useAutoTranslate } from "@/lib/pt-terms";

import { UnlockConversionTracker } from "@/components/analytics/UnlockConversionTracker";
import { useTheme } from "@/hooks/use-theme";

import { RouteError, RouteNotFound } from "@/components/feedback";

function NotFoundComponent() {
  return <RouteNotFound />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <RouteError
      message={error?.message || "Algo deu errado por aqui. Você pode tentar de novo ou voltar para o início."}
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "PreçoCerto — Consulte o preço antes de comprar" },
      {
        name: "description",
        content:
          "Busca em tempo real de preços por nome do produto em mercados perto de você. Escaneie códigos e economize a cada compra.",
      },
      { name: "author", content: "PreçoCerto" },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "PreçoCerto" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "PreçoCerto" },
      { property: "og:title", content: "PreçoCerto — Consulte o preço antes de comprar" },
      {
        property: "og:description",
        content:
          "Busca em tempo real de preços por nome do produto em mercados perto de você. Escaneie códigos e economize a cada compra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PreçoCerto — Consulte o preço antes de comprar" },
      { name: "twitter:description", content: "Busca em tempo real de preços por nome do produto em mercados perto de você. Escaneie códigos e economize a cada compra." },
      { property: "og:image", content: "https://precocerto-feijo.app/icon-1024.png" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:alt", content: "Logo PreçoCerto" },
      { name: "twitter:image", content: "https://precocerto-feijo.app/icon-1024.png" },
      { name: "twitter:image:alt", content: "Logo PreçoCerto" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo-mark.svg", type: "image/svg+xml", sizes: "any" },
      { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "shortcut icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-180.png", sizes: "180x180" },
      { rel: "apple-touch-icon", href: "/icon-152.png", sizes: "152x152" },
      { rel: "apple-touch-icon", href: "/icon-167.png", sizes: "167x167" },
      { rel: "apple-touch-icon", href: "/icon-120.png", sizes: "120x120" },
      { rel: "mask-icon", href: "/logo-mark.svg", color: "#12294a" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Outfit:wght@500;600;700;800&family=Figtree:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        children:
          "try{var s=localStorage.getItem('pc-theme');var d=s!=='light';var r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){var r=document.documentElement;r.classList.add('dark');r.dataset.theme='dark';r.style.colorScheme='dark';}",
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
    <html lang="pt-BR" suppressHydrationWarning>
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
  useAutoTranslate();
  useTheme();


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
