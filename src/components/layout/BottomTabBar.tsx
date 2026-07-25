import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Heart, User } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

/**
 * Barra de navegação inferior — visível apenas no mobile ( < md ).
 * Foco/teclado corretos (button-name / focus-visible), alvos ≥ 56px de altura,
 * safe-area do iOS, e destaque em gold para a aba ativa.
 */
type Tab = {
  to: string;
  label: string;
  Icon: typeof Home;
  matchPrefix?: string;
  requiresAuth?: boolean;
};

const TABS: Tab[] = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/buscar", label: "Buscar", Icon: Search, matchPrefix: "/buscar" },
  { to: "/favoritos", label: "Favoritos", Icon: Heart, matchPrefix: "/favoritos", requiresAuth: true },
  { to: "/perfil", label: "Perfil", Icon: User, matchPrefix: "/perfil", requiresAuth: true },
];

const HIDE_ON = [
  /^\/admin(\/|$|_)/,
  /^\/login$/,
  /^\/cadastro$/,
  /^\/onboarding$/,
  /^\/checkout\b/,
  /^\/auth\b/,
];

export function BottomTabBar() {
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (HIDE_ON.some((r) => r.test(pathname))) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      style={{ boxShadow: "0 -6px 20px -12px rgb(0 0 0 / 0.25)" }}
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {TABS.map(({ to, label, Icon, matchPrefix, requiresAuth }) => {
          const target = requiresAuth && !user ? "/login" : to;
          const active = matchPrefix
            ? pathname === matchPrefix || pathname.startsWith(matchPrefix + "/")
            : pathname === to;

          return (
            <li key={to} className="contents">
              <Link
                to={target}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 pt-1.5 pb-1",
                  "text-[11px] font-semibold leading-none outline-none",
                  "transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active ? "text-[var(--pc-gold-ink)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                    active
                      ? "bg-brand/12 text-[var(--pc-gold-ink)]"
                      : "text-current group-hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                <span className="tracking-[0.02em]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
