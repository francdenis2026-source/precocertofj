import { useState, useCallback, useEffect } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, getCanonicalShareUrl } from "@/lib/share-url";

interface ShareButtonProps {
  title?: string;
  text?: string;
  /**
   * URL a compartilhar.
   * - Omitido → URL canônica da rota atual (`<link rel="canonical">` ou
   *   `origin + pathname`, sem query/hash).
   * - Relativo (`/foo`) → resolvido contra `window.location.origin`.
   * - Absoluto (`https://…`) → usado como está.
   */
  url?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
  /** Variante icônica compacta (sem texto). */
  compact?: boolean;
}

/**
 * Botão de compartilhamento padronizado do PreçoCerto.
 * - Web Share API quando disponível (mobile).
 * - Fallback com cópia do link para a área de transferência
 *   (inclusive em contexto não-seguro, via `document.execCommand`).
 * - URL canônica por padrão — nunca vaza query/hash locais.
 */
export function ShareButton({
  title = "PreçoCerto",
  text = "Veja essa comparação de preços",
  url,
  className = "",
  label = "Compartilhar",
  size = "sm",
  compact = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  // Evita hydration mismatch: só decide o ícone depois de montar no cliente.
  useEffect(() => {
    setCanWebShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleShare = useCallback(async () => {
    const shareUrl = getCanonicalShareUrl(url);
    if (!shareUrl) return;

    // 1) Web Share API (mobile / navegadores compatíveis).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // Cancelamento explícito do usuário — não caímos no fallback.
        if ((err as { name?: string })?.name === "AbortError") return;
        /* qualquer outra falha cai no clipboard */
      }
    }

    // 2) Fallback: copiar link.
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Link copiado ✓", {
        description: "Cole no WhatsApp, e-mail ou onde quiser enviar.",
        action: {
          label: "Abrir",
          onClick: () => window.open(shareUrl, "_blank", "noopener,noreferrer"),
        },
      });
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Não foi possível copiar o link", { description: shareUrl });
    }
  }, [title, text, url]);

  const Icon = copied ? Check : canWebShare ? Share2 : Copy;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={copied ? "Link copiado" : label}
        title={label}
        className={`pc-focus inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/40 hover:text-primary ${className}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
      </button>
    );
  }

  const sizeCls =
    size === "sm"
      ? "h-9 px-3 text-xs gap-1.5"
      : "h-10 px-4 text-sm gap-2";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "Link copiado" : label}
      className={`pc-focus inline-flex items-center rounded-full border border-border bg-background font-medium text-foreground transition hover:border-primary/40 hover:text-primary ${sizeCls} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
      {copied ? "Link copiado" : label}
    </button>
  );
}
