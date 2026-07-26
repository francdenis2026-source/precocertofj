import { Sparkles, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";

function buildLoginHref(): string {
  if (typeof window === "undefined") return "/login";
  const cur = window.location.pathname + window.location.search;
  return `/login?redirect=${encodeURIComponent(cur)}`;
}

/**
 * Chip visível com o número de "buscas grátis" restantes para visitantes.
 * Autenticados: não renderiza nada.
 *
 * Atualiza em tempo real via `useTeaserQuota`, que escuta o evento
 * `pc:teaser-quota-changed` disparado por cada `consume()`.
 *
 * Variantes:
 * - `variant="inline"` (default): chip discreto para topo de página.
 * - `variant="floating"`: pill fixo canto inferior direito (usar 1x por rota).
 */
export function FreeQuotaBadge({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "floating";
  className?: string;
}) {
  const { isVisitor, used, limit, remaining, exceeded, loading } = useTeaserQuota();
  const [href, setHref] = useState<string>("/login");
  useEffect(() => {
    setHref(buildLoginHref());
  }, []);

  if (loading || !isVisitor) return null;

  const label = exceeded
    ? "Buscas grátis esgotadas nesta sessão"
    : `${remaining} de ${limit} buscas grátis restantes`;

  if (variant === "floating") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={
          "fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/25 bg-background/95 px-3 py-2 shadow-lg backdrop-blur " +
          className
        }
      >
        {exceeded ? (
          <Lock className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} aria-hidden />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} aria-hidden />
        )}
        <span className="text-[11px] font-semibold text-foreground">
          {exceeded ? "Sem buscas grátis" : `${remaining}/${limit} grátis`}
        </span>
        <a
          href={href}
          className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Criar conta
        </a>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] " +
        className
      }
    >
      {exceeded ? (
        <Lock className="h-3 w-3 text-primary" strokeWidth={2.4} aria-hidden />
      ) : (
        <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.2} aria-hidden />
      )}
      <span className="font-semibold text-foreground">
        {exceeded ? (
          <>Você já usou suas {limit} buscas grátis</>
        ) : (
          <>
            <span className="tabular-nums">{remaining}</span> de{" "}
            <span className="tabular-nums">{limit}</span> buscas grátis
          </>
        )}
      </span>
      <span className="sr-only">Consumidas: {used}.</span>
      <a
        href={href}
        className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Criar conta
      </a>
    </div>
  );
}
