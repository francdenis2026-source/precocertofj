import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Rota de fallback caso não haja histórico interno (default: "/"). */
  fallbackTo?: string;
  /** Rótulo exibido ao lado do ícone. */
  label?: string;
  /** Rótulo curto para mobile. */
  shortLabel?: string;
  className?: string;
  variant?: "ghost" | "pill" | "seal";
}

/**
 * Botão "voltar" inteligente:
 *  • Se houver histórico interno (SPA), executa `router.history.back()`
 *    preservando o estado da tela anterior (scroll, filtros, etc).
 *  • Caso contrário — deep link, refresh, aba nova — navega para
 *    `fallbackTo` (default "/") como Link semântico com href real.
 *
 * Usar em vez de `<Link to="/">Voltar</Link>` em qualquer página interna.
 */
export function BackButton({
  fallbackTo = "/",
  label = "Voltar",
  shortLabel,
  className,
  variant = "ghost",
}: BackButtonProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // O histórico só existe no cliente: renderizar o mesmo elemento (<a>) no SSR
  // e na primeira renderização evita aviso de hidratação ao navegar.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const base =
    "inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const styles: Record<NonNullable<BackButtonProps["variant"]>, string> = {
    ghost:
      "px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground",
    pill:
      "border border-border bg-background px-3 py-1.5 text-foreground hover:bg-muted",
    seal:
      "border border-white/25 bg-[hsl(var(--pc-home-navy)/0.92)] px-3 py-1.5 text-white shadow-sm hover:bg-[hsl(var(--pc-home-navy))]",
  };
  const cls = cn(base, styles[variant], className);

  const content = (
    <>
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span className={shortLabel ? "hidden sm:inline" : undefined}>
        {label}
      </span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
    </>
  );

  if (hydrated && canGoBack) {
    return (
      <button
        type="button"
        onClick={() => router.history.back()}
        className={cls}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  // Sem histórico do router (deep link / refresh): tenta o histórico do navegador
  // antes de cair no fallback, para nunca "pular" direto para a home quando o
  // usuário abriu a tela vindo de outra rota interna.
  if (hydrated && typeof window !== "undefined" && window.history.length > 1) {
    return (
      <button
        type="button"
        onClick={() => window.history.back()}
        className={cls}
        aria-label={label}
      >
        {content}
      </button>
    );
  }


  return (
    <Link to={fallbackTo} className={cls} aria-label={label}>
      {content}
    </Link>
  );
}
