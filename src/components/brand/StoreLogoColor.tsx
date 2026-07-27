import { cn } from "@/lib/utils";
import { colorLogoSrc } from "@/lib/store-logo-mono";

export type StoreLogoColorProps = {
  /** URL da logo raster da loja (o slug é derivado dela). */
  src?: string | null;
  name: string;
  className?: string;
  /** Acima da dobra: carrega imediatamente. */
  eager?: boolean;
};

/**
 * Marca vetorial **colorida** de um estabelecimento, com par claro/escuro.
 *
 * Usa o mesmo traçado do vetor monocromático pintado com a cor real da marca:
 * a versão clara é calibrada para fundos brancos e a escura para o navy do
 * tema escuro, ambas com contraste WCAG AA. A troca é feita por CSS
 * (`dark:`), sem JavaScript e sem risco de descompasso na hidratação.
 * Sem versão vetorial disponível, retorna `null` para o chamador decidir o
 * fallback.
 */
export function StoreLogoColor({ src, name, className, eager = false }: StoreLogoColorProps) {
  const light = colorLogoSrc(src, "light");
  const dark = colorLogoSrc(src, "dark");
  if (!light || !dark) return null;

  const common = cn("h-full w-full object-contain", className);
  const loading = eager ? ("eager" as const) : ("lazy" as const);

  return (
    <>
      <img src={light} alt={name} loading={loading} decoding="async" className={cn(common, "dark:hidden")} />
      <img
        src={dark}
        alt=""
        aria-hidden
        loading={loading}
        decoding="async"
        className={cn(common, "hidden dark:block")}
      />
    </>
  );
}
