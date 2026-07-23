import { Bell, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export interface ProductListCardProps {
  name: string;
  category?: string | null;
  brand?: string | null;
  price: number;
  pricePerUnit?: number | null;
  unitLabel?: string | null;
  lastDate?: string | Date | null;
  onHistory?: () => void;
  onAlert?: () => void;
  className?: string;
}

/**
 * Cartão padrão para listagem de produtos em páginas públicas de estabelecimento.
 * Inclui hover, foco visível e ações opcionais de alerta/histórico.
 */
export function ProductListCard({
  name,
  category,
  brand,
  price,
  pricePerUnit,
  unitLabel,
  lastDate,
  onHistory,
  onAlert,
  className,
}: ProductListCardProps) {
  const unit = unitLabel ? unitLabel.replace("R$", "").trim() || unitLabel : null;
  const formattedDate = lastDate
    ? new Date(lastDate).toLocaleDateString("pt-BR")
    : null;

  return (
    <Card interactive tabIndex={0} className={cn("group h-full", className)}>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">
            {name}
          </h3>
          {category ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {category}
            </Badge>
          ) : null}
        </div>
        {brand ? (
          <div className="text-[11px] text-muted-foreground">{brand}</div>
        ) : null}
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {brl(price)}
          </span>
          {pricePerUnit != null && unit ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {brl(pricePerUnit)} {unit}
            </span>
          ) : null}
        </div>
        {(formattedDate || onAlert || onHistory) && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formattedDate ? `Atualizado ${formattedDate}` : ""}</span>
            <div className="flex items-center gap-1">
              {onAlert ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAlert();
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  title="Criar alerta de queda de preço"
                  aria-label={`Criar alerta de preço para ${name}`}
                >
                  <Bell className="h-3 w-3" /> Alerta
                </button>
              ) : null}
              {onHistory ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHistory();
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Ver histórico de preço de ${name}`}
                >
                  <History className="h-3 w-3" /> Histórico
                </button>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
