import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  setAuthIntent,
  type AuthIntent,
  type AuthIntentKind,
} from "@/lib/auth-intent";
import { safeInternalPath } from "@/lib/auth-redirect";

/**
 * Copy padronizada para cada tipo de ação que exige login.
 * O objetivo é dar ao visitante clareza sobre "o que acontece agora"
 * — quais são os próximos passos e o que ele vai ganhar entrando.
 */
type Preset = {
  title: string;
  action: string;         // frase curta: "favoritar este preço"
  benefits: string[];     // "o que acontece agora" — 2 a 3 bullets
  confirmLabel?: string;
};

const PRESETS: Record<AuthIntentKind, Preset> = {
  "favorite-panel": {
    title: "Entre para salvar este preço",
    action: "favoritar preços em destaque",
    benefits: [
      "Salvamos o produto na sua lista de favoritos",
      "Avisamos quando o preço cair em qualquer mercado",
      "Você volta para esta página já com o item marcado",
    ],
    confirmLabel: "Entrar e favoritar",
  },
  "favorite-item": {
    title: "Entre para salvar este produto",
    action: "salvar produtos do catálogo",
    benefits: [
      "Salvamos o produto na sua lista pessoal",
      "Você acompanha o preço em todos os mercados",
      "Voltamos automaticamente para esta tela",
    ],
    confirmLabel: "Entrar e salvar",
  },
  "favorite-district": {
    title: "Entre para favoritar bairros",
    action: "favoritar bairros no mapa",
    benefits: [
      "Salvamos os bairros que você acompanha",
      "Priorizamos os mercados dessas regiões nos rankings",
      "Voltamos ao mapa já com o bairro marcado",
    ],
    confirmLabel: "Entrar e favoritar",
  },
  "report-price": {
    title: "Entre para denunciar preços",
    action: "reportar preços desatualizados ou incorretos",
    benefits: [
      "Sua denúncia entra na fila de verificação",
      "Ajuda toda a comunidade a comprar melhor",
      "Voltamos para a lista já com o formulário aberto",
    ],
    confirmLabel: "Entrar e denunciar",
  },
  "checkout-plan": {
    title: "Entre para assinar um plano",
    action: "continuar a assinatura",
    benefits: [
      "Salvamos o plano escolhido",
      "Retomamos direto na tela de pagamento",
      "Você não precisa começar do zero",
    ],
    confirmLabel: "Entrar e continuar",
  },
};

export type PromptSignInOptions = {
  /** Tipo da ação — determina copy e como a página alvo consome a intenção. */
  intent: AuthIntentKind;
  /** Sobrescreve título padrão. */
  title?: string;
  /** Sobrescreve os bullets de "o que acontece agora". */
  benefits?: string[];
  /** Payload da intenção — o consumidor tipa livremente. */
  payload?: Record<string, unknown>;
  /** Rota interna para voltar (default: pathname atual). */
  returnTo?: string;
};

export function usePromptSignIn() {
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  return useCallback(
    async (opts: PromptSignInOptions): Promise<boolean> => {
      const preset = PRESETS[opts.intent];
      const benefits = opts.benefits ?? preset.benefits;

      const description = (
        <div className="space-y-2.5">
          <p className="text-[12.5px] leading-snug text-muted-foreground">
            Entre para {preset.action}. Grátis, leva 10 segundos.
          </p>
          <ul className="space-y-1 text-[12px] leading-snug text-foreground/85">
            {benefits.slice(0, 2).map((b, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span
                  aria-hidden
                  className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full bg-sky-500"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      );

      const ok = await confirm({
        title: opts.title ?? preset.title,
        description,
        confirmLabel: preset.confirmLabel ?? "Entrar agora",
        cancelLabel: "Agora não",
        tone: "info",
      });

      if (!ok) return false;

      const returnTo =
        (typeof window !== "undefined"
          ? safeInternalPath(
              opts.returnTo ??
                window.location.pathname + window.location.search,
            )
          : null) ?? "/";

      const intent: Omit<AuthIntent, "ts"> = {
        kind: opts.intent,
        payload: opts.payload,
        returnTo,
      };
      setAuthIntent(intent);

      navigate({
        to: "/login",
        search: { redirect: returnTo } as never,
      });
      return true;
    },
    [confirm, navigate],
  );
}
