import { Rows2, Rows3 } from "lucide-react";

import { useDensity, type Density } from "@/hooks/use-density";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Density; label: string; short: string; Icon: typeof Rows2 }[] = [
  { id: "comfortable", label: "Densidade confortável", short: "Confortável", Icon: Rows2 },
  { id: "compact", label: "Densidade compacta", short: "Compacta", Icon: Rows3 },
];

/**
 * Alternador de densidade da área do cliente. Segmentado compacto que
 * troca apenas os espaçamentos (nunca a tipografia), com preferência
 * persistida em localStorage.
 */
export function DensityToggle({ className, labels = true }: { className?: string; labels?: boolean }) {
  const { density, setDensity, hydrated } = useDensity();

  return (
    <div
      role="group"
      aria-label="Densidade do painel"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ id, label, short, Icon }) => {
        const active = hydrated && density === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setDensity(id)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} aria-hidden />
            <span className={labels ? "hidden lg:inline" : "hidden"}>{short}</span>
          </button>
        );
      })}
    </div>
  );
}
