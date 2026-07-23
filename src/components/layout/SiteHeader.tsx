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

const PALETTE = {
  navy: "#0f1b3d",
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",
  line: "#dfe3ec",
} as const;

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
};

const NAV_LINKS = [
  { to: "/buscar", label: "Buscar" },
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader({ variant = "solid", showNav = true }: Props) {
  const isOverlay = variant === "overlay";
  const { session, firstName, initials, loading } = useMyProfile();
  const { signOut, loading: signingOut } = useSignOut();
  const navigate = useNavigate();

  const shellClass = isOverlay
    ? "absolute inset-x-0 top-0 z-30"
    : "sticky top-0 z-40 border-b border-white/10";
  const shellStyle: React.CSSProperties = isOverlay
    ? {}
    : { background: PALETTE.navy };

  return (
    <header className={shellClass} style={shellStyle}>
      <div
        className={dsx(
          ds.container,
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:gap-5 sm:py-4 md:flex md:justify-between md:py-5",
        )}
      >
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[19px] font-black shadow-lg sm:h-12 sm:w-12 sm:text-[21px]"
            style={{
              background: PALETTE.gold,
              color: PALETTE.navy,
              boxShadow: `0 6px 16px ${PALETTE.gold}55`,
            }}
          >
            P
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                serif,
                "truncate text-[24px] font-normal leading-none text-white sm:text-[26px] md:text-[28px]",
              )}
              style={{ letterSpacing: "-0.012em" }}
            >
              Preço
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                Certo
              </span>
            </span>
            <span
              className="mt-1.5 hidden text-[10px] font-bold uppercase tracking-[0.24em] text-white/70 sm:block"
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
                className="rounded-lg px-4 py-2.5 text-[16px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white lg:text-[18px] xl:text-[19px] [&.active]:text-white"
                activeProps={{ className: "text-white bg-white/5" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {/* CTAs */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10 sm:px-3 sm:py-2"
                  aria-label="Minha conta"
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: PALETTE.gold, color: PALETTE.navy }}
                  >
                    {initials ?? <UserIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="hidden max-w-[110px] truncate sm:inline">
                    {firstName ?? "Minha conta"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
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
                className="hidden items-center rounded-lg px-4 py-2.5 text-[15.5px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex md:px-5 md:py-3 md:text-[16px]"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-bold tracking-wide shadow-md transition hover:brightness-105 active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-[13.5px]"
                style={{
                  background: PALETTE.gold,
                  color: PALETTE.navy,
                  boxShadow: `0 6px 16px ${PALETTE.gold}40`,
                  letterSpacing: "0.01em",
                }}
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
