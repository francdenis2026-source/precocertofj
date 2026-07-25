/**
 * Utilitário único para rolar suavemente até uma seção da página,
 * respeitando qualquer elemento fixo/sticky no topo (SiteHeader, HomeAnchorNav).
 * Uso consistente em toda a UI (chips de âncora, CTAs "voltar ao topo", etc.).
 */
export function getStickyOffset(): number {
  if (typeof window === "undefined") return 0;
  // Soma a altura de todos os elementos sticky/fixed no topo do documento.
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("header, nav, [data-sticky-top]"),
  );
  let offset = 0;
  for (const el of candidates) {
    const cs = window.getComputedStyle(el);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    const rect = el.getBoundingClientRect();
    // Considera apenas os que estão colados ao topo (top <= 4px).
    if (rect.top <= 4 && rect.height > 0) {
      offset = Math.max(offset, rect.bottom);
    }
  }
  return Math.round(offset) + 8; // respiro visual
}

export function scrollToSection(id: string, opts?: { smooth?: boolean }): boolean {
  if (typeof window === "undefined") return false;
  const el = document.getElementById(id);
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY - getStickyOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: opts?.smooth === false ? "auto" : "smooth" });
  return true;
}
