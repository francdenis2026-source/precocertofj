import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkline } from "@/components/charts/Sparkline";
import { brl } from "@/lib/format";
import {
  getCrossMarketHistory,
  type CrossMarketHistory,
} from "@/lib/cross-market-history.functions";
import { Store, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { CreatePriceAlertButton } from "@/components/alerts/CreatePriceAlertButton";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName?: string;
  productKey?: string;
};

/**
 * Drawer que mostra o histórico de preços de um produto entre diferentes mercados.
 * Reaproveitado no admin (após inserir scan), na página de produto e no lojista.
 */
export function PriceHistoryDrawer({
  open,
  onOpenChange,
  productName,
  productKey,
}: Props) {
  const fetchHistory = useServerFn(getCrossMarketHistory);
  const [state, setState] = useState<CrossMarketHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!productName && !productKey) return;
    setLoading(true);
    setErr(null);
    fetchHistory({ data: { productName, productKey } })
      .then(setState)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open, productName, productKey, fetchHistory]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {state?.displayName ?? productName ?? "Histórico entre mercados"}
          </SheetTitle>
          <SheetDescription>
            Comparação de preços do mesmo produto em diferentes mercados.
          </SheetDescription>
        </SheetHeader>

        {(productName || state?.productKey) && (
          <div className="mt-4">
            <CreatePriceAlertButton
              productKey={state?.productKey || productKey}
              productName={productName}
              displayName={state?.displayName ?? productName}
            />
          </div>
        )}



        {loading && (
          <p className="mt-6 text-sm text-muted-foreground">Carregando histórico…</p>
        )}
        {err && (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {err}
          </p>
        )}

        {state && !loading && (
          <>
            {state.markets.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Ainda não há registros suficientes deste produto em outros mercados.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3">
                  <Stat label="Mín" value={state.overallMin} tone="savings" />
                  <Stat label="Média" value={state.overallAvg} tone="primary" />
                  <Stat label="Máx" value={state.overallMax} tone="destructive" />
                </div>

                <ul className="space-y-2">
                  {state.markets.map((m, idx) => {
                    const trend =
                      m.points.length >= 2
                        ? m.points[m.points.length - 1].price - m.points[0].price
                        : 0;
                    const Icon = trend < 0 ? TrendingDown : trend > 0 ? TrendingUp : Minus;
                    return (
                      <li
                        key={m.establishmentId}
                        className="rounded-2xl border border-border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-sm font-medium">
                              <Store className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{m.storeName}</span>
                              {idx === 0 && (
                                <span className="ml-1 rounded-full bg-savings/15 px-1.5 py-0.5 text-[11px] font-bold uppercase text-savings">
                                  Mais barato
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {m.samples} registro{m.samples > 1 ? "s" : ""} · última em{" "}
                              {new Date(m.lastSeenAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-lg font-bold">
                              {brl(m.lastPrice)}
                            </p>
                            <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                              <Icon className="h-3 w-3" />
                              {brl(m.minPrice)} — {brl(m.maxPrice)}
                            </p>
                          </div>
                        </div>
                        {m.points.length >= 2 && (
                          <div className="mt-2">
                            <Sparkline
                              points={m.points}
                              width={280}
                              height={36}
                              className="w-full"
                              ariaLabel={`Evolução em ${m.storeName}`}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "savings" | "primary" | "destructive";
}) {
  const cls =
    tone === "savings"
      ? "text-savings"
      : tone === "destructive"
        ? "text-destructive"
        : "text-primary";
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-base font-bold ${cls}`}>
        {value === null ? "—" : brl(value)}
      </p>
    </div>
  );
}
