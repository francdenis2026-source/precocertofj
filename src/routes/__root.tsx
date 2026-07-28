import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
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
import { useReadingMode } from "@/hooks/use-reading-mode";
import { useTheme } from "@/hooks/use-theme";
import { usePlansRealtime } from "@/hooks/usePlansRealtime";

import { RouteError, RouteNotFound } from "@/components/feedback";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { MobileStickySearch } from "@/components/layout/MobileStickySearch";

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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
      { property: "og:image", content: "https://precocerto-feijo.app/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://precocerto-feijo.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:alt", content: "PreçoCerto — Consulte o preço antes de comprar" },
      { property: "og:site_name", content: "PreçoCerto" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:url", content: "https://precocerto-feijo.app" },
      { name: "twitter:image", content: "https://precocerto-feijo.app/og-image.jpg" },
      { name: "twitter:image:alt", content: "PreçoCerto — Consulte o preço antes de comprar" },
      { name: "twitter:site", content: "@precocerto" },
      // Impede tradução automática do navegador (Chrome/Edge/Safari) — app é 100% pt-BR
      { name: "google", content: "notranslate" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Favicons "full-bleed": a marca ocupa o máximo do quadro, ficando
      // bem maior/legível na aba e na barra de endereços.
      { rel: "icon", href: "/favicon.ico?v=6", sizes: "16x16 24x24 32x32 48x48 64x64 128x128 256x256" },
      { rel: "icon", href: "/logo-mark.svg?v=6", type: "image/svg+xml", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png?v=6", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-48.png?v=6", sizes: "48x48", type: "image/png" },
      { rel: "icon", href: "/favicon-96.png?v=6", sizes: "96x96", type: "image/png" },
      { rel: "icon", href: "/favicon-512.png?v=6", sizes: "512x512", type: "image/png" },
      { rel: "icon", href: "/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { rel: "icon", href: "/icon-512.png?v=6", sizes: "512x512", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon-180.png?v=6", sizes: "180x180" },
      { rel: "apple-touch-icon", href: "/icon-167.png?v=6", sizes: "167x167" },
      { rel: "apple-touch-icon", href: "/icon-152.png?v=6", sizes: "152x152" },
      { rel: "apple-touch-icon", href: "/icon-120.png?v=6", sizes: "120x120" },
      { rel: "mask-icon", href: "/logo-mark.svg?v=6", color: "#e2a520" },





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
      {
        children:
          "try{var on=localStorage.getItem('pc:reading-mode')==='1';var r=document.documentElement;r.dataset.reading=on?'on':'off';r.style.setProperty('--tc-scale',on?'1.12':'1');}catch(e){}",
      },
      {
        // Console admin: marca o documento ANTES da primeira pintura para que a
        // foto global de fundo nunca apareça (nem cortada) durante o boot.
        children:
          "try{var p=location.pathname;document.documentElement.dataset.adminBoot=(p==='/admin'||p.indexOf('/admin')===0)?'1':'0';}catch(e){}",
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
    <html lang="pt-BR" translate="no" className="notranslate" suppressHydrationWarning>
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
  useReadingMode();

  // Mantém a marcação do console admin em navegações client-side (SPA),
  // evitando flash da foto de fundo entre rotas.
  const adminPathname = useRouterState({ select: (st) => st.location.pathname });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isAdmin = adminPathname.startsWith("/admin");
    document.documentElement.dataset.adminBoot = isAdmin ? "1" : "0";
  }, [adminPathname]);

  // PWA: registra o service worker (auto-update) apenas em produção real.
  useEffect(() => {
    void import("@/lib/pwa").then((m) => m.setupServiceWorker());
  }, []);

  // A11y: toda região rolável recebe foco por teclado + setas/PageUp/Home/End.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void import("@/lib/scroll-keyboard").then((m) => {
      cleanup = m.setupScrollKeyboard();
    });
    return () => cleanup?.();
  }, []);

  // Aquece os dados das rotas principais no tempo ocioso: abrir Buscar,
  // Bairros, Mercados ou Ranking passa a ser instantâneo.
  useEffect(() => {
    void import("@/lib/route-prefetch").then((m) => m.warmMainRoutes(queryClient));
  }, [queryClient]);



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

  // Global guard: bloqueia números negativos em <input type="number"> (exceto quando
  // o input declara explicitamente allow-negative via data-allow-negative).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isGuardedNumber = (el: EventTarget | null): el is HTMLInputElement => {
      if (!(el instanceof HTMLInputElement)) return false;
      if (el.type !== "number") return false;
      if (el.dataset.allowNegative === "true") return false;
      return true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isGuardedNumber(e.target)) return;
      // bloqueia sinal negativo, positivo explícito e notação exponencial
      if (e.key === "-" || e.key === "Subtract" || e.key === "+" || e.key === "e" || e.key === "E") {
        e.preventDefault();
      }
      // seta pra baixo no mínimo: impede ir a negativo via teclado
      if (e.key === "ArrowDown") {
        const el = e.target;
        const n = Number(el.value);
        const step = Number(el.step || "1") || 1;
        if (Number.isFinite(n) && n - step < 0) {
          e.preventDefault();
          if (n !== 0) {
            el.value = "0";
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }
    };

    const clamp = (el: HTMLInputElement) => {
      if (el.value === "" || el.value === "-") return;
      const n = Number(el.value);
      if (Number.isFinite(n) && n < 0) {
        el.value = "0";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    const onInput = (e: Event) => {
      if (!isGuardedNumber(e.target)) return;
      if (!e.target.hasAttribute("min")) e.target.setAttribute("min", "0");
      clamp(e.target);
    };

    const onBlur = (e: FocusEvent) => {
      if (!isGuardedNumber(e.target)) return;
      // limpa "-" solitário ou strings inválidas em blur
      if (e.target.value === "-") {
        e.target.value = "";
        e.target.dispatchEvent(new Event("input", { bubbles: true }));
        e.target.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      clamp(e.target);
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!isGuardedNumber(e.target)) return;
      const text = e.clipboardData?.getData("text") ?? "";
      const trimmed = text.trim();
      // bloqueia paste com sinal negativo ou notação exponencial
      if (/^-/.test(trimmed) || /[eE]/.test(trimmed)) e.preventDefault();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("blur", onBlur, true);
    document.addEventListener("paste", onPaste, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("blur", onBlur, true);
      document.removeEventListener("paste", onPaste, true);
    };
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
        <MobileStickySearch />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <BottomTabBar />
        {/* Compensa a altura da BottomTabBar apenas no mobile, sem afetar desktop. */}
        <div aria-hidden className="h-[64px] md:hidden" />
        <IdleLogoutMonitor />
        <UnlockConversionTracker />
        
        <Toaster richColors position="top-right" />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
