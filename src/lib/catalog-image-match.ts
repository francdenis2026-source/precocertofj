/**
 * Score de correspondência entre um produto do catálogo e uma candidata
 * de imagem retornada por scraper/IA.
 *
 * Retorna um número em [0, 1] e um breakdown com os componentes usados.
 *
 * Componentes:
 *  - nameOverlap: Jaccard entre tokens normalizados do display_name e do
 *    haystack (title + sourcePage + imageUrl).
 *  - brandHit: 1 se o token da marca aparecer no haystack, 0 caso contrário.
 *  - barcodeHit: 1 se o código de barras (EAN/UPC, ≥8 dígitos) aparecer
 *    literalmente no haystack. Match forte.
 *  - domainHit: 1 se sourcePage/imageUrl casar com domínio de varejo BR.
 *
 * Pesos (somam 1 quando há marca e código; menor quando faltam):
 *   name 0.45 | brand 0.20 | barcode 0.25 | domain 0.10
 *
 * Se `barcode` não estiver disponível, seu peso é redistribuído ao nome.
 */

export type MatchInput = {
  displayName: string;
  brand: string | null;
  barcode: string | null;
};

export type MatchCandidate = {
  imageUrl: string;
  sourcePage: string | null;
  title: string | null;
};

export type MatchBreakdown = {
  nameOverlap: number;
  brandHit: number;
  barcodeHit: number;
  domainHit: number;
};

export type MatchResult = {
  score: number; // 0..1
  breakdown: MatchBreakdown;
};

const STOPWORDS = new Set([
  "de","da","do","dos","das","com","sem","para","pra","e","em","no","na","nos","nas",
  "the","and","of","por","pack","cx","kit","pct","un","und","unid","unidade","unidades",
]);

const RETAILER_DOMAINS = [
  "paodeacucar.com",
  "carrefour.com.br",
  "extra.com.br",
  "amazon.com.br",
  "mercadolivre.com.br",
  "americanas.com.br",
  "shopee.com.br",
  "assai.com.br",
  "magazineluiza.com.br",
  "casasbahia.com.br",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokenize(s: string): string[] {
  if (!s) return [];
  const norm = stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ");
  return norm
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function normalizeDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

export function scoreImageMatch(
  target: MatchInput,
  candidate: MatchCandidate,
): MatchResult {
  const haystackRaw = [
    candidate.title ?? "",
    candidate.sourcePage ?? "",
    candidate.imageUrl ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const haystackNorm = stripAccents(haystackRaw);

  // 1) Name overlap
  const nameTokens = new Set(tokenize(target.displayName));
  const hayTokens = new Set(tokenize(haystackRaw));
  const nameOverlap = jaccard(nameTokens, hayTokens);

  // 2) Brand hit — pelo menos um token da marca aparece no haystack
  let brandHit = 0;
  if (target.brand) {
    const bt = tokenize(target.brand);
    if (bt.length > 0 && bt.some((t) => haystackNorm.includes(t))) {
      brandHit = 1;
    }
  }

  // 3) Barcode hit — sequência de dígitos do EAN aparece no haystack
  const bc = normalizeDigits(target.barcode);
  let barcodeHit = 0;
  if (bc.length >= 8) {
    const hayDigits = haystackRaw.replace(/\D+/g, "");
    if (hayDigits.includes(bc)) barcodeHit = 1;
  }

  // 4) Retailer domain
  const src = (candidate.sourcePage ?? "").toLowerCase();
  const url = candidate.imageUrl.toLowerCase();
  const domainHit = RETAILER_DOMAINS.some(
    (d) => src.includes(d) || url.includes(d),
  )
    ? 1
    : 0;

  // Pesos adaptativos: se não há barcode, redistribui esse peso ao nome.
  const hasBrand = !!target.brand;
  const hasBarcode = bc.length >= 8;

  let wName = 0.45;
  let wBrand = 0.20;
  let wBarcode = 0.25;
  const wDomain = 0.10;

  if (!hasBarcode) {
    wName += wBarcode * 0.6;
    wBrand += wBarcode * 0.4;
    wBarcode = 0;
  }
  if (!hasBrand) {
    wName += wBrand;
    wBrand = 0;
  }

  const score =
    nameOverlap * wName +
    brandHit * wBrand +
    barcodeHit * wBarcode +
    domainHit * wDomain;

  // Regra dura: match de barcode garante score ≥ 0.90 (identidade forte)
  const finalScore = barcodeHit === 1 ? Math.max(score, 0.9) : score;

  return {
    score: Math.min(1, Math.max(0, finalScore)),
    breakdown: { nameOverlap, brandHit, barcodeHit, domainHit },
  };
}

export const DEFAULT_MATCH_THRESHOLD = 0.55;
