import { useEffect, useState } from "react";
import {
  trackEvent,
  markPendingUnlock,
  type AnalyticsEvent,
} from "@/lib/analytics-events";

type Variant = "compact" | "full";

function buildLoginHref(): string {
  if (typeof window === "undefined") return "/login";
  const cur = window.location.pathname + window.location.search;
  return `/login?redirect=${encodeURIComponent(cur)}`;
}

/**
 * SVG "cadeado premium" — desenhado em vetor puro para acompanhar qualquer
 * tema (usa `currentColor`). Um pequeno cintilar animado transmite a ideia
 * de que existe conteúdo valioso por trás.
 */
function LockMark({ compact }: { compact: boolean }) {
  const size = compact ? 34 : 56;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className="drop-shadow-[0_2px_6px_rgb(0_0_0/0.15)]"
    >
      <defs>
        <linearGradient id="lockBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="lockGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="26" fill="url(#lockGlow)" />
      {/* arco */}
      <path
        d="M22 28 v-6 a10 10 0 0 1 20 0 v6"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* corpo */}
      <rect
        x="16"
        y="28"
        width="32"
        height="24"
        rx="5"
        fill="url(#lockBody)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      {/* fechadura */}
      <circle cx="32" cy="39" r="3" fill="hsl(var(--primary-foreground))" />
      <rect
        x="30.5"
        y="39"
        width="3"
        height="7"
        rx="1.2"
        fill="hsl(var(--primary-foreground))"
      />
      {/* brilho */}
      <circle cx="24" cy="34" r="1.4" fill="hsl(var(--primary-foreground))" opacity="0.55">
        <animate attributeName="opacity" values="0.15;0.75;0.15" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Envolve `children` e, quando `locked=true`, aplica desfoque + overlay SVG
 * com CTA de cadastro. Foi redesenhado para transmitir profissionalismo e
 * despertar curiosidade — o visitante entende que existe um preço real por
 * trás e que basta criar uma conta gratuita para vê-lo.
 *
 * Acessibilidade: conteúdo borrado fica `aria-hidden` + `inert`; a região
 * do overlay é agrupada com `role="group"` e o CTA tem foco visível.
 */
export function LockOverlay({
  locked,
  variant = "compact",
  children,
  title,
  subtitle,
  reason,
  trackEventName,
  trackPayload,
}: {
  locked: boolean;
  variant?: Variant;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /**
   * Mensagem contextual curta explicando por que o card está bloqueado
   * (ex.: "Preços por loja aparecem só para cadastrados").
   * Renderizada acima do CTA no variant "full".
   */
  reason?: string;
  /** Nome do evento a disparar quando o CTA é clicado. */
  trackEventName?: AnalyticsEvent;
  /** Metadados numéricos/curtos anexados ao evento. */
  trackPayload?: Record<string, string | number | boolean | undefined>;
}) {
  const [href, setHref] = useState<string>("/login");
  useEffect(() => {
    setHref(buildLoginHref());
  }, []);

  if (!locked) return <>{children}</>;

  const compact = variant === "compact";
  const heading = title ?? (compact ? "Preço exclusivo" : "Veja o preço mais barato");
  const helper =
    subtitle ??
    (compact
      ? "Crie sua conta e desbloqueie."
      : "30 dias grátis. Sem cartão. Cancele quando quiser.");

  const handleUnlockClick = () => {
    const evt: AnalyticsEvent = trackEventName ?? "visitor_click_unlock_generic";
    trackEvent(evt, trackPayload ?? {});
    // Correlaciona clique em "desbloquear" com o próximo SIGNED_IN.
    markPendingUnlock(evt);
  };

  return (
    <div
      className="relative isolate h-full w-full overflow-hidden rounded-[inherit]"
      role="group"
      aria-label={`${heading}. ${helper}`}
    >
      {/* Conteúdo real, desfocado ao fundo — dá a sensação de "algo por trás do vidro" */}
      <div
        aria-hidden="true"
        // @ts-expect-error — atributo HTML padrão, ainda não tipado no React.
        inert=""
        className="pointer-events-none absolute inset-0 select-none"
        style={{ filter: "blur(14px) saturate(1.1)", transform: "scale(1.06)" }}
      >
        {children}
      </div>

      {/* Vinheta suave para dar profundidade sob o vidro */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_60%)]"
      />

      {/* Painel de vidro real (glassmorphism) */}
      <div
        className={
          "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-3 text-center " +
          "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_45%,transparent)_0%,color-mix(in_oklab,var(--color-background)_65%,transparent)_100%)] " +
          "backdrop-blur-xl backdrop-saturate-150 " +
          "border-t border-white/25 dark:border-white/10 " +
          "shadow-[inset_0_1px_0_0_color-mix(in_oklab,white_35%,transparent),inset_0_-1px_0_0_color-mix(in_oklab,black_10%,transparent)]"
        }
      >
        {/* Reflexo superior — a faixa clara típica de vidro */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,color-mix(in_oklab,white_22%,transparent),transparent)]"
        />

        <LockMark compact={compact} />

        <span
          className="relative inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-primary shadow-sm backdrop-blur"
          aria-hidden="true"
        >
          <span className="h-1 w-1 rounded-full bg-primary" />
          Exclusivo
        </span>

        {compact ? (
          <p className="relative font-display text-[13px] leading-tight text-foreground">
            {heading}
            <br />
            <span className="italic text-primary">30 dias grátis</span>
          </p>
        ) : (
          <>
            <p className="relative font-display text-lg leading-tight text-foreground sm:text-xl">
              {heading}
            </p>
            <span aria-hidden="true" className="relative h-[2px] w-10 rounded-full bg-primary/70" />
            <p className="relative max-w-[260px] text-[12px] leading-snug text-muted-foreground">
              {helper}
            </p>
            {reason ? (
              <p className="relative max-w-[280px] rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] leading-snug text-foreground/85">
                {reason}
              </p>
            ) : null}
          </>
        )}

        <span className="sr-only">
          Este preço é revelado após criar uma conta grátis. Primeiro mês liberado sem custo.
        </span>

        <a
          href={href}
          onClick={handleUnlockClick}
          aria-label="Criar conta grátis para ver este preço"
          className={
            "relative inline-flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--color-primary)_60%,transparent),inset_0_1px_0_0_color-mix(in_oklab,white_30%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
            (compact ? "px-3 py-1.5 text-[10.5px]" : "mt-1 px-5 py-2.5 text-xs")
          }
        >
          Criar conta grátis
        </a>
        {!compact && (
          <a
            href={href}
            className="relative rounded text-[10.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Já tenho conta
          </a>
        )}
      </div>
    </div>
  );
}
