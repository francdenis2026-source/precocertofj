import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAiQuota } from "@/lib/basket-assistant.functions";
import { Sparkles } from "lucide-react";

/** Badge que mostra créditos de IA restantes do usuário no mês. */
export function AiQuotaBadge({ className }: { className?: string }) {
  const fetchQuota = useServerFn(getMyAiQuota);
  const { data } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => fetchQuota(),
    staleTime: 30_000,
  });
  if (!data) return null;
  const remaining = Math.max(0, data.limit - data.used);
  const pct = data.limit > 0 ? (data.used / data.limit) * 100 : 0;
  const tone =
    remaining === 0 ? "bg-destructive/10 text-destructive border-destructive/30"
    : pct >= 80 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
    : "bg-primary/10 text-primary border-primary/30";
  const reset = new Date(data.resetAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${tone} ${className ?? ""}`}
      title={`${remaining} de ${data.limit} perguntas restantes. Renova em ${reset}.`}
    >
      <Sparkles className="w-3 h-3" />
      IA: {remaining}/{data.limit}
    </div>
  );
}
