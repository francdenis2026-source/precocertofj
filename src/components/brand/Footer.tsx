import { useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";

const items: Array<{ to: string; label: string }> = [
  { to: "/comparador", label: "Comparador" },
  { to: "/planos", label: "Planos" },
  { to: "/colaborar", label: "Colaborar" },
];

export function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#07111F] text-slate-400">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-0">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2.5">
              <Logo variant="dark" className="[&_img]:h-7 [&_img]:w-7 [&_span]:text-[17px]" />
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[12px] font-bold tracking-[0.2em] text-white/90">
                SKAES<span className="text-[var(--primary)]">.</span>
              </span>
            </div>
            <p className="mt-1 text-[10px] tracking-wider text-slate-500 uppercase">
              Technology & Intelligence
            </p>
          </div>

          <nav aria-label="Institucional" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {items.map((i) => (
              <button
                key={i.to}
                type="button"
                onClick={() => navigate({ to: i.to })}
                className="text-[11px] font-medium transition-colors hover:text-[var(--primary)] focus-visible:outline-none"
              >
                {i.label}
              </button>
            ))}
          </nav>

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
