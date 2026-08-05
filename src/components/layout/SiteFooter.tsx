import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const LEGAL_LINKS: Array<{ to: string; label: string; aria: string }> = [
  { to: "/privacidade", label: "Privacidade", aria: "Política de privacidade" },
  { to: "/fale-conosco", label: "Contato", aria: "Fale conosco" },
];

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const linkClass = dsx(
  "inline-flex min-h-9 items-center rounded-md px-2 py-1 font-black uppercase tracking-widest text-[11px] text-white/40",
  "transition-all hover:text-indigo-400 hover:bg-white/5",
  "hover:text-indigo-400",
  "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
);

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
  const navigate = useNavigate();
  const current = pathname.replace(/\/+$/, "") || "/";
  const links = LEGAL_LINKS.filter((l) => l.to !== current);

  return (
    <footer
      aria-labelledby="site-footer-title"
      className="mt-0.5 border-t border-white/5 bg-[#020617] text-white/40"
    >
      <h2 id="site-footer-title" className="sr-only">
        Rodapé — PreçoCerto, comparador de preços de Feijó (AC)
      </h2>
      <div
        className={dsx(
          ds.container,
          // mobile: 2 linhas (marca + © / links + crédito); desktop: 1 linha
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5",
          "py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          "sm:flex sm:flex-wrap sm:justify-between sm:gap-x-4 sm:gap-y-1 sm:py-2",
          "text-[13.5px] leading-snug",
        )}
      >
        {current === "/" ? (
          <p className="flex min-w-0 shrink-0 items-center gap-1.5 py-0.5">
            <img
              src="/logo-mark.png"
              alt=""
              aria-hidden
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="truncate text-lg font-black tracking-tighter text-white">
              Preço<span className="text-indigo-400">Certo</span>
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className={dsx(
              "flex min-w-0 shrink-0 items-center gap-1.5 rounded-md py-0.5 transition-colors",
              focusRing,
            )}
          >
            <img
              src="/logo-mark.png"
              alt=""
              aria-hidden
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="truncate text-lg font-black tracking-tighter text-white">
              Preço<span className="text-indigo-400">Certo</span>
            </span>
            <span className="sr-only">— ir para a página inicial</span>
          </button>
        )}

        <p className="justify-self-end whitespace-nowrap font-medium text-muted-foreground tabular-nums">
          © {year} · Feijó/AC
        </p>

        {links.length > 0 ? (
          <nav aria-label="Institucional" className="min-w-0">
            <ul className="flex min-w-0 items-center gap-x-0.5 -ml-2">
              {links.map((l, i) => (
                <li key={l.to} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => navigate({ to: l.to })}
                    className={linkClass}
                  >
                    {l.label}
                    <span className="sr-only"> — {l.aria}</span>
                  </button>
                  {i < links.length - 1 && (
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <span aria-hidden />
        )}

        <p className="justify-self-end whitespace-nowrap font-black uppercase tracking-widest text-[10px] text-white/20">
          &lt;dev&gt; <span className="text-indigo-400/60">Franc D&apos;nis</span>
        </p>
      </div>
    </footer>
  );
}
