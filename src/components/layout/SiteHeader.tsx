import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, Key, Receipt, LayoutDashboard, ChevronDown, Search, Ticket, Menu } from "lucide-react";
import { ds, dsx } from "@/lib/ds";
import { useMyProfile } from "@/hooks/useMyProfile";
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
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/layout/BackButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

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
};

const NAV_LINKS = [
  { to: "/buscar", label: "Buscar" },
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/colaborar", label: "Colaborar" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true, showThemeToggle = true, showBack = true }: Props) {
  const isOverlay = variant === "overlay";
  const { session, firstName, initials, loading } = useMyProfile();
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

  const shellClass = isOverlay
    ? "absolute inset-x-0 top-0 z-30"
    : "sticky top-0 z-40 border-b border-border bg-card/95 text-foreground shadow-elev-1 backdrop-blur-xl dark:bg-background/88";
  const brandTextClass = isOverlay ? "text-on-media" : "text-foreground";
  const brandAccentClass = isOverlay ? "text-brand-soft" : "text-brand";
  const subTextClass = isOverlay ? "text-on-media-muted" : "text-muted-foreground";
  // Nav: hover/active sempre em gold (brand) — legível em light e dark, sem tons cyan.
  const navClass = isOverlay
    ? "relative text-on-media-muted transition-colors hover:text-brand-soft focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent [&.active]:text-brand-soft after:pointer-events-none after:absolute after:inset-x-2 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-brand-soft after:transition-transform after:duration-200 hover:after:scale-x-100 [&.active]:after:scale-x-100"
    : "relative text-muted-foreground transition-colors hover:text-brand focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&.active]:text-brand after:pointer-events-none after:absolute after:inset-x-2 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-brand after:transition-transform after:duration-200 hover:after:scale-x-100 [&.active]:after:scale-x-100";
  const accountClass = isOverlay
    ? "border-on-media-border bg-on-media-surface text-on-media transition-colors hover:border-brand-soft hover:bg-brand-soft/15 hover:text-brand-soft focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    : "border-border bg-card text-foreground transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  // Botão "Entrar" alinhado à paleta gold/navy do header em ambas as variantes.
  // Tokens-only (navy/gold). Hover visível: escurece o gold e sobe elevação; active afunda.
  const loginClass = isOverlay
    ? "bg-brand text-brand-foreground ring-1 ring-primary/20 shadow-[0_4px_14px_rgb(0_0_0/0.25)] transition-[background-color,box-shadow,transform] hover:bg-brand-strong hover:shadow-[0_8px_22px_rgb(0_0_0/0.32)] active:scale-[0.98] active:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    : "bg-brand text-brand-foreground ring-1 ring-primary/15 shadow-elev-2 transition-[background-color,box-shadow,transform] hover:bg-brand-strong hover:shadow-elev-3 active:scale-[0.98] active:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";




  return (
    <header className={shellClass}>
      <div
        className={dsx(
          ds.container,
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 sm:gap-4 sm:py-2 md:flex md:justify-between md:py-2.5",
        )}
      >
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-2.5">
          <span
            className={dsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand text-[19px] font-black text-brand-foreground sm:h-9 sm:w-9 sm:text-[17px] md:h-10 md:w-10 md:text-[19px]",
              isOverlay ? "shadow-[0_6px_18px_rgb(0_0_0/0.28)] ring-1 ring-black/10" : "shadow-elev-2",
            )}
          >
            P
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                serif,
                "truncate text-[24px] font-medium leading-[0.95] tracking-[-0.015em] antialiased sm:text-[23px] md:text-[26px] lg:text-[28px]",
                brandTextClass,
                isOverlay && "[text-shadow:0_1px_2px_rgb(0_0_0/0.35),0_0_1px_rgb(0_0_0/0.25)]",
              )}
            >
              Preço<span className={dsx("italic font-normal -ml-[0.06em] tracking-[-0.01em]", brandAccentClass)}>Certo</span>
            </span>
            <span
              className={dsx(
                "text-eyebrow-muted mt-0.5 antialiased",
                subTextClass,
                isOverlay && "[text-shadow:0_1px_2px_rgb(0_0_0/0.45)]",
              )}
            >
              Feijó <span className="mx-0.5 opacity-60">·</span> Acre
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
                className={dsx("rounded-lg px-3 py-2 text-[15px] font-semibold leading-[1.35] outline-none transition-colors focus-visible:ring-2 xl:text-[16px]", navClass)}
                activeProps={{ className: isOverlay ? "text-brand-soft bg-brand-soft/12" : "text-brand bg-brand/10", "aria-current": "page" } as any}
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
                <button
                  type="button"
                  aria-label="Abrir menu de navegação"
                  className={dsx(
                    "inline-flex h-11 w-11 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 lg:hidden",
                    isOverlay
                      ? "border-on-media-border bg-on-media-surface text-on-media focus-visible:ring-brand/60"
                      : "border-border bg-card text-foreground focus-visible:ring-brand/60",
                  )}
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>
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
                          className="flex min-h-11 items-center rounded-lg px-3 text-[15.5px] font-semibold text-foreground outline-none transition-colors hover:bg-brand/10 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/60"
                          activeProps={{ className: "bg-brand/12 text-brand", "aria-current": "page" } as any}
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

          {/* Busca compacta no topo — páginas internas sempre; landing após rolar o hero */}
          {showNav && scrolled && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim();
                if (term) navigate({ to: "/buscar", search: { q: term } as any });
              }}
              role="search"
              className="hidden md:block"
            >
              <label className="sr-only" htmlFor="header-search">Buscar produto</label>
              <div
                className={dsx(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                  isOverlay ? "border-on-media-border bg-on-media-surface" : "border-border bg-card",
                )}
              >
                <Search className={dsx("h-4 w-4", isOverlay ? "text-on-media-muted" : "text-muted-foreground")} />
                <input
                  id="header-search"
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
          )}

          {!isOverlay && showBack && (
            <BackButton
              variant="pill"
              shortLabel=""
              className="hidden sm:inline-flex"
            />
          )}
          {showThemeToggle && <ThemeToggle size="sm" tone={isOverlay ? "dark" : "light"} />}
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
                <DropdownMenuItem onSelect={() => navigate({ to: "/app" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Meu painel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/minhas-licencas" })}>
                  <Key className="mr-2 h-4 w-4" /> Minhas licenças
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/resgatar" })}>
                  <Ticket className="mr-2 h-4 w-4" /> Resgatar código
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => navigate({ to: "/meus-pedidos" })}>
                  <Receipt className="mr-2 h-4 w-4" /> Meus pedidos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/perfil" })}>
                  <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void signOut()}
                  disabled={signingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Saindo…" : "Sair da conta"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className={dsx(
                "inline-flex items-center rounded-full px-5 py-2.5 text-[15px] font-bold leading-none tracking-[-0.005em] outline-none sm:rounded-lg sm:px-4 sm:py-2 sm:text-[14.5px] md:px-5 md:py-2.5 md:text-[15.5px]",
                loginClass,
              )}
            >
              Entrar
            </Link>


          )}

        </div>
      </div>
    </header>
  );
}
