import { Bell, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatShortDate, formatAbsoluteTooltip } from "@/components/product/TrustIndicator";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { ProductImage } from "@/components/ds/ProductImage";

const brl = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "BRL" }).format(n);

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
  const formattedDate = lastDate ? formatShortDate(lastDate) : null;
  const absoluteDate = lastDate ? formatAbsoluteTooltip(lastDate) : "";

  return (
    <Card interactive tabIndex={0} className={cn("group h-full", className)}>
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="mb-2 h-24 w-full overflow-hidden rounded-lg border border-border bg-muted/20">
          <ProductImage src={null} name={name} alt={name} size="md" />
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">
            {name}
          </h3>
          {category ? (
            <Badge variant="outline" className="shrink-0 text-[11px]">
              {category}
            </Badge>
          ) : null}
        </div>
        {brand ? (
          <div className="text-[11px] text-muted-foreground">{brand}</div>
        ) : null}
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <Price value={price} size="lg" tone="best" />
          {pricePerUnit != null && unit ? (
            <Price value={pricePerUnit} size="xs" tone="muted" suffix={unit} />
          ) : null}
        </div>
        {(formattedDate || onAlert || onHistory) && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span title={absoluteDate}>{formattedDate ? `Atualizado em ${formattedDate}` : ""}</span>
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
                  aria-label={`Ver histórico de preços de ${name}`}
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
