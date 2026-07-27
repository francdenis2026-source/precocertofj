import { Link } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

/**
 * SiteFooter — rodapé mínimo das páginas internas.
 *
 * A homepage tem seu próprio rodapé editorial completo. Nas demais seções
 * mantemos apenas uma faixa legal enxuta (marca · local · legal · crédito),
 * sem colunas de navegação nem blocos institucionais.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-0.5 border-t border-border bg-muted/50 text-foreground">
      <div
        className={dsx(
          ds.container,
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5",
          "py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:py-1.5",
          "text-[11.5px] font-medium leading-none",
        )}
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-1.5 rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="PreçoCerto — início"
        >
          <img
            src="/logo-mark.png"
            alt=""
            aria-hidden
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 object-contain"
          />
          <span className={dsx(serif, "text-[14px] leading-none text-foreground")}>
            Preço<span className="italic text-brand">Certo</span>
          </span>
        </Link>

        <span className="text-foreground/75 tabular-nums">
          © {year} · Feijó · Acre
        </span>

        <nav aria-label="Rodapé" className="flex items-center gap-x-1">
          <Link
            to="/privacidade"
            className="rounded-md px-1 py-0.5 text-foreground/85 outline-none transition-colors hover:bg-brand/10 hover:text-[var(--pc-gold-ink)] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Privacidade
          </Link>
          <span aria-hidden className="text-brand/60">·</span>
          <Link
            to="/fale-conosco"
            className="rounded-md px-1 py-0.5 text-foreground/85 outline-none transition-colors hover:bg-brand/10 hover:text-[var(--pc-gold-ink)] focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Contato
          </Link>
        </nav>

        <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
          &lt;dev&gt; <span className="text-foreground/85">Franc D&apos;nis</span>
        </span>
      </div>
    </footer>
  );
}
