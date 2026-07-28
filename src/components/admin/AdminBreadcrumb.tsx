import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminTabTone } from "@/components/admin/AdminTabs";

export type AdminHubKey = "contas" | "vitrine" | "operacao" | "precos";

type HubMeta = {
  label: string;
  to: string;
  tone: AdminTabTone;
};

/**
 * Mapa centralizado hub → metadata. Usar aqui evita divergência entre
 * breadcrumbs, launcher e AdminTabs — todos leem da mesma fonte.
 */
export const ADMIN_HUBS: Record<AdminHubKey, HubMeta> = {
  contas: { label: "Contas", to: "/admin_/contas", tone: "people" },
  vitrine: { label: "Vitrine", to: "/admin_/vitrine", tone: "catalog" },
  operacao: { label: "Operação", to: "/admin_/operacao", tone: "system" },
  precos: { label: "Preços", to: "/admin_/precos", tone: "money" },
};

type AdminBreadcrumbProps = {
  hub: AdminHubKey;
  page: string;
  /** Rota atual (não navegável, texto simples). Se omitido, usa `page`. */
  currentLabel?: string;
  className?: string;
};

/**
 * Migalhas Admin › Hub › Página. Aplica o `data-tone` do hub para que a
 * cor semântica se propague (mesma paleta usada pelo AdminHubLauncher e
 * pelas abas administrativas).
 */
export function AdminBreadcrumb({ hub, page, currentLabel, className }: AdminBreadcrumbProps) {
  const meta = ADMIN_HUBS[hub];
  return (
    <nav
      aria-label="Trilha administrativa"
      data-tone={meta.tone}
      data-testid={`admin-breadcrumb-${hub}`}
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Link
        to="/admin"
        className="rounded px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Admin
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      <Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        to={meta.to as any}
        className={cn(
          "rounded px-1 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "text-[color:var(--tone-ink,inherit)]",
        )}
      >
        {meta.label}
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      <span className="px-1 font-medium text-foreground" aria-current="page">
        {currentLabel ?? page}
      </span>
    </nav>
  );
}
