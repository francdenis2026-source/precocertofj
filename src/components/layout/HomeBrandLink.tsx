import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Marca clicável para os cabeçalhos internos — leva sempre à homepage,
 * sem depender do botão "Voltar". Mantém a gramática navy/gold do site.
 */
export function HomeBrandLink({
  className,
  showWordmark = true,
}: {
  className?: string;
  /** Exibe o nome ao lado do símbolo (oculto no mobile). */
  showWordmark?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="PreçoCerto — ir para a página inicial"
      title="Ir para a página inicial"
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
        className,
      )}
    >
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        loading="eager"
        decoding="async"
        className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
      />
      {showWordmark && (
        <span className="hidden truncate font-['Instrument_Serif',ui-serif,Georgia,serif] text-[21px] font-normal leading-none tracking-[-0.01em] text-foreground sm:inline">
          Preço<span className="text-[var(--pc-gold-ink)]">Certo</span>
        </span>
      )}
    </Link>
  );
}
