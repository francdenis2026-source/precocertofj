import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { RatingBadge, RatingInline } from "@/components/ds/RatingStars";


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

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initials: string;
};

const TESTIMONIALS: Testimonial[] = [
  { name: "Maria dos Santos", role: "Centro",           quote: "Comparo em 10 segundos e economizo quase R$ 80 por mês.",              initials: "MS" },
  { name: "João Ferreira",    role: "Segundo Distrito", quote: "Uso todo sábado antes da feira. Evita frustração no caixa.",           initials: "JF" },
  { name: "Ana Paula Lima",   role: "Bela Vista",       quote: "Mandei fotos de encartes e vi meu preço aparecer no mesmo dia.",       initials: "AL" },
  { name: "Carlos Menezes",   role: "Cidade Nova",      quote: "Descobri que o arroz mais barato ficava a duas quadras de casa.",      initials: "CM" },
  { name: "Rita Oliveira",    role: "Bairro Novo",      quote: "O ranking semanal virou parte da minha rotina antes de sair.",         initials: "RO" },
  { name: "Bruno Aguiar",     role: "Centro",           quote: "Simples e direto: aponto o produto e vejo onde está mais em conta.",   initials: "BA" },
];

const RATING_AVG = 4.9;
const RATING_COUNT = 312;
const VISIBLE_INITIAL = 3;

export function SocialProofSection() {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0); // mobile
  const trackRef = useRef<HTMLUListElement | null>(null);

  const items = expanded ? TESTIMONIALS : TESTIMONIALS.slice(0, VISIBLE_INITIAL);
  const total = items.length;

  // sync mobile page from scroll
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (!w) return;
      setPage(Math.round(el.scrollLeft / w));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [total]);

  const scrollToPage = (p: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(total - 1, p));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="social-proof-title" className="pc-container pt-3 sm:pt-4">
      <div
        className="rounded-[var(--pc-radius-md)] border p-3 sm:p-3.5"
        style={{ background: P.card, borderColor: P.line }}
      >
        <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] shrink-0 sm:text-[11px]" style={{ color: "var(--pc-gold-ink)" }}>
              Prova social
            </p>
            <h2
              id="social-proof-title"
              className={`${serif} leading-tight truncate`}
              style={{ color: P.heading, fontSize: "clamp(1rem, 1.7vw, 1.3rem)", letterSpacing: "-0.01em" }}
            >
              Feito com <span style={{ color: "var(--pc-gold-ink)" }}>quem economiza</span>
            </h2>
          </div>

          <RatingBadge value={RATING_AVG} count={RATING_COUNT} />

        </header>

        {/* Mobile: carrossel snap. Desktop: grid até 3, expande para grid completo */}
        <ul
          ref={trackRef}
          className={
            "sm:grid sm:gap-2 sm:[grid-template-columns:repeat(3,minmax(0,1fr))] " +
            "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          {items.map((t) => (
            <li
              key={t.name}
              className="flex min-w-full snap-start flex-col rounded-lg border p-2.5 sm:min-w-0"
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
                    background: "color-mix(in oklab, var(--pc-home-gold) 20%, transparent)",
                    color: P.heading,
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

        {/* Rodapé: dots (mobile) + ver mais */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:hidden" aria-hidden>
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPage(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === page ? 16 : 6,
                  background: i === page ? P.gold : "color-mix(in oklab, var(--pc-home-line) 80%, transparent)",
                }}
                aria-label={`Ir para depoimento ${i + 1}`}
              />
            ))}
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            {/* placeholder para alinhamento no desktop */}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* setas mobile */}
            <button
              type="button"
              onClick={() => scrollToPage(page - 1)}
              disabled={page <= 0}
              className="grid h-7 w-7 place-items-center rounded-md border transition disabled:opacity-40 sm:hidden"
              style={{ borderColor: P.line, color: P.heading, background: P.paper }}
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(page + 1)}
              disabled={page >= total - 1}
              className="grid h-7 w-7 place-items-center rounded-md border transition disabled:opacity-40 sm:hidden"
              style={{ borderColor: P.line, color: P.heading, background: P.paper }}
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {TESTIMONIALS.length > VISIBLE_INITIAL && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] transition hover:opacity-80"
                style={{ color: P.gold }}
              >
                {expanded ? "Ver menos" : `Ver mais depoimentos (${TESTIMONIALS.length - VISIBLE_INITIAL})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
