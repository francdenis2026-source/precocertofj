import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchRouteData } from "@/lib/route-prefetch";
import { LogOut, User as UserIcon, Key, Receipt, LayoutDashboard, ChevronDown, Ticket, Menu, ShieldCheck } from "lucide-react";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
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
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true, showThemeToggle = true, showBack = true }: Props) {
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const shellClass = isOverlay
    ? cn(
        "sticky top-0 z-40 w-full shrink-0 transition-all duration-300",
        scrolled 
          ? "border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md shadow-[var(--shadow-sm)]" 
          : "bg-transparent border-transparent"
      )
    : "sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-md";

  return (
    <header className={shellClass}>
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        {/* Brand */}
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt="PreçoCerto"
            className="h-10 w-10 md:h-12 md:w-12 object-contain"
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span className={cn(
              "text-lg md:text-xl font-bold tracking-tight",
              isOverlay && !scrolled ? "text-white" : "text-[var(--text-primary)]"
            )}>
              Preço<span className="text-[var(--brand-primary)]">Certo</span>
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider mt-0.5",
              isOverlay && !scrolled ? "text-white/60" : "text-[var(--text-tertiary)]"
            )}>
              Feijó · Acre
            </span>
          </div>
        </Link>

        {/* Compact search (only when scrolled or solid) */}
        {(pathname !== "/" || scrolled) && (
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <SmartSearchBar compact />
          </div>
        )}

        {/* Navigation & Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          {showNav && (
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "px-4 py-2 text-[14px] font-semibold transition-colors rounded-lg",
                    isOverlay && !scrolled 
                      ? "text-white/80 hover:text-white hover:bg-white/10" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!isOverlay && canShowBack && (
              <BackButton variant="pill" className="hidden sm:inline-flex" />
            )}
            
            {showThemeToggle && (
               <ThemeToggle className={cn(isOverlay && !scrolled && "text-white hover:bg-white/10")} />
            )}

            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)]" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-10 rounded-[var(--radius-md)] gap-2 border px-3 text-[14px] font-bold",
                      isOverlay && !scrolled 
                        ? "border-white/20 bg-white/10 text-white hover:bg-white/20" 
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                    )}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white uppercase shadow-sm">
                      {initials}
                    </span>
                    <span className="hidden sm:inline">{firstName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-[var(--radius-lg)]">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
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
              <Link
                to="/login"
                className="pc-button-primary"
              >
                Entrar
              </Link>
            )}

            {showNav && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 p-0 lg:hidden rounded-[var(--radius-md)]",
                      isOverlay && !scrolled ? "text-white hover:bg-white/10" : "text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
                    )}
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <SheetHeader className="mb-8">
                    <SheetTitle className="text-left font-bold tracking-tight">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2">
                    {NAV_LINKS.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex h-12 items-center px-4 text-[15px] font-bold text-[var(--text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-elevated)]"
                      >
                        {l.label}
                      </Link>
                    ))}
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