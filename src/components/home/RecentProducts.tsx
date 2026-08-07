import { lazy, Suspense, useState } from "react";
import { Price } from "@/components/ds/Price";
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
// Modal pesado (histórico + mercados) só carrega após o primeiro clique num produto.
const ProductQuickModal = lazy(() =>
  import("@/components/home/ProductQuickModal").then((m) => ({ default: m.ProductQuickModal })),
);
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
      textClass: "text-emerald-700 dark:text-emerald-400",
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

  if (!data) {
    // Reserva vertical estável (evita CLS) enquanto o server function responde.
    return (
      <section
        aria-hidden
        aria-busy="true"
        className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8"
      >
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded-full" style={{ background: P.line }} />
            <div className="h-5 w-64 animate-pulse rounded-md" style={{ background: P.line }} />
          </div>
          <div className="h-4 w-16 animate-pulse rounded-full" style={{ background: P.line }} />
        </div>
        <div
          className="h-[132px] w-full animate-pulse rounded-2xl sm:h-[152px]"
          style={{ background: P.line }}
        />
      </section>
    );
  }
  if (data.length === 0) return null;


  const lastUpdateLabel = live?.lastUpdate ? relative(live.lastUpdate) : null;


  return (
    <section
      aria-labelledby="recent-products-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8"
    >
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Dialog open={liveOpen} onOpenChange={setLiveOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                  style={{
                    borderColor: "color-mix(in oklab, #10b981 45%, transparent)",
                    background: "color-mix(in oklab, #10b981 12%, transparent)",
                    color: "var(--pc-live)",
                  }}
                  aria-label="Abrir painel ao vivo com os últimos preços verificados"
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
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                      Painel ao vivo
                    </span>
                  </div>
                  <DialogTitle className={`${serif} text-left text-2xl`} style={{ color: P.heading, letterSpacing: "-0.02em" }}>
                    Últimos preços verificados
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
                              <Price value={p.price} size="lg" className="shrink-0" />
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
                className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums"
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
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/50"
                style={{
                  background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                  color: "var(--pc-price)",
                }}
                aria-label={`Abrir painel: ${live.checkedToday} preços verificados hoje`}
              >
                {live.checkedToday} preços verificados hoje
              </button>
            )}
          </div>

          <div
            className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: P.goldSoft }}
          >
            Adicionados recentemente
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
            Preços verificados nos últimos dias
          </h2>
        </div>
        <Link
          to="/melhores-precos"
          className="hidden text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-80 sm:inline-flex"
          style={{ color: "var(--pc-price)" }}
        >
          Ver mais →
        </Link>
      </div>


      {/* Single featured product — spotlight with glow to catch attention */}
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
  const promptSignIn = usePromptSignIn();

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

  type FavArgs = { name: string; marketName?: string | null };
  const favMutation = useMutation({
    mutationFn: ({ name }: FavArgs) =>
      toggleFav({ data: { productName: name } }),
    onMutate: ({ name }) => setPendingKey(panelKeyFromName(name)),
    onSuccess: (res, args) => {
      queryClient.invalidateQueries({
        queryKey: ["home", "panel-favorite-keys"],
      });
      const location = args.marketName?.trim() || null;
      if (res.favorited) {
        toast.custom(
          (t) => (
            <div
              role="status"
              className="pc-fav-toast flex w-[340px] max-w-[92vw] items-center gap-3 rounded-xl border border-[color:var(--pc-home-gold)]/45 bg-[color:var(--pc-home-ink)] px-3.5 py-2.5 text-white shadow-2xl ring-1 ring-[color:var(--pc-home-gold)]/20"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--pc-home-gold)]/15 text-[color:var(--pc-home-gold)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2.6l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.6l-6.1 3.2 1.5-6.7L2.3 9.5l6.8-.7z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold leading-tight">
                  Salvo nos favoritos
                </div>
                <div className="mt-0.5 truncate text-[11.5px] leading-tight text-white/75">
                  <span className="font-medium text-white/90">{args.name}</span>
                  {location ? (
                    <span className="text-white/60"> · {location}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t);
                  favMutation.mutate(args);
                }}
                className="shrink-0 rounded-md border border-[color:var(--pc-home-gold)]/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--pc-home-gold)] transition-colors hover:bg-[color:var(--pc-home-gold)]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/60"
              >
                Desfazer
              </button>
            </div>
          ),
          { duration: 6000 },
        );
      } else {
        toast("Removido dos favoritos", {
          description: location ? `${args.name} · ${location}` : args.name,
          duration: 3500,
        });
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao favoritar."),
    onSettled: () => setPendingKey(null),
  });

  // Consome intenção pendente após login: se o visitante clicou em favoritar
  // sem estar autenticado, agora que está logado a ação é executada sozinha.
  useEffect(() => {
    if (!user) return;
    const intent = consumeAuthIntent("favorite-panel");
    const productName =
      typeof intent?.payload?.productName === "string"
        ? intent.payload.productName
        : null;
    if (!productName) return;
    const key = panelKeyFromName(productName);
    if (favSet.has(key)) return; // já favoritado — nada a fazer
    const marketName =
      typeof intent?.payload?.marketName === "string"
        ? (intent.payload.marketName as string)
        : null;
    favMutation.mutate({ name: productName, marketName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFavorite = async (item: {
    name: string;
    marketName?: string | null;
  }) => {
    if (!user) {
      await promptSignIn({
        intent: "favorite-panel",
        payload: { productName: item.name, marketName: item.marketName ?? null },
        summary: item.marketName
          ? `${item.name} · ${item.marketName}`
          : item.name,
      });
      return;
    }
    favMutation.mutate({ name: item.name, marketName: item.marketName });
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
          borderColor: "color-mix(in oklab, var(--pc-home-gold) 32%, transparent)",
          background: P.card,
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 color-mix(in oklab, var(--pc-home-gold) 10%, transparent)",
        }}
      >


        <button
          type="button"
          onClick={() => setOpenItem(p)}
          className="relative block w-full text-left focus-visible:outline-none"
          aria-label={`Ver detalhes de ${p.name} — ${brl(p.price)}`}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{
                background: "color-mix(in oklab, var(--pc-home-gold) 14%, transparent)",
                color: "var(--pc-price)",
              }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: P.gold }} />
              Destaque
            </span>
            {hasDrop && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em]"
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
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] ring-1 ${f.ringClass} ${f.textClass}`}
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
                <Price
                  value={p.previousPrice}
                  size="xs"
                  tone="strike"
                  className="mb-0.5"
                  srLabel={`Preço anterior ${brl(p.previousPrice)}`}
                />
              )}

              <Price
                value={p.price}
                size="xl"
                style={{
                  textShadow: "0 2px 14px color-mix(in oklab, var(--pc-home-gold) 35%, transparent)",
                }}
              />
            </div>
          </div>
        </button>

        <div className="relative mt-2.5 flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: "color-mix(in oklab, var(--pc-home-gold) 22%, transparent)" }}>
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: "color-mix(in oklab, var(--pc-home-ink) 60%, transparent)" }}
          >
            <Clock className="h-2.5 w-2.5" aria-hidden />
            {relative(p.when)}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleFavorite({ name: p.name, marketName: p.marketName })}
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
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
              style={{ color: P.heading }}
            >
              Detalhes
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
            <Link
              to="/melhores-precos"
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
              style={{ color: "var(--pc-price)" }}
            >
              Todos
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>


      {/* Modal de detalhes do produto — só monta (e faz download do chunk) após o primeiro clique. */}
      {openItem !== null && (
        <Suspense fallback={null}>
          <ProductQuickModal
            slug={openItem?.slug ?? null}
            open={!!openItem}
            onOpenChange={(v) => {
              if (!v) setOpenItem(null);
            }}
            fallbackName={openItem?.name}
          />
        </Suspense>
      )}
    </div>
  );
}





