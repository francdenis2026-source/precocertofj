/**
 * Helpers de compartilhamento — URL canônica + fallback de clipboard.
 *
 * Regra padronizada em toda a aplicação:
 * 1. Se o chamador informar `input` absoluto (`http…`), usa como está.
 * 2. Se `input` for relativo (`/foo/bar`), resolve contra `window.location.origin`.
 * 3. Se `input` for omitido:
 *    a. usa `<link rel="canonical">` quando presente no `<head>`;
 *    b. senão, `origin + pathname` da rota atual (sem query/hash — evita
 *       vazar filtros locais como `?q=leite` ou estados internos).
 */

/** Resolve a URL canônica compartilhável para o contexto atual. */
export function getCanonicalShareUrl(input?: string): string {
  if (typeof window === "undefined") return input ?? "";

  if (input) {
    if (/^https?:\/\//i.test(input)) return input;
    const path = input.startsWith("/") ? input : `/${input}`;
    return `${window.location.origin}${path}`;
  }

  // Preferência: link canonical publicado pela rota (head meta).
  const canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )?.href;
  if (canonical) return canonical;

  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Copia texto para o clipboard, com fallback para `document.execCommand`
 * (necessário em contexto não-seguro / iframes antigos onde
 * `navigator.clipboard` é `undefined`). Retorna `true` em sucesso.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Caminho moderno (HTTPS / secure context).
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* cai no fallback */
  }

  // Fallback legado — textarea invisível + execCommand.
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
