/**
 * Card de ativação rápida dos alertas de MENOR PREÇO por região.
 *
 * Cria, em lote, assinaturas do tipo "só quando cair" para todos os produtos
 * favoritados do usuário, restritas ao bairro/cidade do perfil — de modo que o
 * aviso só chegue quando o item ficar mais barato em um estabelecimento
 * próximo. A operação é idempotente (favoritos já monitorados são ignorados).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enableNearbyDropAlertsForFavorites } from "@/lib/price-alerts.functions";
import { getMyAccount } from "@/lib/account.functions";

type Scope = "neighborhood" | "city" | "any";

export function NearbyDropAlertsCard() {
  const enableFn = useServerFn(enableNearbyDropAlertsForFavorites);
  const accountFn = useServerFn(getMyAccount);
  const qc = useQueryClient();

  const [scope, setScope] = useState<Scope>("neighborhood");
  const [thresholdPct, setThresholdPct] = useState("5");

  const accountQuery = useQuery({
    queryKey: ["my-account-area"],
    queryFn: () => accountFn(),
    staleTime: 5 * 60_000,
  });
  const district = accountQuery.data?.address?.district ?? null;
  const city = accountQuery.data?.address?.city ?? null;

  const mutation = useMutation({
    mutationFn: () =>
      enableFn({ data: { scope, thresholdPct: Number(thresholdPct) || 5 } }),
    onSuccess: (r) => {
      if (r.created === 0) {
        toast.info(
          r.skipped > 0
            ? "Seus favoritos já estão monitorados."
            : "Favorite produtos para ativar os alertas de menor preço.",
        );
      } else {
        toast.success(
          `${r.created} produto(s) monitorado(s)${r.scope ? ` em ${r.scope}` : ""}.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["price-alert-subs"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao ativar alertas"),
  });

  const scopeHint =
    scope === "neighborhood"
      ? district
        ? `Somente em ${district}${city ? ` — ${city}` : ""}`
        : "Cadastre seu bairro no perfil para restringir por bairro."
      : scope === "city"
        ? city
          ? `Toda a cidade de ${city}`
          : "Cadastre sua cidade no perfil."
        : "Qualquer estabelecimento cadastrado";

  return (
    <SectionCard
      title="Alertas de menor preço perto de você"
      description="Avisamos no app quando um produto que você acompanha ficar mais barato em um estabelecimento da sua região."
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Região
          </Label>
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neighborhood">Meu bairro</SelectItem>
              <SelectItem value="city">Minha cidade</SelectItem>
              <SelectItem value="any">Qualquer lugar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Sensibilidade da queda
          </Label>
          <Select value={thresholdPct} onValueChange={setThresholdPct}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Qualquer queda (1%)</SelectItem>
              <SelectItem value="5">Quedas relevantes (5%)</SelectItem>
              <SelectItem value="10">Só quedas fortes (10%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-1.5"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          Ativar para meus favoritos
        </Button>
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
        {scopeHint}
      </p>
    </SectionCard>
  );
}
