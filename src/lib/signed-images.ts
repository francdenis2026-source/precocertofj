/**
 * Assinatura em lote de URLs do bucket privado `logos`.
 *
 * As URLs armazenadas em `product_catalog.image_url` usam o padrão
 * `/storage/v1/object/public/logos/...`, mas o bucket é privado pela política
 * de workspace. Convertimos para signed URLs de longa duração no cliente e
 * cacheamos globalmente para evitar chamadas repetidas.
 */
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_PREFIX = "/storage/v1/object/public/logos/";
const SIGN_PREFIX = "/storage/v1/object/sign/logos/";
const RENDER_PREFIX = "/storage/v1/render/image/public/logos/";
const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 dias

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function extractPath(url: string): string | null {
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p.includes(PUBLIC_PREFIX)) return p.split(PUBLIC_PREFIX)[1] ?? null;
    if (p.includes(RENDER_PREFIX)) return p.split(RENDER_PREFIX)[1] ?? null;
    if (p.includes(SIGN_PREFIX)) return null; // já assinado
    return null;
  } catch {
    return null;
  }
}

function needsSigning(url: string): boolean {
  return url.includes(PUBLIC_PREFIX) || url.includes(RENDER_PREFIX);
}

export async function signLogoUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!needsSigning(url)) return url;
  const cached = cache.get(url);
  if (cached) return cached;
  const path = extractPath(url);
  if (!path) return url;

  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from("logos")
      .createSignedUrl(path, EXPIRES_IN);
    if (error || !data?.signedUrl) {
      inflight.delete(url);
      return url; // fallback: tenta URL original
    }
    cache.set(url, data.signedUrl);
    inflight.delete(url);
    return data.signedUrl;
  })();

  inflight.set(url, promise);
  return promise;
}

export async function signLogoUrls(urls: Array<string | null | undefined>): Promise<Record<string, string>> {
  const unique = Array.from(new Set(urls.filter((u): u is string => Boolean(u) && needsSigning(u!))));
  if (unique.length === 0) return {};
  const results = await Promise.all(unique.map((u) => signLogoUrl(u).then((s) => [u, s] as const)));
  const map: Record<string, string> = {};
  for (const [u, s] of results) if (s) map[u] = s;
  return map;
}
