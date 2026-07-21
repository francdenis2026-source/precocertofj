/**
 * Scraper direto (sem IA) para achar capas de produtos.
 *
 * Estratégia: consulta o Bing Images (HTML público) restringindo a domínios
 * brasileiros de varejo. O HTML retornado contém, em cada resultado, um
 * atributo `m="..."` com um JSON serializado que inclui `murl` (URL direta
 * da imagem) e `purl` (página de origem). Fazemos parse desses blocos por
 * regex — não é preciso executar JS.
 *
 * Se o Bing não retornar candidatas válidas, tenta o DuckDuckGo Lite (que
 * também expõe imagens em HTML puro).
 */

import type { WebImageCandidate } from "./catalog-image-picker.server";
import {
  scoreImageMatch,
  type MatchInput,
  type MatchResult,
} from "./catalog-image-match";

export type ScoredCandidate = WebImageCandidate & {
  match: MatchResult;
};


const RETAILER_DOMAINS = [
  "paodeacucar.com",
  "carrefour.com.br",
  "extra.com.br",
  "amazon.com.br",
  "mercadolivre.com.br",
  "americanas.com.br",
  "shopee.com.br",
  "assai.com.br",
];

const IMAGE_EXT_RE = /\.(jpe?g|png|webp)(\?|$)/i;
const IUSC_RE = /class="iusc"[^>]*\sm="([^"]+)"/g;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error("[scraper] fetchHtml falhou", url, err);
    return null;
  }
}

function parseBing(html: string): WebImageCandidate[] {
  const out: WebImageCandidate[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  IUSC_RE.lastIndex = 0;
  while ((match = IUSC_RE.exec(html)) !== null) {
    const raw = decodeHtmlEntities(match[1]);
    try {
      const obj = JSON.parse(raw) as {
        murl?: string;
        purl?: string;
        t?: string;
      };
      const murl = typeof obj.murl === "string" ? obj.murl : "";
      if (!murl || seen.has(murl)) continue;
      if (!/^https?:\/\//i.test(murl)) continue;
      if (!IMAGE_EXT_RE.test(murl)) continue;
      seen.add(murl);
      out.push({
        imageUrl: murl,
        sourcePage: typeof obj.purl === "string" ? obj.purl : null,
        title: typeof obj.t === "string" ? obj.t : null,
        confidence: "medium",
      });
      if (out.length >= 12) break;
    } catch {
      /* bloco inválido — pula */
    }
  }
  return out;
}

// DuckDuckGo Images (fluxo em 2 passos, retorna JSON com URLs reais).
// Google Images não é scrapeável server-side (URLs ficam atrás de JS), então
// usamos DDG como "segundo motor" — a maior parte dos resultados que ele
// devolve são, na verdade, indexados pelo Bing/Google.
async function fetchDuckDuckGoImages(query: string): Promise<WebImageCandidate[]> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  };
  try {
    const seed = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers, redirect: "follow" },
    );
    if (!seed.ok) return [];
    const html = await seed.text();
    const vqdMatch = html.match(/vqd=["']?([\d-]+)["']?/) || html.match(/vqd=([\d-]+)&/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    const res = await fetch(
      `https://duckduckgo.com/i.js?l=pt-br&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
      { headers: { ...headers, Referer: "https://duckduckgo.com/" }, redirect: "follow" },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ image?: string; url?: string; title?: string }> };
    const out: WebImageCandidate[] = [];
    const seen = new Set<string>();
    for (const r of json.results ?? []) {
      const url = r.image;
      if (!url || seen.has(url)) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      if (!IMAGE_EXT_RE.test(url)) continue;
      seen.add(url);
      out.push({
        imageUrl: url,
        sourcePage: r.url ?? null,
        title: r.title ?? null,
        confidence: "medium",
      });
      if (out.length >= 20) break;
    }
    return out;
  } catch (err) {
    console.error("[scraper] ddg falhou", err);
    return [];
  }
}

function buildQuery(displayName: string, brand: string | null): string {
  const base = brand ? `${brand} ${displayName}` : displayName;
  const domainFilter = RETAILER_DOMAINS.map((d) => `site:${d}`).join(" OR ");
  return `${base} (${domainFilter})`;
}

/**
 * Busca candidatas na web para um produto. Consulta Bing + DuckDuckGo em
 * paralelo (ambos gratuitos, sem chave). Google Images não é scrapeável.
 */
export async function scrapeImageCandidates(
  displayName: string,
  brand: string | null,
  barcode: string | null = null,
): Promise<ScoredCandidate[]> {
  const query = buildQuery(displayName, brand);
  const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
  const [bingHtml, ddgList] = await Promise.all([fetchHtml(bingUrl), fetchDuckDuckGoImages(query)]);

  const candidates: WebImageCandidate[] = [];
  const seen = new Set<string>();
  const push = (list: WebImageCandidate[]) => {
    for (const c of list) {
      if (seen.has(c.imageUrl)) continue;
      seen.add(c.imageUrl);
      candidates.push(c);
    }
  };
  if (bingHtml) push(parseBing(bingHtml));
  push(ddgList);
  if (candidates.length === 0) return [];

  const target: MatchInput = { displayName, brand, barcode };
  const scored: ScoredCandidate[] = candidates.map((c) => ({
    ...c,
    match: scoreImageMatch(target, c),
  }));
  scored.sort((a, b) => {
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    return scoreCandidate(b) - scoreCandidate(a);
  });
  return scored.slice(0, 8);
}



function scoreCandidate(c: WebImageCandidate): number {
  const src = (c.sourcePage ?? "").toLowerCase();
  const url = c.imageUrl.toLowerCase();
  let score = 0;
  for (let i = 0; i < RETAILER_DOMAINS.length; i++) {
    const d = RETAILER_DOMAINS[i];
    if (src.includes(d) || url.includes(d)) {
      score += RETAILER_DOMAINS.length - i;
      break;
    }
  }
  if (/[_-](600|800|1000|1200|1500)[x_-]/.test(url)) score += 2;
  if (url.endsWith(".webp")) score += 1;
  return score;
}

