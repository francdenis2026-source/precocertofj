/**
 * Utilitários para gerar URLs responsivas do Supabase Storage.
 *
 * Supabase suporta transformação de imagens no endpoint `/storage/v1/render/image/*`.
 * Para URLs assinadas (`/object/sign/...?token=...`) fazemos rewrite para
 * `/render/image/sign/...?token=...&width=N&quality=70&format=origin`.
 * Para URLs públicas trocamos `/object/public/` por `/render/image/public/`.
 *
 * Quando a URL não é do Storage (ex.: CDN externa, data URL) retornamos apenas
 * o src original — o navegador continua servindo a versão nativa.
 */

const SIGN_RE = /\/storage\/v1\/object\/sign\//;
const PUBLIC_RE = /\/storage\/v1\/object\/public\//;
const AUTH_RE = /\/storage\/v1\/object\/authenticated\//;

const DEFAULT_WIDTHS = [160, 320, 480, 640] as const;

function isTransformable(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  return SIGN_RE.test(url) || PUBLIC_RE.test(url) || AUTH_RE.test(url);
}

function toRenderUrl(url: string): string {
  return url
    .replace(SIGN_RE, "/storage/v1/render/image/sign/")
    .replace(PUBLIC_RE, "/storage/v1/render/image/public/")
    .replace(AUTH_RE, "/storage/v1/render/image/authenticated/");
}

function withParams(url: string, width: number, quality = 65): string {
  const sep = url.includes("?") ? "&" : "?";
  // format=webp força a saída em WebP (fallback automático quando o browser não suporta).
  // quality=65 gera thumbnails ~5x menores mantendo qualidade visível.
  return `${url}${sep}width=${width}&quality=${quality}&resize=contain&format=webp`;
}

/**
 * Retorna { src, srcSet } responsivos.
 * - `src` aponta para a variante mais próxima do tamanho renderizado.
 * - `srcSet` inclui variantes de 160w/320w/480w/640w para redes lentas.
 * Quando a URL não é transformável, cai de volta para a original sem srcSet.
 */
export function buildResponsiveImage(
  url: string | null | undefined,
  displayWidth = 320,
  widths: readonly number[] = DEFAULT_WIDTHS,
): { src: string | null; srcSet?: string } {
  if (!url) return { src: null };
  if (!isTransformable(url)) return { src: url };

  const rendered = toRenderUrl(url);
  const srcSet = widths
    .map((w) => `${withParams(rendered, w)} ${w}w`)
    .join(", ");
  const closest = widths.reduce((prev, cur) =>
    Math.abs(cur - displayWidth) < Math.abs(prev - displayWidth) ? cur : prev,
  );
  return { src: withParams(rendered, closest), srcSet };
}
