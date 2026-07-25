import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { estimateAssistantCost, getMyAiQuota } from "@/lib/basket-assistant.functions";
import { approxTokens, creditsForTokens, formatCredits } from "@/lib/ai-cost";
import { Coins } from "lucide-react";

/**
 * Mostra, antes de enviar, a estimativa de créditos que a pergunta ao
 * assistente de cesta vai consumir — somando o texto digitado ao histórico.
 */
export function AiCostEstimate({
  draft = "",
  historyChars = 0,
  className,
}: {
  draft?: string;
  historyChars?: number;
  className?: string;
}) {
  const fetchEstimate = useServerFn(estimateAssistantCost);
  const fetchQuota = useServerFn(getMyAiQuota);
  const { data: base } = useQuery({
    queryKey: ["ai-cost-estimate"],
    queryFn: () => fetchEstimate(),
    staleTime: 5 * 60_000,
  });
  const { data: quota } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => fetchQuota(),
    staleTime: 30_000,
  });

  if (!base) return null;

  const extraTokens = approxTokens(draft) + Math.ceil(historyChars / 4);
  const promptTokens = base.avgPromptTokens + extraTokens;
  const credits = creditsForTokens(base.model, promptTokens, base.avgCompletionTokens);
  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 " +
        (className ?? "")
      }
      title={`≈ ${promptTokens} tokens de entrada + ${base.avgCompletionTokens} de resposta. ${
        base.samples > 0
          ? `Média real de ${base.samples} pergunta(s) recentes.`
          : "Estimativa inicial — refina com o uso real."
      }`}
    >
      <Coins className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Custo estimado
      </span>
      <span className="font-display text-[12px] font-semibold tabular-nums text-foreground">
        ≈ {formatCredits(credits)} crédito{credits >= 2 ? "s" : ""}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        · ~{promptTokens.toLocaleString("pt-BR")} tokens
      </span>
      {remaining !== null && (
        <span className="font-mono text-[10px] text-muted-foreground">
          · {remaining} pergunta{remaining === 1 ? "" : "s"} na cota
        </span>
      )}
    </div>
  );
}
