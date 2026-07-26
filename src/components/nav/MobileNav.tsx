import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, ShoppingBag, ShoppingCart, User } from "lucide-react";
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

  const items: Item[] = [
    { to: "/", label: "Início", icon: Home, match: (p) => p === "/" },
    { to: "/buscar", label: "Buscar", icon: Search, match: () => isSearchActive },
    { to: "/lista", label: "Lista", icon: ShoppingCart, match: (p) => p === "/lista" || p.startsWith("/lista/"), accent: true },
    { to: "/cesta", label: "Cesta", icon: ShoppingBag, match: (p) => p === "/cesta" },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden [overscroll-behavior:contain] [touch-action:manipulation]"
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
                "group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                active
                  ? it.accent
                    ? "text-accent-strong"
                    : "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 top-0 h-0.5 rounded-b-full",
                    it.accent ? "bg-accent" : "bg-primary",
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
              "group relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
              isAppActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
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
            className="group flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="h-[22px] w-[22px]" strokeWidth={2} />
            <span className="text-[11px] font-semibold leading-none tracking-tight">Entrar</span>
          </a>
        )}
      </div>
    </nav>
  );
}
