import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getInsightsData } from "@/lib/insights.functions";
import { 
  PageHeader, 
  SectionCard, 
  StatGrid,
  type Stat
} from "@/components/layout";
import { 
  TrendingDown, 
  Zap, 
  MapPin, 
  ChevronRight, 
  ArrowRight,
  Bell,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ds/Price";
import { ListRowsSkeleton } from "@/components/feedback";

export const Route = createFileRoute("/app/insights")({
  head: () => ({
    meta: [
      { title: "Insights & Economia — PreçoCerto" },
      { name: "description", content: "Veja quanto você economizou e descubra as melhores rotas de compra." },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <InsightsPage />
    </ProtectedGate>
  ),
});

function InsightsPage() {
  const fetchInsights = useServerFn(getInsightsData);
  const { data, isLoading } = useQuery({
    queryKey: ["app-insights"],
    queryFn: () => fetchInsights(),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <PageHeader title="Calculando seus insights..." />
          <ListRowsSkeleton rows={5} />
        </div>
      </AppShell>
    );
  }

  const stats: Stat[] = [
    { 
      label: "Total Economizado", 
      value: `R$ ${data?.savingsSummary.totalSaved.toFixed(2).replace(".", ",")}`, 
      icon: Wallet, 
      tone: "success" 
    },
    { 
      label: "Potencial de Economia", 
      value: `R$ ${data?.savingsSummary.potentialNextMonth.toFixed(2).replace(".", ",")}`, 
      icon: Zap, 
      tone: "warning" 
    },
    { 
      label: "Eficiência de Compra", 
      value: `${data?.savingsSummary.savedPercentage.toFixed(0)}%`, 
      icon: TrendingDown, 
      tone: "primary" 
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Insights de Economia"
          description="Análise profunda do seu consumo e sugestões inteligentes para economizar mais."
          actions={
            <Button asChild size="sm" variant="outline">
              <Link to="/app/alertas">
                <Bell className="mr-2 h-4 w-4" />
                Alertas Ativos
              </Link>
            </Button>
          }
        />

        <StatGrid stats={stats} className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Rotas de Compra Sugeridas
            </h2>
            
            {data?.suggestedRoutes.map((route) => (
              <SectionCard 
                key={route.id}
                title={route.storeName}
                description={`Economia estimada de R$ ${route.totalSaving.toFixed(2).replace(".", ",")}`}
                className="pc-animate-fade-in"
              >
                <div className="space-y-3">
                  {route.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <div className="text-right">
                        <Price value={item.price} className="font-bold" />
                        <span className="ml-2 text-[10px] text-green-500 font-bold uppercase">Poupa R$ {item.saving.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between items-center font-bold">
                    <span>Total da Rota</span>
                    <Price value={route.totalPrice} className="text-primary" />
                  </div>
                  <Button className="w-full mt-2" variant="outline" size="sm">
                    Ver no Mapa <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </SectionCard>
            ))}
          </div>

          <div className="space-y-6">
             <SectionCard 
              title="Configurar Alertas" 
              description="Receba avisos quando os preços caírem na sua região."
            >
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium">Alertas de Proximidade</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notificaremos você automaticamente quando um favorito atingir o preço meta em mercados próximos.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/app/alertas">Gerenciar Alertas</Link>
                </Button>
              </div>
            </SectionCard>

            <SectionCard 
              title="Acompanhamento" 
              description="Produtos que você está monitorando no momento."
            >
              <div className="text-center py-4">
                <TrendingDown className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                <p className="text-sm font-medium">{data?.alertsCount} itens ativos</p>
                <Link to="/app/produtos" className="text-xs text-primary font-bold hover:underline block mt-2">
                  Adicionar mais produtos
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
