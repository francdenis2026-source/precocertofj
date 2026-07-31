import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAlertSubscription,
  deleteAlertSubscription,
  listMyAlertSubscriptions,
  type PriceAlertSubscription,
} from "@/lib/price-alerts.functions";
import { useSessionGate } from "@/hooks/use-session-gate";
import { cn } from "@/lib/utils";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Encontra uma assinatura ativa de queda de preço para o produto (e, quando
 * informado, para o estabelecimento específico).
 */
export function findDropSubscription(
  subs: PriceAlertSubscription[] | undefined,
  productName: string,
  establishmentId?: string | null,
): PriceAlertSubscription | null {
  if (!subs?.length) return null;
  const key = slug(productName);
  return (
    subs.find(
      (s) =>
        s.active &&
        s.direction !== "rise" &&
        (slug(s.productKey) === key || slug(s.displayName ?? "") === key) &&
        (establishmentId
          ? s.establishmentId === establishmentId
          : s.establishmentId === null),
    ) ?? null
  );
}

/** Hook compartilhado com a lista de assinaturas do usuário. */
export function useMyPriceAlerts() {
  const { hasSession } = useSessionGate();
  const list = useServerFn(listMyAlertSubscriptions);
  return useQuery({
    queryKey: ["price-alert-subs"],
    queryFn: () => list(),
    enabled: hasSession,
    staleTime: 60_000,
  });
}

/**
 * Botão de um clique que liga/desliga o alerta de QUEDA de preço de um produto.
 * Sem `establishmentId`, monitora todos os mercados; com ele, monitora apenas
 * aquele estabelecimento.
 */
export function PriceDropAlertToggle({
  productName,
  establishmentId = null,
  storeName,
  targetPrice = null,
  thresholdPct = 3,
  variant = "icon",
  className,
}: {
  productName: string;
  establishmentId?: string | null;
  storeName?: string | null;
  targetPrice?: number | null;
  thresholdPct?: number;
  variant?: "icon" | "chip";
  className?: string;
}) {
  const { hasSession } = useSessionGate();
  const qc = useQueryClient();
  const subsQuery = useMyPriceAlerts();
  const create = useServerFn(createAlertSubscription);
  const remove = useServerFn(deleteAlertSubscription);

  const existing = useMemo(
    () => findDropSubscription(subsQuery.data, productName, establishmentId),
    [subsQuery.data, productName, establishmentId],
  );
  const active = !!existing;

  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        await remove({ data: { id: existing.id } });
        return "off" as const;
      }
      await create({
        data: {
          productName,
          displayName: productName,
          establishmentId,
          direction: "drop",
          thresholdPct,
          targetPrice,
        },
      });
      return "on" as const;
    },
    onSuccess: (mode) => {
      qc.invalidateQueries({ queryKey: ["price-alert-subs"] });
      if (mode === "on") {
        toast.success("Alerta de queda ativado", {
          description: establishmentId
            ? `Avisaremos quando ${productName} baixar em ${storeName ?? "este estabelecimento"}.`
            : `Avisaremos quando ${productName} baixar em qualquer estabelecimento.`,
        });
      } else {
        toast.success("Alerta desativado", {
          description: `Você não receberá mais avisos de queda para ${productName}.`,
        });
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o alerta"),
  });

  if (!hasSession) return null;

  const label = active
    ? `Desativar alerta de queda de ${productName}${storeName ? ` em ${storeName}` : ""}`
    : `Avisar quando ${productName} baixar${storeName ? ` em ${storeName}` : ""}`;

  const busy = mutation.isPending || subsQuery.isLoading;
  const Icon = busy ? Loader2 : active ? BellRing : Bell;

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={busy}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition-colors disabled:opacity-60",
          active
            ? "border-savings/50 bg-savings/10 text-savings"
            : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <Icon className={cn("h-3 w-3", busy && "animate-spin")} aria-hidden />
        {active ? "Alerta ativo" : "Avisar se baixar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={busy}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md transition-colors disabled:opacity-60",
        active
          ? "bg-savings/15 text-savings hover:bg-savings/25"
          : "bg-muted text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", busy && "animate-spin")} aria-hidden />
    </button>
  );
}
