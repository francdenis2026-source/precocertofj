import { Link, useRouterState } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const LEGAL_LINKS: Array<{ to: string; label: string }> = [
  { to: "/privacidade", label: "Privacidade" },
  { to: "/fale-conosco", label: "Contato" },
];

const linkClass =
  "rounded-md px-1.5 py-1 text-foreground underline-offset-4 outline-none transition-colors " +
  "hover:bg-brand/10 hover:text-[var(--pc-gold-ink)] hover:underline " +
  "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * SiteFooter — rodapé mínimo e consistente das páginas internas.
 *
 * A homepage tem seu próprio rodapé editorial completo. Aqui mantemos apenas
 * marca, faixa legal e crédito do desenvolvedor — o mesmo conteúdo em desktop
 * e mobile, sem colunas de navegação nem blocos institucionais duplicados.
 * O link da página atual é omitido para evitar autorreferência redundante.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const links = LEGAL_LINKS.filter((l) => l.to !== pathname.replace(/\/+$/, ""));

  return (
    <footer className="mt-0.5 border-t border-border bg-muted/50 text-foreground">
      <div
        className={dsx(
          ds.container,
          // mobile: marca + créditos em uma linha, links na linha de baixo
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1",
          "py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]",
          "sm:flex sm:flex-wrap sm:justify-between sm:gap-x-4 sm:py-2",
          "text-[12px] leading-tight",
        )}
      >
        <Link
          to="/"
          className={dsx(
            "flex min-w-0 shrink-0 items-center gap-1.5 rounded-md py-0.5 outline-none",
            "transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label="PreçoCerto — ir para a página inicial"
        >
          <img
            src="/logo-mark.png"
            alt=""
            aria-hidden
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 object-contain"
          />
          <span className={dsx(serif, "truncate text-[14px] leading-none text-foreground")}>
            Preço<span className="italic text-brand">Certo</span>
          </span>
          <span className="sr-only">Página inicial</span>
        </Link>

        <span className="justify-self-end whitespace-nowrap font-medium text-muted-foreground tabular-nums">
          © {year} · Feijó/AC
        </span>

        {links.length > 0 && (
          <nav
            aria-label="Links do rodapé"
            className="flex min-w-0 items-center gap-x-1"
          >
            {links.map((l, i) => (
              <span key={l.to} className="inline-flex items-center">
                <Link to={l.to} className={linkClass}>
                  {l.label}
                </Link>
                {i < links.length - 1 && (
                  <span aria-hidden className="px-0.5 text-border">
                    ·
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        <span className="justify-self-end whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">
          &lt;dev&gt; <span className="text-foreground">Franc D&apos;nis</span>
        </span>
      </div>
    </footer>
  );
}
