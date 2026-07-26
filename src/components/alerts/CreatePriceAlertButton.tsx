import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  createAlertSubscription,
  type AlertDirection,
} from "@/lib/price-alerts.functions";
import { listPublicStores } from "@/lib/stores-public.functions";
import { getMyAccount } from "@/lib/account.functions";

/**
 * Botão que abre um diálogo para criar uma assinatura de alerta de variação
 * de preço para um produto. Aceita restrição por mercado e/ou por bairro/cidade
 * (por padrão, sugere o bairro e a cidade cadastrados no perfil).
 */
export function CreatePriceAlertButton({
  productKey,
  productName,
  displayName,
  defaultEstablishmentId,
  defaultDirection = "drop",
  defaultThresholdPct = 5,
  defaultTargetPrice,
  categoryLabel,
  triggerLabel = "Criar alerta",
  triggerClassName,
  compact = false,
}: {
  productKey?: string;
  productName?: string;
  displayName?: string;
  defaultEstablishmentId?: string | null;
  /** Direção pré-selecionada do alerta. */
  defaultDirection?: AlertDirection;
  /** Sensibilidade/frequência pré-selecionada (em % de variação). */
  defaultThresholdPct?: number;
  /** Preço-alvo sugerido (ex.: melhor preço atual do produto). */
  defaultTargetPrice?: number | null;
  /** Categoria do produto, exibida como contexto no diálogo. */
  categoryLabel?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Gatilho enxuto (chip) para uso dentro de cards de resultado. */
  compact?: boolean;
}) {
  const create = useServerFn(createAlertSubscription);
  const listStores = useServerFn(listPublicStores);
  const getAccount = useServerFn(getMyAccount);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<AlertDirection>(defaultDirection);
  const [thresholdPct, setThresholdPct] = useState<string>(String(defaultThresholdPct));
  const [targetPrice, setTargetPrice] = useState<string>(
    defaultTargetPrice != null ? String(defaultTargetPrice.toFixed(2)) : "",
  );

  const [establishmentId, setEstablishmentId] = useState<string>(
    defaultEstablishmentId ?? "any",
  );
  const [scopeMode, setScopeMode] = useState<"any" | "area">("any");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const storesQuery = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listStores(),
    enabled: open,
    staleTime: 60_000,
  });

  const accountQuery = useQuery({
    queryKey: ["my-account-area"],
    queryFn: () => getAccount(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const addr = accountQuery.data?.address;
    if (!addr) return;
    setNeighborhood((v) => v || addr.district || "");
    setCity((v) => v || addr.city || "");
  }, [open, accountQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          productKey,
          productName,
          displayName: displayName ?? productName ?? null,
          establishmentId: establishmentId === "any" ? null : establishmentId,
          scopeNeighborhood:
            scopeMode === "area" && neighborhood.trim() ? neighborhood.trim() : null,
          scopeCity:
            scopeMode === "area" && city.trim() ? city.trim() : null,
          direction,
          thresholdPct: Number(thresholdPct) || 5,
          targetPrice: targetPrice ? Number(targetPrice) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Alerta ativado — avisaremos quando o preço mudar");
      qc.invalidateQueries({ queryKey: ["price-alert-subs"] });
      setOpen(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao criar alerta"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            className={
              triggerClassName ??
              "inline-flex h-6 items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--brand-gold)_45%,transparent)] bg-background px-2 text-[10.5px] font-semibold text-[var(--pc-gold-ink)] transition hover:bg-[color-mix(in_oklab,var(--brand-gold)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            }
          >
            <Bell className="h-3 w-3" aria-hidden="true" />
            {triggerLabel}
          </button>
        ) : (
          <Button size="sm" variant="outline" className={triggerClassName ?? "gap-1.5"}>
            <Bell className="h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alerta de variação</DialogTitle>
          <DialogDescription>
            Avisamos quando o preço de{" "}
            <strong>{displayName ?? productName ?? "este produto"}</strong>
            {categoryLabel ? ` (${categoryLabel})` : ""}{" "}
            variar acima do limite escolhido.
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-3">
          <div>
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Direção
            </Label>
            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as AlertDirection)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop">Só quando cair</SelectItem>
                <SelectItem value="rise">Só quando subir</SelectItem>
                <SelectItem value="both">Cair ou subir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Frequência dos avisos
            </Label>
            <Select
              value={
                Number(thresholdPct) <= 1
                  ? "1"
                  : Number(thresholdPct) <= 5
                    ? "5"
                    : Number(thresholdPct) <= 10
                      ? "10"
                      : "15"
              }
              onValueChange={setThresholdPct}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Toda variação (a partir de 1%)</SelectItem>
                <SelectItem value="5">Variações relevantes (5%)</SelectItem>
                <SelectItem value="10">Só variações fortes (10%)</SelectItem>
                <SelectItem value="15">Apenas grandes variações (15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Limite (%)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={thresholdPct}
                onChange={(e) => setThresholdPct(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Preço-alvo (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Opcional"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Mercado
            </Label>
            <Select value={establishmentId} onValueChange={setEstablishmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os mercados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todos os mercados</SelectItem>
                {(storesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Restringir à minha região</span>
              </div>
              <Select
                value={scopeMode}
                onValueChange={(v) => setScopeMode(v as "any" | "area")}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer região</SelectItem>
                  <SelectItem value="area">Meu bairro/cidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scopeMode === "area" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Bairro
                  </Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex.: Centro"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Cidade
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex.: Feijó"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ativar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
