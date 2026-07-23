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

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-8 border-t border-border bg-muted/45 text-foreground md:mt-12"
    >
      {/* Top — brand + link columns */}
      <div
        className={dsx(
          ds.container,
          "grid gap-6 py-6 md:grid-cols-[1.2fr_2fr] md:gap-12 md:py-9",
        )}
      >
        {/* Brand block */}
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-[14px] font-black text-primary-foreground shadow-elev-1 md:h-9 md:w-9 md:text-[15px]"
            >
              P
            </span>
            <span
              className={dsx(serif, "text-[20px] leading-none text-foreground md:text-[23px]")}
            >
              Preço
              <span className="italic text-brand">
                Certo
              </span>
            </span>
          </Link>

          <p
            className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground md:mt-3 md:text-[13px]"
          >
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
          </p>

          <ul
            className="mt-3 space-y-1.5 text-[12px] text-foreground/80 md:mt-3.5 md:space-y-1.5 md:text-[12.5px]"
          >
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand" />
              Feijó · Acre · Brasil
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-brand" />
              <a href="mailto:precocerto-fj@proton.me" className="hover:underline">
                precocerto-fj@proton.me
              </a>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Dados protegidos · LGPD
            </li>
          </ul>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <div
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand md:text-[11px] md:tracking-[0.22em] lg:text-[12px]"
              >
                {col.title}
              </div>
              <ul className="mt-2 space-y-1.5 md:mt-2.5 md:space-y-2">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-[12.5px] leading-[1.5] text-foreground/80 transition-colors hover:text-primary md:text-[13.5px] lg:text-[14.5px]"
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

      {/* Bottom — legal strip (sem duplicar links do menu) */}
      <div className="border-t border-border bg-muted">
        <div
          className={dsx(
            ds.container,
            "flex flex-col items-start justify-between gap-1 py-2.5 text-[11.5px] font-medium leading-[1.5] text-foreground sm:flex-row sm:items-center md:py-3 md:text-[12.5px] lg:text-[13.5px]",
          )}
        >
          <span className="whitespace-normal">© {year} <strong className="font-semibold">PreçoCerto</strong> · Feijó · Acre</span>
          <span className="whitespace-nowrap font-mono text-muted-foreground">&lt;dev&gt; Franc D&apos;nis</span>
        </div>

      </div>
    </footer>
  );
}

