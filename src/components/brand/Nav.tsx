import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { LogOut, MapPin, Shield, ShoppingBag, User } from "lucide-react";
import { Logo } from "./Logo";

import { HighContrastToggle } from "@/components/HighContrastToggle";
import { useMyProfile } from "@/hooks/useMyProfile";
import { NotificationsBell } from "@/components/collab/NotificationsBell";
import { useSignOut } from "@/hooks/use-sign-out";
import { AuthNavToggle } from "@/components/nav/AuthNavToggle";
import { useMyRoles } from "@/hooks/useMyRoles";
import { loginHrefWithRedirect } from "@/lib/auth-redirect";
import { getCart } from "@/lib/cart.functions";
import { IconTile } from "@/components/ui/icon-tile";

const links = [
  { to: "/comparador", label: "Comparador" },
  { to: "/melhores-precos", label: "Melhores preços" },
  { to: "/precos-por-categoria", label: "Por categoria" },
  { to: "/#como-funciona", label: "Como funciona" },
  { to: "/#planos", label: "Planos" },
] as const;

export function Nav() {
  const { session, loading, firstName, fullName, initials, avatarUrl } = useMyProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const isAuthed = !loading && !!session;
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const showAdminLink = isAuthed && !rolesLoading && isAdmin;
  const fetchCart = useServerFn(getCart);
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const cartCount = (cartQuery.data?.items ?? []).reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Logo showTagline />
          <span
            className="hidden items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-[11px] font-semibold text-foreground lg:inline-flex"
            aria-label="Localização atual"
          >
            <IconTile icon={MapPin} size="xs" tone="accent" />
            Feijó · <span className="text-gold-ink">AC</span>
          </span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          
          <HighContrastToggle tone="onLight" className="hidden sm:inline-flex" />
          {showAdminLink && (
            <Link
              to="/admin-login"
              aria-label="Portal interno"
              title="Portal interno"
              className="group hidden h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted sm:inline-flex"
            >
              <IconTile icon={Shield} size="xs" tone="surface" interactive />
              Interno
            </Link>
          )}
          <Link
            to="/cesta"
            aria-label={cartCount > 0 ? `Cesta com ${cartCount} itens` : "Cesta"}
            className="group relative hidden shrink-0 sm:inline-flex"
          >
            <IconTile icon={ShoppingBag} size="sm" tone="surface" interactive />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-foreground shadow">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {isAuthed ? (
            <>
              <NotificationsBell />
              <AuthNavToggle size="sm" className="hidden sm:inline-flex" />

              <Link
                to="/perfil"
                aria-label={fullName ? `Meu perfil — ${fullName}` : "Meu perfil"}
                title={fullName ?? "Meu perfil"}
                className="hidden h-10 max-w-[220px] items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted lg:inline-flex"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {initials ?? <User className="h-4 w-4" />}
                  </span>
                )}
                <span className="truncate">
                  {loading ? "..." : firstName ?? "Perfil"}
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                aria-label="Sair"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{signingOut ? "Saindo..." : "Sair"}</span>
              </button>
            </>
          ) : (
            <>
              <a
                href={loginHrefWithRedirect("/")}
                className="hidden h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-muted sm:inline-flex"
              >
                Entrar
              </a>
              <a
                href={`${loginHrefWithRedirect("/")}${loginHrefWithRedirect("/").includes("?") ? "&" : "?"}mode=signup`}
                className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-[0_8px_20px_-8px_oklch(0.72_0.18_45_/_0.6)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                Criar conta
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
