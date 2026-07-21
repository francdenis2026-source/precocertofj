import type { ReactNode } from "react";

interface DashboardEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Compact empty state used inside dashboard panels (favorites, lists,
 * markets). Differs from the generic `@/components/feedback` EmptyState
 * because panels already provide their own border/background.
 */
export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-8 text-center">
      <div className="text-muted-foreground/70">{icon}</div>
      <p className="font-display text-[14px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-[12.5px] leading-snug text-muted-foreground">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
