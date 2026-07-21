/**
 * Retorna um path interno seguro (same-origin) ou null.
 * Aceita apenas paths começando com "/" e nunca "//" (proteção open-redirect).
 */
export function safeInternalPath(p: string | null | undefined): string | null {
  if (!p) return null;
  if (typeof p !== "string") return null;
  if (!p.startsWith("/")) return null;
  if (p.startsWith("//")) return null;
  // Barra rotas internas de auth para não gerar loops
  if (p === "/login" || p.startsWith("/login?")) return null;
  if (p === "/admin-login" || p.startsWith("/admin-login?")) return null;
  return p;
}

/**
 * Constrói `/login?redirect=<pathname+search>` a partir do location atual.
 * Uso: <Link to={loginHrefWithRedirect()}>Entrar</Link>
 */
export function loginHrefWithRedirect(fallback: string = "/"): string {
  if (typeof window === "undefined") return "/login";
  const cur = window.location.pathname + window.location.search;
  const safe = safeInternalPath(cur) ?? fallback;
  const params = new URLSearchParams({ redirect: safe });
  return `/login?${params.toString()}`;
}
