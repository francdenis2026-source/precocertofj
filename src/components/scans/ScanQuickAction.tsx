import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera } from "lucide-react";
import { listEstablishments } from "@/lib/establishments.functions";
import { getLastScanByEstablishment } from "@/lib/scan-quick-edit.functions";
import { PhotoScanDialog } from "./PhotoScanDialog";
import {
  LastScanQuickEdit,
  type LastScanSummary,
} from "./LastScanQuickEdit";

/**
 * Ação rápida (admin): seleciona um mercado, abre o scanner por foto
 * e mostra o card de edição rápida do último item inserido. O último scan
 * é persistido no banco — sobrevive a refresh/login.
 */
export function ScanQuickAction() {
  const listFn = useServerFn(listEstablishments);
  const lastFn = useServerFn(getLastScanByEstablishment);
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<LastScanSummary | null>(null);

  const { data: ests } = useQuery({
    queryKey: ["admin", "establishments", "for-scan"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });

  const lastQuery = useQuery({
    queryKey: ["admin", "last-scan", establishmentId],
    queryFn: () => lastFn({ data: { establishmentId } }),
    enabled: !!establishmentId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (lastQuery.data) {
      setLast({
        id: lastQuery.data.id,
        productName: lastQuery.data.productName,
        priceCaptured: lastQuery.data.priceCaptured,
        storeName: lastQuery.data.storeName ?? undefined,
        createdAt: lastQuery.data.createdAt,
      });
    } else if (lastQuery.data === null) {
      setLast(null);
    }
  }, [lastQuery.data]);

  const selected = ests?.find((e) => e.id === establishmentId);


  return (
    <div className="rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/5 via-card to-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brass">
            Escanear por foto
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            IA detecta produto + preço. Possíveis duplicatas pedem confirmação antes de gravar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={establishmentId} onValueChange={setEstablishmentId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecione o mercado…" />
            </SelectTrigger>
            <SelectContent>
              {(ests ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!establishmentId}
            onClick={() => setOpen(true)}
            className="bg-brass text-brass-foreground hover:bg-brass/90"
          >
            <Camera className="mr-2 h-4 w-4" /> Escanear
          </Button>
        </div>
      </div>

      {last && (
        <div className="mt-4">
          <LastScanQuickEdit scan={last} onUpdated={() => {}} />
        </div>
      )}

      <PhotoScanDialog
        open={open}
        onOpenChange={setOpen}
        establishmentId={establishmentId}
        storeName={selected?.name}
        onInserted={({ productName, scanId, price }) =>
          setLast({
            id: scanId,
            productName,
            priceCaptured: price,
            storeName: selected?.name,
            createdAt: new Date().toISOString(),
          })
        }
      />
    </div>
  );
}
