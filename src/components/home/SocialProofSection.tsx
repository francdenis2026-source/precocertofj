import { Star } from "lucide-react";

const P = {
  paper: "var(--pc-home-paper)",
  card: "var(--pc-home-card)",
  line: "var(--pc-home-line)",
  gold: "var(--pc-home-gold)",
  heading: "var(--pc-home-heading)",
  body: "var(--pc-text-body)",
  navy: "var(--pc-home-navy)",
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const TESTIMONIALS = [
  {
    name: "Maria dos Santos",
    role: "Centro",
    quote: "Comparo em 10 segundos e economizo quase R$ 80 por mês.",
    initials: "MS",
  },
  {
    name: "João Ferreira",
    role: "Segundo Distrito",
    quote: "Uso todo sábado antes da feira. Evita frustração no caixa.",
    initials: "JF",
  },
  {
    name: "Ana Paula Lima",
    role: "Bela Vista",
    quote: "Mandei fotos de encartes e vi meu preço aparecer no mesmo dia.",
    initials: "AL",
  },
];

const RATING_AVG = 4.9;
const RATING_COUNT = 312;

export function SocialProofSection() {
  return (
    <section aria-labelledby="social-proof-title" className="pc-container pt-4 sm:pt-5">
      <div
        className="rounded-[var(--pc-radius-md)] border p-3 sm:p-4"
        style={{ background: P.card, borderColor: P.line }}
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] shrink-0" style={{ color: P.gold }}>
              Prova social
            </p>
            <h2
              id="social-proof-title"
              className={`${serif} leading-tight truncate`}
              style={{ color: P.heading, fontSize: "clamp(1.05rem, 1.8vw, 1.35rem)", letterSpacing: "-0.01em" }}
            >
              Feito com <span style={{ color: P.gold }}>quem economiza</span>
            </h2>
          </div>

          <div
            className="flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              background: "color-mix(in oklab, var(--pc-home-gold) 8%, transparent)",
              borderColor: "color-mix(in oklab, var(--pc-home-gold) 28%, transparent)",
            }}
          >
            <span
              className={`${serif} tabular-nums leading-none`}
              style={{ color: P.heading, fontSize: "1.15rem", letterSpacing: "-0.02em" }}
            >
              {RATING_AVG.toFixed(1).replace(".", ",")}
            </span>
            <div className="flex items-center gap-0.5" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3 w-3" fill={P.gold} style={{ color: P.gold }} />
              ))}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: P.body }}>
              · {RATING_COUNT}
            </span>
          </div>
        </header>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li
              key={t.name}
              className="flex flex-col rounded-lg border p-2.5"
              style={{ background: P.paper, borderColor: P.line }}
            >
              <p className="text-[12.5px] leading-snug" style={{ color: P.heading }}>
                “{t.quote}”
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold"
                  style={{
                    background: "color-mix(in oklab, var(--pc-home-navy) 12%, transparent)",
                    color: P.navy,
                  }}
                >
                  {t.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold leading-tight" style={{ color: P.heading }}>
                    {t.name}
                  </p>
                  <p className="truncate text-[10.5px] font-medium" style={{ color: P.body }}>
                    {t.role}
                  </p>
                </div>
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5" fill={P.gold} style={{ color: P.gold }} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
