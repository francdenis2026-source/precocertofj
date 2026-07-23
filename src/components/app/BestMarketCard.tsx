import { Sparkles } from "lucide-react";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { IconTile } from "@/components/ui/icon-tile";
import { brl } from "@/lib/format";

interface BestMarketCardProps {
  marketName: string | null;
  total: number | null;
  storeNames: Set<string>;
  onOpenStore: (name: string) => void;
}

export function BestMarketCard({
  marketName,
  total,
  storeNames,
  onOpenStore,
}: BestMarketCardProps) {
  const hasStore =
    marketName !== null && storeNames.has(marketName.trim().toLowerCase());

  return (
    <PanelCard
      eyebrow="Recomendado"
      title={
        <span className="inline-flex items-center gap-2.5">
          <IconTile icon={Sparkles} size="sm" tone="accent" density="compact" />
          Melhor mercado
        </span>
      }
      className="hairline-gold border-savings/40"
    >
      {marketName ? (
        <>
          {hasStore ? (
            <button
              type="button"
              onClick={() => onOpenStore(marketName)}
              className="block rounded-md text-left font-display text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Abrir detalhes de ${marketName}`}
            >
              {marketName}
            </button>
          ) : (
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground">{marketName}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Melhor mercado para levar seus favoritos —{" "}
            <span className="font-mono text-foreground">{brl(total ?? 0)}</span>
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Favorite produtos para receber uma recomendação de mercado.
        </p>
      )}
    </PanelCard>
  );
}
