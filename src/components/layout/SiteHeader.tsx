import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";
import { HighContrastToggle } from "@/components/HighContrastToggle";

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
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 sm:gap-3 sm:py-4 md:flex md:justify-between md:py-5",
        )}
      >
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-bold shadow-md sm:h-10 sm:w-10 md:h-11 md:w-11 md:text-[16px]"
            style={{ background: PALETTE.gold, color: PALETTE.navy }}
          >
            P
          </span>
          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={dsx(
                serif,
                "truncate text-[19px] font-normal text-white sm:text-[22px] md:text-[24px]",
              )}
            >
              Preço
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                Certo
              </span>
            </span>
            <span
              className={dsx(
                ds.type.overline,
                "mt-1 hidden text-white/70 sm:block",
              )}
            >
              Feijó · Acre
            </span>
          </div>
        </Link>

        {showNav && (
          <nav className="hidden items-center gap-8 text-[14px] font-medium text-white/85 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <HighContrastToggle tone="onDark" />
          <Link
            to="/login"
            className="hidden items-center rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/90 transition-colors hover:text-white sm:inline-flex md:px-4 md:py-2.5 md:text-[14px]"
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
