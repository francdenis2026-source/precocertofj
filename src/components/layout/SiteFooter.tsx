import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";
import { MapPin, Mail, ShieldCheck } from "lucide-react";

const PALETTE = {
  ink: "#08122a",
  navy: "#0f1b3d",
  navy2: "#324c73",
  muted: "#5b6b86",
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",
  line: "#e4e8f0",
  bgTint: "#f7f9fc",
} as const;

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const NAV_COLS: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  {
    title: "Explorar",
    links: [
      { to: "/melhores-precos", label: "Rankings" },
      { to: "/estabelecimentos", label: "Mercados" },
      { to: "/mapa", label: "Bairros" },
      { to: "/buscar", label: "Buscar produto" },
    ],
  },
  {
    title: "Conta",
    links: [
      { to: "/planos", label: "Planos" },
      { to: "/resgatar", label: "Ativar código" },
      { to: "/login", label: "Entrar" },
      { to: "/cadastro", label: "Criar conta" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { to: "/colaborar", label: "Colaborar" },
      { to: "/privacidade", label: "Privacidade" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-16 border-t"
      style={{ background: PALETTE.bgTint, borderColor: PALETTE.line }}
    >
      {/* Top — brand + link columns */}
      <div
        className={dsx(
          ds.container,
          "grid gap-10 py-12 md:grid-cols-[1.2fr_2fr] md:gap-14 md:py-14",
        )}
      >
        {/* Brand block */}
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[16px] font-black shadow-sm"
              style={{
                background: PALETTE.navy,
                color: PALETTE.goldSoft,
                boxShadow: `0 4px 12px ${PALETTE.navy}30`,
              }}
            >
              P
            </span>
            <span
              className={dsx(serif, "text-[26px] leading-none")}
              style={{ color: PALETTE.ink, letterSpacing: "-0.012em" }}
            >
              Preço
              <span className="italic" style={{ color: PALETTE.gold }}>
                Certo
              </span>
            </span>
          </Link>

          <p
            className="mt-4 text-[13.5px] leading-relaxed"
            style={{ color: PALETTE.muted }}
          >
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
            Dados verificados por nota fiscal, atualizados pela comunidade.
          </p>

          <ul
            className="mt-5 space-y-2 text-[12.5px]"
            style={{ color: PALETTE.navy2 }}
          >
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
              Feijó · Acre · Brasil
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
              <a
                href="mailto:precofacil-fj@proton.me"
                className="hover:underline"
              >
                precofacil-fj@proton.me
              </a>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
              Dados protegidos · LGPD
            </li>
          </ul>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <div
                className="text-[10.5px] font-bold uppercase tracking-[0.22em]"
                style={{ color: PALETTE.gold }}
              >
                {col.title}
              </div>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-[13.5px] transition-colors"
                      style={{ color: PALETTE.navy2 }}
                    >
                      <span className="hover:text-[color:var(--nt-ink)]">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — legal strip */}
      <div style={{ borderTop: `1px solid ${PALETTE.line}` }}>
        <div
          className={dsx(
            ds.container,
            "flex flex-col items-start justify-between gap-3 py-5 text-[11.5px] sm:flex-row sm:items-center",
          )}
          style={{ color: PALETTE.muted }}
        >
          <div className="flex items-center gap-2">
            <span>© {year} PreçoCerto</span>
            <span aria-hidden>·</span>
            <span>Feito com carinho em Feijó · Acre</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="hover:text-[color:var(--nt-ink)]">
              Privacidade
            </Link>
            <span aria-hidden>·</span>
            <Link to="/colaborar" className="hover:text-[color:var(--nt-ink)]">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
