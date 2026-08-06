import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-[var(--bg-surface-elevated)]/50",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/[0.03] before:to-transparent",
        "motion-reduce:before:hidden motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
