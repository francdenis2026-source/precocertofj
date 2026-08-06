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
        {!compact && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />}
        <XAxis 
          dataKey="date" 
          hide={compact}
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="#888888"
        />
        <YAxis 
          hide={compact} 
          fontSize={10}
          tickLine={false}
          axisLine={false}
          stroke="#888888"
          domain={['auto', 'auto']}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const value = Number(payload[0].value);
              return (
                <div className="rounded-lg border bg-background p-2 shadow-md text-[10px] space-y-1">
                  <p className="font-bold">{payload[0].payload.date}</p>
                  <p className="text-primary">R$ {value?.toFixed(2)}</p>
                  <p className="text-muted-foreground truncate max-w-[120px]">{payload[0].payload.market}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="var(--color-primary)" 
          strokeWidth={compact ? 2 : 3} 
          dot={!compact}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
