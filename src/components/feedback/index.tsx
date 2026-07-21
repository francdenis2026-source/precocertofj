import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Reusable feedback primitives for consistent loading, error and empty
 * states across the app. Use these instead of ad-hoc spinners.
 */

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Não foi possível carregar",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/15">
        <AlertCircle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        {message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {message && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

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
          className={cn("h-16 w-full rounded-2xl bg-muted", itemClassName)}
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

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-4 p-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-xl bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 bg-muted" />
          <Skeleton className="h-3 w-1/2 bg-muted" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full bg-muted" />
            <Skeleton className="h-5 w-16 rounded-full bg-muted" />
          </div>
        </div>
      </div>
      <div className="space-y-2 border-t border-border p-4">
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-2/3 bg-muted" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border bg-background/40 p-4">
        <Skeleton className="h-8 w-24 bg-muted" />
        <Skeleton className="h-8 w-16 bg-muted" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <Skeleton className="aspect-square w-full rounded-2xl bg-muted" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 bg-muted" />
        <Skeleton className="h-8 w-3/4 bg-muted" />
        <Skeleton className="h-4 w-1/2 bg-muted" />
        <div className="grid grid-cols-3 gap-3 pt-4">
          <Skeleton className="h-20 rounded-xl bg-muted" />
          <Skeleton className="h-20 rounded-xl bg-muted" />
          <Skeleton className="h-20 rounded-xl bg-muted" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-14 w-full rounded-xl bg-muted" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted" />
          <Skeleton className="h-14 w-full rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
