import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Botão de compartilhamento com fallback para copiar URL.
 * - Em dispositivos com Web Share API nativa (celular), abre o menu de compartilhamento.
 * - Em desktop ou quando a API falha, copia a URL para a área de transferência.
 */
export function ShareButton({
  url,
  title,
  text,
  label = "Compartilhar",
  className,
  compact = false,
}: {
  url: string;
  title?: string;
  text?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const absoluteUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;

    // Tenta compartilhamento nativo primeiro
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch (err) {
        // Usuário cancelou ou API falhou → cai no clipboard
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-foreground transition hover:border-accent-strong/50 hover:bg-accent/10",
          className,
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-savings" strokeWidth={2.4} />
        ) : (
          <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground transition hover:border-accent-strong/50 hover:bg-accent/10",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-savings" strokeWidth={2.4} />
          Link copiado
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
          {label}
        </>
      )}
    </button>
  );
}
