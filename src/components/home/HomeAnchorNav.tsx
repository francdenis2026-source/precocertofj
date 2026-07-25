import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

const P = {
  paper: "var(--pc-home-paper)",
  card: "var(--pc-home-card)",
  line: "var(--pc-home-line)",
  gold: "var(--pc-home-gold)",
  heading: "var(--pc-home-heading)",
  body: "var(--pc-text-body)",
};

const ANCHORS = [
  { id: "hero", label: "Início" },
  { id: "beneficios", label: "Benefícios" },
  { id: "pilares", label: "Pilares" },
  { id: "recentes", label: "Recentes" },
  { id: "parceiros", label: "Parceiros" },
  { id: "prova-social", label: "Depoimentos" },
] as const;

export function HomeAnchorNav({ onSearch }: { onSearch: (q: string) => void }) {
  const [active, setActive] = useState<string>("hero");
  const [q, setQ] = useState("");
  const [showMini, setShowMini] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const els = ANCHORS
      .map((a) => document.getElementById(a.id))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Mostrar mini-busca ao rolar para fora do hero
  useEffect(() => {
    const onScroll = () => setShowMini(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll do chip ativo para o centro
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const btn = rail.querySelector<HTMLButtonElement>(`[data-anchor="${active}"]`);
    if (btn) {
      const off = btn.offsetLeft - rail.clientWidth / 2 + btn.clientWidth / 2;
      rail.scrollTo({ left: off, behavior: "smooth" });
    }
  }, [active]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    onSearch(query);
  };

  return (
    <nav
      aria-label="Seções da página"
      className="sticky top-[56px] z-30 border-b"
      style={{
        background: `color-mix(in oklab, ${P.paper} 94%, transparent)`,
        borderColor: P.line,
        backdropFilter: "saturate(140%) blur(10px)",
        WebkitBackdropFilter: "saturate(140%) blur(10px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2 sm:px-6 lg:px-8">
        <div
          ref={railRef}
          className="chips-scroller flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {ANCHORS.map((a) => {
            const isActive = active === a.id;
            return (
              <button
                key={a.id}
                type="button"
                data-anchor={a.id}
                onClick={() => jumpTo(a.id)}
                aria-current={isActive ? "true" : undefined}
                className="relative inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[12px] font-semibold leading-none tracking-[-0.005em] transition-all active:scale-[0.97]"
                style={{
                  background: isActive ? P.heading : P.card,
                  color: isActive ? P.paper : P.body,
                  borderColor: isActive ? P.heading : P.line,
                }}
              >
                {a.label}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -bottom-[7px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full"
                    style={{ background: P.gold }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Mini-busca (aparece ao rolar, desktop) */}
        <form
          onSubmit={submit}
          className="hidden shrink-0 overflow-hidden transition-all sm:flex"
          style={{
            width: showMini ? 220 : 0,
            opacity: showMini ? 1 : 0,
          }}
          aria-hidden={!showMini}
        >
          <div
            className="flex h-8 w-full items-center gap-1.5 rounded-full border px-2.5"
            style={{ background: P.paper, borderColor: P.line }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: P.body }} strokeWidth={2.2} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="min-w-0 flex-1 bg-transparent text-[12px] font-medium outline-none placeholder:text-slate-400"
              style={{ color: P.heading }}
              tabIndex={showMini ? 0 : -1}
            />
          </div>
        </form>
      </div>
    </nav>
  );
}
