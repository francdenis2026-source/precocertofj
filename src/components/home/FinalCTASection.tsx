import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Search, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import heroImg from "@/assets/home-hero.jpg";

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
    setTimeout(() => {
      navigate({ to: "/buscar", search: term ? { q: term } : undefined });
    }, 60);
  };

  return (
    <section aria-labelledby="final-cta-title" className="pc-container pt-3 sm:pt-4">
      <div
        className="relative overflow-hidden rounded-[var(--pc-radius-md)] p-[1.5px]"
        style={{
          background: `linear-gradient(120deg, ${P.gold} 0%, color-mix(in oklab, ${P.gold} 30%, transparent) 55%, color-mix(in oklab, ${P.gold} 70%, transparent) 100%)`,
          boxShadow: "var(--pc-shadow-3)",
        }}
      >
        <div
          className="relative isolate overflow-hidden rounded-[calc(var(--pc-radius-md)-2px)]"
          style={{ background: P.navy, color: "#F5F6FA" }}
        >
          {/* Foto editorial */}
          <img
            src={heroImg}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            style={{ opacity: 0.42 }}
          />
          {/* Scrim navy — legibilidade WCAG AA */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(115deg, color-mix(in oklab, ${P.navy} 92%, transparent) 0%, color-mix(in oklab, ${P.navy} 72%, transparent) 55%, color-mix(in oklab, ${P.navy} 88%, transparent) 100%)`,
            }}
          />
          {/* Halo dourado */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 45%, transparent) 0%, transparent 65%)`,
              filter: "blur(70px)",
              opacity: 0.5,
            }}
          />


          <div className="relative px-4 py-5 sm:px-6 sm:py-7">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-2.5 text-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: `color-mix(in oklab, ${P.gold} 12%, transparent)`,
                  borderColor: `color-mix(in oklab, ${P.gold} 45%, transparent)`,
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
                  fontSize: "clamp(1.35rem, 3vw, 1.9rem)",
                  textShadow: "0 2px 18px rgba(0,0,0,0.4)",
                }}
              >
                Encontre o preço certo em{" "}
                <span className="italic" style={{ color: "#F5C86A" }}>
                  segundos
                </span>
                .
              </h2>


              <p
                className="max-w-xl text-[13.5px] sm:text-[14.5px]"
                style={{ color: "rgba(245,246,250,0.82)" }}
              >
                Compare em tempo real os preços dos mercados parceiros do seu bairro.
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-1 w-full"
                role="search"
                aria-label="Buscar preço agora"
              >
                <div
                  className="flex items-center gap-2 rounded-2xl border p-1.5 transition-colors focus-within:border-[color:var(--pc-home-gold)]"
                  style={{
                    background: "rgba(255,255,255,0.98)",
                    borderColor: "rgba(255,255,255,0.25)",
                    boxShadow: "0 18px 40px -18px rgba(0,0,0,0.55)",
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
                  style={{ color: "rgba(245,246,250,0.68)" }}
                >
                  Grátis, sem cadastro. Enter para buscar.
                </p>
              </form>

              {/* Selos de confiança */}
              <ul
                className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px]"
                style={{ color: "rgba(245,246,250,0.78)" }}
              >
                <li className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" style={{ color: "#F5C86A" }} aria-hidden />
                  Resultados instantâneos
                </li>
                <li aria-hidden className="opacity-40">•</li>
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#F5C86A" }} aria-hidden />
                  Dados verificados
                </li>
                <li aria-hidden className="opacity-40">•</li>
                <li className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "#F5C86A" }} aria-hidden />
                  Mercados do seu bairro
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
