import type { ReactNode } from "react";

interface SectionKickerProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}

/**
 * Section header used across dashboard pages: a small uppercase eyebrow
 * label above a large display title, with an optional right-side actions
 * slot and a divider underline.
 */
export function SectionKicker({ eyebrow, title, actions }: SectionKickerProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border/70 pb-2.5">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
