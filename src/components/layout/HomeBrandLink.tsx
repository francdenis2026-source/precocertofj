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
        "inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
        className,
      )}
    >
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={56}
        height={56}
        loading="eager"
        decoding="async"
        className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_2px_6px_rgb(11_22_44/0.18)] sm:h-12 sm:w-12 lg:h-[52px] lg:w-[52px]"
      />
      {showWordmark && (
        <span className="hidden min-w-0 flex-col leading-none sm:flex">
          <span className="truncate font-['Instrument_Serif',ui-serif,Georgia,serif] text-[25px] font-normal leading-[0.95] tracking-[-0.015em] text-foreground lg:text-[27px]">
            Preço<span className="italic -ml-[0.05em] text-[var(--pc-gold-ink)]">Certo</span>
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Feijó <span className="mx-0.5 opacity-60">·</span> Acre
          </span>
        </span>
      )}

    </Link>
  );
}
