/**
 * ExperimentalBanner — comunicado profissional em SVG informando que o
 * PreçoCerto está em fase experimental e que a IA de montagem de cesta
 * ainda não está ativa. Aparece no topo do dashboard do cliente.
 */
export function ExperimentalBanner() {
  return (
    <section
      role="note"
      aria-label="Aviso — fase experimental"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-[#0f1b3d] via-[#132347] to-[#0a1631] text-white shadow-lg"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <svg
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="expb-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e6c977" stopOpacity="0.0" />
              <stop offset="0.5" stopColor="#e6c977" stopOpacity="0.35" />
              <stop offset="1" stopColor="#e6c977" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M0 140 Q 150 80 300 130 T 600 110 L 600 200 L 0 200 Z"
            fill="url(#expb-gold)"
          />
        </svg>
      </div>

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        {/* Selo em SVG */}
        <div className="flex-shrink-0">
          <svg
            width="72"
            height="72"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden
            className="drop-shadow-md"
          >
            <defs>
              <linearGradient id="expb-seal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e6c977" />
                <stop offset="1" stopColor="#b58a3c" />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r="34" fill="#0a1631" stroke="url(#expb-seal)" strokeWidth="2" />
            <circle cx="40" cy="40" r="28" fill="none" stroke="#e6c977" strokeOpacity="0.35" strokeDasharray="3 4" />
            {/* Ampulheta / experimento */}
            <path
              d="M28 22 L52 22 L52 30 Q52 36 44 40 Q52 44 52 50 L52 58 L28 58 L28 50 Q28 44 36 40 Q28 36 28 30 Z"
              fill="none"
              stroke="url(#expb-seal)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M34 28 L46 28 M34 52 L46 52" stroke="#e6c977" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="40" cy="41" r="2.2" fill="#e6c977" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#e6c977]">
            Fase experimental
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold leading-tight text-white sm:text-xl">
            PreçoCerto Feijó · projeto em construção regional
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/80 sm:text-sm">
            Estamos validando preços com notas fiscais dos mercados de Feijó.
            A <strong className="text-white">assistente de IA</strong> que monta
            cestas e sugere o menor preço será liberada quando alcançarmos
            cobertura regional. Até lá você já pode comparar preços, favoritar
            mercados e receber alertas.
          </p>
        </div>
      </div>
    </section>
  );
}
