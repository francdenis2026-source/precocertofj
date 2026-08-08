import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ds, dsx } from "@/lib/ds";

const LEGAL_LINKS: Array<{ to: string; label: string; aria: string }> = [
  { to: "/privacidade", label: "Privacidade", aria: "Política de privacidade" },
  { to: "/fale-conosco", label: "Contato", aria: "Fale conosco" },
];

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const current = pathname.replace(/\/+$/, "") || "/";
  const links = LEGAL_LINKS.filter((l) => l.to !== current);

  return (
    <footer
      aria-labelledby="site-footer-title"
      className="border-t border-white/5 bg-[#07111F] text-slate-400"
    >
      <h2 id="site-footer-title" className="sr-only">
        Rodapé — PreçoCerto, comparação de preços para Feijó (AC)
      </h2>
      <div className={dsx(ds.container, "py-6")}>
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className={dsx("flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80", focusRing)}
            >
              <img
                src="/logo-mark.png"
                alt=""
                aria-hidden
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="text-[17px] font-black tracking-tighter text-white">
                Preço<span className="text-[var(--brand-primary)]">Certo</span>
              </span>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[12px] font-bold tracking-[0.2em] text-white/90">
                SKAES<span className="text-[var(--brand-primary)]">.</span>
              </span>
            </button>
            <p className="text-[10px] tracking-wider text-slate-500 uppercase md:ml-[38px]">
              Technology & Intelligence
            </p>
          </div>

          <nav aria-label="Institucional" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => navigate({ to: l.to })}
                className="text-[11px] font-medium transition-colors hover:text-[var(--brand-primary)] focus-visible:outline-none"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1.5 text-right md:items-end">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-white/80 uppercase tracking-tight">SKAES NET TECHNOLOGY</span>
              <span className="text-white/20">•</span>
              <span className="text-slate-400">Franc D'nis</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span>Feijó-AC</span>
              <span className="text-white/10">|</span>
              <span>© {year}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
