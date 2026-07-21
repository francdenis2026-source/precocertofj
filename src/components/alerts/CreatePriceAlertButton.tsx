import { useState } from "react";
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
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAlertSubscription,
  type AlertDirection,
} from "@/lib/price-alerts.functions";
import { listPublicStores } from "@/lib/stores-public.functions";

/**
 * Botão que abre um diálogo para criar uma assinatura de alerta de variação
 * de preço para um produto (opcionalmente restrito a um mercado).
 */
export function CreatePriceAlertButton({
  productKey,
  productName,
  displayName,
  defaultEstablishmentId,
}: {
  productKey?: string;
  productName?: string;
  displayName?: string;
  defaultEstablishmentId?: string | null;
}) {
  const create = useServerFn(createAlertSubscription);
  const listStores = useServerFn(listPublicStores);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<AlertDirection>("drop");
  const [thresholdPct, setThresholdPct] = useState<string>("5");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [establishmentId, setEstablishmentId] = useState<string>(
    defaultEstablishmentId ?? "any",
  );

  const storesQuery = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listStores(),
    enabled: open,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          productKey,
          productName,
          displayName: displayName ?? productName ?? null,
          establishmentId: establishmentId === "any" ? null : establishmentId,
          direction,
          thresholdPct: Number(thresholdPct) || 5,
          targetPrice: targetPrice ? Number(targetPrice) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Alerta criado — você será avisado quando bater o limite");
      qc.invalidateQueries({ queryKey: ["price-alert-subs"] });
      setOpen(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao criar alerta"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Criar alerta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alerta de variação</DialogTitle>
          <DialogDescription>
            Avisamos quando o preço de{" "}
            <strong>{displayName ?? productName ?? "este produto"}</strong>{" "}
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
