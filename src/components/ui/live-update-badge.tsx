import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sinaliza que a tela acabou de receber preços novos via tempo real.
 *
 * `ping()` acende o selo; ele apaga sozinho após `ms`. Mantemos o estado num
 * hook para que ranking e busca compartilhem o mesmo comportamento visual.
 */
export function useLivePulse(ms = 6000) {
  const [active, setActive] = useState(false);
  const timer = useRef<number | null>(null);

  const ping = useCallback(() => {
    setActive(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), ms);
  }, [ms]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return { active, ping };
}

type Tone = "onDark" | "onLight";

/**
 * Selo discreto "Atualizado agora" com ponto pulsante. Some suavemente quando
 * `active` volta a ser falso — sem toast e sem deslocar o layout (altura fixa
 * reservada via `min-h`).
 */
export function LiveUpdateBadge({
  active,
  tone = "onLight",
  label = "Atualizado agora",
  className = "",
}: {
  active: boolean;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  const palette =
    tone === "onDark"
      ? "border-brand-gold/45 bg-white/10 text-gold-ink"
      : "border-brand-gold/50 bg-brand-gold/10 text-[color:var(--pc-gold-ink,#6b4a12)] dark:text-gold-ink";

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-opacity duration-300",
        palette,
        active ? "opacity-100" : "opacity-0",
        className,
      ].join(" ")}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {active ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold opacity-70" />
        ) : null}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-gold" />
      </span>
      {active ? label : ""}
    </span>
  );
}
