import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAiQuota, getMyAiUsage } from "@/lib/basket-assistant.functions";
import { formatCredits } from "@/lib/ai-cost";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiQuotaWarning } from "@/components/ai/AiQuotaWarning";
import { Coins, Loader2, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/minha-ia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu uso de IA — Preço Certo" },
      {
        name: "description",
        content:
          "Veja seu histórico de perguntas ao assistente, a estimativa de créditos por uso e o total consumido no mês.",
      },
      { property: "og:title", content: "Meu uso de IA — Preço Certo" },
      {
        property: "og:description",
        content: "Histórico de perguntas à IA, créditos estimados e cota mensal do seu plano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyAiPage,
});

function MyAiPage() {
  const fetchQuota = useServerFn(getMyAiQuota);
  const fetchUsage = useServerFn(getMyAiUsage);

  const { data: quota } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => fetchQuota(),
    staleTime: 30_000,
  });
  const { data: usage, isLoading } = useQuery({
    queryKey: ["ai-usage-mine"],
    queryFn: () => fetchUsage(),
    staleTime: 60_000,
  });

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <header className="space-y-1">
          <h1 className="font-display text-xl font-semibold text-foreground">Meu uso de IA</h1>
          <p className="text-xs text-muted-foreground">
            Histórico de perguntas ao assistente, créditos estimados e cota do seu plano.
          </p>
        </header>

        <AiQuotaWarning />

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            label="Cota do mês"
            value={quota ? `${quota.used}/${quota.limit}` : "—"}
            hint={
              quota
                ? `${remaining} restante(s) · renova em ${new Date(quota.resetAt).toLocaleDateString("pt-BR")}`
                : undefined
            }
          />
          <Stat
            icon={<MessageSquare className="h-4 w-4 text-primary" />}
            label="Perguntas no mês"
            value={usage ? String(usage.currentMonth.requests) : "—"}
            hint={usage ? `${usage.currentMonth.totalTokens.toLocaleString("pt-BR")} tokens` : undefined}
          />
          <Stat
            icon={<Coins className="h-4 w-4 text-primary" />}
            label="Créditos no mês"
            value={usage ? `≈ ${formatCredits(usage.currentMonth.credits)}` : "—"}
            hint="estimativa pelos tokens usados"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Plano e regras</CardTitle>
              <CardDescription>
                {quota?.reason === "plan_not_eligible"
                  ? "O assistente de IA é exclusivo dos planos pagos (Mensal, Trimestral ou Anual). O plano Degustação não inclui IA."
                  : quota?.planName
                    ? `Plano ${quota.planName} — ${quota.limit} perguntas por mês.`
                    : "Sem plano vinculado — cota padrão da plataforma."}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/planos">Ver planos</Link>
            </Button>
          </CardHeader>
          {quota && (
            <CardContent className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                {quota.assistantEnabled ? "Assistente ativo" : "Assistente desativado"}
              </Badge>
              <Badge variant="outline">
                {quota.requireActivePlan ? "Requer plano ativo" : "Aberto a cadastrados"}
              </Badge>
              {quota.requireActivePlan && quota.allowTrial && (
                <Badge variant="outline">Trial liberado</Badge>
              )}
              <Badge variant="outline">Avisos: {(quota.warnThresholds ?? []).join("% · ")}%</Badge>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de perguntas</CardTitle>
            <CardDescription>Últimas 200 chamadas, com créditos estimados por uso.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {usage && usage.items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Você ainda não fez perguntas ao assistente.
              </p>
            )}
            {usage && usage.items.length > 0 && (
              <ul className="divide-y divide-border">
                {usage.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                    <span className="w-32 shrink-0 font-mono text-muted-foreground">
                      {new Date(it.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex-1 truncate text-foreground">{it.functionName}</span>
                    <span className="font-mono text-muted-foreground">
                      {it.totalTokens.toLocaleString("pt-BR")} tok
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      ≈ {formatCredits(it.credits)} cr
                    </span>
                    {!it.success && <Badge variant="destructive">falha</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {usage && usage.months.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumo por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {usage.months.map((m) => (
                  <li key={m.monthKey} className="flex items-center justify-between py-2 text-xs">
                    <span className="font-mono text-muted-foreground">{m.monthKey}</span>
                    <span className="text-foreground">{m.requests} pergunta(s)</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      ≈ {formatCredits(m.credits)} cr
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
