import { Star, Quote } from "lucide-react";

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
    role: "Mãe de família · Centro",
    quote:
      "Antes eu andava três mercados para achar o feijão mais em conta. Hoje abro o app, comparo em 10 segundos e economizo quase R$ 80 por mês.",
    initials: "MS",
    rating: 5,
  },
  {
    name: "João Ferreira",
    role: "Motorista · Segundo Distrito",
    quote:
      "Uso todo sábado antes da feira. O ranking mostra quem baixou preço na semana e evita frustração no caixa.",
    initials: "JF",
    rating: 5,
  },
  {
    name: "Ana Paula Lima",
    role: "Enfermeira · Bela Vista",
    quote:
      "A comunidade colabora de verdade. Já mandei três fotos de encartes e vi meu preço aparecer para outras pessoas no mesmo dia.",
    initials: "AL",
    rating: 5,
  },
];

const RATING_AVG = 4.9;
const RATING_COUNT = 312;

export function SocialProofSection() {
  return (
    <section
      aria-labelledby="social-proof-title"
      className="pc-container pt-8 sm:pt-10"
    >
      <div
        className="rounded-[var(--pc-radius-md)] border p-5 sm:p-7"
        style={{ background: P.card, borderColor: P.line }}
      >
        {/* Header — rating + título */}
        <header className="mb-5 flex flex-col items-start justify-between gap-4 sm:mb-6 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: P.gold }}
            >
              Prova social
            </p>
            <h2
              id="social-proof-title"
              className={`${serif} mt-1 leading-tight`}
              style={{
                color: P.heading,
                fontSize: "clamp(1.5rem, 2.8vw, 2rem)",
                letterSpacing: "-0.01em",
              }}
            >
              Feito com <span style={{ color: P.gold }}>quem economiza</span>
            </h2>
          </div>

          {/* Rating agregado */}
          <div
            className="flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3"
            style={{
              background: "color-mix(in oklab, var(--pc-home-gold) 8%, transparent)",
              borderColor: "color-mix(in oklab, var(--pc-home-gold) 30%, transparent)",
            }}
          >
            <div
              className={`${serif} tabular-nums leading-none`}
              style={{
                color: P.heading,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {RATING_AVG.toFixed(1).replace(".", ",")}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5"
                    fill={P.gold}
                    style={{ color: P.gold }}
                  />
                ))}
              </div>
              <p
                className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: P.body }}
              >
                Avaliação média · {RATING_COUNT} usuários
              </p>
            </div>
          </div>
        </header>

        {/* Cards de depoimentos */}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {TESTIMONIALS.map((t) => (
            <li
              key={t.name}
              className="relative flex flex-col rounded-2xl border p-4 sm:p-5"
              style={{ background: P.paper, borderColor: P.line }}
            >
              <Quote
                aria-hidden
                className="absolute right-3 top-3 h-5 w-5 opacity-25"
                style={{ color: P.gold }}
              />

              <div className="mb-3 flex items-center gap-0.5" aria-label={`${t.rating} de 5 estrelas`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5" fill={P.gold} style={{ color: P.gold }} />
                ))}
              </div>

              <p
                className="flex-1 text-[13px] leading-relaxed sm:text-[13.5px]"
                style={{ color: P.heading }}
              >
                “{t.quote}”
              </p>

              <div className="mt-4 flex items-center gap-3 border-t pt-3" style={{ borderColor: P.line }}>
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11.5px] font-bold"
                  style={{
                    background: "color-mix(in oklab, var(--pc-home-navy) 12%, transparent)",
                    color: P.navy,
                  }}
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-[12.5px] font-bold leading-tight"
                    style={{ color: P.heading }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[11px] font-medium"
                    style={{ color: P.body }}
                  >
                    {t.role}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
