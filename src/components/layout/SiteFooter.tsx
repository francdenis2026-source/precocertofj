import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";
import { MapPin, Mail, ShieldCheck } from "lucide-react";

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
      { to: "/fale-conosco", label: "Fale conosco" },
      { to: "/privacidade", label: "Privacidade" },
    ],
  },
];

// Flat link list for the compact mobile footer (grouped by intent)
const MOBILE_LINKS: Array<{ to: string; label: string }> = [
  { to: "/melhores-precos", label: "Rankings" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/planos", label: "Planos" },
  { to: "/fale-conosco", label: "Contato" },
  { to: "/privacidade", label: "Privacidade" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-4 border-t border-border bg-muted/45 text-foreground md:mt-8"
    >
      {/* ============ MOBILE (ultra compact + safe-area) ============ */}
      <div
        className={dsx(
          ds.container,
          "md:hidden pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-[max(0.875rem,env(safe-area-inset-left))]",
        )}
      >
        {/* Row 1: brand + location badge */}
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5"
            aria-label="PreçoCerto — início"
          >
            <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-brand text-[11px] font-black text-brand-foreground shadow-elev-2">
              P
            </span>
            <span className={dsx(serif, "text-[14px] leading-none text-foreground")}>
              Preço<span className="italic text-brand">Certo</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <MapPin className="h-3 w-3 text-brand" aria-hidden />
            Feijó · AC
          </span>
        </div>

        {/* Row 2: nav chips — inline flex, wraps if needed */}
        <nav
          aria-label="Rodapé"
          className="mt-2 flex flex-wrap gap-x-1 gap-y-1 text-[12px] font-semibold leading-none text-foreground/85"
        >
          {MOBILE_LINKS.map((l, i) => (
            <span key={l.to} className="inline-flex items-center">
              <Link
                to={l.to}
                className="rounded px-1 py-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {l.label}
              </Link>
              {i < MOBILE_LINKS.length - 1 && (
                <span aria-hidden className="px-0.5 text-muted-foreground/50">·</span>
              )}
            </span>
          ))}
        </nav>

        {/* Row 3: legal strip, single line */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-1.5 text-[10.5px] leading-none text-muted-foreground">
          <span>© {year} · LGPD</span>
          <span className="font-mono">&lt;dev&gt; Franc D&apos;nis</span>
        </div>
      </div>




      {/* ============ DESKTOP / TABLET ============ */}
      <div
        className={dsx(
          ds.container,
          "hidden md:grid gap-3.5 py-3.5 sm:gap-6 md:grid-cols-[1.2fr_2fr] md:gap-10 md:py-6",
        )}
      >
        {/* Brand block */}
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-brand text-[15px] font-black text-brand-foreground shadow-elev-2 sm:h-9 sm:w-9 sm:text-[17px] md:h-10 md:w-10 md:text-[19px]"
            >
              P
            </span>
            <span
              className={dsx(serif, "text-[19px] leading-none text-foreground sm:text-[23px] md:text-[26px]")}
            >
              Preço<span className="italic text-brand">Certo</span>
            </span>
          </Link>

          <p className="mt-2 text-[12px] leading-snug text-muted-foreground md:mt-2.5 md:text-[13px]">
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
          </p>

          <ul className="mt-3 space-y-1.5 text-[12px] text-foreground/80 md:text-[12.5px]">
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
              Feijó · Acre · Brasil
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-brand" />
              <a href="mailto:precocerto-fj@proton.me" className="truncate hover:underline">
                precocerto-fj@proton.me
              </a>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand" />
              Dados protegidos · LGPD
            </li>
          </ul>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-8">
          {NAV_COLS.map((col) => (
            <div key={col.title} className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand md:text-[11px] md:tracking-[0.22em] lg:text-[12px]">
                {col.title}
              </div>
              <ul className="mt-2 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 -mx-1.5 text-[12.5px] leading-[1.5] text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:text-[13.5px] lg:text-[14.5px]"
                    >
                      <span>{l.label}</span>
                    </Link>

                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom legal strip — desktop only (mobile has its own inline strip) */}
      <div className="hidden md:block border-t border-border bg-muted">
        <div
          className={dsx(
            ds.container,
            "flex flex-col items-start justify-between gap-1 py-2 text-[11.5px] font-medium leading-[1.4] text-foreground sm:flex-row sm:items-center md:py-2.5 md:text-[12.5px] lg:text-[13.5px]",
          )}
        >
          <span className="whitespace-normal">© {year} <strong className="font-semibold">PreçoCerto</strong> · Feijó · Acre</span>
          <span className="whitespace-nowrap font-mono text-muted-foreground">&lt;dev&gt; Franc D&apos;nis</span>
        </div>
      </div>
    </footer>
  );
}

