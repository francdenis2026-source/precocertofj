import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductPriceSeries } from "@/lib/price-history.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PriceHistoryChart({ productName, compact = false }: { productName: string; compact?: boolean }) {
  const fetchSeries = useServerFn(getProductPriceSeries);
  const { data: series, isLoading } = useQuery({
    queryKey: ["price-series", productName],
    queryFn: () => fetchSeries({ data: { productName } }),
    enabled: !!productName,
  });

  if (isLoading) return <Skeleton className="w-full h-full" />;
  if (!series || series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Histórico indisponível
      </div>
    );
  }

  const data = series.map((p) => ({
    date: format(new Date(p.date), "dd/MM", { locale: ptBR }),
    price: p.price,
    market: p.marketName,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        {!compact && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />}
        <XAxis 
          dataKey="date" 
          hide={compact}
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="var(--text-tertiary)"
          dy={10}
        />
        <YAxis 
          hide={compact} 
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="var(--text-tertiary)"
          domain={['auto', 'auto']}
          dx={-10}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const value = Number(payload[0].value);
              return (
                <div className="pc-card p-3 shadow-xl ring-1 ring-[var(--border-subtle)] bg-[var(--bg-surface)] min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">{payload[0].payload.date}</p>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-sm font-black text-[var(--brand-primary)]">R$</span>
                    <span className="text-lg font-black text-[var(--text-primary)] tracking-tighter">{value?.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] truncate flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                    {payload[0].payload.market}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="var(--brand-primary)" 
          strokeWidth={compact ? 2.5 : 4} 
          dot={!compact ? { r: 4, fill: "var(--brand-primary)", strokeWidth: 2, stroke: "var(--bg-surface)" } : false}
          activeDot={{ r: 6, fill: "var(--brand-primary)", strokeWidth: 3, stroke: "var(--bg-surface)" }}
          animationDuration={1500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
