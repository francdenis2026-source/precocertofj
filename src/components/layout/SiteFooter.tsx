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
      className="mt-10 border-t border-border bg-muted/45 text-foreground md:mt-16"
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-[15px] font-black text-primary-foreground shadow-elev-1 md:h-10 md:w-10 md:text-[16px]"
            >
              P
            </span>
            <span
              className={dsx(serif, "text-[22px] leading-none text-foreground md:text-[26px]")}
            >
              Preço
              <span className="italic text-brand">
                Certo
              </span>
            </span>
          </Link>

          <p
            className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground md:mt-4 md:text-[13.5px]"
          >
            Comparador colaborativo de preços dos mercados de Feijó — Acre.
          </p>

          <ul
            className="mt-3.5 space-y-1.5 text-[12px] text-foreground/80 md:mt-5 md:space-y-2 md:text-[12.5px]"
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
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand md:text-[11.5px] md:tracking-[0.22em] lg:text-[12.5px]"
              >
                {col.title}
              </div>
              <ul className="mt-2 space-y-1.5 md:mt-3 md:space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-[12.5px] leading-[1.5] text-foreground/80 transition-colors hover:text-primary md:text-[14.5px] lg:text-[16px]"
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
            "flex flex-col items-start justify-between gap-1.5 py-3 text-[12px] font-medium leading-[1.5] text-foreground sm:flex-row sm:items-center md:py-4 md:text-[13.5px] lg:text-[15px]",
          )}
        >
          <span className="whitespace-normal">© {year} <strong className="font-semibold">PreçoCerto</strong> · Feijó · Acre</span>
          <span className="whitespace-nowrap font-mono text-muted-foreground">&lt;dev&gt; Franc D&apos;nis</span>
        </div>

      </div>
    </footer>
  );
}
