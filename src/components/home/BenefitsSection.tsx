import { Zap, Wallet, MapPin, ShieldCheck } from "lucide-react";

const P = {
  paper: "var(--pc-home-paper)",
  card: "var(--pc-home-card)",
  line: "var(--pc-home-line)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
  heading: "var(--pc-home-heading)",
  body: "var(--pc-text-body)",
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const BENEFITS = [
  {
    icon: <Wallet className="h-5 w-5" strokeWidth={2} />,
    title: "Economia real",
    desc: "Compare em segundos e escolha o mercado com o menor preço da semana.",
  },
  {
    icon: <Zap className="h-5 w-5" strokeWidth={2} />,
    title: "Preços em tempo real",
    desc: "Atualizações contínuas da comunidade — sem catálogos antigos.",
  },
  {
    icon: <MapPin className="h-5 w-5" strokeWidth={2} />,
    title: "Feito para Feijó",
    desc: "Mercados, bairros e produtos que fazem parte da rotina da cidade.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" strokeWidth={2} />,
    title: "Dados verificados",
    desc: "Curadoria + auditoria automática para preços sempre confiáveis.",
  },
];

export function BenefitsSection() {
  return (
    <section
      aria-labelledby="benefits-title"
      className="pc-container pt-8 sm:pt-10"
    >
      <header className="mb-4 flex flex-col items-start gap-1 sm:mb-5">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: P.gold }}
        >
          Benefícios
        </p>
        <h2
          id="benefits-title"
          className={`${serif} leading-tight`}
          style={{
            color: P.heading,
            fontSize: "clamp(1.35rem, 2.4vw, 1.75rem)",
            letterSpacing: "-0.01em",
          }}
        >
          Por que usar o PreçoCerto
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {BENEFITS.map((b) => (
          <article
            key={b.title}
            className="group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm sm:p-5"
            style={{ background: P.card, borderColor: P.line }}
          >
            <div
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                color: P.gold,
                border: "1px solid color-mix(in oklab, var(--pc-home-gold) 32%, transparent)",
              }}
              aria-hidden
            >
              {b.icon}
            </div>
            <h3
              className="text-[14.5px] font-bold leading-tight tracking-tight sm:text-[15.5px]"
              style={{ color: P.heading }}
            >
              {b.title}
            </h3>
            <p
              className="mt-1.5 text-[12.5px] leading-snug sm:text-[13px]"
              style={{ color: P.body }}
            >
              {b.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
