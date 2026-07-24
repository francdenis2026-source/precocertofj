import * as React from "react";
import { AlertCircle, RefreshCw, Inbox, Loader2, Home, SearchX, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable feedback primitives for consistent loading, empty and error
 * states across the app. Use these instead of ad-hoc spinners.
 */

// ────────────────────────────────────────────────────────────────
// Loading
// ────────────────────────────────────────────────────────────────

interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
}

const spinnerSize = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

/** Accessible spinner. Wrap in a flex parent to control layout. */
export function Spinner({ size = "sm", label = "Carregando", className, ...props }: SpinnerProps) {
  return (
    <>
      <Loader2
        aria-hidden="true"
        className={cn("animate-spin text-current", spinnerSize[size], className)}
        {...props}
      />
      <span className="sr-only">{label}</span>
    </>
  );
}

interface PageLoaderProps {
  label?: string;
  className?: string;
  /** Fill parent (viewport-friendly). */
  fullScreen?: boolean;
}

/** Centered loader for route pending states. */
export function PageLoader({
  label = "Carregando...",
  className,
  fullScreen = false,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-foreground/85",
        fullScreen ? "min-h-[60dvh] w-full" : "py-16",
        className,
      )}
    >
      <Spinner size="lg" className="text-primary" label={label} />
      <p className="text-[13px] sm:text-sm font-medium leading-snug">{label}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Error
// ────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** Icon override. Defaults to AlertCircle. */
  icon?: React.ComponentType<{ className?: string }>;
}

/** Inline error card. Use inside a page section. */
export function ErrorState({
  title = "Não foi possível carregar",
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  icon: Icon = AlertCircle,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-[13px] sm:text-sm leading-relaxed text-foreground sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive dark:text-destructive-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] sm:text-[15px] font-semibold leading-snug text-foreground">{title}</p>
        {message && (
          <p className="mt-1 line-clamp-3 text-[12.5px] sm:text-[13px] leading-relaxed text-foreground/80">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <Button
          type="button"
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="shrink-0 font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  className?: string;
  id?: string;
}

/** Compact inline error under a form field. */
export function InlineError({ message, className, id }: InlineErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn("mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive", className)}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </p>
  );
}

interface RouteErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHome?: boolean;
  className?: string;
}

/** Full-page error state for route-level errorComponents. */
export function RouteError({
  title = "Esta página não carregou",
  message = "Algo deu errado por aqui. Você pode tentar de novo ou voltar para o início.",
  onRetry,
  showHome = true,
  className,
}: RouteErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <WifiOff className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} size="sm">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
        {showHome && (
          <Button asChild variant="outline" size="sm">
            <a href="/">
              <Home className="h-4 w-4" />
              Ir para o início
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

interface RouteNotFoundProps {
  title?: string;
  message?: string;
  className?: string;
}

/** Full-page 404 state. */
export function RouteNotFound({
  title = "Página não encontrada",
  message = "A página que você procura não existe ou foi movida.",
  className,
}: RouteNotFoundProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6">
        <Button asChild size="sm">
          <a href="/">
            <Home className="h-4 w-4" />
            Ir para o início
          </a>
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Empty
// ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  action?: React.ReactNode;
  className?: string;
  /** Visual density. */
  size?: "sm" | "md";
}

export function EmptyState({
  title,
  message,
  icon: Icon = Inbox,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 text-center",
        isSm ? "px-4 py-5" : "px-5 py-7 sm:py-8",
        className,
      )}
    >
      <span
        className={cn(
          "mb-2.5 grid place-items-center rounded-full bg-muted text-muted-foreground",
          isSm ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <Icon className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.75} />
      </span>
      <p
        className={cn(
          "font-sans font-semibold tracking-tight text-foreground",
          isSm ? "text-[15px] leading-snug" : "text-[16px] sm:text-[17px] leading-snug",
        )}
      >
        {title}
      </p>
      {message && (
        <p className="mt-1.5 max-w-md text-[13px] sm:text-[13.5px] leading-relaxed text-foreground/80 dark:text-foreground/85">
          {message}
        </p>
      )}

      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Skeletons
// ────────────────────────────────────────────────────────────────

interface LoadingListProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

/** Vertical list of skeleton rows for lists. */
export function LoadingList({
  count = 3,
  className,
  itemClassName,
}: LoadingListProps) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-16 w-full rounded-2xl", itemClassName)}
        />
      ))}
    </div>
  );
}

interface LoadingGridProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/** Responsive skeleton grid for card layouts. */
export function LoadingGrid({ count = 6, columns = 3, className }: LoadingGridProps) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];
  return (
    <div
      className={cn("grid gap-4", cols, className)}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/** Standard table skeleton with header row + body rows. */
export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="grid gap-4 border-b border-border bg-muted/40 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-2/3" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4", c === 0 ? "w-5/6" : c === columns - 1 ? "w-1/2" : "w-3/4")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardSkeletonProps {
  count?: number;
  className?: string;
}

/** Grid of dashboard KPI skeletons. */
export function StatCardSkeleton({ count = 4, className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-elev-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-7 w-24" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-4 p-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="space-y-2 border-t border-border p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border bg-background/40 p-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-3 pt-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
