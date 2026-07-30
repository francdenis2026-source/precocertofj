import { Fragment, type ReactNode } from "react";
import { tokenizeQuery, type SearchMode } from "@/lib/search-tokens";

/** Strip acentos + lower, SEM trim (preserva mapeamento caractere-a-caractere). */
function strip(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


/**
 * Destaca (via <mark>) as ocorrências dos tokens da busca em `text`,
 * ignorando acentos e maiúsculas/minúsculas — preservando o texto original.
 *
 * A tokenização/normalização vem de `@/lib/search-tokens` (fonte única
 * compartilhada com o backend), garantindo que backend e frontend nunca
 * divergem no que conta como "match".
 *
 * @param mode  "strict" (padrão) = palavra inteira para tokens curtos
 *              "loose"           = prefixo de palavra (≥3 chars)
 */
export function HighlightMatch({
  text,
  tokens,
  mode = "strict",
  className,
}: {
  text: string;
  tokens: string[];
  mode?: SearchMode;
  className?: string;
}): ReactNode {
  if (!text || tokens.length === 0) return <>{text}</>;

  // Mapeia cada índice do texto original → índice na versão sem acento.
  let normAcc = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    map.push(normAcc.length);
    normAcc += strip(text[i]);
  }
  map.push(normAcc.length);

  const ranges: Array<[number, number]> = [];
  for (const raw of tokens) {
    const t = strip(raw);
    if (!t) continue;
    // Palavra inteira para tokens curtos (evita "sal" casar "salsicha").
    const wholeWord = mode === "strict" ? true : t.length < 3;
    // Percorre normAcc procurando ocorrências que sejam word-boundary.
    let idx = 0;
    while (true) {
      const found = normAcc.indexOf(t, idx);
      if (found === -1) break;
      const prev = found > 0 ? normAcc.charAt(found - 1) : "";
      const nextChar = normAcc.charAt(found + t.length);
      const startsAtWord = !prev || !/[a-z0-9]/i.test(prev);
      const endsAtWord = !nextChar || !/[a-z0-9]/i.test(nextChar);
      const ok = wholeWord ? startsAtWord && endsAtWord : startsAtWord;
      if (ok) {
        let origStart = 0;
        while (origStart < text.length && map[origStart] < found) origStart++;
        let origEnd = origStart;
        while (origEnd < text.length && map[origEnd] < found + t.length) origEnd++;
        if (origEnd > origStart) ranges.push([origStart, origEnd]);
      }
      idx = found + Math.max(1, t.length);
    }
  }

  if (ranges.length === 0) return <>{text}</>;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      merged.push([r[0], r[1]]);
    }
  }

  const nodes: ReactNode[] = [];
  let cur = 0;
  merged.forEach(([s, e], i) => {
    if (s > cur) nodes.push(<Fragment key={`t${i}`}>{text.slice(cur, s)}</Fragment>);
    nodes.push(
      <mark
        key={`m${i}`}
        className={
          className ??
          "rounded bg-[color-mix(in_oklab,var(--brand-gold)_38%,transparent)] px-0.5 font-bold text-foreground underline decoration-[color-mix(in_oklab,var(--brand-gold)_75%,transparent)] decoration-2 underline-offset-2"
        }
      >
        {text.slice(s, e)}
      </mark>,
    );
    cur = e;
  });
  if (cur < text.length) nodes.push(<Fragment key="tail">{text.slice(cur)}</Fragment>);

  return <>{nodes}</>;
}

// Re-export para call sites que já importavam daqui — a fonte real é
// `@/lib/search-tokens`.
export { tokenizeQuery };
