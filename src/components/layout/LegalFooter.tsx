import { Link } from "@tanstack/react-router";

export function LegalFooter({ updatedAt }: { updatedAt: string }) {
  const year = new Date().getFullYear();
  
  return (
    <footer className="shrink-0 border-t border-white/5 bg-[#07111F] text-slate-400">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-0">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2.5">
              <span className="text-[17px] font-black tracking-tighter text-white">
                Preço<span className="text-[var(--brand-primary)]">Certo</span>
              </span>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[12px] font-bold tracking-[0.2em] text-white/90">
                SKAES<span className="text-[var(--brand-primary)]">.</span>
              </span>
            </div>
            <p className="mt-1 text-[10px] tracking-wider text-slate-500 uppercase">
              Technology & Intelligence
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Link
              to="/fale-conosco"
              className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-medium transition-colors hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
            >
              Fale Conosco
            </Link>
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">
              Atualizado em {updatedAt}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-right md:items-end">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-white/80">SKAES NET TECHNOLOGY</span>
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
