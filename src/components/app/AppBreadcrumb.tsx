/**
 * AppBreadcrumb — trilha de navegação da área do cliente.
 *
 * Deriva automaticamente a trilha a partir do pathname, usando um índice
 * central que espelha os grupos do menu lateral (Comprar melhor / Minha
 * conta / Assinatura). Rotas com segmento dinâmico (categoria, produto,
 * estabelecimento) exibem o slug legível como página atual.
 *
 * Não renderiza nada em `/app` (home da área), onde a trilha seria redundante.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; to?: string };

type RouteMeta = {
  /** Rótulo da página atual. */
  page: string;
  /** Seção (grupo do menu) à qual a página pertence. */
  section?: string;
  /** Rota-pai opcional (clicável) antes da página atual. */
  parent?: { label: string; to: string };
};

/** Prefix-longest-match: rotas específicas antes das genéricas. */
const APP_ROUTE_INDEX: ReadonlyArray<{ prefix: string; meta: RouteMeta }> = [
  // Comprar melhor
  { prefix: "/melhores-precos", meta: { page: "Melhores preços", section: "Comprar melhor" } },
  { prefix: "/comparador", meta: { page: "Comparador", section: "Comprar melhor" } },
  { prefix: "/estabelecimentos", meta: { page: "Mercados", section: "Comprar melhor" } },
  { prefix: "/estabelecimento", meta: { page: "Mercado", section: "Comprar melhor", parent: { label: "Mercados", to: "/estabelecimentos" } } },
  { prefix: "/mapa", meta: { page: "Bairros", section: "Comprar melhor" } },
  { prefix: "/buscar", meta: { page: "Buscar preços", section: "Comprar melhor" } },
  { prefix: "/categorias", meta: { page: "Categorias", section: "Comprar melhor" } },
  { prefix: "/categoria", meta: { page: "Categoria", section: "Comprar melhor", parent: { label: "Categorias", to: "/categorias" } } },
  { prefix: "/produto-publico", meta: { page: "Produto", section: "Comprar melhor", parent: { label: "Buscar preços", to: "/buscar" } } },
  { prefix: "/produto", meta: { page: "Produto", section: "Comprar melhor", parent: { label: "Buscar preços", to: "/buscar" } } },
  { prefix: "/cesta-basica", meta: { page: "Cesta básica", section: "Comprar melhor" } },
  { prefix: "/tendencias", meta: { page: "Tendências", section: "Comprar melhor" } },
  { prefix: "/acougues", meta: { page: "Açougues", section: "Comprar melhor" } },

  // Minha conta
  { prefix: "/lista", meta: { page: "Minha lista", section: "Minha conta" } },
  { prefix: "/alertas", meta: { page: "Alertas", section: "Minha conta" } },
  { prefix: "/historico", meta: { page: "Histórico", section: "Minha conta" } },
  { prefix: "/economia", meta: { page: "Economia", section: "Minha conta" } },
  { prefix: "/perfil", meta: { page: "Perfil", section: "Minha conta" } },
  { prefix: "/notificacoes", meta: { page: "Notificações", section: "Minha conta" } },
  { prefix: "/favoritos", meta: { page: "Favoritos", section: "Minha conta" } },

  // Assinatura
  { prefix: "/planos", meta: { page: "Planos", section: "Assinatura" } },
  { prefix: "/minhas-licencas", meta: { page: "Licenças", section: "Assinatura" } },
  { prefix: "/meus-pedidos", meta: { page: "Pedidos", section: "Assinatura" } },
  { prefix: "/resgatar", meta: { page: "Resgatar código", section: "Assinatura" } },
  { prefix: "/colaborador", meta: { page: "Colaborador", section: "Assinatura" } },
];

/** Converte um slug de URL em rótulo legível ("arroz-tio-joao" → "Arroz Tio Joao"). */
function humanizeSlug(segment: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  })();
  const clean = decoded.replace(/[-_]+/g, " ").trim();
  if (!clean) return "";
  return clean
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function buildAppCrumbs(pathname: string): Crumb[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app" || path === "/" || path.startsWith("/admin")) return [];

  const match = APP_ROUTE_INDEX.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  const crumbs: Crumb[] = [{ label: "Painel", to: "/app" }];

  if (!match) {
    const label = humanizeSlug(path.split("/").filter(Boolean)[0] ?? "");
    if (label) crumbs.push({ label });
    return crumbs;
  }

  if (match.meta.section) crumbs.push({ label: match.meta.section });
  if (match.meta.parent) crumbs.push({ label: match.meta.parent.label, to: match.meta.parent.to });

  const rest = path.slice(match.prefix.length).split("/").filter(Boolean);
  if (rest.length > 0) {
    crumbs.push({ label: match.meta.page, to: match.prefix });
    const leaf = humanizeSlug(rest[rest.length - 1]);
    crumbs.push({ label: leaf || match.meta.page });
  } else {
    crumbs.push({ label: match.meta.page });
  }

  return crumbs;
}

export function AppBreadcrumb({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = buildAppCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Trilha de navegação"
      className={cn(
        "flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[11.5px] font-medium text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-border">
                /
              </span>
            )}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="inline-flex items-center gap-1 rounded-sm px-0.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {i === 0 && <Home className="h-3.5 w-3.5" strokeWidth={2.2} />}
                <span className="truncate">{crumb.label}</span>
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn("truncate", isLast ? "font-semibold text-foreground" : "")}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
