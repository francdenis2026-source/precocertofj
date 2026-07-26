import { SmartLogoImage } from "@/components/brand/SmartLogo";
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
}: StoreLogoThumbProps) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-border/70 bg-white p-1",
        className,
      )}
    >
      {src ? (
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
