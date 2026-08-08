import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, ShoppingBag, ShoppingCart, Star, User, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { loginHrefWithRedirect } from "@/lib/auth-redirect";
import { getCart } from "@/lib/cart.functions";

type Item = {
  to: string;
  label: string;
  icon: typeof Home;
  match?: (p: string) => boolean;
  accent?: boolean;
};

export function MobileNav() {
  const { location } = useRouterState();
  const pathname = location.pathname;
  const { session, loading: sessionLoading } = useSession();
  const isAuthed = !sessionLoading && !!session;
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    if (isAuthed) return;
    setLoginHref(loginHrefWithRedirect());
  }, [isAuthed, location.pathname, location.searchStr]);

  const fetchCart = useServerFn(getCart);
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const cartCount = (cartQuery.data?.items ?? []).reduce(
    (s, i) => s + i.quantity,
    0,
  );

  const isSearchActive = ["/buscar", "/melhores-precos", "/comparador", "/produto"].some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAppActive = isAuthed && (pathname === "/app" || pathname.startsWith("/app/"));

  // No painel do cliente a barra inferior vira a navegação lateral: mantém
  // "Minha lista" e "Favoritos" sempre visíveis em telas pequenas.
  const items: Item[] = isAppActive || (isAuthed && pathname === "/favoritos")
    ? [
      { to: "/app", label: "Painel", icon: Home, match: () => pathname === "/app" },
        { to: "/app/insights", label: "Insights", icon: TrendingDown, match: (p) => p.startsWith("/app/insights") },
        {
          to: "/app/produtos",
          label: "Buscar",
          icon: Search,
          match: (p) => p.startsWith("/app/produtos"),
        },
        {
          to: "/lista",
          label: "Minha lista",
          icon: ShoppingCart,
          match: (p) => p === "/lista" || p.startsWith("/lista/"),
          accent: true,
        },
        { to: "/favoritos", label: "Favoritos", icon: Star, match: (p) => p === "/favoritos" },
      ]
    : [
        { to: "/", label: "Início", icon: Home, match: (p) => p === "/" },
        { to: "/buscar", label: "Buscar", icon: Search, match: () => isSearchActive },
        { to: "/lista", label: "Lista", icon: ShoppingCart, match: (p) => p === "/lista" || p.startsWith("/lista/"), accent: true },
        { to: "/cesta", label: "Cesta", icon: ShoppingBag, match: (p) => p === "/cesta" },
      ];


  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-[12px] pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {items.map((it) => {
          const active = it.match ? it.match(pathname) : pathname === it.to;
          const showBadge = it.to === "/cesta" && cartCount > 0;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-label={showBadge ? `${it.label} (${cartCount})` : it.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "pc-nav-link group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5",
                active
                  ? it.accent
                    ? "text-[var(--brand-accent)]"
                    : "text-[var(--brand-primary)]"
                  : "text-[var(--text-tertiary)]",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 top-0 h-0.5 rounded-b-full",
                    it.accent ? "bg-[var(--brand-accent)]" : "bg-[var(--brand-primary)]",
                  )}
                />
              )}
              <span className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px]",
                    active && it.accent && "drop-shadow-[0_0_6px_oklch(0.74_0.11_82/0.35)]",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-foreground ring-2 ring-background">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold leading-none tracking-tight">
                {it.label}
              </span>
            </Link>
          );
        })}

        {/* Conta / Painel — item único (sem duplicar) */}
        {isAuthed ? (
          <Link
            to="/app"
            aria-label="Meu painel"
            aria-current={isAppActive ? "page" : undefined}
            className={cn(
              "pc-nav-link group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5",
              isAppActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isAppActive && (
              <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary" />
            )}
            <User className="h-[22px] w-[22px]" strokeWidth={isAppActive ? 2.4 : 2} />
            <span className="text-[11px] font-semibold leading-none tracking-tight">Painel</span>
          </Link>
        ) : (
          <a
            href={loginHref}
            aria-label="Entrar"
            className="pc-nav-link group flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-muted-foreground"
          >
            <User className="h-[22px] w-[22px]" strokeWidth={2} />
            <span className="text-[11px] font-semibold leading-none tracking-tight">Entrar</span>
          </a>
        )}
      </div>
    </nav>
  );
}
