import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "article" | "div";
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
}: SectionCardProps) {
  return (
    <Tag
      className={cn(
        "pc-card overflow-hidden",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] -mx-6 -mt-6 mb-6 px-6 py-4 bg-[var(--bg-surface-elevated)]/50">
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </Tag>
  );
}