import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Ticket, Search } from "lucide-react";

const P = {
  navy: "var(--pc-home-navy)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

export function FinalCTASection() {
  return (
    <section aria-labelledby="final-cta-title" className="pc-container pt-10 sm:pt-12">
      <div
        className="relative overflow-hidden rounded-[var(--pc-radius-md)] p-[1.5px]"
        style={{
          background: `linear-gradient(120deg, ${P.gold} 0%, color-mix(in oklab, ${P.gold} 35%, transparent) 55%, color-mix(in oklab, ${P.gold} 70%, transparent) 100%)`,
          boxShadow: "var(--pc-shadow-3)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-[calc(var(--pc-radius-md)-2px)] px-5 py-7 sm:px-8 sm:py-10"
          style={{
            background: `linear-gradient(115deg, ${P.navy} 0%, color-mix(in oklab, ${P.navy} 82%, black) 100%)`,
            color: "#F5F6FA",
          }}
        >
          {/* Padrão diagonal sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `repeating-linear-gradient(-45deg, ${P.gold} 0 1px, transparent 1px 14px)`,
            }}
          />
          {/* Glow dourado */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in oklab, ${P.gold} 45%, transparent) 0%, transparent 65%)`,
              filter: "blur(70px)",
              opacity: 0.4,
            }}
          />

          <div className="relative flex flex-col items-center gap-6 text-center sm:gap-7">
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
              className={`${serif} max-w-3xl leading-[1.05] tracking-tight`}
              style={{
                color: "#F8FAFC",
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              }}
            >
              A sua próxima compra pode custar até{" "}
              <span className="italic" style={{ color: "#F5C86A" }}>
                40% menos
              </span>
              .
            </h2>

            <p
              className="max-w-xl text-[14px] leading-relaxed sm:text-[15px]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Junte-se a centenas de famílias de Feijó que já economizam a cada visita ao mercado.
              É grátis para começar.
            </p>

            <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                to="/buscar"
                className="group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold uppercase tracking-wide shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                style={{ background: P.gold, color: P.navy }}
              >
                <Search className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                Buscar preço agora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
              </Link>

              <Link
                to="/planos"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[14px] font-bold uppercase tracking-wide transition-all hover:-translate-y-px"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.22)",
                  color: "#ffffff",
                }}
              >
                Ver planos Plus
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
              </Link>
            </div>

            {/* Sub-link — resgatar código */}
            <Link
              to="/resgatar"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors hover:brightness-125"
              style={{ color: "#F5C86A" }}
            >
              <Ticket className="h-3.5 w-3.5" strokeWidth={2.4} />
              Já tenho um código de licença
              <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
