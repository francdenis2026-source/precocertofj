/**
 * AutoAdminBreadcrumb — derivação automática da trilha administrativa a
 * partir do pathname atual. Injetado no AppShell (escopo `admin`) para
 * garantir consistência sem que cada rota precise declarar manualmente
 * `<AdminBreadcrumb hub=… page=… />`.
 *
 * Registro central `ADMIN_ROUTE_INDEX`:
 *  - agrupa rotas administrativas por categoria funcional
 *    (Cesta Básica, Auditoria, Veredito, Ranking, Catálogo, …),
 *  - reaproveita os 4 hubs semânticos existentes (contas/vitrine/
 *    operacao/precos) via `ADMIN_HUBS`,
 *  - permite lookup O(1) por pathname para propagar o tone correto
 *    para o `AdminBreadcrumb` (que aplica a paleta AA validada).
 *
 * A rota `/admin` raiz é considerada "home do console" e não gera
 * migalha (o próprio AdminHubLauncher domina a tela).
 */

import { useRouterState } from "@tanstack/react-router";
import { AdminBreadcrumb, type AdminHubKey } from "@/components/admin/AdminBreadcrumb";

export type AdminCategory =
  | "Cesta Básica"
  | "Auditoria"
  | "Veredito"
  | "Ranking"
  | "Catálogo"
  | "Comercial"
  | "Clientes"
  | "Sistema"
  | "Visão geral";

type RouteMeta = {
  /** Rótulo exibido como página atual na trilha. */
  page: string;
  /** Hub semântico que dá cor à trilha. */
  hub: AdminHubKey;
  /** Categoria funcional para agrupamento (usada na sidebar/hub launcher). */
  category: AdminCategory;
};

/**
 * Prefix-longest-match: rotas mais específicas antes das genéricas.
 * Ordem importa — `admin/cesta-auditoria` vem antes de `admin/cesta` para
 * evitar colisão de prefixo.
 */
const ADMIN_ROUTE_INDEX: ReadonlyArray<{ prefix: string; meta: RouteMeta }> = [
  // ---------- Cesta Básica ----------
  { prefix: "/admin/cesta-auditoria", meta: { page: "Auditoria da Cesta", hub: "operacao", category: "Auditoria" } },
  { prefix: "/admin/cesta",           meta: { page: "Itens & versões",    hub: "operacao", category: "Cesta Básica" } },

  // ---------- Ranking ----------
  { prefix: "/admin/rank-check",      meta: { page: "Ranking geral",      hub: "operacao", category: "Ranking" } },
  { prefix: "/admin/cobertura",       meta: { page: "Cobertura",          hub: "operacao", category: "Ranking" } },

  // ---------- Auditoria ----------
  { prefix: "/admin/auditoria-numeros",  meta: { page: "Auditoria de números",  hub: "operacao", category: "Auditoria" } },
  { prefix: "/admin/auditoria-acessos",  meta: { page: "Auditoria de acessos",  hub: "contas",   category: "Auditoria" } },
  { prefix: "/admin/auditoria",          meta: { page: "Auditoria geral",       hub: "operacao", category: "Auditoria" } },
  { prefix: "/admin/consistencia",       meta: { page: "Consistência",          hub: "operacao", category: "Auditoria" } },
  { prefix: "/admin/webhooks",           meta: { page: "Webhooks",              hub: "operacao", category: "Sistema" } },

  // ---------- Catálogo / Preços ----------
  { prefix: "/admin/catalogo",           meta: { page: "Catálogo",              hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/categorizacao",      meta: { page: "Categorização",         hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/cadastro-foto",      meta: { page: "Cadastro por foto",     hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/importacoes",        meta: { page: "Importações",           hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/image-jobs",         meta: { page: "Imagens",               hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/lote-inserir",       meta: { page: "Inserção em lote",      hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/sinonimos",          meta: { page: "Sinônimos",             hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/icones-categoria",   meta: { page: "Ícones de categoria",   hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/vitrine",            meta: { page: "Vitrine",               hub: "vitrine", category: "Catálogo" } },
  { prefix: "/admin/historico-precos",   meta: { page: "Histórico de preços",   hub: "precos",  category: "Catálogo" } },
  { prefix: "/admin/preco-rapido",       meta: { page: "Preço rápido",          hub: "precos",  category: "Catálogo" } },
  { prefix: "/admin/precos",             meta: { page: "Preços",                hub: "precos",  category: "Catálogo" } },

  // ---------- Comercial ----------
  { prefix: "/admin/promocoes-codigos",  meta: { page: "Códigos promocionais",  hub: "precos",  category: "Comercial" } },
  { prefix: "/admin/promocoes",          meta: { page: "Promoções",             hub: "precos",  category: "Comercial" } },
  { prefix: "/admin/cupom-lote",         meta: { page: "Cupons em lote",        hub: "precos",  category: "Comercial" } },
  { prefix: "/admin/cupom",              meta: { page: "Cupons",                hub: "precos",  category: "Comercial" } },
  { prefix: "/admin/gestao",             meta: { page: "Gestão de licenças",    hub: "precos",  category: "Comercial" } },
  { prefix: "/admin_/acessos-temporarios", meta: { page: "Acessos temporários",  hub: "precos",  category: "Comercial" } },
  { prefix: "/admin/conversoes",         meta: { page: "Conversões",            hub: "precos",  category: "Comercial" } },

  // ---------- Clientes / Contas ----------
  { prefix: "/admin/clientes",           meta: { page: "Clientes",              hub: "contas",  category: "Clientes" } },
  { prefix: "/admin/contas",             meta: { page: "Contas",                hub: "contas",  category: "Clientes" } },

  // ---------- Sistema ----------
  { prefix: "/admin/analytics",          meta: { page: "Analytics",             hub: "operacao", category: "Sistema" } },
  { prefix: "/admin/metricas",           meta: { page: "Métricas",              hub: "operacao", category: "Sistema" } },
  { prefix: "/admin/ia",                 meta: { page: "IA",                    hub: "operacao", category: "Sistema" } },
  { prefix: "/admin/reports",            meta: { page: "Relatórios",            hub: "operacao", category: "Sistema" } },
  { prefix: "/admin/operacao",           meta: { page: "Operação",              hub: "operacao", category: "Sistema" } },
];

/**
 * Casos especiais fora de `/admin` que ainda pertencem ao console
 * (páginas públicas usadas pela administração — ex.: veredito ao vivo).
 */
const CROSS_SCOPE_INDEX: ReadonlyArray<{ prefix: string; meta: RouteMeta }> = [
  { prefix: "/cesta-basica", meta: { page: "Veredito ao vivo", hub: "operacao", category: "Veredito" } },
];

export function lookupAdminRoute(pathname: string): RouteMeta | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  for (const entry of ADMIN_ROUTE_INDEX) {
    if (p === entry.prefix || p.startsWith(entry.prefix + "/")) return entry.meta;
  }
  for (const entry of CROSS_SCOPE_INDEX) {
    if (p === entry.prefix || p.startsWith(entry.prefix + "/")) return entry.meta;
  }
  return null;
}

/**
 * Renderiza a trilha automaticamente. Silencia em `/admin` raiz e em
 * rotas sem correspondência (evita ruído em telas de utilidade).
 */
export function AutoAdminBreadcrumb({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Raiz do console: hub launcher já provê contexto suficiente.
  if (pathname === "/admin" || pathname === "/admin/") return null;
  const meta = lookupAdminRoute(pathname);
  if (!meta) return null;
  return (
    <AdminBreadcrumb
      hub={meta.hub}
      page={meta.page}
      currentLabel={`${meta.category} · ${meta.page}`}
      className={className}
    />
  );
}
