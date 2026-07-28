import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Check, Copy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { tabLabel, type TabDef } from "./adminTabs.utils";

export type AdminTabItem = TabDef;

export type AdminTabTone = "overview" | "catalog" | "commerce" | "people" | "system";

type Props = {
  /** Rota base do hub, ex.: `/admin/precos`. */
  to: string;
  /** Título humanizado do hub (usado no breadcrumb), ex.: `Preços`. */
  title?: string;
  items: AdminTabItem[];
  active: string;
  className?: string;
  /** Tom semântico do hub, aplicado no breadcrumb, na aba ativa e no hover. */
  tone?: AdminTabTone;
};


/**
 * Barra de abas compacta para páginas admin consolidadas.
 *
 * - Renderiza breadcrumb `Admin › {title} › {aba ativa}` acima das abas.
 * - Expõe botão "Copiar link" que copia a URL atual (com o `?tab=` selecionado).
 * - Usa <Link> com search={{ tab }} para preservar histórico do navegador.
 */
export function AdminTabs({ to, title, items, active, className }: Props) {
  const activeLabel = tabLabel(items, active);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? window.location.href
          : `${to}?tab=${active}`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof window !== "undefined") {
        // Fallback: seleciona texto temporário.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Link copiado", { description: url });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }, [to, active]);

  return (
    <div className={cn("sticky top-0 z-20 -mx-4 mb-4 bg-background/95 backdrop-blur", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 pt-2 pb-1">
        <nav
          aria-label="Trilha de navegação"
          className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-muted-foreground"
        >
          <span>Admin</span>
          {title && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <Link
                to={to}
                search={{ tab: items[0]?.key } as never}
                className="truncate hover:text-foreground"
              >
                {title}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          <span className="truncate text-foreground" aria-current="page">
            {activeLabel}
          </span>
        </nav>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-label={`Copiar link da aba ${activeLabel}`}
          data-testid="admin-tabs-copy-link"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" aria-hidden /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden /> Copiar link
            </>
          )}
        </button>
      </div>

      <nav
        aria-label="Abas da seção"
        className="flex gap-1 overflow-x-auto px-4 py-2"
      >
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              to={to}
              search={{ tab: item.key } as never}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
