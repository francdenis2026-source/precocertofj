import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { prefetchRouteData } from "@/lib/route-prefetch";
import { LogOut, User as UserIcon, Key, Receipt, LayoutDashboard, ChevronDown, Search, Ticket, Menu, ShieldCheck } from "lucide-react";
import { ds, dsx } from "@/lib/ds";
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
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/layout/BackButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const serif = "font-sans";

type Variant = "overlay" | "solid";

type Props = {
  /**
   * "overlay" → transparente sobre um hero escuro (usar em landing).
   * "solid"   → fundo Navy sólido com borda inferior (páginas internas).
   */
  variant?: Variant;
  /** Esconde a navegação principal (útil em fluxos de auth / checkout). */
  showNav?: boolean;
  /** Mostra o botão de alternância claro/escuro (apenas na homepage). */
  showThemeToggle?: boolean;
  /** Mostra o botão "Voltar" (padrão true na variante solid). */
  showBack?: boolean;
  /** Força o estado compacto (ex: busca ativa na home). */
  forceCompact?: boolean;
};

const NAV_LINKS = [
  { to: "/buscar", label: "Buscar" },
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/colaborar", label: "Colaborar" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true, showThemeToggle = true, showBack = true, forceCompact = false }: Props) {
  const isOverlay = variant === "overlay";
  const pathname = useLocation({ select: (l) => l.pathname });
  // Na homepage não há "tela anterior" dentro do app: o Voltar não faz sentido.
  const canShowBack = showBack && pathname !== "/";
  const { session, firstName, initials, loading } = useMyProfile();
  // Contas internas (admin) precisam voltar ao console sem passar pelo /login.
  const { isAdmin } = useMyRoles();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // Busca compacta no header aparece após o usuário rolar o hero (apenas overlay/landing).
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

  // O header global existe apenas na homepage: nas demais seções a navegação
  // fica a cargo do PageHeader/InternalPageHeader (com HomeBrandLink) e da
  // BottomTabBar, evitando duas barras empilhadas.
  // Removed conditional return to ensure header is always visible
  // if (pathname !== "/") return null;

  const shellClass = isOverlay
    ? "sticky top-0 z-40 w-full shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-[12px] shadow-sm"
    : "sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-sm backdrop-blur-[12px] transition-colors duration-300";
  const brandTextClass = "text-[var(--text-primary)]";
  const brandAccentClass = "text-[var(--brand-primary)]";
  const subTextClass = "text-[var(--text-tertiary)]";
  const navClass = "relative text-[var(--text-secondary)] transition-colors hover:text-[var(--brand-primary)] [&.active]:text-[var(--brand-primary)]";
  const accountClass = "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--bg-surface-elevated)] shadow-sm";
  const loginClass = "bg-[var(--brand-primary)] text-black font-black shadow-[var(--pc-shadow-md)] transition-all hover:scale-[1.02] active:scale-[0.98]";




  return (
    <header className={shellClass} data-site-header="global">
      <div
        className={dsx(
          ds.container,
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1 sm:gap-4 sm:py-1.5 md:flex md:justify-between md:py-2",
        )}
      >
        {/* Brand */}
        <Link to="/" className="group flex min-w-0 items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--brand-primary)] blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <img
              src="/logo-mark.png"
              alt=""
              aria-hidden="true"
              width={64}
              height={64}
              className={dsx(
                "relative h-12 w-12 shrink-0 object-contain transition-transform duration-500 group-hover:scale-110 sm:h-12 sm:w-12 md:h-14 md:w-14 drop-shadow-[0_10px_30px_rgba(108,92,231,0.2)]"
              )}
            />
          </div>

          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                "font-display truncate text-xl font-black leading-tight tracking-[-0.05em] antialiased sm:text-2xl",
                brandTextClass,
              )}
            >
              Preço<span className="text-[var(--brand-primary)]">Certo</span>
            </span>
            <span
              className={dsx(
                "text-[12px] font-bold uppercase tracking-[0.06em] mt-1 antialiased",
                subTextClass,
              )}
            >
              Nossa Feijó <span className="mx-0.5 opacity-60">·</span> <span className="text-[var(--brand-primary)]">Acre</span>
            </span>
          </div>
        </Link>





        {/* Primary nav — desktop */}
        {showNav && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onPointerEnter={() => prefetchRouteData(queryClient, String(l.to))}
                onFocus={() => prefetchRouteData(queryClient, String(l.to))}
                className={cn(
                  "pc-nav-link rounded-lg px-4 py-2 text-[15px] font-normal leading-none antialiased outline-none transition-all hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]",
                  navClass
                )}
                activeProps={{ "aria-current": "page" } as any}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}


        {/* CTAs */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Menu de navegação para telas < lg (mobile e tablet) */}
          {showNav && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  aria-label="Abrir menu de navegação"
                  className={dsx(
                    "inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 outline-none transition-all focus-visible:ring-2 lg:hidden",
                    isOverlay
                      ? "border-white/20 bg-white/10 text-white backdrop-blur-md focus-visible:ring-white/50"
                      : "border-border bg-card text-foreground focus-visible:ring-primary/50",
                  )}
                >
                  <Menu className="h-6 w-6" aria-hidden />
                </motion.button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-xs p-0">
                <SheetHeader className="px-4 pt-4 pb-2 text-left">
                  <SheetTitle className="text-[17px]">Navegação</SheetTitle>
                </SheetHeader>
                <nav aria-label="Navegação do menu" className="px-2 pb-6">
                  <ul className="flex flex-col">
                    {[...NAV_LINKS, { to: "/resgatar", label: "Resgatar código" } as const].map((l) => (
                      <li key={l.to}>
                        <Link
                          to={l.to}
                          onClick={() => setMenuOpen(false)}
                          className="pc-nav-link flex min-h-11 items-center rounded-lg px-3 text-[15.5px] font-semibold text-foreground outline-none"
                          activeProps={{ "aria-current": "page" } as any}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </SheetContent>
            </Sheet>
          )}

          {/* Busca compacta no topo — páginas internas sempre; landing após rolar o hero ou quando focado */}
          {showNav && (scrolled || forceCompact) && (
            <motion.div
              initial={forceCompact ? { y: 20, opacity: 0 } : { y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={forceCompact ? { y: 20, opacity: 0 } : { y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="hidden md:block"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const term = q.trim();
                  if (term) navigate({ to: "/buscar", search: { q: term } as any });
                }}
                role="search"
              >
                <label className="sr-only" htmlFor="header-search">Buscar produto</label>
                <div
                  className={dsx(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary/40",
                    isOverlay ? "border-on-media-border bg-on-media-surface/80 backdrop-blur-md" : "border-border bg-card/80 backdrop-blur-md",
                    forceCompact && "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20 shadow-xl"
                  )}
                >
                  <Search className={dsx("h-4 w-4", isOverlay ? "text-on-media-muted" : "text-muted-foreground")} />
                  <input
                    id="header-search"
                    autoFocus={forceCompact}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar preço…"
                    className={dsx(
                      "w-32 bg-transparent text-[13.5px] font-medium outline-none xl:w-44",
                      isOverlay ? "text-on-media placeholder:text-on-media-muted" : "text-foreground placeholder:text-muted-foreground",
                    )}
                  />
                </div>
              </form>
            </motion.div>
          )}

          {!isOverlay && canShowBack && (
            <BackButton
              variant="pill"
              shortLabel=""
              className="hidden sm:inline-flex"
            />
          )}
          {showThemeToggle && (
            <div className="ml-1 sm:ml-2">
              <ThemeToggle size="sm" />
            </div>
          )}
          {loading ? (
            <div className={dsx("h-9 w-24 animate-pulse rounded-lg", isOverlay ? "bg-on-media-surface" : "bg-muted")} />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={dsx("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[14px] font-semibold transition-colors sm:px-3 sm:py-2 sm:text-[13px]", accountClass)}
                  aria-label="Minha conta"
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground"
                  >
                    {initials ?? <UserIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="hidden max-w-[110px] truncate sm:inline">
                    {firstName ?? "Minha conta"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {firstName ? `Olá, ${firstName}` : "Minha conta"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })} className="pc-nav-link pc-nav-link--row">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Console administrativo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onSelect={() => navigate({ to: "/app" })} className="pc-nav-link pc-nav-link--row">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Meu painel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/minhas-licencas" })} className="pc-nav-link pc-nav-link--row">
                  <Key className="mr-2 h-4 w-4" /> Minhas licenças
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/resgatar" })} className="pc-nav-link pc-nav-link--row">
                  <Ticket className="mr-2 h-4 w-4" /> Resgatar código
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => navigate({ to: "/meus-pedidos" })} className="pc-nav-link pc-nav-link--row">
                  <Receipt className="mr-2 h-4 w-4" /> Meus pedidos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/perfil" })} className="pc-nav-link pc-nav-link--row">
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void signOut()}
                  disabled={signingOut}
                  className="pc-nav-link pc-nav-link--row text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Saindo…" : "Sair da conta"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className={cn(
                "font-display inline-flex items-center rounded-lg bg-[var(--brand-primary)] px-6 py-3 text-[15px] font-bold text-black shadow-[0_20px_40px_-10px_var(--brand-glow)] transition-all hover:scale-[1.05] hover:bg-[var(--brand-primary)]/90 active:scale-[0.98] outline-none",
              )}
            >
              Entrar na conta
            </Link>


          )}

        </div>
      </div>
    </header>
  );
}
