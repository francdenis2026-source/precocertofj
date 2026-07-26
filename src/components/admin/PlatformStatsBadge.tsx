import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Store, ScanLine } from "lucide-react";
import { getPlatformItemStats } from "@/lib/platform-stats.functions";

/**
 * Badge com a contagem de itens (produtos, scans, mercados) da plataforma.
 * Usado no header do painel administrativo de catálogo.
 */
export function PlatformStatsBadge() {
  const statsFn = useServerFn(getPlatformItemStats);
  const query = useQuery({
    queryKey: ["platform-item-stats"],
    queryFn: () => statsFn(),
    staleTime: 60_000,
  });

  const s = query.data;
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatChip
        icon={<Boxes className="h-3.5 w-3.5" />}
        label="Produtos"
        value={s ? fmt(s.productCount) : "…"}
      />
      <StatChip
        icon={<ScanLine className="h-3.5 w-3.5" />}
        label="Scans"
        value={s ? fmt(s.scanCount) : "…"}
      />
      <StatChip
        icon={<Store className="h-3.5 w-3.5" />}
        label="Mercados"
        value={s ? fmt(s.establishmentCount) : "…"}
      />
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs">
      <span className="text-primary">{icon}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="uppercase tracking-widest text-[11px] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
