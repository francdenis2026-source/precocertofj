import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { loginHrefWithRedirect } from "@/lib/auth-redirect";
import { getCart } from "@/lib/cart.functions";

const left = [
  { to: "/", label: "Início", icon: Home },
  { to: "/buscar", label: "Buscar", icon: Search },
] as const;

const right = [
  { to: "/cesta", label: "Cesta", icon: ShoppingBag },
] as const;

export function MobileNav() {
  const { location } = useRouterState();
  const pathname = location.pathname;
  const listaActive = pathname === "/lista";
  const { session, loading: sessionLoading } = useSession();
  const isAuthed = !sessionLoading && !!session;
  const fetchCart = useServerFn(getCart);
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const cartCount = (cartQuery.data?.items ?? []).reduce((s, i) => s + i.quantity, 0);

  // Rotas que representam o fluxo de "busca/descoberta" no mobile.
  const SEARCH_PREFIXES = ["/buscar", "/melhores-precos", "/comparador", "/produto"];
  const isSearchActive = SEARCH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const renderItem = (to: string, label: string, Icon: typeof Home) => {
    const active =
      to === "/buscar" ? isSearchActive : pathname === to;
    const showBadge = to === "/cesta" && cartCount > 0;
    return (
      <Link
        key={to}
        to={to}
        aria-label={showBadge ? `${label} (${cartCount})` : label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-colors",
          active ? "text-accent-strong" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="relative">
          <IconTile
            icon={Icon}
            size="sm"
            tone={active ? "accent" : "surface"}
            density="compact"
            interactive
          />
          {showBadge && (
            <span className="absolute -right-1.5 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground shadow ring-2 ring-background">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </span>
        <span className={cn(
          "text-[12px] font-semibold tracking-tight",
          active && "text-accent-strong",
        )}>
          {label}
        </span>
      </Link>
    );
  };

  // Item "Conta": leva para /app quando logado (com highlight), ou /login preservando redirect quando não.
  const renderAccountItem = () => {
    const active = isAuthed && (pathname === "/app" || pathname.startsWith("/app/"));
    const commonClass = cn(
      "group flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-colors",
      active ? "text-accent-strong" : "text-muted-foreground hover:text-foreground",
    );
    if (isAuthed) {
      return (
        <Link
          to="/app"
          aria-label="Meu painel"
          aria-current={active ? "page" : undefined}
          className={commonClass}
        >
          <IconTile
            icon={User}
            size="sm"
            tone={active ? "accent" : "surface"}
            density="compact"
            interactive
          />
          <span className={cn("text-[12px] font-semibold tracking-tight", active && "text-accent-strong")}>
            Painel
          </span>
        </Link>
      );
    }
    return (
      <a href={loginHrefWithRedirect()} aria-label="Entrar" className={commonClass}>
        <IconTile icon={User} size="sm" tone="surface" density="compact" interactive />
        <span className="text-[12px] font-semibold tracking-tight">Conta</span>
      </a>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-[60] bg-background pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden [overscroll-behavior:contain] [touch-action:manipulation] before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background before:to-transparent"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between gap-1 border-t border-border bg-background px-2 pt-2 pb-1 shadow-[0_-10px_30px_-12px_rgba(15,81,50,0.15)]">
        {left.map((n) => renderItem(n.to, n.label, n.icon))}

        {/* Center FAB — Lista/Carrinho de compras */}
        <div className="relative flex flex-1 items-start justify-center">
          <Link
            to="/lista"
            aria-label="Minha lista"
            className={cn(
              "group absolute -top-6 transition-transform active:scale-95",
              listaActive && "drop-shadow-[0_0_0_oklch(0.74_0.11_82/0.4)]",
            )}
          >
            <IconTile
              icon={ShoppingCart}
              size="lg"
              tone="accent"
              interactive
              className={cn("rounded-full", listaActive && "ring-4 ring-accent/25")}
            />
          </Link>
          <span className="mt-[52px] text-[12px] font-semibold tracking-tight text-muted-foreground">
            Lista
          </span>
        </div>

        {right.map((n) => renderItem(n.to, n.label, n.icon))}
        {renderAccountItem()}
      </div>
    </nav>
  );
}
