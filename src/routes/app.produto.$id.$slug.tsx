import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { 
  ArrowLeft, 
  Clock, 
  Store as StoreIcon, 
  TrendingDown, 
  TrendingUp,
  MapPin,
  Tag,
  ChevronRight,
  History as HistoryIcon
} from "lucide-react";
import { 
  getPublicProductDetail, 
  getCrossStoreComparison,
  type PricePoint,
  type CrossStoreOffer
} from "@/lib/stores-public.functions";
import { Price } from "@/components/ds/Price";
import { ProductImage } from "@/components/product/ProductImage";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/layout";
import { queryOptions } from "@tanstack/react-query";

const productQuery = (storeId: string, slug: string) =>
  queryOptions({
    queryKey: ["public-product", storeId, slug],
    queryFn: () => getPublicProductDetail({ data: { storeId, slug } }),
    staleTime: 30_000,
  });

const compareQuery = (storeId: string, slug: string) =>
  queryOptions({
    queryKey: ["public-product-compare", storeId, slug],
    queryFn: () => getCrossStoreComparison({ data: { storeId, slug } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/app/produto/$id/$slug")({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(productQuery(params.id, params.slug));
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Detalhes do Produto — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <AppShell>
        <ProductDetailDashboard />
      </AppShell>
    </ProtectedGate>
  ),
});

function ProductDetailDashboard() {
  const { id, slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(id, slug));
  const { store, product, history, variations } = data;
  const { data: compareData } = useQuery(compareQuery(id, slug));

  const trend =
    history.length >= 2
      ? history[history.length - 1].price - history[0].price
      : 0;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.productName}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <StoreIcon className="h-3.5 w-3.5" />
            {store.name} · {store.city}/{store.state}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard className="overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 p-1">
              <div className="w-full md:w-48 h-48 shrink-0 rounded-xl overflow-hidden border bg-muted/30">
                <ProductImage 
                  src={product.imageUrl} 
                  alt={product.productName} 
                  width={200} 
                  height={200} 
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {product.category}
                    </span>
                    {product.brand && (
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <Price value={product.price} size="2xl" className="font-black" />
                    {product.pricePerUnit && product.unitLabel && (
                      <p className="text-sm text-muted-foreground font-medium">
                        ({product.unitLabel} <Price value={product.pricePerUnit} size="xs" inline />)
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Visto {fmtRelative(product.lastDate)}</span>
                    {trend !== 0 && (
                      <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs ${trend < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {Math.abs((trend / (product.price - trend)) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Stat label="Mínimo" value={product.minPrice} tone="success" />
                  <Stat label="Média" value={product.avgPrice} />
                  <Stat label="Máximo" value={product.maxPrice} tone="destructive" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* History */}
          <SectionCard title="Histórico de Preço" icon={HistoryIcon}>
            <div className="pt-4">
              <Sparkline points={history} />
              <div className="mt-6 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Data</th>
                      <th className="px-4 py-2 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...history].reverse().slice(0, 8).map((h, i) => (
                      <tr key={`${h.date}-${i}`} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{new Date(h.date).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-2 text-right font-bold"><Price value={h.price} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Comparison */}
          <SectionCard title="Onde comprar" icon={MapPin}>
            <div className="space-y-3 pt-2">
              {compareData && compareData.length > 0 ? (
                compareData.map((offer) => (
                  <div key={offer.storeId} className="group flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/40 transition-all">
                    <div className="h-10 w-10 shrink-0 rounded-lg border bg-background grid place-items-center overflow-hidden">
                      {offer.storeLogoUrl ? (
                        <img src={offer.storeLogoUrl} alt={offer.storeName} className="h-full w-full object-cover" />
                      ) : (
                        <StoreIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate leading-tight">{offer.storeName}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        {offer.storeCity} · {fmtDate(offer.lastDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Price value={offer.price} size="sm" className="font-black" tone={offer.storeId === id ? "default" : offer.price < product.price ? "best" : "default"} />
                      {offer.storeId === id && <span className="text-[9px] font-bold uppercase text-primary">Atual</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum outro estabelecimento encontrado.</p>
              )}
            </div>
          </SectionCard>

          {/* Variations */}
          {variations.length > 0 && (
            <SectionCard title="Variações" icon={Tag}>
              <div className="space-y-2 pt-2">
                {variations.map((v) => (
                  <Link 
                    key={v.slug} 
                    to="/app/produto/$id/$slug" 
                    params={{ id, slug: v.slug }}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{v.productName}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{v.unit || "—"}</p>
                    </div>
                    <Price value={v.price} size="sm" className="font-black" />
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | null | undefined; tone?: "success" | "destructive" }) {
  return (
    <div className="p-3 rounded-xl border bg-muted/20 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <Price value={value} size="md" className="font-black" tone={tone === "success" ? "best" : tone === "destructive" ? "muted" : "default"} />
    </div>
  );
}

function Sparkline({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed">Histórico insuficiente</div>;
  
  const w = 500;
  const h = 100;
  const prices = points.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  
  const path = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p.price - min) / range) * (h - 20) - 10;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  return (
    <div className="relative h-[120px] w-full pt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={3} className="text-primary" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * step} cy={h - ((p.price - min) / range) * (h - 20) - 10} r={4} className="fill-background stroke-primary stroke-[3px]" />
        ))}
      </svg>
    </div>
  );
}

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const d = Math.floor(diff / day);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  if (d < 30) return `há ${Math.floor(d / 7)} semana(s)`;
  return `há ${Math.floor(d / 30)} mês(es)`;
};