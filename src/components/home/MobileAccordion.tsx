import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Wrapper que colapsa o conteúdo apenas no mobile.
 * No desktop (sm+) renderiza normalmente sem chrome extra.
 */
export function MobileAccordion({
  title,
  eyebrow,
  defaultOpen = false,
  children,
}: {
  title: string;
  eyebrow?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      {/* Mobile: cabeçalho colapsável */}
      <div className="pc-container pt-3 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors"
          style={{
            background: "var(--pc-home-card)",
            borderColor: "var(--pc-home-line)",
          }}
        >
          <div className="min-w-0">
            {eyebrow && (
              <p
                className="text-[9.5px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--pc-home-gold)" }}
              >
                {eyebrow}
              </p>
            )}
            <p
              className="truncate text-[13.5px] font-bold leading-tight"
              style={{ color: "var(--pc-home-heading)" }}
            >
              {title}
            </p>
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform"
            style={{
              color: "var(--pc-home-heading)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </div>
      <div className={open ? "sm:contents" : "hidden sm:contents"}>{children}</div>
    </>
  );
}
