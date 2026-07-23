import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";


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
                className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white [&.active]:text-white"
                activeProps={{ className: "text-white bg-white/5" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {/* CTAs */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to="/login"
            className="hidden items-center rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-white/85 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex md:px-4 md:py-2.5 md:text-[14px]"
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
        </div>
      </div>
    </header>
  );
}
