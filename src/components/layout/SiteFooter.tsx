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
      className="mt-4 border-t border-border bg-muted/60 text-foreground md:mt-8"
    >
      {/* ============ MOBILE (ultra compact — 2 lines) ============ */}
      <div
        className={dsx(
          ds.container,
          "md:hidden pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))]",
        )}
      >
        {/* Row 1: brand + location + legal — single line */}
        <div className="flex items-center justify-between gap-2 text-[clamp(13px,3.5vw,15px)] leading-none">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5 rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="PreçoCerto — início"
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-[5px] bg-brand text-[11px] font-black text-brand-foreground shadow-elev-2">
              P
            </span>
            <span className={dsx(serif, "text-[clamp(16px,4.4vw,18px)] leading-none text-foreground")}>
              Preço<span className="italic text-brand">Certo</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.1em] text-foreground/85">
            <MapPin className="h-4 w-4 text-brand" aria-hidden />
            Feijó·AC
          </span>
          <span className="font-semibold text-foreground/75 tabular-nums">© {year}</span>
        </div>

        {/* Row 2: nav chips + dev credit — inline flow */}
        <nav
          aria-label="Rodapé"
          className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[clamp(13.5px,3.7vw,15.5px)] font-semibold leading-none text-foreground"
        >
          {MOBILE_LINKS.map((l, i) => (
            <span key={l.to} className="inline-flex items-center">
              <Link
                to={l.to}
                className="rounded-md px-1 py-0.5 text-foreground/95 outline-none transition-colors hover:bg-brand/10 hover:text-brand active:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&.active]:text-brand"
              >
                {l.label}
              </Link>
              {i < MOBILE_LINKS.length - 1 && (
                <span aria-hidden className="px-0.5 text-brand/60">·</span>
              )}
            </span>
          ))}
          <span aria-hidden className="px-0.5 text-brand/60">·</span>
          <span className="ml-auto font-mono text-[13px] font-medium text-muted-foreground">
            &lt;dev&gt; <span className="text-foreground/85">Franc</span>
          </span>
        </nav>
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
          <Link to="/" className="group flex items-center gap-2 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-2.5">
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

          <p className="mt-2 text-[13px] font-medium leading-snug text-foreground/80 md:mt-2.5 md:text-[13.5px]">
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
          </p>

          <ul className="mt-3 space-y-1 text-[13px] font-medium text-foreground/90 md:text-[13.5px]">
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
              Feijó · Acre · Brasil
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-brand" />
              <a
                href="mailto:precocerto-fj@proton.me"
                className="truncate rounded-md px-1 py-0.5 -mx-1 text-foreground outline-none transition-colors hover:bg-brand/10 hover:text-brand hover:underline underline-offset-4 decoration-brand/70 active:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
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
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand md:text-[12px] lg:text-[12.5px]">
                {col.title}
              </div>
              <ul className="mt-2 space-y-1">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 -mx-1.5 text-[13.5px] font-medium leading-[1.45] text-foreground/90 outline-none transition-colors hover:bg-brand/10 hover:text-brand active:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&.active]:text-brand [&.active]:bg-brand/10 md:text-[14px] lg:text-[15px]"
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
            "flex flex-col items-start justify-between gap-1 py-2 text-[12.5px] font-medium leading-[1.4] text-foreground/85 sm:flex-row sm:items-center md:py-2.5 md:text-[13px] lg:text-[13.5px]",
          )}
        >
          <span className="whitespace-normal">© {year} <strong className="font-semibold text-foreground">PreçoCerto</strong> · Feijó · Acre</span>
          <span className="whitespace-nowrap font-mono text-muted-foreground">
            &lt;dev&gt; <span className="text-foreground/90">Franc D&apos;nis</span>
          </span>
        </div>
      </div>
    </footer>
  );
}


