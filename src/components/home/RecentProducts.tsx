import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Clock,
  Store,
  Radio,
  ArrowRight,
  ChevronRight,
  TrendingDown,
  Star,
} from "lucide-react";
import { getRecentProducts } from "@/lib/products-public.functions";
import { getLiveTickerStats } from "@/lib/products-public.functions";
import {
  listFavoritedPanelKeys,
  panelKeyFromName,
  toggleFavoritePanelProduct,
} from "@/lib/favorite-panel.functions";
import { useSession } from "@/hooks/useSession";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { consumeAuthIntent } from "@/lib/auth-intent";
import { useEffect } from "react";
import { ProductQuickModal } from "@/components/home/ProductQuickModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";



const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const relative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (d <= 0) return "hoje";
  if (d === 1) return "há 1 dia";
  if (d < 7) return `há ${d} dias`;
  const w = Math.floor(d / 7);
  if (w === 1) return "há 1 semana";
  if (w < 5) return `há ${w} semanas`;
  const m = Math.floor(d / 30);
  return m <= 1 ? "há 1 mês" : `há ${m} meses`;
};

/** Encurta nomes longos preservando palavras — ideal para letreiro no mobile. */
function shortName(raw: string, max = 22): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const words = clean.split(" ");
  let out = "";
  for (const w of words) {
    if ((out + (out ? " " : "") + w).length > max) break;
    out += (out ? " " : "") + w;
  }
  if (!out) out = clean.slice(0, max);
  return out + "…";
}


type Freshness = { label: string; dotClass: string; textClass: string; ringClass: string };

function freshness(iso: string): Freshness {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7)
    return {
      label: "Disponível",
      dotClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-400",
      ringClass: "ring-emerald-500/30",
    };
  if (days <= 30)
    return {
      label: "Recente",
      dotClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-400",
      ringClass: "ring-amber-500/30",
    };
  return {
    label: "Desatualizado",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-500 dark:text-zinc-400",
    ringClass: "ring-zinc-400/30",
  };
}


type Palette = {
  card: string;
  line: string;
  heading: string;
  ink: string;
  goldSoft: string;
  gold: string;
};

export function RecentProducts({ P, serif }: { P: Palette; serif: string }) {
  const fetchRecent = useServerFn(getRecentProducts);
  const fetchLive = useServerFn(getLiveTickerStats);
  const { data } = useQuery({
    queryKey: ["home", "recent-products", 6],
    queryFn: () => fetchRecent({ data: { limit: 6 } }),
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
  const { data: live } = useQuery({
    queryKey: ["home", "live-ticker-stats"],
    queryFn: () => fetchLive(),
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const [liveOpen, setLiveOpen] = useState(false);
  const { data: liveList, isLoading: liveListLoading } = useQuery({
    queryKey: ["home", "recent-products", 20],
    queryFn: () => fetchRecent({ data: { limit: 20 } }),
    staleTime: 60_000,
    enabled: liveOpen,
  });

  if (!data || data.length === 0) return null;

  const lastUpdateLabel = live?.lastUpdate ? relative(live.lastUpdate) : null;


  return (
    <section
      aria-labelledby="recent-products-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8"
    >
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Dialog open={liveOpen} onOpenChange={setLiveOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                  style={{
                    borderColor: "color-mix(in oklab, #10b981 45%, transparent)",
                    background: "color-mix(in oklab, #10b981 12%, transparent)",
                    color: "#10b981",
                  }}
                  aria-label="Abrir painel ao vivo com os últimos preços conferidos"
                >
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Ao vivo
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg overflow-hidden p-0">
                <DialogHeader className="border-b px-5 pb-3 pt-5" style={{ borderColor: P.line }}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                      Painel ao vivo
                    </span>
                  </div>
                  <DialogTitle className={`${serif} text-left text-2xl`} style={{ color: P.heading, letterSpacing: "-0.02em" }}>
                    Últimos preços conferidos
                  </DialogTitle>
                  <DialogDescription className="text-left">
                    {lastUpdateLabel ? `Última atualização ${lastUpdateLabel}` : "Coletas recentes em Feijó"}
                    {typeof live?.checkedToday === "number" && live.checkedToday > 0
                      ? ` · ${live.checkedToday} hoje`
                      : ""}
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto">
                  {liveListLoading && !liveList ? (
                    <ul className="divide-y" style={{ borderColor: P.line }}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-3 px-5 py-3">
                          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/60" />
                          </div>
                          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="divide-y" style={{ borderColor: P.line }}>
                      {(liveList ?? data).map((p) => {
                        const f = freshness(p.when);
                        return (
                          <li key={p.slug}>
                            <Link
                              to="/produto/$slug"
                              params={{ slug: p.slug }}
                              onClick={() => setLiveOpen(false)}
                              className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                            >
                              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${f.dotClass}`} aria-hidden />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold" style={{ color: P.heading }}>
                                  {p.name}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                                  <span className="market-name truncate font-bold uppercase tracking-[0.05em] text-[var(--market-accent)]">
                                    {p.marketName ?? "Vários mercados"}
                                  </span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-muted-foreground">{relative(p.when)}</span>
                                </div>
                              </div>
                              <span
                                className={`${serif} tabular-nums shrink-0 text-[18px] font-semibold`}
                                style={{ color: P.gold, letterSpacing: "-0.02em" }}
                              >
                                {brl(p.price)}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t px-5 py-3" style={{ borderColor: P.line }}>
                  <Link
                    to="/melhores-precos"
                    onClick={() => setLiveOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] transition-transform hover:scale-[1.01]"
                    style={{ background: P.gold, color: "#0a1631" }}
                  >
                    Ver todos os resultados
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </DialogContent>
            </Dialog>
            {lastUpdateLabel && (
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-medium tabular-nums"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 60%, transparent)" }}
              >
                <Radio className="h-3 w-3" aria-hidden />
                Última atualização {lastUpdateLabel}
              </span>
            )}
            {typeof live?.checkedToday === "number" && live.checkedToday > 0 && (
              <button
                type="button"
                onClick={() => setLiveOpen(true)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/50"
                style={{
                  background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                  color: P.gold,
                }}
                aria-label={`Abrir painel: ${live.checkedToday} preços conferidos hoje`}
              >
                {live.checkedToday} preços conferidos hoje
              </button>
            )}
          </div>

          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: P.goldSoft }}
          >
            Recém-cadastrados
          </div>
          <h2
            id="recent-products-heading"
            className={`${serif}`}
            style={{
              color: P.heading,
              fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Preços conferidos nos últimos dias
          </h2>
        </div>
        <Link
          to="/melhores-precos"
          className="hidden text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-80 sm:inline-flex"
          style={{ color: P.gold }}
        >
          Ver mais →
        </Link>
      </div>


      {/* Único produto em destaque — spotlight com brilho para chamar atenção */}
      <SpotlightCard data={data} P={P} serif={serif} />
    </section>
  );
}


type RecentItem = {
  slug: string;
  name: string;
  price: number;
  when: string;
  marketName: string | null;
  stores: number;
  previousPrice: number | null;
  dropPct: number | null;
};

/** Considera "queda relevante" a partir de ~5% de redução vs. maior preço anterior. */
const DROP_THRESHOLD = 5;

function SpotlightCard({
  data,
  P,
  serif,
}: {
  data: RecentItem[];
  P: Palette;
  serif: string;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const router = useRouter();

  // Modal de detalhes (produto, mercados, histórico)
  const [openItem, setOpenItem] = useState<RecentItem | null>(null);

  // Favoritos do usuário — chaves no formato do painel
  const fetchFavKeys = useServerFn(listFavoritedPanelKeys);
  const { data: favKeys } = useQuery({
    queryKey: ["home", "panel-favorite-keys", user?.id ?? "anon"],
    queryFn: () => fetchFavKeys(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const favSet = new Set(favKeys?.keys ?? []);

  const toggleFav = useServerFn(toggleFavoritePanelProduct);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const favMutation = useMutation({
    mutationFn: (name: string) => toggleFav({ data: { productName: name } }),
    onMutate: (name) => setPendingKey(panelKeyFromName(name)),
    onSuccess: (res) => {
      toast.success(
        res.favorited
          ? "Adicionado aos favoritos — vamos avisar quando o preço cair."
          : "Removido dos favoritos.",
      );
      queryClient.invalidateQueries({
        queryKey: ["home", "panel-favorite-keys"],
      });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao favoritar."),
    onSettled: () => setPendingKey(null),
  });

  const handleFavorite = async (name: string) => {
    if (!user) {
      const ok = await confirm({
        title: "Entre para salvar este preço",
        description:
          "Favoritar produtos é grátis e leva 10 segundos. Assim que o preço cair em qualquer mercado, avisamos você por aqui.",
        confirmLabel: "Entrar agora",
        cancelLabel: "Agora não",
        tone: "info",
      });
      if (ok) {
        router.navigate({
          to: "/login",
          search: { redirect: "/" } as never,
        });
      }
      return;
    }
    favMutation.mutate(name);
  };


  // Seleciona 1 item: prioriza maior queda relevante; fallback = primeiro
  const featured = [...data]
    .sort((a, b) => (b.dropPct ?? 0) - (a.dropPct ?? 0))[0];
  if (!featured) return null;

  const p = featured;
  const f = freshness(p.when);
  const hasDrop = p.dropPct !== null && p.dropPct >= DROP_THRESHOLD;
  const key = panelKeyFromName(p.name);
  const isFav = favSet.has(key);
  const isFavPending = pendingKey === key && favMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-xl" aria-label="Destaque de preço">
      <div
        className="pc-spotlight group relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-transform hover:-translate-y-0.5"
        style={{
          borderColor: "color-mix(in oklab, var(--pc-home-gold) 45%, transparent)",
          background: `linear-gradient(135deg, ${P.card} 0%, color-mix(in oklab, var(--pc-home-gold) 6%, ${P.card}) 100%)`,
          boxShadow:
            "0 6px 24px -10px color-mix(in oklab, var(--pc-home-gold) 30%, transparent), inset 0 1px 0 color-mix(in oklab, var(--pc-home-gold) 18%, transparent)",
        }}
      >
        {/* Brilho animado no canto */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--pc-home-gold) 55%, transparent) 0%, transparent 70%)",
            animation: "pc-spot-pulse 3.5s ease-in-out infinite",
          }}
        />

        <button
          type="button"
          onClick={() => setOpenItem(p)}
          className="relative block w-full text-left focus-visible:outline-none"
          aria-label={`Ver detalhes de ${p.name} — ${brl(p.price)}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em]"
              style={{
                background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                color: P.gold,
              }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: P.gold, boxShadow: `0 0 6px ${P.gold}` }} />
              Destaque
            </span>
            {hasDrop && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em]"
                style={{
                  background: "color-mix(in oklab, #10b981 18%, transparent)",
                  color: "#059669",
                  border: "1px solid color-mix(in oklab, #10b981 50%, transparent)",
                  animation: "pc-spot-badge 2.2s ease-in-out infinite",
                }}
              >
                <TrendingDown className="h-2.5 w-2.5" aria-hidden />
                Baixou {p.dropPct}%
              </span>
            )}
            <span
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ${f.ringClass} ${f.textClass}`}
              title={f.label}
            >
              <span className={`h-1 w-1 rounded-full ${f.dotClass}`} aria-hidden />
              {f.label}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div
                className="line-clamp-2 text-[14px] sm:text-[15px] font-semibold leading-snug"
                style={{ color: P.heading }}
              >
                {p.name}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <Store className="h-3 w-3 shrink-0 text-[var(--market-accent)]" aria-hidden />
                <span className="market-name truncate font-bold uppercase tracking-[0.05em] text-[var(--market-accent)]">
                  {p.marketName ?? "Vários mercados"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end leading-none shrink-0">
              {hasDrop && p.previousPrice && (
                <span
                  className="mb-0.5 text-[10.5px] font-medium text-muted-foreground line-through tabular-nums"
                  aria-label={`Preço anterior ${brl(p.previousPrice)}`}
                >
                  {brl(p.previousPrice)}
                </span>
              )}
              <span
                className={`${serif} tabular-nums font-semibold leading-none`}
                style={{
                  color: P.gold,
                  letterSpacing: "-0.02em",
                  fontSize: "clamp(1.5rem, 4.5vw, 2rem)",
                  textShadow: "0 2px 14px color-mix(in oklab, var(--pc-home-gold) 35%, transparent)",
                }}
              >
                {brl(p.price)}
              </span>
            </div>
          </div>
        </button>

        <div className="relative mt-2.5 flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: "color-mix(in oklab, var(--pc-home-gold) 22%, transparent)" }}>
          <span
            className="inline-flex items-center gap-1 text-[10px]"
            style={{ color: "color-mix(in oklab, var(--pc-home-ink) 60%, transparent)" }}
          >
            <Clock className="h-2.5 w-2.5" aria-hidden />
            {relative(p.when)}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleFavorite(p.name)}
              disabled={isFavPending}
              aria-pressed={isFav}
              aria-label={isFav ? `Remover ${p.name} dos favoritos` : `Favoritar ${p.name}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/60"
              style={{ opacity: isFavPending ? 0.5 : 1 }}
            >
              <Star
                className="h-3.5 w-3.5"
                strokeWidth={2}
                style={{
                  color: isFav ? P.gold : "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)",
                  fill: isFav ? P.gold : "transparent",
                }}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => setOpenItem(p)}
              className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
              style={{ color: P.heading }}
            >
              Detalhes
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
            <Link
              to="/melhores-precos"
              className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
              style={{ color: P.gold }}
            >
              Todos
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>


      {/* Modal de detalhes do produto (mercados, histórico, link para a página) */}
      <ProductQuickModal
        slug={openItem?.slug ?? null}
        open={!!openItem}
        onOpenChange={(v) => {
          if (!v) setOpenItem(null);
        }}
        fallbackName={openItem?.name}
      />
    </div>
  );
}





