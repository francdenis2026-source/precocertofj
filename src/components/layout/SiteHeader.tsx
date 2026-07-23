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
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 sm:gap-5 sm:py-5 md:flex md:justify-between md:py-6",
        )}
      >
        <Link to="/" className="flex min-w-0 items-center gap-3.5 sm:gap-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[20px] font-black shadow-lg sm:h-[52px] sm:w-[52px] sm:text-[22px] md:h-14 md:w-14 md:text-[24px]"
            style={{ background: PALETTE.gold, color: PALETTE.navy, boxShadow: `0 6px 18px ${PALETTE.gold}55` }}
          >
            P
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                serif,
                "truncate text-[26px] font-normal text-white sm:text-[30px] md:text-[34px]",
              )}
              style={{ letterSpacing: "-0.012em" }}
            >
              Preço
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                Certo
              </span>
            </span>
            <span
              className="mt-2 hidden text-[11px] font-bold uppercase tracking-[0.22em] text-white/80 sm:block"
            >
              Feijó · Acre
            </span>
          </div>
        </Link>

        {showNav && (
          <nav className="hidden items-center gap-10 text-[15.5px] font-semibold text-white/90 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-1 py-0.5 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          
          <Link
            to="/login"
            className="hidden items-center rounded-lg px-3.5 py-2 text-[14px] font-semibold text-white/90 transition-colors hover:text-white sm:inline-flex md:px-4 md:py-2.5 md:text-[14.5px]"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className={dsx(ds.btn.base, ds.btn.sizes.md, "shadow-md")}
            style={{ background: PALETTE.gold, color: PALETTE.navy }}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
