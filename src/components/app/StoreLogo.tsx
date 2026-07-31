import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip de logomarca de estabelecimento com contraste garantido.
 *
 * Muitas logos são PNG/JPG com fundo escuro; renderizá-las direto sobre o
 * card fazia o bloco "sumir" (mancha preta sem destaque). Aqui a logo sempre
 * fica sobre uma base clara, com padding e anel sutil, tanto no tema claro
 * quanto no escuro.
 */
export function StoreLogo({
  src,
  name,
  className,
  imgClassName,
}: {
  src?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md p-1",
        "bg-white ring-1 ring-border/70 shadow-[0_1px_2px_rgba(11,30,58,0.12)]",
        "dark:bg-white dark:ring-white/25",
        className,
      )}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("h-full w-full object-contain", imgClassName)}
        />
      ) : (
        <Store className="h-4 w-4 text-slate-500" aria-hidden />
      )}
    </span>
  );
}
