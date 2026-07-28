import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";
import type { AdminTabTone } from "@/components/admin/AdminTabs";

export type HubDestination = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * TanStack Router `to` string. Passed as-is to <Link> so param routes stay
   * type-safe on the caller side.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  to: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search?: any;
  /** Small right-hand callout, e.g. "3 pendentes". */
  badge?: string;
  badgeTone?: "neutral" | "alert" | "ok";
  /** When true, the card gets a slightly stronger frame — use for the flagship item. */
  primary?: boolean;
};

export type HubSection = {
  key: string;
  title: string;
  description?: string;
  items: HubDestination[];
};

export type HubLauncherProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone: AdminTabTone;
  sections: HubSection[];
  /** Optional call-to-action shown at the top-right of the header (e.g. "Voltar ao dashboard"). */
  headerCta?: { label: string; to: string };
};

/**
 * AdminHubLauncher — organiza as capabilities de um hub administrativo em
 * seções tematicamente agrupadas, cada uma com cards que navegam para a rota
 * (ou aba) real de destino. Serve como "painel de comando" dedicado a um
 * domínio (Contas, Gestão, Operação) sem duplicar código das telas alvo.
 *
 * A11y:
 *  - cada seção é um `<section>` com heading próprio (níveis h2/h3),
 *  - cards renderizam como `<Link>` reais (foco, cmd-click e preload nativos),
 *  - o `tone` propaga via `data-tone` para que `AdminTabs`, breadcrumbs e o
 *    anel de foco reutilizem exatamente a mesma paleta semântica.
 */
/**
 * Compara o card com a rota atual. Consideramos "ativo" quando:
 *  - o `to` do card == pathname atual (ignorando barra final), OU
 *  - `to` bate + todos os pares chave/valor de `item.search` estão presentes
 *    no querystring atual (match parcial: outros params são preservados).
 * Isso destaca automaticamente o card quando o usuário está em uma rota
 * "legada" que faz redirect para o hub com `?tab=…`.
 */
function isCardActive(
  item: HubDestination,
  pathname: string,
  searchStr: string,
): boolean {
  const target = String(item.to ?? "").replace(/\/$/, "");
  const cur = pathname.replace(/\/$/, "");
  if (!target || target !== cur) return false;
  if (!item.search || typeof item.search !== "object") return true;
  const params = new URLSearchParams(searchStr);
  for (const [k, v] of Object.entries(item.search as Record<string, unknown>)) {
    if (v == null) continue;
    if (params.get(k) !== String(v)) return false;
  }
  return true;
}

export function AdminHubLauncher({
  eyebrow,
  title,
  description,
  tone,
  sections,
  headerCta,
}: HubLauncherProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const searchStr =
    typeof location.searchStr === "string"
      ? location.searchStr
      : new URLSearchParams(
          Object.entries((location.search ?? {}) as Record<string, unknown>).reduce(
            (acc, [k, v]) => {
              if (v != null) acc[k] = String(v);
              return acc;
            },
            {} as Record<string, string>,
          ),
        ).toString();
  return (
    <div
      data-tone={tone}
      data-testid="admin-hub-launcher"
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-3 md:px-5 md:py-4"
    >
      {/* Header editorial do hub */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <p className={cn(tc.eyebrow, "pc-admin-hub-crumb")}>{eyebrow}</p>
          <h1 className={cn(tc.h1, "mt-1 truncate")}>{title}</h1>
          <p className={cn(tc.sectionNote, "mt-1 max-w-2xl")}>{description}</p>
        </div>
        {headerCta && (
          <Link
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={headerCta.to as any}
            className={cn(
              tc.control,
              "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border/70 bg-card px-3 py-1.5 text-muted-foreground",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {headerCta.label}
          </Link>
        )}
      </header>

      {/* Seções agrupadas */}
      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <section key={section.key} aria-labelledby={`hub-section-${section.key}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`hub-section-${section.key}`} className={cn(tc.sectionTitle)}>
                {section.title}
              </h2>
              {section.description && (
                <p className={cn(tc.meta, "max-w-xl text-right")}>{section.description}</p>
              )}
            </div>

            <ul
              role="list"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {section.items.map((item) => {
                const active = isCardActive(item, pathname, searchStr);
                return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    search={item.search}
                    data-testid={`hub-card-${item.key}`}
                    data-active={active ? "true" : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-full flex-col gap-2 rounded-xl border bg-card p-3 transition-all",
                      "hover:-translate-y-0.5 hover:shadow-md hover:border-[color:var(--tone,theme(colors.border))]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "border-[color:var(--pc-gold-600,theme(colors.amber.500))] shadow-[0_0_0_2px_var(--pc-focus,theme(colors.amber.400/30))] bg-[color:var(--tone-soft,transparent)]"
                        : item.primary
                          ? "border-[color:var(--tone-ink,theme(colors.border))]/40 bg-[color:var(--tone-soft,transparent)]"
                          : "border-border/70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/60",
                          "bg-background text-[color:var(--tone-ink,theme(colors.foreground))]",
                        )}
                        aria-hidden
                      >
                        <item.icon className="h-4 w-4" strokeWidth={2.1} />
                      </span>
                      <div className="flex items-center gap-1.5">
                        {active && (
                          <span
                            className={cn(
                              tc.tag,
                              "inline-flex items-center gap-1 rounded-full border border-[color:var(--pc-gold-600,theme(colors.amber.500))]/50 bg-[color:var(--pc-gold-50,theme(colors.amber.50))] px-2 py-0.5 text-[color:var(--pc-gold-700,theme(colors.amber.700))]",
                            )}
                          >
                            <Check className="h-3 w-3" aria-hidden />
                            Aberto
                          </span>
                        )}
                        {item.badge && (
                          <span
                            className={cn(
                              tc.tag,
                              "rounded-full px-2 py-0.5",
                              item.badgeTone === "alert"
                                ? "border border-destructive/40 bg-destructive/10 text-destructive"
                                : item.badgeTone === "ok"
                                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border border-border/60 bg-muted text-muted-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(tc.itemTitle, "truncate")}>{item.title}</h3>
                      <p className={cn(tc.meta, "mt-0.5 line-clamp-2")}>{item.description}</p>
                    </div>
                    <div className={cn(tc.control, "flex items-center gap-1 text-muted-foreground/80 group-hover:text-foreground")}>
                      {active ? "Aberto agora" : "Abrir"}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
