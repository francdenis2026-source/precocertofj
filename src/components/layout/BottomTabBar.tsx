import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Heart, User, PlusCircle } from "lucide-react";
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
  { to: "/buscar", label: "Categorias", Icon: Search, matchPrefix: "/categoria" },
  { to: "/registrar", label: "Adicionar", Icon: PlusCircle, matchPrefix: "/registrar" },
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
        "fixed inset-x-0 bottom-0 z-40 flex lg:hidden",
        "border-t border-border bg-[var(--bg-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-surface)]/85",
        "pb-[env(safe-area-inset-bottom)] transition-colors duration-300",
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
                  "pc-nav-link group flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 pt-1.5 pb-1",
                  "text-[11px] font-semibold leading-none outline-none",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition-all duration-300",
                    active
                      ? "bg-[var(--brand-primary)] text-black shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                      : "text-[var(--text-secondary)] group-hover:bg-white/5",
                    label === "Adicionar" && !active && "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "h-6 w-6" : "")} strokeWidth={active ? 3 : 2} aria-hidden />
                </span>
                <span className={cn(
                  "tracking-[0.05em] uppercase text-[9px] mt-1 transition-colors",
                  active ? "text-[var(--brand-primary)] font-black" : "text-[var(--text-tertiary)] font-bold"
                )}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
