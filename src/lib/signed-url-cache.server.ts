/**
 * Cache em memória (por worker) das URLs assinadas do storage.
 *
 * Cada busca/autocomplete precisava assinar até 8 imagens do catálogo,
 * gerando round-trips extras ao storage e alguns centenas de ms de atraso.
 * Como a assinatura vale 7 dias, guardamos em memória e renovamos só perto
 * do vencimento.
 */
type Entry = { url: string; expiresAt: number };

const cache = new Map<string, Entry>();
const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7;
const REUSE_MS = 6 * 24 * 60 * 60 * 1000;

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
};

/** Extrai `{ bucket, path }` de uma URL pública/assinada do storage. */
export function parseStoragePath(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/);
  if (!m) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

/** Devolve a URL assinada (com cache) ou `null` quando não for assinável. */
export async function getSignedUrlCached(
  client: unknown,
  rawUrl: string | null,
  allowedBuckets: readonly string[] = ["logos", "scans"],
): Promise<string | null> {
  if (!rawUrl) return null;
  const parsed = parseStoragePath(rawUrl);
  if (!parsed) return null;
  if (!allowedBuckets.includes(parsed.bucket)) return null;

  const key = `${parsed.bucket}/${parsed.path}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const { data } = await (client as StorageClient).storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGN_TTL_SECONDS);
  if (!data?.signedUrl) return null;

  cache.set(key, { url: data.signedUrl, expiresAt: Date.now() + REUSE_MS });
  return data.signedUrl;
}
