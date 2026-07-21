import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toggle segmentado "Homepage / Meu painel" com estado ativo automático
 * baseado no pathname. Responsivo — no mobile mostra só ícone.
 * Só renderiza quando o usuário está autenticado.
 */
export function AuthNavToggle({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPanel = pathname === "/app" || pathname.startsWith("/app/");
  // "Homepage" cobre a home e todo o fluxo público de pesquisa/descoberta.
  const PUBLIC_BROWSE_PREFIXES = ["/buscar", "/melhores-precos", "/comparador", "/produto"];
  const isHome =
    !isPanel &&
    (pathname === "/" ||
      PUBLIC_BROWSE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")));

  const h = size === "sm" ? "h-9" : "h-10";
  const px = size === "sm" ? "px-3" : "px-3.5";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1",
        className,
      )}
      role="group"
      aria-label="Alternar entre homepage e meu painel"
    >
      <Link
        to="/"
        aria-current={isHome ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
          h, px, text,
          isHome
            ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_oklch(0.36_0.11_155_/_0.5)]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Home className="h-3.5 w-3.5" strokeWidth={isHome ? 2.4 : 2} />
        <span className="hidden sm:inline">Homepage</span>
      </Link>
      <Link
        to="/app"
        aria-current={isPanel ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
          h, px, text,
          isPanel
            ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_oklch(0.36_0.11_155_/_0.5)]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={isPanel ? 2.4 : 2} />
        <span className="hidden sm:inline">Meu painel</span>
      </Link>
    </div>
  );
}
