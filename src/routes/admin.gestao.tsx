import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Redirect de compatibilidade: `/admin/gestao?tab=...` foi substituído pelos
 * hubs dedicados `/admin_/operacao` e `/admin_/contas`. Preserva query params
 * originais e mapeia o `?tab=` legado para as abas equivalentes.
 */

const OPERACAO_TABS = new Set([
  "planos",
  "assinantes",
  "integracoes",
  "webhooks",
  "email",
  "credenciais",
  "ia",
  "auditoria",
  "limpeza",
]);

const CONTAS_TABS = new Set([
  "clientes",
  "pins",
  "senhas",
  "login-logs",
  "team",
  "roles",
]);

const TAB_ALIAS: Record<string, string> = {
  pins: "senhas",
  "login-logs": "acessos",
  team: "roles",
  credenciais: "integracoes",
  limpeza: "auditoria",
};

export const Route = createFileRoute("/admin/gestao")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>) => {
    const search: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v == null) continue;
      search[k] = String(v);
    }
    return search;
  },
  component: LegacyGestaoRedirect,
});

function LegacyGestaoRedirect() {
  const search = Route.useSearch();
  const rawTab = search.tab;
  const mappedTab = rawTab ? TAB_ALIAS[rawTab] ?? rawTab : undefined;

  // Decide destino pelo tab; padrão volta ao dashboard admin.
  let to: "/admin_/operacao" | "/admin_/contas" | "/admin" = "/admin";
  if (rawTab && OPERACAO_TABS.has(rawTab)) to = "/admin_/operacao";
  else if (rawTab && CONTAS_TABS.has(rawTab)) to = "/admin_/contas";

  // Mantém demais search params além de "tab".
  const { tab: _drop, ...rest } = search;
  const nextSearch: Record<string, string> = { ...rest };
  if (mappedTab && to !== "/admin") nextSearch.tab = mappedTab;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Navigate to={to as any} search={nextSearch as any} replace />
  );
}
