import { Zap, Wallet, MapPin, ShieldCheck } from "lucide-react";

const P = {
  card: "var(--pc-home-card)",
  line: "var(--pc-home-line)",
  gold: "var(--pc-home-gold)",
  heading: "var(--pc-home-heading)",
  body: "var(--pc-text-body)",
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

const BENEFITS = [
  { icon: <Wallet className="h-4 w-4" strokeWidth={2} />, title: "Economia real", desc: "Menor preço da semana em segundos." },
  { icon: <Zap className="h-4 w-4" strokeWidth={2} />, title: "Tempo real", desc: "Atualizações contínuas da comunidade." },
  { icon: <MapPin className="h-4 w-4" strokeWidth={2} />, title: "Feito para Feijó", desc: "Mercados e bairros da cidade." },
  { icon: <ShieldCheck className="h-4 w-4" strokeWidth={2} />, title: "Dados verificados", desc: "Curadoria e auditoria automática." },
];

export function BenefitsSection() {
  return (
    <section aria-labelledby="benefits-title" className="pc-container pt-4 sm:pt-5">
      <header className="mb-2.5 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] shrink-0" style={{ color: P.gold }}>
            Benefícios
          </p>
          <h2
            id="benefits-title"
            className={`${serif} leading-tight truncate`}
            style={{ color: P.heading, fontSize: "clamp(1.05rem, 1.8vw, 1.35rem)", letterSpacing: "-0.01em" }}
          >
            Por que usar o PreçoCerto
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BENEFITS.map((b) => (
          <article
            key={b.title}
            className="rounded-lg border p-2.5 sm:p-3 transition-colors"
            style={{ background: P.card, borderColor: P.line }}
          >
            <div className="flex items-center gap-2">
              <div
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                  color: P.gold,
                  border: "1px solid color-mix(in oklab, var(--pc-home-gold) 30%, transparent)",
                }}
                aria-hidden
              >
                {b.icon}
              </div>
              <h3 className="text-[13px] font-bold leading-tight tracking-tight truncate" style={{ color: P.heading }}>
                {b.title}
              </h3>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: P.body }}>
              {b.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
