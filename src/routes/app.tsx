import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getAppDashboard } from "@/lib/dashboard.functions";
import { 
  PageHeader, 
  SectionCard, 
  StatGrid, 
  type Stat 
} from "@/components/layout";
import { 
  History, 
  Star, 
  Bell, 
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Package,
  Store,
  Tag,
  Search,
  ShoppingCart,
  Zap,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/ProductImage";
import { Price } from "@/components/ds/Price";
import { ListRowsSkeleton, EmptyState } from "@/components/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — PreçoCerto" },
      { name: "description", content: "Resumo da sua atividade, economia e alertas de preço." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <DashboardPage />
    </ProtectedGate>
  ),
});

function DashboardPage() {
  const fetchDashboard = useServerFn(getAppDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["app-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const stats: Stat[] = [
    { 
      label: "Economia (90d)", 
      value: data ? `R$ ${data.stats.totalSavings.toFixed(2).replace(".", ",")}` : "...", 
      icon: TrendingDown, 
      tone: "success",
      hint: data?.stats.potentialSavings && data.stats.potentialSavings > 0 
        ? `Poderia poupar R$ ${data.stats.potentialSavings.toFixed(2).replace(".", ",")}` 
        : undefined
    },
    { 
      label: "Favoritos", 
      value: data?.stats.favoritesCount ?? "...", 
      icon: Star, 
      tone: "primary" 
    },
    { 
      label: "Alertas ativos", 
      value: data?.recentAlerts.filter(a => !a.readAt).length ?? "...", 
      icon: Bell, 
      tone: "warning" 
    },
    { 
      label: "Contribuições", 
      value: data?.stats.contributionsCount ?? "...", 
      icon: Package 
    },
  ];

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <PageHeader title="Carregando painel..." />
          <div className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl border animate-pulse bg-muted/50" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ListRowsSkeleton rows={4} />
              <ListRowsSkeleton rows={4} />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Meu Painel"
          description="Aqui você acompanha seus produtos, quanto economizou e seus avisos de preço."
          actions={
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/app/insights">
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Insights
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/estabelecimentos">
                  <Store className="mr-2 h-4 w-4" />
                  Ver comércios
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/comparacoes">
                  <Scale className="mr-2 h-4 w-4" />
                  Comparativos
                </Link>
              </Button>
            </div>

          }
        />

        <StatGrid stats={stats} className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nova Seção de Insights Rápidos */}
          <SectionCard 
            title="Insights & Economia" 
            description="Veja onde você está economizando mais este mês em Feijó."
            className="lg:col-span-2 pc-animate-fade-in border-none bg-white text-[#1A1A2E] shadow-sm rounded-[32px] overflow-hidden"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-[var(--brand-primary)]">
                <Link to="/app/insights">Ver Relatório Completo <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-2">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Eficiência de Compra</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#1A1A2E]">84%</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">+5% este mês</span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-[var(--brand-primary)] rounded-full" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Melhor Localidade</p>
                <p className="font-display text-lg font-bold leading-tight text-[#1A1A2E]">Varejão Contamigos</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-wider">
                  <TrendingUp className="h-3 w-3" />
                  <span>R$ 42,50 Poupados</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Meta de Notas</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#1A1A2E]">8 / 10 Notas</p>
                  <span className="text-[10px] font-black text-muted-foreground uppercase">80%</span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full w-[80%] bg-[var(--brand-primary)] rounded-full" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Tracked Products */}
          <SectionCard 
            title="Produtos que eu sigo" 
            description="Seus itens favoritos e quanto estão custando hoje."
            className="pc-animate-fade-in [animation-delay:100ms]"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-wider">
                <Link to="/favoritos">Ver todos <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            }
          >
            {data?.trackedItems.length === 0 ? (
              <EmptyState 
                icon={Star} 
                title="Sem favoritos" 
                message="Marque o coração nos produtos para acompanhar os preços aqui." 
                action={<Button asChild variant="outline" size="sm"><Link to="/precos">Buscar produtos</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-border">
                {data?.trackedItems.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <Link 
                      to="/app/produto/$id/$slug" 
                      params={{ id: item.lastEstablishmentId || "catalogo", slug: item.catalogSlug }} 

                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <ProductImage src={item.imageUrl} alt={item.displayName} width={40} height={40} className="rounded-md border bg-muted/30" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.displayName}</p>
                        <p className="text-xs text-muted-foreground">{item.brand || "—"}</p>
                      </div>
                      <div className="text-right">
                        <Price value={item.currentPrice} className="text-sm font-bold" />
                        {item.targetPrice && (
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Meta: R$ {item.targetPrice.toFixed(2).replace(".", ",")}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Recent Alerts */}
          <SectionCard 
            title="Avisos recentes" 
            description="Mensagens de quando o preço baixou ou atingiu sua meta."
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/alertas">Gerenciar <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            }
          >
            {data?.recentAlerts.length === 0 ? (
              <EmptyState 
                icon={Bell} 
                title="Sem alertas recentes" 
                message="A gente te avisa quando os preços dos seus produtos favoritos baixarem." 
              />
            ) : (
              <ul className="space-y-3">
                {data?.recentAlerts.map((alert) => (
                  <li 
                    key={alert.id} 
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 transition-colors",
                      !alert.readAt ? "border-primary/20 bg-primary/5" : "bg-card"
                    )}
                  >
                    <Link 
                      to="/app/produto/$id/$slug" 
                      params={{ id: alert.establishmentId || "catalogo", slug: alert.productSlug || "" }}

                      className="flex w-full gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {alert.kind === "item_target_hit" ? <Tag className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{alert.displayName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {alert.marketName ? `No ${alert.marketName}: ` : ""}
                          <span className="font-bold text-foreground">
                            R$ {alert.newPrice?.toFixed(2).replace(".", ",")}
                          </span>
                          {alert.diffPct && (
                            <span className="ml-1 text-neon font-bold">(-{alert.diffPct.toFixed(0)}%)</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Recent History */}
          <SectionCard 
            title="Coisas que vi antes" 
            description="Últimos produtos que você olhou ou registrou."
            className="lg:col-span-2"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/historico">Ver histórico completo <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            }
          >
            {data?.recentScans.length === 0 ? (
              <EmptyState 
                icon={History} 
                title="Nenhum registro" 
                message="Busque ou registre um produto para ele aparecer aqui." 
                action={<Button asChild variant="outline" size="sm"><Link to="/precos">Começar busca</Link></Button>}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data?.recentScans.map((scan) => (
                    <Link 
                      key={scan.id} 
                      to="/app/produto/$id/$slug" 
                      params={{ id: scan.establishmentId || "catalogo", slug: scan.productSlug || "" }}

                    className="group flex flex-col items-center p-4 rounded-xl border border-border/50 bg-background hover:border-primary/40 hover:bg-muted/10 transition-all"
                  >
                    <ProductImage src={scan.imageUrl} alt={scan.productName || ""} width={60} height={60} className="mb-3 rounded-lg" />
                    <div className="text-center w-full">
                      <p className="truncate text-xs font-bold mb-1">{scan.productName || "Sem nome"}</p>
                      <Price value={scan.priceCaptured} className="text-sm font-black text-primary" />
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">
                        {new Date(scan.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Quick Actions / Navigation */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-widest font-bold">O que você deseja fazer agora?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="rounded-full h-12 px-8 font-bold">
              <Link to="/precos">
                <Search className="mr-2 h-4 w-4" />
                Achar Menor Preço
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full h-12 px-8 font-bold border-2">
              <Link to="/lista">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Lista de Compras
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full h-12 px-8 font-bold border-2">
              <Link to="/app/estabelecimentos">
                <Store className="mr-2 h-4 w-4" />
                Ver Comércios
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
