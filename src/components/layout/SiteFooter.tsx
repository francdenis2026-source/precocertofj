import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";

const PALETTE = {
  ink: "#08122a",
  navy: "#0f1b3d",
  navy2: "#324c73",
  line: "#dfe3ec",
} as const;

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const FOOTER_LINKS = [
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/planos", label: "Planos" },
  { to: "/colaborar", label: "Colaborar" },
  { to: "/privacidade", label: "Privacidade" },
] as const;

export function SiteFooter() {
  return (
    <footer
      className={dsx(
        ds.container,
        "flex flex-col items-start justify-between gap-3 border-t py-6 text-[12px] sm:flex-row sm:flex-wrap sm:items-center",
      )}
      style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-6 w-6 place-items-center rounded text-[10px] font-bold text-white"
          style={{ background: PALETTE.navy }}
        >
          P
        </span>
        <span className={serif} style={{ color: PALETTE.ink }}>
          PreçoCerto
        </span>
        <span aria-hidden>·</span>
        <span>Feito em Feijó · Acre</span>
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2">
        {FOOTER_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="hover:text-[color:var(--nt-ink)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
