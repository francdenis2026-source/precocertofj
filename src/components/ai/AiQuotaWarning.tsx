import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAiQuota } from "@/lib/basket-assistant.functions";
import { AlertTriangle, Info, Ban } from "lucide-react";

/**
 * Avisos progressivos de cota de IA: dispara nos percentuais configurados pelo
 * administrador (ex.: 75% → 15/20, 95% → 19/20) e no bloqueio total.
 */
export function AiQuotaWarning({ className }: { className?: string }) {
  const fetchQuota = useServerFn(getMyAiQuota);
  const { data } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => fetchQuota(),
    staleTime: 30_000,
  });
  if (!data || data.limit <= 0) return null;

  const remaining = Math.max(0, data.limit - data.used);
  const pct = (data.used / data.limit) * 100;
  const thresholds = [...(data.warnThresholds ?? [75, 95])].sort((a, b) => b - a);
  const hit = thresholds.find((t) => pct >= t);
  const reset = new Date(data.resetAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  if (remaining === 0) {
    return (
      <Row
        tone="danger"
        icon={<Ban className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        className={className}
      >
        Cota mensal esgotada ({data.used}/{data.limit}
        {data.planName ? ` · plano ${data.planName}` : ""}). Renova em {reset}.
      </Row>
    );
  }
  if (hit === undefined) return null;

  const critical = hit >= 90 || remaining <= 1;
  return (
    <Row
      tone={critical ? "danger" : "warn"}
      icon={
        critical ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )
      }
      className={className}
    >
      {critical ? "Última(s) pergunta(s): " : "Atenção: "}
      você já usou {data.used}/{data.limit} perguntas do mês
      {data.planName ? ` (plano ${data.planName})` : ""} — restam {remaining}. Renova em {reset}.
    </Row>
  );
}

function Row({
  tone,
  icon,
  children,
  className,
}: {
  tone: "warn" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const styles =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${styles} ${className ?? ""}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
