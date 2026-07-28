import { Link } from "@tanstack/react-router";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

/**
 * Rodapé institucional compartilhado por páginas legais/estáticas
 * (ex.: /privacidade). Um único componente para garantir alinhamento
 * consistente do bloco de contato e do CTA "Fale conosco" em todas as
 * larguras críticas (360px, 768px, 1366px), sem overflow nem quebra.
 */
export function LegalFooter({ updatedAt }: { updatedAt: string }) {
  return (
    <footer className="shrink-0 border-t border-border/60 bg-background/92">
      <div className="mx-auto grid w-full max-w-5xl gap-2 px-3 py-2 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-8">
        {/* Bloco de contato — sempre em uma coluna fluida */}
        <p className={cn(tc.meta, "min-w-0 leading-snug")}>
          Idealizado por{" "}
          <strong className="font-semibold text-foreground">Franc D&apos;nis</strong> — Feijó (AC).
          Parcerias, delivery ou apps sob demanda:{" "}
          <a
            href="https://wa.me/5568992031340"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-semibold text-[var(--pc-gold-ink)] underline underline-offset-2"
          >
            (68) 99203-1340
          </a>{" "}
          ·{" "}
          <a
            href="mailto:precocerto-fj@proton.me"
            className="whitespace-nowrap font-semibold text-[var(--pc-gold-ink)] underline underline-offset-2"
          >
            precocerto-fj@proton.me
          </a>
        </p>

        {/* CTA + timestamp — coluna auto, sem quebra */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <span className={cn(tc.meta, "whitespace-nowrap")}>Atualizado {updatedAt}</span>
          <Link
            to="/fale-conosco"
            className={cn(
              tc.chip,
              "pc-focus inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
            )}
          >
            Fale conosco
          </Link>
        </div>
      </div>
    </footer>
  );
}
