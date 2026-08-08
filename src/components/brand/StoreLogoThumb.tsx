import { SmartLogoImage } from "@/components/brand/SmartLogo";
import { StoreLogoColor } from "@/components/brand/StoreLogoColor";
import { StoreLogoMono } from "@/components/brand/StoreLogoMono";
import { colorLogoSrc, monoLogoSrc } from "@/lib/store-logo-mono";
import { cn } from "@/lib/utils";

export type StoreLogoThumbProps = {
  src?: string | null;
  name: string;
  /** Classe do quadro (tamanho, borda, raio). */
  className?: string;
  /** Classe da imagem. */
  imgClassName?: string;
  /** Classe do fallback com as iniciais. */
  initialsClassName?: string;
  /** Acima da dobra: carrega imediatamente. Padrão: false (lazy + observer). */
  eager?: boolean;
  /**
   * Usa a versão vetorial monocromática (nítida em qualquer tamanho e pintada
   * com `currentColor`). Cai para a logo colorida quando não existir vetor.
   */
  mono?: boolean;
  /**
   * Usa a versão vetorial **colorida** da marca, com par claro/escuro já
   * calibrado para contraste. Cai para a logo raster quando não existir vetor.
   */
  vector?: boolean;
};


/**
 * Miniatura padronizada de logomarca de estabelecimento.
 *
 * Centraliza o carregamento de logos da rede para que exista **uma única
 * requisição por marca**: mesma origem CORS do analisador de contraste
 * (`crossOrigin="anonymous"`), `loading="lazy"` + IntersectionObserver e cache
 * de métricas compartilhado via `SmartLogoImage`.
 */
export function StoreLogoThumb({
  src,
  name,
  className,
  imgClassName,
  initialsClassName,
  eager = false,
  mono = false,
  vector = false,
}: StoreLogoThumbProps) {
  const monoSrc = mono ? monoLogoSrc(src) : null;
  const vectorSrc = !mono && vector ? colorLogoSrc(src) : null;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg border p-1",
        monoSrc ? "border-current/10 bg-transparent" : "border-[var(--border-subtle)] bg-white",
        className,
      )}
    >
      {monoSrc ? (
        <StoreLogoMono src={monoSrc} name={name} className={cn("h-full w-full", imgClassName)} />
      ) : vectorSrc ? (
        <StoreLogoColor src={src} name={name} eager={eager} className={imgClassName} />
      ) : src ? (
        <SmartLogoImage src={src} name={name} eager={eager} className={imgClassName} />
      ) : (

        <span
          aria-hidden
          className={cn(
            "font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-brand-navy",
            initialsClassName,
          )}
        >
          {name.substring(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
