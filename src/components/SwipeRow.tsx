import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal swipe row: works with mouse drag, touch swipe, and wheel.
 * Renders arrow buttons on desktop when overflow exists.
 */
export function SwipeRow({
  children,
  ariaLabel,
  className,
}: {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 200), behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className={cn(
          "no-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1",
          "select-none",
          "[-webkit-overflow-scrolling:touch]",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>

      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Anterior"
          className="hidden md:grid absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-md hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Próximo"
          className="hidden md:grid absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-md hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
