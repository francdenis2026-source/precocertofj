/**
 * Compat shim — mantém a assinatura antiga (`url` obrigatório, `compact`
 * booleano) mas delega toda a lógica para o botão padronizado em
 * `@/components/ds/ShareButton`. Novas telas devem importar direto de `ds`.
 */
import { ShareButton as DSShareButton } from "@/components/ds/ShareButton";

export function ShareButton({
  url,
  title,
  text,
  label = "Compartilhar",
  className,
  compact = false,
}: {
  /** Aceita URL absoluta (`http…`), relativa (`/foo`) ou vazia (usa canônica). */
  url?: string;
  title?: string;
  text?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <DSShareButton
      url={url}
      title={title}
      text={text}
      label={label}
      className={className}
      compact={compact}
    />
  );
}
