import { cn } from "@/lib/utils";

export function LoadingSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-muted/60"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border/60 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-7 w-32 rounded bg-muted" />
      <div className="mt-2 h-3 w-40 rounded bg-muted/70" />
    </div>
  );
}
