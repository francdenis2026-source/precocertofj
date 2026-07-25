import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Search, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";


const P = {
  navy: "var(--pc-home-navy)",
  gold: "var(--pc-home-gold)",
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

export function FinalCTASection() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const term = q.trim();
    setLoading(true);
    // Feedback imediato — navega no próximo tick para permitir render do estado de loading.
    setTimeout(() => {
      navigate({ to: "/buscar", search: term ? { q: term } : undefined });
    }, 60);
  };

  return (
    <section aria-labelledby="final-cta-title" className="pc-container pt-3 sm:pt-4">
      <div
        className="relative overflow-hidden rounded-[var(--pc-radius-md)] p-[1.5px]"
        style={{
          background: `linear-gradient(120deg, ${P.gold} 0%, color-mix(in oklab, ${P.gold} 35%, transparent) 55%, color-mix(in oklab, ${P.gold} 70%, transparent) 100%)`,
          boxShadow: "var(--pc-shadow-3)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-[calc(var(--pc-radius-md)-2px)] px-4 py-5 sm:px-6 sm:py-7"
          style={{
            background: `linear-gradient(115deg, ${P.navy} 0%, color-mix(in oklab, ${P.navy} 82%, black) 100%)`,
            color: "#F5F6FA",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `repeating-linear-gradient(-45deg, ${P.gold} 0 1px, transparent 1px 14px)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 45%, transparent) 0%, transparent 65%)`,
              filter: "blur(70px)",
              opacity: 0.4,
            }}
          />

          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-3.5 text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em]"
              style={{
                background: `color-mix(in oklab, ${P.gold} 10%, transparent)`,
                borderColor: `color-mix(in oklab, ${P.gold} 40%, transparent)`,
                color: "#F5C86A",
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden /> Comece agora
            </span>

            <h2
              id="final-cta-title"
              className={`${serif} leading-[1.05] tracking-tight`}
              style={{
                color: "#F8FAFC",
                fontSize: "clamp(1.35rem, 3vw, 2rem)",
              }}
            >
              Encontre o preço certo em{" "}
              <span className="italic" style={{ color: "#F5C86A" }}>
                segundos
              </span>
              .
            </h2>

            {/* Ação primária: busca inline com feedback imediato */}
            <form
              onSubmit={onSubmit}
              className="w-full"
              role="search"
              aria-label="Buscar preço agora"
            >
              <div
                className="flex items-center gap-2 rounded-2xl border p-1.5 shadow-lg transition-colors focus-within:border-[color:var(--pc-home-gold)]"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex flex-1 items-center gap-2 pl-3">
                  <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ex.: Arroz, Feijão, Leite…"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
                    aria-label="O que você procura?"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-90"
                  style={{ background: P.gold, color: P.navy }}
                  aria-live="polite"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Abrindo…
                    </>
                  ) : (
                    <>
                      Buscar
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
                    </>
                  )}
                </button>
              </div>
              <p
                className="mt-2 text-[11.5px]"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Grátis, sem cadastro. Enter para buscar.
              </p>
            </form>



          </div>
        </div>
      </div>
    </section>
  );
}
