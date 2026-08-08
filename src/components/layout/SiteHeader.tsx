import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogOut, User as UserIcon, LayoutDashboard, ChevronDown, Menu, ShieldCheck } from "lucide-react";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMyRoles } from "@/hooks/useMyRoles";
import { useSignOut } from "@/hooks/use-sign-out";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/layout/BackButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Variant = "overlay" | "solid";

type Props = {
  variant?: Variant;
  showNav?: boolean;
  showThemeToggle?: boolean;
  showBack?: boolean;
};

const NAV_LINKS = [
  { to: "/precos", label: "Comparar Preços" },
  { to: "/estabelecimentos", label: "Lojas" },
  { to: "/cesta", label: "Cesta Inteligente" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true, showBack = true }: Props) {
  const isOverlay = variant === "overlay";
  const pathname = useLocation({ select: (l) => l.pathname });
  const canShowBack = showBack && pathname !== "/";
  const { session, firstName, initials, loading } = useMyProfile();
  const { isAdmin } = useMyRoles();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { signOut, loading: signingOut } = useSignOut();
  void signingOut;
  const navigate = useNavigate();

  const floating = isOverlay && !scrolled;

  const shellClass = cn(
    "sticky top-0 z-40 w-full shrink-0 text-[var(--text-primary)]",
    "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
    floating
      ? "border-b border-transparent bg-transparent"
      : "border-b border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-base)_78%,transparent)] shadow-[var(--pc-shadow-sm)] backdrop-blur-xl",
  );

  return (
    <header className={shellClass}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:h-20 md:px-8">
        {/* Brand */}
        <Link
          to="/"
          aria-label="PreçoCerto — início"
          className="group flex shrink-0 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        >
          <img
            src="/logo-mark.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-105 md:h-11 md:w-11"
          />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[21px]">
              Preço<span className="text-[var(--brand-primary)]">Certo</span>
            </span>
            <span className="mt-1 text-[12px] font-medium text-[var(--text-tertiary)]">
              Feijó · Acre
            </span>
          </span>
        </Link>

        {/* Removed redundant top search bar as requested by user */}


        {/* Navigation & Actions */}
        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          {showNav && (
            <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  activeProps={{ "data-active": "true" } as any}
                  className={cn(
                    "group relative rounded-[var(--radius-md)] px-3 py-2 text-[15px] font-medium text-[var(--text-secondary)]",
                    "transition-colors duration-200 hover:text-[var(--text-primary)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
                    "data-[active=true]:text-[var(--text-primary)]",
                  )}
                >
                  {l.label}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-[var(--brand-primary)] transition-transform duration-300 ease-out group-hover:scale-x-100 group-data-[active=true]:scale-x-100"
                  />
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!isOverlay && canShowBack && (
              <BackButton variant="pill" className="hidden sm:inline-flex" />
            )}

            {loading ? (
              <div className="h-11 w-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)]" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-11 gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 text-[15px] font-medium",
                      "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]",
                    )}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand-primary)] text-[12px] font-semibold uppercase text-[var(--text-on-brand)]">
                      {initials}
                    </span>
                    <span className="hidden sm:inline">{firstName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-[var(--radius-lg)]">
                  <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => navigate({ to: "/app" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Painel
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/perfil" })}>
                    <UserIcon className="mr-2 h-4 w-4" /> Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login" className="pc-button-ghost hidden sm:inline-flex">
                  Entrar
                </Link>
                <Link to="/cadastro" search={{ from: "/" }} className="pc-button-primary">
                  Começar
                </Link>
              </>
            )}

            {showNav && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="Abrir menu"
                    className="h-11 w-11 rounded-[var(--radius-md)] p-0 text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <SheetHeader className="mb-8">
                    <SheetTitle className="text-left text-[20px] font-semibold tracking-[-0.02em]">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2">
                    {NAV_LINKS.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex h-12 items-center rounded-[var(--radius-md)] px-4 text-[16px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                      >
                        {l.label}
                      </Link>
                    ))}
                    {!session && (
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="mt-2 flex h-12 items-center rounded-[var(--radius-md)] px-4 text-[16px] font-medium text-[var(--brand-primary)] hover:bg-[var(--bg-surface-elevated)]"
                      >
                        Entrar
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}