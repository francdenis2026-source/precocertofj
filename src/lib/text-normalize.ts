/**
 * Normalização de texto compartilhada (acentos, caixa e pontuação).
 *
 * Motivação: divergências entre o nome escaneado ("Água Sanitária Ypê 1L") e o
 * nome canônico do catálogo ("AGUA SANITARIA YPE 1L") vinham de cada módulo ter
 * a sua própria normalização — alguns removiam acento, outros não, e as regexes
 * com `\b` (que em JS só reconhece [A-Za-z0-9_]) falhavam silenciosamente em
 * palavras acentuadas. Este módulo é a fonte única dessas conversões.
 *
 * Todas as funções são puras, determinísticas e seguras no cliente e no servidor.
 */

/** Remove marcas diacríticas preservando o restante do texto. */
export function stripAccents(value: string | null | undefined): string {
  if (typeof value !== "string" || value === "") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Texto pronto para casar com regex/keywords: sem acento, minúsculo e com
 * pontuação convertida em espaço (para `\b` funcionar nas bordas).
 */
export function normalizeSearchText(value: string | null | undefined): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chave canônica para indexar/comparar nomes de produto entre tabelas.
 * "Água Sanitária Ypê 1L" e "agua sanitaria ype 1l" produzem a mesma chave.
 */
export function normalizeNameKey(value: string | null | undefined): string {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Slug estável para URLs, derivado do mesmo pipeline de normalização. */
export function slugifyText(value: string | null | undefined, maxLength = 80): string {
  return normalizeSearchText(value).replace(/\s+/g, "-").slice(0, maxLength).replace(/^-+|-+$/g, "");
}
