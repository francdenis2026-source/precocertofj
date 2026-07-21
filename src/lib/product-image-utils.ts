const STORAGE_OBJECT_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/;

const STOPWORDS = new Set([
  "DE",
  "DA",
  "DO",
  "DAS",
  "DOS",
  "COM",
  "SEM",
  "E",
  "PARA",
  "TIPO",
  "SABOR",
  "UN",
  "UND",
  "PC",
  "PCT",
  "PACOTE",
  "KG",
  "G",
  "GR",
  "ML",
  "L",
  "LT",
  "LITRO",
  "LITROS",
]);

export type CatalogImageCandidate = {
  displayName: string;
  normalizedName?: string | null;
  imageUrl: string | null;
};

type StorageSigner = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

export const normalizeProductName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

export const productTokens = (value: string): string[] =>
  normalizeProductName(value)
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

export const findCatalogImageForProduct = (
  productName: string,
  candidates: CatalogImageCandidate[],
): string | null => {
  const targetTokens = productTokens(productName);
  if (targetTokens.length === 0) return null;

  let bestScore = 0;
  let bestUrl: string | null = null;

  for (const candidate of candidates) {
    if (!candidate.imageUrl) continue;

    const candidateTokens = new Set(
      productTokens(`${candidate.displayName} ${candidate.normalizedName ?? ""}`),
    );
    if (candidateTokens.size === 0) continue;

    let overlap = 0;
    for (const token of targetTokens) {
      if (candidateTokens.has(token)) overlap += 1;
    }

    const score = overlap / Math.max(targetTokens.length, candidateTokens.size);
    if (overlap >= 2 && score > bestScore) {
      bestScore = score;
      bestUrl = candidate.imageUrl;
    }
  }

  return bestScore >= 0.25 ? bestUrl : null;
};

const storageObjectFromUrl = (
  value: string,
): { bucket: string; path: string } | null => {
  const match = value.match(STORAGE_OBJECT_RE);
  if (!match) return null;

  try {
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return { bucket: match[1], path: match[2] };
  }
};

export const signStorageImageUrl = async (
  imageUrl: string | null,
  signer: StorageSigner,
  options?: { allowedBuckets?: string[]; expiresIn?: number },
): Promise<string | null> => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return imageUrl;
  if (imageUrl.startsWith("/__l5e/assets-v1/")) return imageUrl;

  const object = storageObjectFromUrl(imageUrl);
  if (!object) return imageUrl;

  const allowedBuckets = options?.allowedBuckets ?? ["logos", "scans"];
  if (!allowedBuckets.includes(object.bucket)) return imageUrl;

  const { data, error } = await signer.storage
    .from(object.bucket)
    .createSignedUrl(object.path, options?.expiresIn ?? 60 * 60 * 24 * 7); // 7 dias — cache agressivo de <img>

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};