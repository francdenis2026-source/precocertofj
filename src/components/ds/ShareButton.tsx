import { useState, useCallback } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  title?: string;
  text?: string;
  /** Optional explicit URL — defaults to current window.location.href */
  url?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

/**
 * Botão de compartilhamento discreto.
 * - Usa Web Share API quando disponível (mobile)
 * - Fallback para copiar link para a área de transferência
 */
export function ShareButton({
  title = "PreçoCerto",
  text = "Veja essa comparação de preços",
  url,
  className = "",
  label = "Compartilhar",
  size = "sm",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title, text, url: shareUrl });
        toast.success("Comparação compartilhada", {
          description: "Envie agora para quem precisar ver os preços.",
        });
        return;
      }
    } catch {
      /* usuário cancelou — cai no fallback */
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado ✓", {
        description: "Cole no WhatsApp, e-mail ou onde quiser enviar.",
        action: {
          label: "Abrir",
          onClick: () => window.open(shareUrl, "_blank", "noopener,noreferrer"),
        },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link", {
        description: shareUrl,
      });
    }
  }, [title, text, url]);

  const sizeCls =
    size === "sm"
      ? "h-9 px-3 text-xs gap-1.5"
      : "h-10 px-4 text-sm gap-2";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={label}
      className={`inline-flex items-center rounded-full border border-border bg-background font-medium text-foreground transition hover:border-primary/40 hover:text-primary ${sizeCls} ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
          Link copiado
        </>
      ) : (
        <>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Share2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
          )}
          {label}
        </>
      )}
    </button>
  );
}
