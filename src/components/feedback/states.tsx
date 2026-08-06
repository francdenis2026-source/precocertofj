import * as React from "react";
import { RefreshCw, WifiOff, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Estados visuais de segunda geração: skeletons coerentes com o layout real,
 * estados vazios ilustrados com chamada para ação e erros amigáveis com
 * recuperação automática.
 */

// ────────────────────────────────────────────────────────────────
// Ilustrações (SVG inline, herdam a cor do tema)
// ────────────────────────────────────────────────────────────────

export type EmptyIllustrationKind =
  | "search"
  | "price"
  | "list"
  | "alert"
  | "basket"
  | "market";

export function EmptyIllustration({
  kind = "search",
  className,
}: {
  kind?: EmptyIllustrationKind;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 120 88"
      role="presentation"
      aria-hidden="true"
      className={cn("h-20 w-auto text-primary/70", className)}
    >
      <ellipse
        cx="60"
        cy="79"
        rx="34"
        ry="5"
        className="fill-current opacity-10"
        stroke="none"
      />
      {kind === "search" && (
        <>
          <circle cx="52" cy="38" r="20" {...common} />
          <path d="M67 53 L82 68" {...common} />
          <path d="M44 38h16M44 45h10" {...common} className="opacity-60" />
        </>
      )}
      {kind === "price" && (
        <>
          <rect x="30" y="20" width="60" height="46" rx="8" {...common} />
          <path d="M42 52l10-12 9 8 12-16" {...common} />
          <circle cx="73" cy="32" r="2.5" className="fill-current" stroke="none" />
        </>
      )}
      {kind === "list" && (
        <>
          <rect x="34" y="16" width="52" height="56" rx="8" {...common} />
          <path d="M46 32h28M46 44h28M46 56h16" {...common} className="opacity-70" />
        </>
      )}
      {kind === "alert" && (
        <>
          <path d="M60 18a14 14 0 0 1 14 14v12l6 9H40l6-9V32a14 14 0 0 1 14-14Z" {...common} />
          <path d="M53 59a7 7 0 0 0 14 0" {...common} />
        </>
      )}
      {kind === "basket" && (
        <>
          <path d="M32 34h56l-6 32H38L32 34Z" {...common} />
          <path d="M46 34l8-14M74 34l-8-14" {...common} />
          <path d="M50 44v12M70 44v12M60 44v12" {...common} className="opacity-60" />
        </>
      )}
      {kind === "market" && (
        <>
          <path d="M30 34h60v32H30z" {...common} />
          <path d="M30 34l6-12h48l6 12" {...common} />
          <path d="M52 66V50h16v16" {...common} className="opacity-70" />
        </>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Estado vazio ilustrado
// ────────────────────────────────────────────────────────────────

export interface IllustratedEmptyStateProps {
  kind?: EmptyIllustrationKind;
  title: string;
  message?: string;
  /** Ação principal (ex.: “Buscar um produto”). */
  action?: React.ReactNode;
  /** Ação secundária discreta. */
  secondaryAction?: React.ReactNode;
  /** Sugestões clicáveis para reduzir cliques. */
  suggestions?: { label: string; onSelect: () => void }[];
  className?: string;
  compact?: boolean;
}

export function IllustratedEmptyState({
  kind = "search",
  title,
  message,
  action,
  secondaryAction,
  suggestions,
  className,
  compact = false,
}: IllustratedEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 text-center animate-in fade-in-0 slide-in-from-bottom-1 duration-300 shadow-2xl backdrop-blur-md",
        compact ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      <EmptyIllustration kind={kind} className={compact ? "h-14" : "h-20"} />
      <p
        className={cn(
          "mt-3 font-sans font-semibold tracking-tight leading-snug text-foreground",
          compact ? "text-[15px]" : "text-[17px] sm:text-[18px]",
        )}
      >
        {title}
      </p>
      {message && (
        <p className="mt-1.5 max-w-md text-[13px] sm:text-[13.5px] leading-relaxed text-foreground/85">
          {message}
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={s.onSelect}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12.5px] font-medium text-foreground/85 transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {s.label}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Erro amigável com recuperação automática
// ────────────────────────────────────────────────────────────────

/** Traduz erros técnicos em uma explicação clara para o usuário. */
export function friendlyErrorMessage(error: unknown): {
  title: string;
  message: string;
  recoverable: boolean;
} {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const text = raw.toLowerCase();

  if (!raw) {
    return {
      title: "Algo não carregou",
      message: "Tivemos um problema inesperado. Tente novamente em instantes.",
      recoverable: true,
    };
  }
  if (text.includes("fetch") || text.includes("network") || text.includes("failed to fetch")) {
    return {
      title: "Sem conexão com o servidor",
      message: "Sua internet parece instável. Vamos tentar de novo automaticamente.",
      recoverable: true,
    };
  }
  if (text.includes("timeout") || text.includes("aborted")) {
    return {
      title: "A consulta demorou demais",
      message: "O servidor demorou para responder. Uma nova tentativa costuma resolver.",
      recoverable: true,
    };
  }
  if (text.includes("401") || text.includes("unauthorized") || text.includes("jwt")) {
    return {
      title: "Sua sessão expirou",
      message: "Entre novamente na sua conta para continuar de onde parou.",
      recoverable: false,
    };
  }
  if (text.includes("403") || text.includes("permission") || text.includes("policy")) {
    return {
      title: "Acesso não permitido",
      message: "Esta informação não está disponível para o seu perfil.",
      recoverable: false,
    };
  }
  if (text.includes("404") || text.includes("not found")) {
    return {
      title: "Não encontramos esse conteúdo",
      message: "O item pode ter sido removido ou mudou de endereço.",
      recoverable: false,
    };
  }
  if (text.includes("429") || text.includes("rate limit") || text.includes("quota")) {
    return {
      title: "Muitas consultas seguidas",
      message: "Aguarde alguns segundos antes de tentar novamente.",
      recoverable: true,
    };
  }
  return {
    title: "Não foi possível carregar",
    message: raw.slice(0, 180),
    recoverable: true,
  };
}

export interface SmartErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Tenta novamente sozinho após alguns segundos (só para erros recuperáveis). */
  autoRetry?: boolean;
  /** Segundos até a tentativa automática. */
  autoRetryDelay?: number;
  /** Ação alternativa (ex.: “Ajustar busca”). */
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function SmartErrorState({
  error,
  onRetry,
  autoRetry = true,
  autoRetryDelay = 6,
  secondaryAction,
  className,
  compact = false,
}: SmartErrorStateProps) {
  const { title, message, recoverable } = friendlyErrorMessage(error);
  const shouldAutoRetry = Boolean(autoRetry && onRetry && recoverable);
  const [countdown, setCountdown] = React.useState(
    shouldAutoRetry ? autoRetryDelay : 0,
  );
  const [retrying, setRetrying] = React.useState(false);
  const retryRef = React.useRef(onRetry);
  retryRef.current = onRetry;

  React.useEffect(() => {
    if (!shouldAutoRetry) return;
    setCountdown(autoRetryDelay);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          setRetrying(true);
          retryRef.current?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [shouldAutoRetry, autoRetryDelay, error]);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 text-left animate-in fade-in-0 duration-200 sm:flex-row sm:items-center shadow-lg shadow-destructive/5 backdrop-blur-sm",
        compact ? "p-3.5" : "p-5",
        className,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
        <WifiOff className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold leading-snug text-foreground">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">{message}</p>
        {shouldAutoRetry && countdown > 0 && (
          <p className="mt-1 text-[12.5px] font-medium text-foreground/70" aria-live="polite">
            Nova tentativa automática em {countdown}s…
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onRetry && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setRetrying(true);
              setCountdown(0);
              onRetry();
            }}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
            Tentar novamente
          </Button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Skeletons coerentes com layouts reais
// ────────────────────────────────────────────────────────────────

function shimmer(className?: string) {
  return cn("animate-pulse", className);
}

/** Linhas de lista (nome + meta + valor à direita). */
export function ListRowsSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("divide-y divide-border/60", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Estamos organizando a lista..."
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={shimmer("flex items-center gap-3 px-3 py-3")}>
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[55%]" />
            <Skeleton className="h-2.5 w-[35%]" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Lista de preços por mercado (usada em histórico, drawers e catálogos). */
export function PriceListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-2", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Atualizando os melhores preços..."
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={shimmer(
            "flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5",
          )}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-[60%]" />
            <Skeleton className="h-2.5 w-[30%]" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Cards de mercado / estabelecimento em grade. */
export function MarketCardsSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Localizando estabelecimentos..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={shimmer("rounded-2xl border border-border/60 bg-card/60 p-4")}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-[70%]" />
              <Skeleton className="h-2.5 w-[45%]" />
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Comparação de cestas / mercados lado a lado. */
export function ComparisonSkeleton({
  columns = 3,
  rows = 5,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Preparando comparação detalhada..."
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={shimmer("rounded-2xl border border-border/60 bg-card/60 p-4")}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-2 h-2.5 w-20" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className={shimmer(
              "grid items-center gap-3 border-b border-border/50 px-3 py-3 last:border-b-0",
            )}
            style={{ gridTemplateColumns: `minmax(0,1.4fr) repeat(${columns}, minmax(0,1fr))` }}
          >
            <Skeleton className="h-3 w-[80%]" />
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-16" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grade de catálogo (imagem + título + preço). */
export function CatalogGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando produtos"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={shimmer("overflow-hidden rounded-2xl border border-border/60 bg-card/60")}
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3.5 w-[85%]" />
            <Skeleton className="h-2.5 w-[50%]" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
