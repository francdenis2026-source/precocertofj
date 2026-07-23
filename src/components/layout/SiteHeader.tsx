import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User as UserIcon, Key, Receipt, LayoutDashboard, ChevronDown } from "lucide-react";
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
};

const NAV_LINKS = [
  { to: "/buscar", label: "Buscar" },
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true, showThemeToggle = false }: Props) {
  const isOverlay = variant === "overlay";
  const { session, firstName, initials, loading } = useMyProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const navigate = useNavigate();

  const shellClass = isOverlay
    ? "absolute inset-x-0 top-0 z-30"
    : "sticky top-0 z-40 border-b border-border bg-card/95 text-foreground shadow-elev-1 backdrop-blur-xl dark:bg-background/88";
  const brandTextClass = isOverlay ? "text-on-media" : "text-foreground";
  const brandAccentClass = isOverlay ? "text-brand-soft" : "text-brand";
  const subTextClass = isOverlay ? "text-on-media-muted" : "text-muted-foreground";
  const navClass = isOverlay
    ? "text-on-media-muted hover:bg-on-media-surface hover:text-on-media focus-visible:ring-on-media/60 [&.active]:text-on-media"
    : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/40 [&.active]:bg-primary/10 [&.active]:text-primary";
  const accountClass = isOverlay
    ? "border-on-media-border bg-on-media-surface text-on-media hover:bg-on-media-surface"
    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted";
  const loginClass = isOverlay
    ? "text-on-media-muted hover:bg-on-media-surface hover:text-on-media focus-visible:ring-on-media/60"
    : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/40";

  return (
    <header className={shellClass}>
      <div
        className={dsx(
          ds.container,
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:gap-5 sm:py-4 md:flex md:justify-between md:py-5",
        )}
      >
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span
            className={dsx(
              "grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-brand text-[19px] font-black text-brand-foreground sm:h-12 sm:w-12 sm:text-[21px]",
              isOverlay ? "shadow-[0_6px_18px_rgb(0_0_0/0.28)] ring-1 ring-black/10" : "shadow-elev-2",
            )}
          >
            P
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                serif,
                "truncate text-[24px] font-normal leading-none sm:text-[26px] md:text-[28px]",
                brandTextClass,
                isOverlay && "[text-shadow:0_1px_2px_rgb(0_0_0/0.35),0_0_1px_rgb(0_0_0/0.25)]",
              )}
            >
              Preço
              <span className={dsx("italic", brandAccentClass)}>
                Certo
              </span>
            </span>
            <span
              className={dsx(
                "mt-1.5 hidden text-[10px] font-extrabold uppercase tracking-[0.28em] sm:block",
                subTextClass,
                isOverlay && "[text-shadow:0_1px_2px_rgb(0_0_0/0.45)]",
              )}
            >
              Feijó · Acre
            </span>
          </div>
        </Link>

        {/* Primary nav */}
        {showNav && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={dsx("rounded-lg px-4 py-2.5 text-[16px] font-semibold leading-[1.35] outline-none transition-colors focus-visible:ring-2 lg:text-[18px] xl:text-[19px]", navClass)}
                activeProps={{ className: isOverlay ? "text-on-media bg-on-media-surface" : "text-primary bg-primary/10" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}


        {/* CTAs */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showThemeToggle && <ThemeToggle size="sm" tone={isOverlay ? "dark" : "light"} />}
          {loading ? (
            <div className={dsx("h-9 w-24 animate-pulse rounded-lg", isOverlay ? "bg-on-media-surface" : "bg-muted")} />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={dsx("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3 sm:py-2", accountClass)}
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
            <>
              <Link
                to="/login"
                className={dsx("hidden items-center rounded-lg px-4 py-2.5 text-[15.5px] font-semibold leading-[1.35] outline-none transition-colors focus-visible:ring-2 sm:inline-flex md:px-5 md:py-3 md:text-[16px] lg:text-[18px] xl:text-[19px]", loginClass)}
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold leading-[1.2] text-brand-foreground shadow-elev-2 outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-[13.5px] lg:px-5 lg:py-3 lg:text-[16px] xl:text-[17px]"
              >
                Criar conta
              </Link>
            </>

          )}
        </div>
      </div>
    </header>
  );
}
