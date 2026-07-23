import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";
import { MapPin, Mail, ShieldCheck } from "lucide-react";

const PALETTE = {
  ink: "#08122a",
  navy: "#0f1b3d",
  navy2: "#1f2f4d",
  muted: "#334463",
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",
  line: "#d4dbe6",
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
      className="mt-10 border-t md:mt-16"
      style={{ background: PALETTE.bgTint, borderColor: PALETTE.line }}
    >
      {/* Top — brand + link columns */}
      <div
        className={dsx(
          ds.container,
          "grid gap-7 py-7 md:grid-cols-[1.2fr_2fr] md:gap-14 md:py-14",
        )}
      >
        {/* Brand block */}
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-black shadow-sm md:h-10 md:w-10 md:text-[16px]"
              style={{
                background: PALETTE.navy,
                color: PALETTE.goldSoft,
                boxShadow: `0 4px 12px ${PALETTE.navy}30`,
              }}
            >
              P
            </span>
            <span
              className={dsx(serif, "text-[22px] leading-none md:text-[26px]")}
              style={{ color: PALETTE.ink, letterSpacing: "-0.012em" }}
            >
              Preço
              <span className="italic" style={{ color: PALETTE.gold }}>
                Certo
              </span>
            </span>
          </Link>

          <p
            className="mt-3 text-[12.5px] leading-relaxed md:mt-4 md:text-[13.5px]"
            style={{ color: PALETTE.muted }}
          >
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
          </p>

          <ul
            className="mt-3.5 space-y-1.5 text-[12px] md:mt-5 md:space-y-2 md:text-[12.5px]"
            style={{ color: PALETTE.navy2 }}
          >
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
              Feijó · Acre · Brasil
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
              <a href="mailto:precofacil-fj@proton.me" className="hover:underline">
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
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <div
                className="text-[10px] font-bold uppercase tracking-[0.2em] md:text-[10.5px] md:tracking-[0.22em]"
                style={{ color: PALETTE.gold }}
              >
                {col.title}
              </div>
              <ul className="mt-2 space-y-1.5 md:mt-3 md:space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-[12.5px] transition-colors md:text-[13.5px]"
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

      {/* Bottom — legal strip (sem duplicar links do menu) */}
      <div style={{ borderTop: `1px solid ${PALETTE.line}`, background: "#eef2f8" }}>
        <div
          className={dsx(
            ds.container,
            "flex flex-col items-start justify-between gap-1.5 py-3 text-[12px] font-medium sm:flex-row sm:items-center md:py-4 md:text-[13px]",
          )}
          style={{ color: PALETTE.ink }}
        >
          <span>© {year} <strong className="font-semibold">PreçoCerto</strong> · Feijó · Acre</span>
          <span className="font-mono" style={{ color: PALETTE.navy2 }}>&lt;dev&gt; Franc D&apos;nis</span>
        </div>
      </div>
    </footer>
  );
}
