import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  FileDown,
  Share2,
  Star,
  Send,
  Sparkles,
  MapPin,
  AlertTriangle,
  Trash2,
  Plus,
  Minus,
  Check,
  ClipboardCopy,
  ChevronDown,
  X,
  Eye,
  Copy,
  Columns2,
  Repeat,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  getBasketComparison,
  buildBudgetBasket,
  listEssentialPrices,
  listBasketBuilderOptions,
  type BasketComparisonResult,
  type BudgetBasketResult,
  type BasketBuilderOptions,
  type EssentialKey,
  type EssentialCategory,
  type EssentialPricesResult,
} from "@/lib/basket.functions";
import {
  listSavedBaskets,
  saveBasket,
  getSavedBasket,
  deleteSavedBasket,
  toggleBasketShare,
  getDraftBasket,
  saveDraftBasket,
  clearDraftBasket,
  type SavedBasketSummary,
  type SavedBasketDetail,
} from "@/lib/saved-baskets.functions";
import {
  askBasketAssistant,
  explainBasketSavings,
  type AssistantMessage,
  type AssistantAction,
  type EssentialTool,
} from "@/lib/basket-assistant.functions";
import { exportBasketPdf, exportManualBasketPdf } from "@/lib/basket-pdf";
import { buildShareUrl, decodeQuantities } from "@/lib/basket-share";
import { CreatePriceAlertButton } from "@/components/alerts/CreatePriceAlertButton";
import {
  createStoreBasketAlert,
} from "@/lib/store-basket-alerts.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { useSession } from "@/hooks/useSession";
import { getMyAccount } from "@/lib/account.functions";
import { EssentialGlyph, BasketMark } from "@/components/cesta/EssentialGlyph";
import { ItemPriceStrip, type PriceStripRow } from "@/components/basket/ItemPriceStrip";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { AiCostEstimate } from "@/components/ai/AiCostEstimate";
import { AiQuotaWarning } from "@/components/ai/AiQuotaWarning";


export const Route = createFileRoute("/cesta-basica")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    share?: string;
    mode?: Mode;
    q?: string;
    budget?: number;
    city?: string;
    radius?: number;
    mincov?: number;
    miss?: MissingMode;
  } => {
    const m = typeof s.mode === "string" ? s.mode : undefined;
    const mode: Mode | undefined =
      m === "compare" || m === "budget" || m === "manual" ? m : undefined;
    const miss = typeof s.miss === "string" ? s.miss : undefined;
    const missingMode: MissingMode | undefined =
      miss === "zero" || miss === "ignore" || miss === "estimate" ? miss : undefined;
    const num = (v: unknown): number | undefined => {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      share: typeof s.share === "string" ? s.share : undefined,
      mode,
      q: typeof s.q === "string" ? s.q : undefined,
      budget: num(s.budget),
      city: typeof s.city === "string" ? s.city.slice(0, 80) : undefined,
      radius: num(s.radius),
      mincov: num(s.mincov),
      miss: missingMode,
    };
  },
  head: () => ({
    meta: [
      { title: "Cesta Básica — Compare mercados | PreçoCerto" },
      {
        name: "description",
        content:
          "Monte uma cesta básica pelo seu orçamento, escolha manualmente ou compare o custo total entre supermercados cadastrados no PreçoCerto.",
      },
      { property: "og:title", content: "Cesta Básica — Compare mercados | PreçoCerto" },
      {
        property: "og:description",
        content:
          "Ranking de custo da cesta básica por mercado, montagem por orçamento, seleção manual e PDF.",
      },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <CestaBasicaPage />
    </ProtectedGate>
  ),
});

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Mode = "compare" | "budget" | "manual";
type Coords = { lat: number; lng: number } | null;
export type MissingMode = "zero" | "ignore" | "estimate";


function CestaBasicaPage() {
  const sp = Route.useSearch();
  const initialMode = sp.mode;
  const initialQuantities = useMemo(() => decodeQuantities(sp.q ?? ""), [sp.q]);
  const [mode, setMode] = useState<Mode | null>(initialMode ?? null);
  const [radiusKm, setRadiusKm] = useState<number | null>(sp.radius ?? null);
  const [city, setCity] = useState<string>(sp.city ?? "");
  const [coords, setCoords] = useState<Coords>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [minCoverage, setMinCoverage] = useState<number>(sp.mincov ?? 0);
  const [missingMode, setMissingMode] = useState<MissingMode>(sp.miss ?? "zero");

  const { user } = useSession();
  const fetchAccount = useServerFn(getMyAccount);
  const accountQuery = useQuery({
    queryKey: ["my-account-basket-ai", user?.id ?? "anon"],
    queryFn: () => fetchAccount(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const hasAiAccess = accountQuery.data?.status === "active";

  const getBasket = useServerFn(getBasketComparison);

  const comparisonQuery = useQuery({
    queryKey: ["basket-comparison", { radiusKm, city, coords }],
    queryFn: () =>
      getBasket({
        data: {
          originLat: coords?.lat ?? null,
          originLng: coords?.lng ?? null,
          radiusKm,
          city: city.trim() || null,
        },
      }),
    staleTime: 60_000,
    enabled: mode !== null,
  });

  function requestGeolocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização não disponível neste navegador.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!radiusKm) setRadiusKm(5);
        setGpsBusy(false);
        toast.success("Localização detectada");
      },
      (err) => {
        setGpsBusy(false);
        toast.error(`Falha ao obter localização: ${err.message}`);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-3 py-2.5">
          <Link
            to="/"
            className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-surface"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <BasketMark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground leading-none">
              PreçoCerto
            </p>
            <h1 className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground leading-tight">
              Cesta Básica
            </h1>
          </div>
          {mode && (
            <button
              type="button"
              onClick={() => setMode(null)}
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-surface"
            >
              Trocar
            </button>
          )}
          {hasAiAccess ? (
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
              title="Assistente de IA"
            >
              <Sparkles className="h-3 w-3" /> IA
            </button>
          ) : (
            <Link
              to="/assinar"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
              title={
                user
                  ? "IA disponível apenas para assinantes ativos"
                  : "Faça login e assine para usar a IA"
              }
            >
              <Sparkles className="h-3 w-3" /> IA 🔒
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 pt-4 space-y-3">
        {mode === null && <IntroChooser onPick={setMode} />}

        {mode !== null && <ModeSwitcher mode={mode} setMode={setMode} />}

        {mode === "compare" && (
          <details className="group rounded-xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Ajustar cidade, raio e cobertura
                {(city || coords || radiusKm || minCoverage > 0 || missingMode !== "zero") && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">ativo</span>
                )}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/60 p-3">
              <FilterBar
                city={city}
                setCity={setCity}
                radiusKm={radiusKm}
                setRadiusKm={setRadiusKm}
                coords={coords}
                gpsBusy={gpsBusy}
                requestGeolocation={requestGeolocation}
                minCoverage={minCoverage}
                setMinCoverage={setMinCoverage}
                missingMode={missingMode}
                setMissingMode={setMissingMode}
                onClear={() => {
                  setCity("");
                  setRadiusKm(null);
                  setCoords(null);
                  setMinCoverage(0);
                  setMissingMode("zero");
                }}
              />
            </div>
          </details>
        )}
        {mode === "compare" && (
          <CompareMode
            data={comparisonQuery.data ?? null}
            loading={comparisonQuery.isLoading}
            filters={{ radiusKm, city, coords }}
            minCoverage={minCoverage}
            missingMode={missingMode}
          />
        )}
        {mode === "budget" && <BudgetMode initialBudget={sp.budget} />}
        {mode === "manual" && (
          <ManualMode
            data={comparisonQuery.data ?? null}
            loading={comparisonQuery.isLoading}
            initialQty={initialQuantities}
            filters={{ city, radiusKm, originLat: coords?.lat ?? null, originLng: coords?.lng ?? null }}
          />
        )}
        {mode !== null && <SavedBasketsPanel />}
      </main>

      <AssistantSidePanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onAction={(a) => {
          if (a.type === "set_mode") setMode(a.mode);
          else if (a.type === "set_filters") {
            if (a.city !== undefined) setCity(a.city ?? "");
            if (a.radiusKm !== undefined) setRadiusKm(a.radiusKm ?? null);
            setMode("compare");
          } else if (a.type === "set_budget") {
            setMode("budget");
            window.dispatchEvent(
              new CustomEvent("precocerto:basket-set-budget", { detail: { amount: a.amount } }),
            );
          } else if (a.type === "add_item") {
            setMode("manual");
            window.dispatchEvent(
              new CustomEvent("precocerto:basket-add-item", {
                detail: { key: a.key, qty: a.qty },
              }),
            );
          } else if (a.type === "remove_item") {
            setMode("manual");
            window.dispatchEvent(
              new CustomEvent("precocerto:basket-remove-item", { detail: { key: a.key } }),
            );
          } else if (a.type === "clear_manual") {
            window.dispatchEvent(new CustomEvent("precocerto:basket-clear-manual"));
          }
        }}
      />
      <MobileNav />
    </div>
  );
}

/* ============================= INTRO ============================= */

function IntroChooser({ onPick }: { onPick: (m: Mode) => void }) {
  const options: {
    id: Mode;
    title: string;
    desc: string;
    cta: string;
    accent: string;
  }[] = [
    {
      id: "budget",
      title: "Tenho um valor pra gastar",
      desc: "Você diz quanto pode gastar e a gente monta a cesta mais barata possível.",
      cta: "Informar valor",
      accent: "from-emerald-500/15 to-emerald-500/0 ring-emerald-500/30",
    },
    {
      id: "manual",
      title: "Quero escolher os itens",
      desc: "Selecione item por item e veja o total no mercado mais barato.",
      cta: "Escolher itens",
      accent: "from-amber-500/15 to-amber-500/0 ring-amber-500/30",
    },
    {
      id: "compare",
      title: "Só quero comparar mercados",
      desc: "Veja o ranking de custo da cesta básica completa por supermercado.",
      cta: "Ver ranking",
      accent: "from-primary/15 to-primary/0 ring-primary/30",
    },
  ];
  return (
    <section className="space-y-4 pt-2">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Passo 1 de 1
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          O que você quer fazer?
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Escolha um caminho. Você pode trocar depois pelo botão “Trocar”.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onPick(opt.id)}
            className={
              "group relative flex h-full flex-col rounded-2xl border border-border bg-gradient-to-br p-4 text-left transition hover:border-transparent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
              opt.accent
            }
          >
            <h3 className="font-display text-base font-semibold text-foreground">
              {opt.title}
            </h3>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{opt.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary group-hover:gap-2 transition-all">
              {opt.cta} →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ModeSwitcher({ mode, setMode }: { mode: Mode; setMode: (m: Mode | null) => void }) {
  const labels: Record<Mode, string> = {
    compare: "Comparando mercados",
    budget: "Cesta por orçamento",
    manual: "Escolha manual",
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
          Modo atual
        </p>
        <p className="mt-0.5 truncate font-display text-[13.5px] font-semibold text-foreground">
          {labels[mode]}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setMode(null)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5 hover:text-primary"
      >
        Trocar
      </button>
    </div>
  );
}

/* ============================= FILTERS ============================= */

function FilterBar({
  city,
  setCity,
  radiusKm,
  setRadiusKm,
  coords,
  gpsBusy,
  requestGeolocation,
  minCoverage,
  setMinCoverage,
  missingMode,
  setMissingMode,
  onClear,
}: {
  city: string;
  setCity: (v: string) => void;
  radiusKm: number | null;
  setRadiusKm: (v: number | null) => void;
  coords: Coords;
  gpsBusy: boolean;
  requestGeolocation: () => void;
  minCoverage: number;
  setMinCoverage: (v: number) => void;
  missingMode: MissingMode;
  setMissingMode: (v: MissingMode) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Cidade (opcional)"
          className="h-9 flex-1 min-w-[140px] rounded-xl border border-border bg-background px-3 font-display text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
        />
        <button
          type="button"
          onClick={requestGeolocation}
          disabled={gpsBusy}
          className={
            "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 font-mono text-[11px] uppercase tracking-[0.16em] transition disabled:opacity-60 " +
            (coords
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:bg-primary/5")
          }
        >
          {gpsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
          {coords ? "GPS ligado" : "Usar meu local"}
        </button>
        <select
          value={radiusKm ?? ""}
          onChange={(e) => setRadiusKm(e.target.value ? Number(e.target.value) : null)}
          disabled={!coords}
          className="h-9 rounded-xl border border-border bg-background px-2 font-display text-[12.5px] text-foreground outline-none disabled:opacity-50"
        >
          <option value="">Raio: todos</option>
          <option value="2">2 km</option>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="20">20 km</option>
          <option value="50">50 km</option>
        </select>
        {(city || coords || radiusKm || minCoverage > 0 || missingMode !== "zero") && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </div>

      <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
        {/* Filtro por cobertura mínima */}
        <div>
          <label className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Cobertura mínima</span>
            <span className="text-foreground tabular-nums">{minCoverage}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minCoverage}
            onChange={(e) => setMinCoverage(Number(e.target.value))}
            className="mt-1 w-full accent-primary"
          />
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
            Mostrar apenas mercados com {minCoverage}% ou mais dos itens da cesta.
          </p>
        </div>

        {/* Como somar itens sem preço */}
        <div>
          <label className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Itens sem preço</span>
          </label>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
            {(
              [
                { v: "zero" as const, label: "R$ 0,00", hint: "Somar como zero" },
                { v: "ignore" as const, label: "Ignorar", hint: "Excluir do total" },
                { v: "estimate" as const, label: "Média", hint: "Preencher com média do banco" },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setMissingMode(opt.v)}
                title={opt.hint}
                className={
                  "rounded-lg px-2 py-1 font-mono text-[11px] transition " +
                  (missingMode === opt.v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary/5")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================= COMPARE MODE ============================= */

function CompareMode({
  data: rawData,
  loading,
  filters,
  minCoverage,
  missingMode,
}: {
  data: BasketComparisonResult | null;
  loading: boolean;
  filters: { radiusKm: number | null; city: string; coords: Coords };
  minCoverage: number;
  missingMode: MissingMode;
}) {
  // Aplica filtro de cobertura mínima sobre o resultado bruto
  const data = useMemo<BasketComparisonResult | null>(() => {
    if (!rawData) return null;
    const threshold = minCoverage / 100;
    const filteredStores = rawData.stores.filter((s) => s.coverage >= threshold);
    return { ...rawData, stores: filteredStores };
  }, [rawData, minCoverage]);
  const session = useSession();
  const qc = useQueryClient();
  const saveFn = useServerFn(saveBasket);
  const [savingShare, setSavingShare] = useState(false);
  const [saveDialog, setSaveDialog] = useState<null | { share: boolean }>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando comparação…
      </div>
    );
  }
  if (!data || data.stores.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        {rawData && rawData.stores.length > 0 && minCoverage > 0 ? (
          <>
            Nenhum mercado atinge {minCoverage}% de cobertura da cesta.{" "}
            <span className="block text-xs text-muted-foreground/80">
              {rawData.stores.length} mercado(s) foram filtrados por cobertura mínima — reduza o filtro para ver mais.
            </span>
          </>
        ) : (
          <>
            Ainda não há preços recentes suficientes para montar a comparação de cesta
            {filters.radiusKm ? " com esse filtro de raio." : "."}
          </>
        )}
      </div>
    );
  }

  const best = data.stores[0];

  /**
   * Estimativas por mercado:
   * - displayTotal: valor exibido conforme o modo escolhido
   * - minEstimate: soma apenas dos itens com preço (piso conhecido)
   * - maxEstimate: soma dos itens com preço + média dos ausentes (teto estimado)
   */
  function computeEstimates(s: BasketComparisonResult["stores"][number]) {
    let known = 0;
    let missingAvg = 0;
    let missingWithoutAvg = 0;
    s.items.forEach((it, i) => {
      if (it) {
        known += it.price * (it.quantity ?? 1);
      } else {
        const ess = data!.essentials[i];
        const avg = data!.averagePrices[ess.key];
        const q = ess.quantity ?? 1;
        if (typeof avg === "number") missingAvg += avg * q;
        else missingWithoutAvg += 1;
      }
    });

    const minEstimate = known;
    const maxEstimate = known + missingAvg; // itens sem média conhecida ficam de fora do teto
    let displayTotal = known;
    if (missingMode === "estimate") displayTotal = known + missingAvg;
    // "zero" e "ignore" resultam no mesmo somatório numérico (só muda a narrativa),
    // porque itens sem preço já valem 0 na soma "known".
    return {
      known: Number(known.toFixed(2)),
      missingAvg: Number(missingAvg.toFixed(2)),
      missingWithoutAvg,
      minEstimate: Number(minEstimate.toFixed(2)),
      maxEstimate: Number(maxEstimate.toFixed(2)),
      displayTotal: Number(displayTotal.toFixed(2)),
    };
  }

  async function persistBasket(name: string, share: boolean) {
    if (!session.user) {
      toast.error("Faça login para salvar cestas.");
      return;
    }
    setSavingShare(share);
    try {
      const row = await saveFn({
        data: {
          name,
          mode: "compare",
          filters: {
            radiusKm: filters.radiusKm ?? null,
            city: filters.city || null,
            originLat: filters.coords?.lat ?? null,
            originLng: filters.coords?.lng ?? null,
          },
          snapshot: JSON.parse(JSON.stringify({ variant: "compare", data })),
          share,
        },
      });
      if (share && row.shareToken) {
        const url = `${window.location.origin}/cesta-basica?share=${row.shareToken}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Link copiado! Compartilhe com quem quiser.");
      } else {
        toast.success("Cesta salva com sucesso.");
      }
      qc.invalidateQueries({ queryKey: ["saved-baskets"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSavingShare(false);
      setSaveDialog(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Cesta com o menor custo"
          value={fmt(best.total)}
          hint={`${best.establishmentName} · ${best.itemsFound}/${best.totalItems} itens`}
        />
        <SummaryCard
          label="Cesta teórica (menor por item)"
          value={fmt(data.cheapestBasketTotal)}
          hint="Combinando o menor preço em qualquer mercado"
        />
        <SummaryCard
          label="Janela analisada"
          value={`${data.windowDays} dias`}
          hint={`${data.stores.length} mercados · ${data.totalEssentials} itens`}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => exportBasketPdf(data, { missingMode, minCoverage })}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
        >
          <FileDown className="h-3.5 w-3.5" /> Exportar PDF
        </button>
        <button
          type="button"
          onClick={async () => {
            const summary = buildBasketSummary(data, computeEstimates);
            try {
              await navigator.clipboard.writeText(summary);
              toast.success("Resumo copiado para a área de transferência.");
            } catch {
              toast.error("Não foi possível copiar. Tente novamente.");
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
        >
          <ClipboardCopy className="h-3.5 w-3.5" /> Copiar resumo
        </button>
        <button
          type="button"
          onClick={() => setSaveDialog({ share: false })}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
        >
          <Star className="h-3.5 w-3.5" /> Salvar com nome
        </button>
        <button
          type="button"
          onClick={() => setSaveDialog({ share: true })}
          disabled={savingShare}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/15 disabled:opacity-60"
        >
          {savingShare ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          Salvar & Compartilhar
        </button>
      </div>

      {saveDialog && (
        <SaveNamedDialog
          defaultName={`Cesta ${new Date().toLocaleDateString("pt-BR")}${filters.city ? " · " + filters.city : ""}`}
          submitLabel={saveDialog.share ? "Salvar & compartilhar" : "Salvar"}
          busy={savingShare}
          onCancel={() => setSaveDialog(null)}
          onConfirm={(name) => persistBasket(name, saveDialog.share)}
        />
      )}



      {/* Ranking */}
      <section className="space-y-3">
        <h2 className="font-display text-[14px] font-semibold tracking-tight text-foreground">
          Ranking por mercado
        </h2>
        <ol className="space-y-2">
          {data.stores.map((s, idx) => {
            const isBest = idx === 0;
            const est = computeEstimates(s);
            const missingCount = s.totalItems - s.itemsFound;

            const isExpanded = expandedStore === s.establishmentId;
            return (
              <li key={s.establishmentId}>
                <div
                  className={
                    "rounded-2xl border p-4 transition " +
                    (isBest ? "border-primary bg-primary/5" : "border-border bg-surface")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[13px] font-semibold tabular-nums " +
                        (isBest
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent/10 text-accent-strong")
                      }
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/loja/$id"
                        params={{ id: s.establishmentId }}
                        search={{ q: "" }}
                        className="block truncate font-display text-[14px] font-semibold tracking-tight text-foreground hover:text-primary hover:underline"
                      >
                        {s.establishmentName}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {s.itemsFound}/{s.totalItems} itens · cobertura {(s.coverage * 100).toFixed(0)}%
                        {s.distanceKm != null && ` · ${s.distanceKm.toFixed(1)} km`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {isBest && (
                        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                          Mais barato
                        </p>
                      )}
                      <p className="font-display text-[19px] font-semibold leading-tight tabular-nums text-foreground">
                        {fmt(est.displayTotal)}
                      </p>
                      {missingCount > 0 && est.maxEstimate > est.minEstimate ? (
                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          faixa {fmt(est.minEstimate)} — <span className="text-warning">{fmt(est.maxEstimate)}</span>
                        </p>
                      ) : (
                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {missingCount === 0 ? "cesta completa" : `${missingCount} item(ns) sem preço`}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStore(isExpanded ? null : s.establishmentId)
                    }
                    aria-expanded={isExpanded}
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <ChevronDown
                      className={"h-3 w-3 transition " + (isExpanded ? "rotate-180" : "")}
                    />
                    {isExpanded ? "Ocultar detalhes" : "Ver detalhes por item"}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Item</th>
                            <th className="px-3 py-2 font-semibold">Produto usado</th>
                            <th className="px-3 py-2 text-right font-semibold">Preço usado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {s.items.map((it, i) => {
                            const label = data.essentials[i].label;
                            const key = data.essentials[i].key;
                            const avg = data.averagePrices[key];
                            let productName = "—";
                            let priceCell: React.ReactNode = (
                              <span className="text-warning">R$ 0,00</span>
                            );
                            if (it) {
                              productName = it.productName;
                              priceCell = (
                                <span className="tabular-nums text-primary">
                                  {fmt(it.price)}
                                </span>
                              );
                            } else if (missingMode === "ignore") {
                              priceCell = <span className="italic">ignorado</span>;
                            } else if (
                              missingMode === "estimate" &&
                              typeof avg === "number"
                            ) {
                              productName = "média do mercado";
                              priceCell = (
                                <span className="tabular-nums text-accent-strong">
                                  ~{fmt(avg)}
                                </span>
                              );
                            }
                            return (
                              <tr key={i} className="bg-background">
                                <td className="px-3 py-1.5 font-semibold text-foreground">
                                  {label}
                                </td>
                                <td className="max-w-[260px] truncate px-3 py-1.5 text-muted-foreground">
                                  {productName}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                  {priceCell}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-primary/5">
                            <td className="px-3 py-2 font-display text-[12px] font-semibold text-foreground">
                              Total usado no cálculo
                            </td>
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2 text-right font-display text-[13px] font-semibold tabular-nums text-primary">
                              {fmt(est.displayTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.items.map((it, i) => {
                        const label = data.essentials[i].label;
                        const avg = data.averagePrices[data.essentials[i].key];
                        if (it) {
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 font-mono text-[11px] text-foreground"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                              <span className="max-w-[110px] truncate">{label}</span>
                              <span className="tabular-nums text-primary">{fmt(it.price)}</span>
                            </span>
                          );
                        }
                        if (missingMode === "ignore") {
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/30 bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground/80"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                              <span className="max-w-[110px] truncate">{label}</span>
                              <span className="tabular-nums italic">ignorado</span>
                            </span>
                          );
                        }
                        if (missingMode === "estimate" && typeof avg === "number") {
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-accent/50 bg-accent/5 px-2.5 py-1 font-mono text-[11px] text-accent-strong"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                              <span className="max-w-[110px] truncate">{label}</span>
                              <span className="tabular-nums">~{fmt(avg)}</span>
                            </span>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning/50 bg-warning/5 px-2.5 py-1 font-mono text-[11px] text-warning line-through decoration-warning/70"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
                            <span className="max-w-[110px] truncate no-underline">{label}</span>
                            <span className="tabular-nums no-underline opacity-80">R$ 0,00</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Missing report */}
      {data.missingByItem.some((m) => m.missingStores.length > 0) && (
        <section className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Itens sem preço em alguns mercados
          </h2>
          <ul className="mt-2 space-y-1">
            {data.missingByItem
              .filter((m) => m.missingStores.length > 0)
              .map((m) => (
                <li key={m.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-warning/20 py-1 font-mono text-[11px]">
                  <span className="font-semibold text-foreground">{m.label}</span>
                  <span className="text-muted-foreground">
                    disponível em {m.availableStores} mercado(s) · falta em {m.missingStores.slice(0, 3).join(", ")}
                    {m.missingStores.length > 3 && "…"}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Cheapest per item */}
      {data.cheapest.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-display text-[14px] font-semibold tracking-tight text-foreground">
            Menor preço por item (em qualquer mercado)
          </h2>
          <ul className="mt-3 divide-y divide-border/60">
            {data.cheapest.map((c) => (
              <li key={c.key} className="flex items-baseline justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-[13px] font-medium text-foreground">
                    {c.label}
                  </p>
                  <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {c.establishmentName} · {c.productName}
                  </p>
                </div>
                <p className="shrink-0 font-display text-[15px] font-semibold tabular-nums text-primary">
                  {fmt(c.price)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ============================= BUDGET MODE ============================= */

const BUDGET_PRESETS = [50, 80, 100, 150, 200, 300];

function BudgetMode({ initialBudget }: { initialBudget?: number }) {
  const build = useServerFn(buildBudgetBasket);
  const listOptions = useServerFn(listBasketBuilderOptions);
  const saveFn = useServerFn(saveBasket);
  const session = useSession();
  const { confirm } = useConfirm();
  const qc = useQueryClient();
  const [input, setInput] = useState(initialBudget ? String(initialBudget) : "100");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BudgetBasketResult | null>(null);
  const [saveDialog, setSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Itens removidos manualmente do resultado (client-side, sem re-rodar). */
  const [manualRemovals, setManualRemovals] = useState<Set<EssentialKey>>(new Set());
  /** Quantidade por item (default 1). 0 = removido. */
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  /** Troca de estabelecimento/preço por item (override do resultado da varredura). */
  const [swapMap, setSwapMap] = useState<
    Record<
      string,
      { establishmentId: string; establishmentName: string; price: number; productName: string }
    >
  >({});
  /** Preços por essencial usados no strip lado a lado. */
  const [allPrices, setAllPrices] = useState<Record<string, PriceStripRow[]>>({});
  const [pricesOpen, setPricesOpen] = useState<{ key: EssentialKey; label: string } | null>(null);
  const [pricesData, setPricesData] = useState<EssentialPricesResult | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const listPricesFn = useServerFn(listEssentialPrices);

  // Personalização: modo (global vs. mercado específica) + mercado + itens a considerar
  const [scope, setScope] = useState<"global" | "store">("global");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [options, setOptions] = useState<BasketBuilderOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [includedKeys, setIncludedKeys] = useState<Set<EssentialKey> | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  // Histórico de cestas salvas do usuário (para carregar/comparar por estabelecimento).
  const listSavedFn = useServerFn(listSavedBaskets);
  const getSavedFn = useServerFn(getSavedBasket);
  const delSavedFn = useServerFn(deleteSavedBasket);
  const savedQuery = useQuery({
    queryKey: ["saved-baskets"],
    queryFn: () => listSavedFn(),
    enabled: !!session.user,
  });

  // Carrega opções (mercados + essenciais) uma vez
  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    listOptions()
      .then((o) => {
        if (cancelled) return;
        setOptions(o);
        setIncludedKeys((prev) => prev ?? new Set(o.essentials.map((e) => e.key)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listOptions]);

  // Ao receber um novo `result`, pré-inicializa qty=1 para cada item e carrega
  // preços comparativos por essencial (em paralelo) para o strip lado a lado.
  useEffect(() => {
    if (!result) return;
    // Reset quantidades para 1 por item preservando ajustes prévios
    setItemQty((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const it of result.items) if (next[it.key] == null) next[it.key] = 1;
      return next;
    });
    let cancelled = false;
    const keys = Array.from(new Set(result.items.map((it) => it.key)));
    (async () => {
      const entries = await Promise.all(
        keys.map(async (key) => {
          if (allPrices[key]) return [key, allPrices[key]] as const;
          try {
            const r = await listPricesFn({ data: { key } });
            const rows: PriceStripRow[] = r.rows.map((x) => ({
              establishmentId: x.establishmentId,
              establishmentName: x.establishmentName,
              price: x.price,
            }));
            return [key, rows] as const;
          } catch {
            return [key, [] as PriceStripRow[]] as const;
          }
        }),
      );
      if (cancelled) return;
      setAllPrices((prev) => {
        const next = { ...prev };
        for (const [k, rows] of entries) next[k] = rows;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function bumpQty(key: EssentialKey, delta: number) {
    setItemQty((prev) => {
      const cur = prev[key] ?? 1;
      const next = Math.max(1, Math.min(20, cur + delta));
      return { ...prev, [key]: next };
    });
  }
  function setQtyValue(key: EssentialKey, value: number) {
    const clamped = Math.max(1, Math.min(20, Math.floor(value)));
    if (!Number.isFinite(clamped)) return;
    setItemQty((prev) => ({ ...prev, [key]: clamped }));
  }

  async function openBudgetPrices(key: EssentialKey, label: string) {
    setPricesOpen({ key, label });
    setPricesData(null);
    setPricesLoading(true);
    try {
      const r = await listPricesFn({ data: { key } });
      setPricesData(r);
      // aproveita para hidratar o strip também
      setAllPrices((prev) => ({
        ...prev,
        [key]: r.rows.map((x) => ({
          establishmentId: x.establishmentId,
          establishmentName: x.establishmentName,
          price: x.price,
        })),
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar preços.");
      setPricesOpen(null);
    } finally {
      setPricesLoading(false);
    }
  }

  function applySwap(
    key: EssentialKey,
    label: string,
    row: { establishmentId: string; establishmentName: string; price: number; productName: string },
  ) {
    setSwapMap((prev) => ({ ...prev, [key]: row }));
    setPricesOpen(null);
    setPricesData(null);
    toast.success(`${label} → ${row.establishmentName} (${fmt(row.price)})`);
  }
  function clearSwap(key: EssentialKey) {
    setSwapMap((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  const includedList = useMemo<EssentialKey[] | null>(() => {
    if (!includedKeys || !options) return null;
    // Se todos selecionados → não filtrar (comportamento padrão)
    if (includedKeys.size === options.essentials.length) return null;
    return options.essentials.map((e) => e.key).filter((k) => includedKeys.has(k));
  }, [includedKeys, options]);

  function toggleKey(k: EssentialKey) {
    setIncludedKeys((prev) => {
      const base = prev ? new Set(prev) : new Set<EssentialKey>();
      if (base.has(k)) base.delete(k);
      else base.add(k);
      return base;
    });
  }
  function selectAllKeys() {
    if (!options) return;
    setIncludedKeys(new Set(options.essentials.map((e) => e.key)));
  }
  function clearAllKeys() {
    setIncludedKeys(new Set());
  }
  // Categorias: liga/desliga em bloco todas as chaves da categoria
  function toggleCategory(cat: EssentialCategory) {
    if (!options) return;
    const keysInCat = options.essentials.filter((e) => e.category === cat).map((e) => e.key);
    setIncludedKeys((prev) => {
      const base = prev ? new Set(prev) : new Set<EssentialKey>();
      const allOn = keysInCat.every((k) => base.has(k));
      if (allOn) for (const k of keysInCat) base.delete(k);
      else for (const k of keysInCat) base.add(k);
      return base;
    });
  }

  async function persist(name: string) {
    if (!result) return;
    if (!session.user) {
      toast.error("Faça login para salvar cestas.");
      return;
    }
    setSaving(true);
    try {
      const visibleItems = result.items.filter((it) => !manualRemovals.has(it.key));
      const visibleTotal = Number(
        visibleItems.reduce((s, it) => s + it.price, 0).toFixed(2),
      );
      const restrictedTo = result.restrictedTo ?? null;
      await saveFn({
        data: {
          name,
          mode: "budget",
          filters: {
            budget: result.budget,
            establishmentId: restrictedTo?.establishmentId ?? null,
            establishmentName: restrictedTo?.establishmentName ?? null,
            includeKeys: result.includedKeys,
            removed: Array.from(manualRemovals),
          },
          snapshot: JSON.parse(
            JSON.stringify({
              variant: "budget",
              result: {
                ...result,
                items: visibleItems,
                total: visibleTotal,
                remaining: Number((result.budget - visibleTotal).toFixed(2)),
              },
              removed: Array.from(manualRemovals),
            }),
          ),
        },
      });
      toast.success("Cesta salva com sucesso.");
      qc.invalidateQueries({ queryKey: ["saved-baskets"] });
      setSaveDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const budgetValue = useMemo(() => {
    const n = Number(input.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [input]);

  // Recalcula totais considerando itens removidos manualmente, quantidades e swaps.
  const visibleResult = useMemo(() => {
    if (!result) return null;
    const items = result.items
      .filter((it) => !manualRemovals.has(it.key))
      .map((it) => {
        const swap = swapMap[it.key];
        const merged = swap
          ? {
              ...it,
              price: swap.price,
              establishmentId: swap.establishmentId,
              establishmentName: swap.establishmentName,
              productName: swap.productName,
            }
          : it;
        return merged;
      });
    const total = Number(
      items.reduce((s, it) => s + it.price * (itemQty[it.key] ?? 1), 0).toFixed(2),
    );
    return {
      ...result,
      items,
      total,
      remaining: Number((result.budget - total).toFixed(2)),
    } as BudgetBasketResult;
  }, [result, manualRemovals, swapMap, itemQty]);

  const usage = visibleResult
    ? Math.min(100, (visibleResult.total / visibleResult.budget) * 100)
    : 0;

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (budgetValue <= 0) {
      setErr("Informe um orçamento válido.");
      return;
    }
    if (scope === "store" && !selectedStoreId) {
      setErr("Selecione uma mercado para montar a cesta.");
      return;
    }
    if (includedKeys && includedKeys.size === 0) {
      setErr("Selecione ao menos 1 item para a cesta.");
      return;
    }
    // Alerta antes da varredura: piso já ultrapassa o orçamento.
    if (previewData && previewData.count > 0 && previewData.minSum > budgetValue) {
      const excess = previewData.minSum - budgetValue;
      const ok = await confirm({
        title: "Custo estimado acima do orçamento",
        description:
          `Os itens escolhidos já custam pelo menos ${fmt(previewData.minSum)} — ` +
          `${fmt(excess)} acima do seu orçamento de ${fmt(budgetValue)}. ` +
          `Podemos montar assim mesmo (com corte de itens), mas você tende a ficar com uma cesta incompleta.\n\n` +
          `Prefere ajustar as categorias ou aumentar o valor antes?`,
        confirmLabel: "Montar mesmo assim",
        cancelLabel: "Ajustar antes",
        tone: "warning",
      });
      if (!ok) return;
    }
    setErr(null);
    setLoading(true);
    try {
      const r = await build({
        data: {
          budget: budgetValue,
          establishmentId: scope === "store" ? selectedStoreId : null,
          includeKeys: includedList,
        },
      });
      setResult(r);
      setManualRemovals(new Set());
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Falha ao montar cesta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!result) return;
    const ok = await confirm({
      title: "Limpar cesta?",
      description: `Isto vai apagar a cesta com ${(visibleResult?.items.length ?? result.items.length)} ${(visibleResult?.items.length ?? result.items.length) === 1 ? "item" : "itens"} montada por orçamento. Você poderá montar de novo a qualquer momento.`,
      confirmLabel: "Sim, limpar",
      cancelLabel: "Cancelar",
      tone: "danger",
      destructive: true,
    });
    if (!ok) return;
    setResult(null);
    setManualRemovals(new Set());
    setErr(null);
    toast.success("Cesta apagada.");
  }

  async function handleRemoveItem(key: EssentialKey, label: string, price: number) {
    const ok = await confirm({
      title: `Remover ${label}?`,
      description: `Vamos tirar "${label}" (${fmt(price)}) da cesta. O total e a sobra serão recalculados.`,
      confirmLabel: "Sim, remover",
      cancelLabel: "Manter",
      tone: "danger",
      destructive: true,
    });
    if (!ok) return;
    setManualRemovals((prev) => new Set(prev).add(key));
    toast.success(`${label} removido da cesta.`);
  }

  function handleRestoreItem(key: EssentialKey) {
    setManualRemovals((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  }

  async function handleLoadSaved(id: string) {
    try {
      const detail = await getSavedFn({ data: { id } });
      if (!detail) return;
      const snap = detail.snapshot as {
        variant?: string;
        result?: BudgetBasketResult;
        removed?: EssentialKey[];
      } | null;
      if (!snap || snap.variant !== "budget" || !snap.result) {
        toast.error("Snapshot inválido.");
        return;
      }
      setResult(snap.result);
      setManualRemovals(new Set(snap.removed ?? []));
      setInput(String(snap.result.budget));
      if (snap.result.restrictedTo) {
        setScope("store");
        setSelectedStoreId(snap.result.restrictedTo.establishmentId);
      }
      toast.success(`Cesta "${detail.name}" carregada.`);
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Falha ao carregar cesta.");
    }
  }

  async function handleDeleteSaved(id: string, name: string) {
    const ok = await confirm({
      title: `Excluir "${name}"?`,
      description: "A cesta salva será removida do seu histórico. Essa ação não pode ser desfeita.",
      confirmLabel: "Sim, excluir",
      cancelLabel: "Cancelar",
      tone: "danger",
      destructive: true,
    });
    if (!ok) return;
    try {
      await delSavedFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["saved-baskets"] });
      toast.success("Cesta excluída.");
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Falha ao excluir.");
    }
  }

  /**
   * Duplicar cesta do histórico: aplica orçamento, mercado e categorias no formulário
   * mas NÃO monta automaticamente — o usuário ajusta antes de rodar a varredura.
   */
  async function handleDuplicateSaved(id: string) {
    try {
      const detail = await getSavedFn({ data: { id } });
      if (!detail) return;
      const snap = detail.snapshot as {
        variant?: string;
        result?: BudgetBasketResult;
      } | null;
      if (!snap || snap.variant !== "budget" || !snap.result) {
        toast.error("Só é possível duplicar cestas montadas por orçamento.");
        return;
      }
      // Confirmação opcional — mostra mercado e categorias pré-carregadas para
      // o usuário revisar antes de aplicar no formulário.
      const storeName = snap.result.restrictedTo?.establishmentName ?? "Todas as mercados";
      const includedKeysList = Array.isArray(snap.result.includedKeys)
        ? (snap.result.includedKeys as EssentialKey[])
        : [];
      const categoryPreview = (() => {
        if (!options || includedKeysList.length === 0) return "Todas as categorias";
        const cats = new Set<string>();
        for (const key of includedKeysList) {
          const ess = options.essentials.find((e) => e.key === key);
          if (ess?.category) cats.add(ess.category);
        }
        if (cats.size === 0) return "Todas as categorias";
        return Array.from(cats).join(", ");
      })();
      const budgetLabel = `R$ ${snap.result.budget.toFixed(2).replace(".", ",")}`;
      const ok = await confirm({
        title: `Duplicar "${detail.name}"?`,
        description: `Orçamento ${budgetLabel} · Mercado: ${storeName} · Categorias: ${categoryPreview}. Você poderá ajustar antes de rodar a varredura.`,
        confirmLabel: "Duplicar e ajustar",
        cancelLabel: "Cancelar",
        tone: "info",
      });
      if (!ok) return;
      setResult(null);
      setManualRemovals(new Set());
      setErr(null);
      setInput(String(snap.result.budget));
      if (snap.result.restrictedTo) {
        setScope("store");
        setSelectedStoreId(snap.result.restrictedTo.establishmentId);
      } else {
        setScope("global");
        setSelectedStoreId(null);
      }
      if (options && includedKeysList.length > 0) {
        setIncludedKeys(new Set(includedKeysList));
      }
      setShowCustomize(true);
      toast.success(
        `Cesta "${detail.name}" duplicada. Ajuste mercado/categorias e clique em Montar.`,
      );
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Falha ao duplicar cesta.");
    }
  }

  /** Exporta a cesta atual (resultado do orçamento) em PDF. */
  function handleExportPdf() {
    if (!visibleResult) return;
    const items = visibleResult.items.map((it) => {
      const qty = itemQty[it.key] ?? 1;
      return {
        key: it.key,
        label: it.label,
        quantity: qty,
        productName: it.productName ?? null,
        establishmentName: it.establishmentName ?? null,
        unitPrice: it.price,
        avgPrice: null as number | null,
      };
    });
    const totalWithQty = Number(
      items.reduce((s, it) => s + it.unitPrice * it.quantity, 0).toFixed(2),
    );
    exportManualBasketPdf({
      items,
      total: totalWithQty,
      estimatedAvgTotal: totalWithQty,
      savings: 0,
      totalUnits: items.reduce((s, it) => s + it.quantity, 0),
      missingCount: visibleResult.missing?.length ?? 0,
    });
    toast.success("PDF exportado.");
  }

  /** Exporta uma cesta do histórico em PDF diretamente (busca snapshot). */
  async function handleExportSavedPdf(id: string, name: string) {
    try {
      const detail = await getSavedFn({ data: { id } });
      if (!detail) return;
      exportSavedBasketDetailToPdf(detail, name);
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : "Falha ao exportar PDF.");
    }
  }

  // Listener: IA define orçamento e roda a montagem
  useEffect(() => {
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number }>).detail;
      if (!detail?.amount) return;
      setInput(String(detail.amount));
      setLoading(true);
      setErr(null);
      build({
        data: {
          budget: detail.amount,
          establishmentId: scope === "store" ? selectedStoreId : null,
          includeKeys: includedList,
        },
      })
        .then((r) => setResult(r))
        .catch((ex) => setErr(ex instanceof Error ? ex.message : "Falha ao montar cesta."))
        .finally(() => setLoading(false));
    };
    window.addEventListener("precocerto:basket-set-budget", onSet);
    return () => window.removeEventListener("precocerto:basket-set-budget", onSet);
  }, [build, scope, selectedStoreId, includedList]);

  const totalEssentials = options?.essentials.length ?? 0;
  const includedCount = includedKeys?.size ?? totalEssentials;
  const isFullyIncluded = includedCount === totalEssentials;

  // Prévia da varredura: itens que entrarão no cálculo com preços estimados.
  const previewData = useMemo(() => {
    if (!options) return null;
    const list = options.essentials
      .filter((e) => includedKeys?.has(e.key) ?? true)
      .map((e) => {
        // Se há mercado selecionada, priorize o preço mínimo local; senão, use o global.
        const storeMin =
          scope === "store" && selectedStoreId
            ? options.stores.find((s) => s.establishmentId === selectedStoreId)
                ?.minPricesByKey[e.key] ?? null
            : null;
        return {
          key: e.key,
          label: e.label,
          category: e.category,
          avgPrice: e.avgPrice,
          minPrice: storeMin ?? e.minPrice,
          storesCount: e.storesCount,
          availableHere: scope === "store" ? storeMin != null : e.storesCount > 0,
        };
      });
    const minSum = list.reduce((s, r) => s + (r.minPrice ?? 0), 0);
    const avgSum = list.reduce((s, r) => s + (r.avgPrice ?? r.minPrice ?? 0), 0);
    const withPrice = list.filter((r) => r.availableHere).length;
    return {
      list,
      count: list.length,
      withPrice,
      minSum: Number(minSum.toFixed(2)),
      avgSum: Number(avgSum.toFixed(2)),
    };
  }, [options, includedKeys, scope, selectedStoreId]);

  // Histórico de cestas salvas — filtra por mercado quando escopo === 'store'.
  const savedFiltered = useMemo(() => {
    const rows = savedQuery.data ?? [];
    return rows
      .filter((r) => r.mode === "budget")
      .filter((r) => {
        if (scope !== "store" || !selectedStoreId) return true;
        const f = (r.filters ?? {}) as { establishmentId?: string | null };
        return f.establishmentId === selectedStoreId;
      })
      .slice(0, 8);
  }, [savedQuery.data, scope, selectedStoreId]);

  return (
    <div className="space-y-3">
      <form
        onSubmit={run}
        className="rounded-2xl border border-border bg-surface p-4"
      >
        {/* Escopo: geral vs. mercado */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-background p-1 border border-border">
          <button
            type="button"
            onClick={() => setScope("global")}
            className={
              "rounded-lg px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition " +
              (scope === "global"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Melhor preço (todas as mercados)
          </button>
          <button
            type="button"
            onClick={() => setScope("store")}
            className={
              "rounded-lg px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition " +
              (scope === "store"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Em uma mercado específica
          </button>
        </div>

        {scope === "store" && (
          <div className="mb-3">
            <label htmlFor="basket-store" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Mercado
            </label>
            <select
              id="basket-store"
              value={selectedStoreId ?? ""}
              onChange={(e) => setSelectedStoreId(e.target.value || null)}
              disabled={optionsLoading}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 font-display text-[13px] text-foreground outline-none focus:border-primary"
            >
              <option value="">
                {optionsLoading ? "Carregando mercados..." : "Selecione uma mercado"}
              </option>
              {options?.stores.map((s) => (
                <option key={s.establishmentId} value={s.establishmentId}>
                  {s.establishmentName}
                  {s.city ? ` — ${s.city}` : ""} ({s.itemsCovered}/{s.totalEssentials} itens)
                </option>
              ))}
            </select>
          </div>
        )}

        <label htmlFor="budget" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Quanto você tem para gastar?
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <span className="font-display text-[16px] font-semibold text-muted-foreground">R$</span>
          <input
            id="budget"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^\d.,]/g, "").slice(0, 8))}
            className="h-12 w-full bg-transparent font-display text-[24px] font-bold tabular-nums text-foreground outline-none"
            placeholder="100,00"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 font-display text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BasketMark className="h-3.5 w-3.5" />
            )}
            Montar
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {BUDGET_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInput(String(v))}
              className={
                "rounded-full border px-2.5 py-1 font-mono text-[11px] tabular-nums transition " +
                (budgetValue === v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
              }
            >
              R$ {v}
            </button>
          ))}
        </div>

        {/* Personalização de itens */}
        {options && (
          <div className="mt-3 rounded-xl border border-border bg-background/60 p-2.5">
            <button
              type="button"
              onClick={() => setShowCustomize((v) => !v)}
              className="flex w-full items-center justify-between gap-2"
              aria-expanded={showCustomize}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
                Personalizar itens
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                  {isFullyIncluded ? "todos" : `${includedCount}/${totalEssentials}`}
                </span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {showCustomize ? "esconder" : "escolher"}
              </span>
            </button>
            {showCustomize && (
              <div className="mt-2.5 space-y-3">
                {/* Filtro por categoria */}
                {options.categories.length > 0 && (
                  <div>
                    <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Categorias
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {options.categories.map((c) => {
                        const keysInCat = options.essentials
                          .filter((e) => e.category === c.key)
                          .map((e) => e.key);
                        const onCount = keysInCat.filter((k) => includedKeys?.has(k)).length;
                        const state: "all" | "some" | "none" =
                          onCount === keysInCat.length
                            ? "all"
                            : onCount === 0
                              ? "none"
                              : "some";
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => toggleCategory(c.key)}
                            className={
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition " +
                              (state === "all"
                                ? "border-primary bg-primary text-primary-foreground"
                                : state === "some"
                                  ? "border-primary/60 bg-primary/10 text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/40")
                            }
                            aria-pressed={state !== "none"}
                            title={
                              state === "all"
                                ? "Clique para desmarcar todos desta categoria"
                                : "Clique para marcar todos desta categoria"
                            }
                          >
                            {c.label}
                            <span className="opacity-70">
                              {onCount}/{c.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Itens individuais */}
                <div>
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Itens
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.essentials.map((e) => {
                      const on = includedKeys?.has(e.key) ?? true;
                      return (
                        <button
                          key={e.key}
                          type="button"
                          onClick={() => toggleKey(e.key)}
                          className={
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] transition " +
                            (on
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40")
                          }
                          aria-pressed={on}
                        >
                          <EssentialGlyph k={e.key} className="h-3 w-3" />
                          {e.label}
                          {typeof e.avgPrice === "number" && (
                            <span className="opacity-60">· {fmt(e.avgPrice)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllKeys}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:underline"
                  >
                    Marcar todos
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={clearAllKeys}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:underline"
                  >
                    Desmarcar todos
                  </button>
                </div>
                <p className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
                  Só os itens marcados vão para o cálculo. Você pode ajustar antes de montar.
                </p>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Prévia da varredura: mostra o que será considerado antes do usuário clicar em "Montar". */}
      {options && previewData && (
        <div className="rounded-2xl border border-border bg-surface p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Prévia da varredura
                {scope === "store" && selectedStoreId && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                    mercado selecionada
                  </span>
                )}
              </p>
              <h3 className="mt-0.5 font-display text-[13px] font-semibold text-foreground">
                {previewData.count} {previewData.count === 1 ? "item" : "itens"} · custo estimado {fmt(previewData.minSum)}
                {previewData.avgSum > previewData.minSum && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    – {fmt(previewData.avgSum)}
                  </span>
                )}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {previewData.withPrice}/{previewData.count} com preço {scope === "store" ? "nesta mercado" : "recente"}
                {previewData.count > 0 && (
                  <>
                    {" "}· piso: menor preço · teto: média entre mercados
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="shrink-0 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
              aria-expanded={previewOpen}
              aria-controls="basket-preview-list"
            >
              {previewOpen ? "esconder" : "ver lista"}
            </button>
          </div>
          {previewOpen && previewData.count > 0 && (
            <ul
              id="basket-preview-list"
              className="mt-2.5 divide-y divide-border/60 rounded-xl border border-border/60 bg-background"
            >
              {previewData.list.map((r) => (
                <li key={r.key} className="flex items-center gap-2 px-3 py-1.5">
                  <EssentialGlyph k={r.key} className="h-3.5 w-3.5 text-primary" />
                  <span className="flex-1 truncate font-display text-[12.5px] text-foreground">
                    {r.label}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {r.category}
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums">
                    {r.minPrice != null ? (
                      <>
                        <span className="text-primary">{fmt(r.minPrice)}</span>
                        {r.avgPrice != null && r.avgPrice > r.minPrice && (
                          <span className="text-muted-foreground"> / {fmt(r.avgPrice)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">sem preço</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {previewData.count === 0 && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-warning">
              Nenhum item selecionado. Marque ao menos 1 essencial para montar.
            </p>
          )}
          {previewData.count > 0 && budgetValue > 0 && previewData.minSum > budgetValue && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 px-2.5 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-warning">
                  Custo estimado acima do orçamento
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  Piso {fmt(previewData.minSum)} · teto {fmt(previewData.avgSum)} vs orçamento{" "}
                  <span className="font-medium text-foreground">{fmt(budgetValue)}</span>.
                  Desmarque categorias ou aumente o valor para caber tudo.
                </p>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Histórico de cestas salvas (filtra por mercado quando aplicável). */}
      {session.user && savedFiltered.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Histórico
              {scope === "store" && selectedStoreId && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                  desta mercado
                </span>
              )}
            </p>
            <span className="font-mono text-[11px] text-muted-foreground">
              {savedFiltered.length} {savedFiltered.length === 1 ? "cesta" : "cestas"}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {savedFiltered.map((s) => {
              const f = (s.filters ?? {}) as {
                budget?: number;
                establishmentName?: string | null;
              };
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[12.5px] font-medium text-foreground">
                      {s.name}
                    </p>
                    <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {typeof f.budget === "number" ? `R$ ${f.budget.toFixed(0)}` : "—"}
                      {f.establishmentName ? ` · ${f.establishmentName}` : ""}
                      {" · "}
                      {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(s.id)}
                    className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Carregar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateSaved(s.id)}
                    aria-label={`Duplicar cesta ${s.name}`}
                    title="Duplicar para nova variação"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSavedPdf(s.id, s.name)}
                    aria-label={`Exportar PDF da cesta ${s.name}`}
                    title="Exportar em PDF"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(s.id, s.name)}
                    aria-label={`Excluir cesta ${s.name}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Duplique para variar mercado/categorias sem perder a original. Use o painel abaixo para comparar duas cestas lado a lado.
          </p>
        </div>
      )}

      {err && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}

      {visibleResult && result && (
        <section className="space-y-3">
          {/* Barra de progresso do orçamento */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Uso do orçamento
              </p>
              <p className="font-display text-[13px] font-semibold tabular-nums text-foreground">
                {fmt(visibleResult.total)} <span className="text-muted-foreground font-normal">/ {fmt(visibleResult.budget)}</span>
              </p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${usage}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {visibleResult.remaining >= 0
                ? `sobra ${fmt(visibleResult.remaining)} · ${visibleResult.items.length} itens`
                : `${fmt(Math.abs(visibleResult.remaining))} acima do orçamento`}
            </p>
            {visibleResult.restrictedTo && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                Mercado: {visibleResult.restrictedTo.establishmentName}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {session.user && (
                <button
                  type="button"
                  onClick={() => setSaveDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
                >
                  <Star className="h-3.5 w-3.5" /> Salvar cesta
                </button>
              )}
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
              >
                <FileDown className="h-3.5 w-3.5" /> Exportar PDF
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar cesta
              </button>
            </div>
          </div>
          {saveDialog && (
            <SaveNamedDialog
              defaultName={`Cesta R$${visibleResult.budget.toFixed(0)}${visibleResult.restrictedTo ? " · " + visibleResult.restrictedTo.establishmentName : ""} · ${new Date().toLocaleDateString("pt-BR")}`}
              submitLabel="Salvar"
              busy={saving}
              onCancel={() => setSaveDialog(false)}
              onConfirm={persist}
            />
          )}

          <div className="rounded-2xl border border-border bg-surface">
            <div className="border-b border-border/60 px-4 py-2.5">
              <h2 className="font-display text-[13px] font-semibold tracking-tight text-foreground">
                Itens escolhidos ({visibleResult.items.length})
              </h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {visibleResult.restrictedTo
                  ? "Menor preço recente na mercado selecionada"
                  : "Menor preço recente em qualquer mercado"}
              </p>
            </div>
            <ul className="divide-y divide-border/60">
              {visibleResult.items.map((it, i) => {
                const qtyValue = itemQty[it.key] ?? 1;
                const lineTotal = it.price * qtyValue;
                const swap = swapMap[it.key];
                const strip = allPrices[it.key] ?? [];
                return (
                  <li key={`${it.key}-${i}`} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <EssentialGlyph k={it.key} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[13px] font-medium text-foreground">
                          {it.label}
                          {swap ? (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1 py-[1px] align-middle font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
                              <Repeat className="h-2 w-2" aria-hidden="true" /> trocado
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {it.productName} · {it.establishmentName}
                        </p>
                      </div>
                      {/* Quantidade +/- inline */}
                      <div className="flex shrink-0 items-center rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => bumpQty(it.key, -1)}
                          aria-label={`Diminuir ${it.label}`}
                          className="grid h-7 w-7 place-items-center rounded-l-md text-muted-foreground hover:bg-primary/5 hover:text-foreground disabled:opacity-40"
                          disabled={qtyValue <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={20}
                          value={qtyValue}
                          onChange={(e) => setQtyValue(it.key, Number(e.target.value))}
                          aria-label={`Quantidade de ${it.label}`}
                          className="w-8 border-0 bg-transparent text-center font-display text-[12px] font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => bumpQty(it.key, +1)}
                          aria-label={`Aumentar ${it.label}`}
                          className="grid h-7 w-7 place-items-center rounded-r-md text-primary hover:bg-primary/10 disabled:opacity-40"
                          disabled={qtyValue >= 20}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="shrink-0 text-right">
                        <Link
                          to="/loja/$id"
                          params={{ id: it.establishmentId }}
                          search={{ q: "" }}
                          className="block font-display text-[14px] font-semibold tabular-nums text-primary hover:underline"
                          title="Ver na mercado"
                        >
                          {fmt(it.price)}
                        </Link>
                        {qtyValue > 1 ? (
                          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            × {qtyValue} = <span className="text-foreground">{fmt(lineTotal)}</span>
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.key, it.label, it.price)}
                        aria-label={`Remover ${it.label} da cesta`}
                        title="Remover este item"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Ações + strip de comparação lado a lado */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openBudgetPrices(it.key, it.label)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <Repeat className="h-2.5 w-2.5" /> Trocar mercado
                      </button>
                      <Link
                        to="/buscar"
                        search={{ q: it.label }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/40 hover:text-primary"
                        title="Buscar variantes específicas deste item"
                      >
                        <Search className="h-2.5 w-2.5" /> Buscar item
                      </Link>
                      {swap ? (
                        <button
                          type="button"
                          onClick={() => clearSwap(it.key)}
                          className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary hover:bg-primary/15"
                        >
                          Restaurar automático
                        </button>
                      ) : null}
                    </div>
                    {strip.length > 1 ? (
                      <ItemPriceStrip
                        className="mt-1.5"
                        rows={strip}
                        activeEstablishmentId={it.establishmentId}
                        fmt={fmt}
                        onPick={(row) => {
                          const existing = strip.find(
                            (r) => r.establishmentId === row.establishmentId,
                          );
                          if (!existing) return;
                          applySwap(it.key, it.label, {
                            establishmentId: row.establishmentId,
                            establishmentName: row.establishmentName,
                            price: row.price,
                            productName: it.productName,
                          });
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
              {visibleResult.items.length === 0 && (
                <li className="px-4 py-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Todos os itens foram removidos. Restaure abaixo ou monte novamente.
                </li>
              )}
            </ul>
          </div>

          {manualRemovals.size > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="font-display text-[12.5px] font-semibold text-foreground">
                Removidos desta cesta
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Clique em um item para trazer de volta ao cálculo.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(manualRemovals).map((k) => {
                  const orig = result.items.find((it) => it.key === k);
                  if (!orig) return null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleRestoreItem(k)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      <EssentialGlyph k={k} className="h-3 w-3" />
                      {orig.label} <span className="opacity-60">· {fmt(orig.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div className="rounded-2xl border border-warning/40 bg-warning/5 p-3">
              <p className="font-display text-[12.5px] font-semibold text-foreground">
                Não couberam no orçamento
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {result.missing.map((m) => m.label).join(" · ")}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Diálogo "trocar mercado" no modo orçamento */}
      {pricesOpen && (
        <EssentialPricesDialog
          label={pricesOpen.label}
          loading={pricesLoading}
          result={pricesData}
          onClose={() => {
            setPricesOpen(null);
            setPricesData(null);
          }}
          onSelect={(r) =>
            applySwap(pricesOpen.key, pricesOpen.label, {
              establishmentId: r.establishmentId,
              establishmentName: r.establishmentName,
              price: r.price,
              productName: r.productName,
            })
          }
        />
      )}
    </div>
  );
}


/* ============================= MANUAL MODE ============================= */

function ManualMode({
  data,
  loading,
  initialQty,
  filters,
}: {
  data: BasketComparisonResult | null;
  loading: boolean;
  initialQty?: Record<string, number>;
  filters?: {
    city: string;
    radiusKm: number | null;
    originLat: number | null;
    originLng: number | null;
  };
}) {
  const session = useSession();
  const { confirm } = useConfirm();
  const qc = useQueryClient();

  const saveFn = useServerFn(saveBasket);
  const listPricesFn = useServerFn(listEssentialPrices);
  const getDraftFn = useServerFn(getDraftBasket);
  const saveDraftFn = useServerFn(saveDraftBasket);
  const clearDraftFn = useServerFn(clearDraftBasket);
  const explainFn = useServerFn(explainBasketSavings);
  const createStoreAlertFn = useServerFn(createStoreBasketAlert);
  const [qty, setQty] = useState<Record<EssentialKey, number>>(
    (initialQty as Record<EssentialKey, number>) ?? ({} as Record<EssentialKey, number>),
  );
  const [saveDialog, setSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSyncing, setDraftSyncing] = useState(false);
  const [pricesOpen, setPricesOpen] = useState<{
    key: EssentialKey;
    label: string;
  } | null>(null);
  const [pricesData, setPricesData] = useState<EssentialPricesResult | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  const cheapestMap = useMemo(() => {
    const m = new Map<EssentialKey, BasketComparisonResult["cheapest"][number]>();
    for (const c of data?.cheapest ?? []) m.set(c.key, c);
    return m;
  }, [data]);

  // Load draft on mount (only for logged-in users)
  useEffect(() => {
    if (!session.user || draftLoaded) return;
    let cancelled = false;
    getDraftFn()
      .then((d) => {
        if (cancelled || !d) return;
        const filtered: Record<string, number> = {};
        for (const [k, v] of Object.entries(d.quantities)) {
          const n = Math.max(0, Math.min(20, Math.floor(Number(v) || 0)));
          if (n > 0) filtered[k] = n;
        }
        if (Object.keys(filtered).length > 0) {
          setQty((prev) => {
            // Se veio quantidade da URL, não sobrescrever com rascunho
            if (Object.keys(prev).length > 0) return prev;
            toast.info("Rascunho da sua cesta carregado.");
            return filtered as Record<EssentialKey, number>;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.user, draftLoaded, getDraftFn]);

  // Debounced autosave of draft (only for logged-in users, after initial load)
  const skipSaveRef = useRef(true);
  useEffect(() => {
    if (!session.user || !draftLoaded) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    setDraftSyncing(true);
    const t = setTimeout(() => {
      const active: Record<string, number> = {};
      for (const [k, v] of Object.entries(qty)) if (v > 0) active[k] = v;
      saveDraftFn({ data: { quantities: active } })
        .catch(() => {})
        .finally(() => setDraftSyncing(false));
    }, 800);
    return () => clearTimeout(t);
  }, [qty, session.user, draftLoaded, saveDraftFn]);

  // Listeners: assistant IA controla itens
  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent<{ key: EssentialKey; qty: number }>).detail;
      if (!detail?.key) return;
      setQty((prev) => {
        const cur = prev[detail.key] ?? 0;
        return { ...prev, [detail.key]: Math.max(0, Math.min(20, cur + (detail.qty || 1))) };
      });
      toast.success(`Adicionado: ${detail.key}`);
    };
    const onRemove = (e: Event) => {
      const detail = (e as CustomEvent<{ key: EssentialKey }>).detail;
      if (!detail?.key) return;
      setQty((prev) => ({ ...prev, [detail.key]: 0 }));
    };
    const onClear = () => setQty({} as Record<EssentialKey, number>);
    window.addEventListener("precocerto:basket-add-item", onAdd);
    window.addEventListener("precocerto:basket-remove-item", onRemove);
    window.addEventListener("precocerto:basket-clear-manual", onClear);
    return () => {
      window.removeEventListener("precocerto:basket-add-item", onAdd);
      window.removeEventListener("precocerto:basket-remove-item", onRemove);
      window.removeEventListener("precocerto:basket-clear-manual", onClear);
    };
  }, []);

  function bump(key: EssentialKey, delta: number) {
    setQty((prev) => {
      const cur = prev[key] ?? 0;
      const next = Math.max(0, Math.min(20, cur + delta));
      return { ...prev, [key]: next };
    });
  }
  function addOne(key: EssentialKey) {
    setQty((prev) => {
      const cur = prev[key] ?? 0;
      return { ...prev, [key]: Math.min(20, cur + 1) };
    });
  }
  function removeItem(key: EssentialKey) {
    setQty((prev) => ({ ...prev, [key]: 0 }));
  }
  async function removeItemWithConfirm(key: EssentialKey, label: string) {
    const cur = qty[key] ?? 0;
    // Confirmação opcional: só pergunta quando há mais de 1 unidade,
    // evitando fricção em cliques rápidos.
    if (cur > 1) {
      const ok = await confirm({
        title: `Remover ${label}?`,
        description: `Você tem ${cur} ${cur === 1 ? "unidade" : "unidades"} de "${label}" na cesta. Deseja remover este item?`,
        confirmLabel: "Sim, remover",
        cancelLabel: "Manter",
        tone: "danger",
        destructive: true,
      });
      if (!ok) return;
    }
    removeItem(key);
  }

  const totals = useMemo(() => {
    let sum = 0;
    let avgSum = 0;
    let items = 0;
    let missing = 0;
    for (const ess of data?.essentials ?? []) {
      const n = qty[ess.key] ?? 0;
      if (n <= 0) continue;
      items += n;
      const c = cheapestMap.get(ess.key);
      const avg = data?.averagePrices[ess.key];
      if (c) sum += c.price * n;
      else missing += 1;
      if (typeof avg === "number") avgSum += avg * n;
    }
    const savings = Math.max(0, Number((avgSum - sum).toFixed(2)));
    return { sum: Number(sum.toFixed(2)), avgSum: Number(avgSum.toFixed(2)), items, missing, savings };
  }, [qty, cheapestMap, data]);

  // Aggregated totals per establishment (auto-cheapest per item)
  const perStore = useMemo(() => {
    const map = new Map<
      string,
      { establishmentId: string; establishmentName: string; total: number; itemCount: number; units: number }
    >();
    for (const ess of data?.essentials ?? []) {
      const n = qty[ess.key] ?? 0;
      if (n <= 0) continue;
      const c = cheapestMap.get(ess.key);
      if (!c) continue;
      const cur = map.get(c.establishmentId) ?? {
        establishmentId: c.establishmentId,
        establishmentName: c.establishmentName,
        total: 0,
        itemCount: 0,
        units: 0,
      };
      cur.total += c.price * n;
      cur.itemCount += 1;
      cur.units += n;
      map.set(c.establishmentId, cur);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, total: Number(r.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
  }, [qty, cheapestMap, data]);

  // Custo total da cesta se comprada INTEIRAMENTE em cada estabelecimento.
  // Itens não disponíveis na mercado são estimados pela média (averagePrices) e sinalizados.
  const perStoreFull = useMemo(() => {
    if (!data) return [];
    const selectedKeys = data.essentials
      .map((e) => e.key)
      .filter((k) => (qty[k] ?? 0) > 0);
    if (selectedKeys.length === 0) return [];
    const rows = data.stores.map((s) => {
      let covered = 0;
      let coveredCost = 0;
      let estimatedCost = 0;
      let missing = 0;
      let missingUnits = 0;
      const missingLabels: string[] = [];
      for (const key of selectedKeys) {
        const idx = data.essentials.findIndex((e) => e.key === key);
        const it = s.items[idx];
        const n = qty[key] ?? 0;
        if (it) {
          covered += 1;
          coveredCost += it.price * n;
        } else {
          missing += 1;
          missingUnits += n;
          const avg = data.averagePrices[key];
          if (typeof avg === "number") estimatedCost += avg * n;
          const ess = data.essentials.find((e) => e.key === key);
          if (ess) missingLabels.push(ess.label);
        }
      }
      const totalReal = Number(coveredCost.toFixed(2));
      const totalEstimated = Number((coveredCost + estimatedCost).toFixed(2));
      return {
        establishmentId: s.establishmentId,
        establishmentName: s.establishmentName,
        selected: selectedKeys.length,
        covered,
        missing,
        missingUnits,
        missingLabels,
        totalReal,
        totalEstimated,
        coverage: selectedKeys.length > 0 ? covered / selectedKeys.length : 0,
      };
    });
    // ordenar: preferir melhor cobertura; empate → menor total estimado
    rows.sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return a.totalEstimated - b.totalEstimated;
    });
    return rows;
  }, [qty, data]);

  async function openPrices(key: EssentialKey, label: string) {
    setPricesOpen({ key, label });
    setPricesData(null);
    setPricesLoading(true);
    try {
      const r = await listPricesFn({ data: { key } });
      setPricesData(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar preços.");
      setPricesOpen(null);
    } finally {
      setPricesLoading(false);
    }
  }

  function exportPdf() {
    if (!data) return;
    const items = data.essentials
      .map((ess) => {
        const n = qty[ess.key] ?? 0;
        if (n <= 0) return null;
        const c = cheapestMap.get(ess.key);
        const avg = data.averagePrices[ess.key] ?? null;
        return {
          key: ess.key,
          label: ess.label,
          quantity: n,
          productName: c?.productName ?? null,
          establishmentName: c?.establishmentName ?? null,
          unitPrice: c?.price ?? null,
          avgPrice: avg,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (items.length === 0) {
      toast.error("Adicione ao menos 1 item para exportar.");
      return;
    }
    exportManualBasketPdf({
      items,
      total: totals.sum,
      estimatedAvgTotal: totals.avgSum,
      savings: totals.savings,
      totalUnits: totals.items,
      missingCount: totals.missing,
      perStore: perStoreFull,
    });
    toast.success("PDF exportado.");
  }

  function shareLink() {
    const active: Record<string, number> = {};
    for (const [k, v] of Object.entries(qty)) if (v > 0) active[k] = v;
    if (Object.keys(active).length === 0) {
      toast.error("Adicione ao menos 1 item para gerar o link.");
      return;
    }
    const url = buildShareUrl(window.location.origin, {
      mode: "manual",
      quantities: active,
      city: filters?.city || undefined,
      radiusKm: filters?.radiusKm ?? undefined,
    });
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link da cesta copiado. Compartilhe!"))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  async function explain() {
    const active: Partial<Record<EssentialKey, number>> = {};
    for (const [k, v] of Object.entries(qty)) if (v > 0) active[k as EssentialKey] = v;
    if (Object.keys(active).length === 0) {
      toast.error("Adicione ao menos 1 item para eu explicar a economia.");
      return;
    }
    setExplainOpen(true);
    setExplainLoading(true);
    setExplainText(null);
    try {
      const r = await explainFn({
        data: {
          quantities: active,
          city: filters?.city || null,
          radiusKm: filters?.radiusKm ?? null,
          originLat: filters?.originLat ?? null,
          originLng: filters?.originLng ?? null,
        },
      });
      setExplainText(r.text);
    } catch (e) {
      setExplainText(
        `Não consegui explicar agora: ${e instanceof Error ? e.message : "erro"}`,
      );
    } finally {
      setExplainLoading(false);
    }
  }

  async function createStoreAlert(
    establishmentId: string,
    establishmentName: string,
    targetTotal: number,
  ) {
    if (!session.user) {
      toast.error("Faça login para criar alertas.");
      return;
    }
    const active: Record<string, number> = {};
    for (const [k, v] of Object.entries(qty)) if (v > 0) active[k] = v;
    try {
      await createStoreAlertFn({
        data: {
          establishmentId,
          establishmentName,
          targetTotal,
          basketSnapshot: active,
        },
      });
      toast.success(`Alerta criado para ${establishmentName}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar alerta");
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando essenciais…
      </div>
    );
  }

  const selectedCount = Object.values(qty).filter((v) => v > 0).length;

  return (
    <div className="space-y-3">
      {/* Sticky summary */}
      <div className="sticky top-[112px] z-20 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 backdrop-blur">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Sua cesta
          </p>
          <p className="font-display text-[20px] font-bold tabular-nums text-foreground leading-none">
            {fmt(totals.sum)}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {selectedCount} tipo(s) · {totals.items} unidade(s)
            {totals.missing > 0 && ` · ${totals.missing} sem preço`}
          </p>
          {totals.savings > 0 && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              Economia: {fmt(totals.savings)} vs. média do mercado ({fmt(totals.avgSum)})
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
              aria-label="Exportar cesta em PDF"
            >
              <FileDown className="h-3 w-3" /> PDF
            </button>
          )}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={shareLink}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
              aria-label="Copiar link da cesta"
              title="Copiar link para compartilhar esta cesta"
            >
              <Share2 className="h-3 w-3" /> Link
            </button>
          )}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={explain}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              aria-label="Explicar economia"
              title="Ver quanto você economiza vs. média do mercado"
            >
              <Sparkles className="h-3 w-3" /> Economia
            </button>
          )}
          {selectedCount > 0 && session.user && (
            <button
              type="button"
              onClick={() => setSaveDialog(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
            >
              <Star className="h-3 w-3" /> Salvar
            </button>
          )}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: "Limpar cesta?",
                  description: `Isto vai remover os ${selectedCount} ${selectedCount === 1 ? "item" : "itens"} da sua cesta manual. Esta ação não pode ser desfeita.`,
                  confirmLabel: "Sim, limpar tudo",
                  cancelLabel: "Cancelar",
                  tone: "danger",
                  destructive: true,

                });
                if (!ok) return;
                setQty({} as Record<EssentialKey, number>);
                if (session.user) {
                  clearDraftFn().catch(() => {});
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar cesta
            </button>
          )}

          {session.user && selectedCount > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              aria-live="polite"
            >
              {draftSyncing ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Salvando rascunho
                </>
              ) : (
                <>
                  <Check className="h-2.5 w-2.5 text-emerald-500" /> Rascunho salvo
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {explainOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setExplainOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Explicação da economia"
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground leading-none">
                    Análise da IA
                  </p>
                  <p className="font-display text-[14px] font-semibold text-foreground">
                    Sua economia real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExplainOpen(false)}
                className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-surface"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              {explainLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando sua cesta…
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground">
                  {explainText}
                </pre>
              )}
            </div>
            {explainText && !explainLoading && (
              <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(explainText)
                      .then(() => toast.success("Análise copiada."))
                      .catch(() => toast.error("Não foi possível copiar."));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-primary/5 hover:text-primary"
                >
                  <ClipboardCopy className="h-3 w-3" /> Copiar
                </button>
                <button
                  type="button"
                  onClick={() => setExplainOpen(false)}
                  className="rounded-lg bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}



      {saveDialog && (
        <SaveNamedDialog
          defaultName={`Minha cesta · ${new Date().toLocaleDateString("pt-BR")}`}
          submitLabel="Salvar"
          busy={saving}
          onCancel={() => setSaveDialog(false)}
          onConfirm={async (name) => {
            if (!session.user) {
              toast.error("Faça login para salvar cestas.");
              return;
            }
            setSaving(true);
            try {
              const items = (data?.essentials ?? [])
                .map((ess) => {
                  const n = qty[ess.key] ?? 0;
                  if (n <= 0) return null;
                  const c = cheapestMap.get(ess.key);
                  return {
                    key: ess.key,
                    label: ess.label,
                    quantity: n,
                    productName: c?.productName ?? null,
                    establishmentId: c?.establishmentId ?? null,
                    establishmentName: c?.establishmentName ?? null,
                    unitPrice: c?.price ?? null,
                    lineTotal: c ? Number((c.price * n).toFixed(2)) : null,
                  };
                })
                .filter((x): x is NonNullable<typeof x> => x != null);
              const total = items.reduce((s, it) => s + (it.lineTotal ?? 0), 0);
              await saveFn({
                data: {
                  name,
                  mode: "budget",
                  filters: { variant: "manual" },
                  snapshot: JSON.parse(
                    JSON.stringify({ variant: "manual", items, total, quantities: qty }),
                  ),
                },
              });
              toast.success("Cesta salva com sucesso.");
              qc.invalidateQueries({ queryKey: ["saved-baskets"] });
              setSaveDialog(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      {pricesOpen && (
        <EssentialPricesDialog
          label={pricesOpen.label}
          loading={pricesLoading}
          result={pricesData}
          onClose={() => {
            setPricesOpen(null);
            setPricesData(null);
          }}
        />
      )}

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground px-1">
        Toque para adicionar · digite ou use +/− para a quantidade · a mercado mais barata é escolhida automaticamente
      </p>

      {perStore.length > 0 && (
        <section
          aria-label="Total por estabelecimento"
          className="rounded-2xl border border-border bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Total por mercado (mais barata por item)
            </p>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {perStore.length} mercado(s)
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {perStore.map((s, i) => {
              const share = totals.sum > 0 ? (s.total / totals.sum) * 100 : 0;
              return (
                <li key={s.establishmentId} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <Link
                        to="/loja/$id"
                        params={{ id: s.establishmentId }}
                        className="truncate font-display text-[13px] font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {s.establishmentName}
                      </Link>
                    </div>
                    <p className="mt-0.5 pl-7 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {s.itemCount} item(ns) · {s.units} unidade(s) · {share.toFixed(0)}% da cesta
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-[15px] font-bold tabular-nums text-foreground">
                    {fmt(s.total)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {perStoreFull.length > 0 && (
        <section
          aria-label="Comparação total por estabelecimento"
          className="rounded-2xl border border-border bg-surface p-3"
        >
          <div className="flex items-start justify-between gap-2 pb-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Quanto ficaria comprando tudo em cada mercado
              </p>
              <p className="mt-0.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground/80">
                Ordenado por cobertura da sua cesta e menor valor. Itens fora do estoque da mercado usam preço médio (estimativa).
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {perStoreFull.length} mercado(s)
            </span>
          </div>
          <ul className="divide-y divide-border/60">
            {perStoreFull.map((s, i) => {
              const full = s.missing === 0;
              const best = i === 0;
              return (
                <li key={s.establishmentId} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold " +
                          (best ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")
                        }
                      >
                        {i + 1}
                      </span>
                      <Link
                        to="/loja/$id"
                        params={{ id: s.establishmentId }}
                        className="truncate font-display text-[13px] font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {s.establishmentName}
                      </Link>
                      {best && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-600">
                          <Star className="h-2.5 w-2.5 fill-current" /> melhor
                        </span>
                      )}
                      {full ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
                          cesta completa
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-amber-600">
                          {s.missing} sem estoque
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 pl-7 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {s.covered}/{s.selected} itens · cobertura {(s.coverage * 100).toFixed(0)}%
                    </p>
                    {!full && s.missingLabels.length > 0 && (
                      <p
                        className="mt-0.5 pl-7 font-mono text-[11px] tracking-[0.06em] text-amber-700/80 line-clamp-2"
                        title={s.missingLabels.join(", ")}
                      >
                        faltam: {s.missingLabels.slice(0, 4).join(", ")}
                        {s.missingLabels.length > 4 ? ` +${s.missingLabels.length - 4}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-[15px] font-bold tabular-nums text-foreground">
                      {fmt(s.totalEstimated)}
                      {!full && (
                        <span className="ml-1 font-mono text-[11px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                          est.
                        </span>
                      )}
                    </p>
                    {!full && s.totalReal > 0 && (
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        real: {fmt(s.totalReal)}
                      </p>
                    )}
                    {session.user && (
                      <button
                        type="button"
                        onClick={() =>
                          createStoreAlert(
                            s.establishmentId,
                            s.establishmentName,
                            Math.max(1, Math.floor(s.totalEstimated * 0.9)),
                          )
                        }
                        className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary"
                        title={`Avisar quando a cesta ficar abaixo de ${fmt(Math.max(1, Math.floor(s.totalEstimated * 0.9)))} nesta mercado`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" /> alerta -10%
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}



      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {data.essentials.map((ess) => {
          const n = qty[ess.key] ?? 0;
          const c = cheapestMap.get(ess.key);
          const active = n > 0;
          const subtotal = c && active ? c.price * n : null;
          return (
            <div
              key={ess.key}
              className={
                "relative flex flex-col rounded-xl border p-3 transition " +
                (active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-surface hover:border-primary/40")
              }
            >
              <button
                type="button"
                onClick={() => addOne(ess.key)}
                aria-label={active ? `Adicionar mais um ${ess.label}` : `Adicionar ${ess.label}`}
                className="flex items-start gap-2 text-left"
              >
                <span
                  className={
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition " +
                    (active
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary")
                  }
                >
                  {active ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <EssentialGlyph k={ess.key} className="h-4.5 w-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[12.5px] font-semibold text-foreground leading-tight">
                    {ess.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {c ? `${fmt(c.price)}/un` : "sem preço"}
                  </p>
                </div>
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => removeItemWithConfirm(ess.key, ess.label)}
                  aria-label={`Remover ${ess.label} da cesta`}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {active && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-background px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => bump(ess.key, -1)}
                    aria-label={`Diminuir ${ess.label}`}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    step={1}
                    value={n}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setQty((prev) => ({ ...prev, [ess.key]: 0 }));
                        return;
                      }
                      const parsed = Math.floor(Number(raw));
                      if (!Number.isFinite(parsed)) return;
                      const clamped = Math.max(0, Math.min(20, parsed));
                      setQty((prev) => ({ ...prev, [ess.key]: clamped }));
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || Number(e.target.value) < 1) {
                        setQty((prev) => ({ ...prev, [ess.key]: 1 }));
                      }
                    }}
                    aria-label={`Quantidade de ${ess.label}`}
                    className="w-10 border-0 bg-transparent text-center font-display text-[13px] font-semibold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-primary/40 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => bump(ess.key, +1)}
                    aria-label={`Aumentar ${ess.label}`}
                    className="grid h-7 w-7 place-items-center rounded-md text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {active && subtotal != null && (
                <p className="mt-1.5 font-mono text-[11px] tabular-nums font-semibold text-foreground">
                  Subtotal: <span className="text-primary">{fmt(subtotal)}</span>
                </p>
              )}
              {active && c && (
                <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {c.establishmentName}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openPrices(ess.key, ess.label)}
                  className="inline-flex items-center gap-1 self-start rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/40 hover:text-primary"
                  aria-label={`Ver preços de ${ess.label} em outras mercados`}
                >
                  <Eye className="h-2.5 w-2.5" /> Ver preços
                </button>
                {active && c && session.user && (
                  <CreatePriceAlertButton
                    productName={c.productName}
                    displayName={ess.label}
                    defaultEstablishmentId={c.establishmentId}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EssentialPricesDialog({
  label,
  loading,
  result,
  onClose,
  onSelect,
}: {
  label: string;
  loading: boolean;
  result: EssentialPricesResult | null;
  onClose: () => void;
  /**
   * Se informado, renderiza um botão "Escolher" em cada linha e devolve a
   * escolha do usuário para o componente pai (usado no modo cesta por
   * orçamento para trocar a mercado/preço de um item específico).
   */
  onSelect?: (row: EssentialPricesResult["rows"][number]) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preços de ${label}`}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Preços em todas as mercados
            </p>
            <p className="font-display text-[16px] font-bold text-foreground leading-tight">
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando preços…
            </div>
          )}
          {!loading && result && result.rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sem preços registrados nos últimos 90 dias.
            </p>
          )}
          {!loading && result && result.rows.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 border-b border-border bg-background px-4 py-2 text-center">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Menor
                  </p>
                  <p className="font-display text-[13px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {result.min != null ? fmt(result.min) : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Média
                  </p>
                  <p className="font-display text-[13px] font-bold tabular-nums text-foreground">
                    {result.avg != null ? fmt(result.avg) : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Maior
                  </p>
                  <p className="font-display text-[13px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {result.max != null ? fmt(result.max) : "—"}
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {result.rows.map((r, i) => (
                  <li key={r.establishmentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <Link
                          to="/loja/$id"
                          params={{ id: r.establishmentId }}
                          className="truncate font-display text-[13px] font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {r.establishmentName}
                        </Link>
                      </div>
                      <p className="mt-0.5 truncate pl-7 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {r.productName}
                        {r.city ? ` · ${r.city}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="font-display text-[15px] font-bold tabular-nums text-foreground">
                        {fmt(r.price)}
                      </p>
                      {onSelect ? (
                        <button
                          type="button"
                          onClick={() => onSelect(r)}
                          className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`Escolher ${r.establishmentName} por ${fmt(r.price)}`}
                        >
                          Escolher
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ============================= SAVED BASKETS ============================= */

function SavedBasketsPanel() {
  const session = useSession();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const listFn = useServerFn(listSavedBaskets);
  const delFn = useServerFn(deleteSavedBasket);
  const shareFn = useServerFn(toggleBasketShare);
  const getFn = useServerFn(getSavedBasket);

  const [detail, setDetail] = useState<SavedBasketDetail | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<{
    a: SavedBasketDetail;
    b: SavedBasketDetail;
  } | null>(null);
  const [compareBusy, setCompareBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["saved-baskets"],
    queryFn: () => listFn(),
    enabled: !!session.user,
    staleTime: 30_000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cesta removida");
      qc.invalidateQueries({ queryKey: ["saved-baskets"] });
    },
  });

  const shareMut = useMutation({
    mutationFn: async (row: SavedBasketSummary) => {
      const enable = !row.shareToken;
      const r = await shareFn({ data: { id: row.id, enable } });
      return { row, enable, token: r.shareToken };
    },
    onSuccess: async ({ enable, token }) => {
      if (enable && token) {
        const url = `${window.location.origin}/cesta-basica?share=${token}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Link copiado!");
      } else {
        toast.success("Compartilhamento desativado");
      }
      qc.invalidateQueries({ queryKey: ["saved-baskets"] });
    },
  });

  async function openDetail(id: string) {
    setOpeningId(id);
    try {
      const d = await getFn({ data: { id } });
      if (!d) {
        toast.error("Cesta não encontrada.");
        return;
      }
      setDetail(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir cesta.");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleExportPdf(id: string, name: string) {
    try {
      const d = await getFn({ data: { id } });
      if (!d) return;
      exportSavedBasketDetailToPdf(d, name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar PDF.");
    }
  }

  function toggleCompareId(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        // FIFO — descarta a primeira seleção para manter no máximo 2.
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  async function openCompare() {
    if (compareIds.length !== 2) return;
    setCompareBusy(true);
    try {
      const [a, b] = await Promise.all([
        getFn({ data: { id: compareIds[0] } }),
        getFn({ data: { id: compareIds[1] } }),
      ]);
      if (!a || !b) {
        toast.error("Falha ao carregar cestas para comparar.");
        return;
      }
      setCompareData({ a, b });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao comparar.");
    } finally {
      setCompareBusy(false);
    }
  }

  if (!session.user) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-[14px] font-semibold tracking-tight text-foreground">
            Minhas cestas salvas
          </h2>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Marque 2 cestas com <Columns2 className="inline h-3 w-3" /> para comparar lado a lado.
          </p>
        </div>
        {compareIds.length > 0 && (
          <button
            type="button"
            onClick={openCompare}
            disabled={compareIds.length !== 2 || compareBusy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {compareBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Columns2 className="h-3 w-3" />
            )}
            Comparar {compareIds.length}/2
          </button>
        )}
      </div>
      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Você ainda não salvou nenhuma cesta. Use "Salvar com nome" no modo de comparação, orçamento ou seleção manual.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {data!.map((b) => {
            const selected = compareIds.includes(b.id);
            return (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleCompareId(b.id)}
                  aria-pressed={selected}
                  aria-label={selected ? "Remover da comparação" : "Selecionar para comparar"}
                  className={
                    "grid h-6 w-6 shrink-0 place-items-center rounded-md border transition " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40")
                  }
                >
                  {selected ? <Check className="h-3 w-3" /> : <Columns2 className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => openDetail(b.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-display text-[13px] font-medium text-foreground group-hover:text-primary">
                    {b.name}
                  </p>
                  <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {b.mode === "budget" ? "Orçamento/Manual" : "Comparação"} ·{" "}
                    {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                    {b.shareToken && " · compartilhada"}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openDetail(b.id)}
                    disabled={openingId === b.id}
                    className="rounded-lg border border-primary/40 bg-primary/5 p-1.5 text-primary hover:bg-primary/10 disabled:opacity-60"
                    title="Reutilizar / ver detalhes"
                  >
                    {openingId === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPdf(b.id, b.name)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    title="Exportar em PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shareMut.mutate(b)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    title={b.shareToken ? "Copiar link / desativar" : "Ativar compartilhamento"}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Excluir "${b.name}"?`,
                        description: "Esta cesta salva será removida permanentemente.",
                        confirmLabel: "Excluir",
                        destructive: true,
                      });
                      if (ok) delMut.mutate(b.id);
                    }}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detail && <BasketDetailDialog detail={detail} onClose={() => setDetail(null)} />}
      {compareData && (
        <CompareBasketsDialog
          a={compareData.a}
          b={compareData.b}
          onClose={() => {
            setCompareData(null);
            setCompareIds([]);
          }}
        />
      )}
    </section>
  );
}

/* ============================= COMPARE BASKETS DIALOG ============================= */

function CompareBasketsDialog({
  a,
  b,
  onClose,
}: {
  a: SavedBasketDetail;
  b: SavedBasketDetail;
  onClose: () => void;
}) {
  const parsedA = useMemo(() => extractDrilldown(a), [a]);
  const parsedB = useMemo(() => extractDrilldown(b), [b]);

  // Cruzamento por label (chave semântica do essencial). Rótulos únicos em cada
  // lado alimentam as colunas "somente em A/B"; interseção alimenta a comparação
  // par-a-par com delta por item.
  const analysis = useMemo(() => {
    const mapA = new Map(parsedA.rows.map((r) => [r.label, r]));
    const mapB = new Map(parsedB.rows.map((r) => [r.label, r]));
    const allLabels = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
    const shared: Array<{
      label: string;
      priceA: number | null;
      priceB: number | null;
      delta: number | null;
    }> = [];
    const onlyA: string[] = [];
    const onlyB: string[] = [];
    for (const label of allLabels) {
      const rA = mapA.get(label);
      const rB = mapB.get(label);
      if (rA && rB) {
        const pA = rA.lineTotal ?? rA.unitPrice;
        const pB = rB.lineTotal ?? rB.unitPrice;
        shared.push({
          label,
          priceA: pA,
          priceB: pB,
          delta:
            typeof pA === "number" && typeof pB === "number" ? +(pB - pA).toFixed(2) : null,
        });
      } else if (rA) onlyA.push(label);
      else if (rB) onlyB.push(label);
    }
    return { shared, onlyA, onlyB };
  }, [parsedA, parsedB]);

  const delta = +(parsedB.total - parsedA.total).toFixed(2);
  const cheaper = delta === 0 ? null : delta < 0 ? "B" : "A";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Comparar duas cestas"
    >
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Comparar cestas
            </p>
            <h3 className="font-display text-base font-semibold text-foreground">
              A · {a.name} <span className="text-muted-foreground">×</span> B · {b.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-3 border-b border-border bg-surface/60 px-4 py-3 sm:grid-cols-3">
          <BasketSummaryCard label="Cesta A" name={a.name} total={parsedA.total} count={parsedA.rows.length} tone="a" />
          <BasketSummaryCard label="Cesta B" name={b.name} total={parsedB.total} count={parsedB.rows.length} tone="b" />
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Diferença
            </p>
            <p
              className={
                "mt-1 font-display text-lg font-bold tabular-nums " +
                (cheaper === null
                  ? "text-foreground"
                  : cheaper === "A"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400")
              }
            >
              {delta === 0 ? "empate" : `${delta > 0 ? "+" : ""}${fmt(delta)}`}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {cheaper === null
                ? "Custos idênticos."
                : cheaper === "A"
                  ? `Cesta A é ${fmt(Math.abs(delta))} mais barata que B.`
                  : `Cesta B é ${fmt(Math.abs(delta))} mais barata que A.`}
            </p>
          </div>
        </div>

        <div className="grow overflow-y-auto p-4">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Itens em comum ({analysis.shared.length})
          </h4>
          {analysis.shared.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              As duas cestas não têm itens equivalentes em comum.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-surface text-left">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Item
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      A
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      B
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Δ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {analysis.shared.map((row) => (
                    <tr key={row.label}>
                      <td className="px-3 py-2 text-foreground">{row.label}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
                        {row.priceA != null ? fmt(row.priceA) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
                        {row.priceB != null ? fmt(row.priceB) : "—"}
                      </td>
                      <td
                        className={
                          "whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium " +
                          (row.delta == null
                            ? "text-muted-foreground"
                            : row.delta === 0
                              ? "text-muted-foreground"
                              : row.delta < 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400")
                        }
                      >
                        {row.delta == null
                          ? "—"
                          : row.delta === 0
                            ? "0"
                            : `${row.delta > 0 ? "+" : ""}${fmt(row.delta)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ExclusiveList label={`Somente em A (${analysis.onlyA.length})`} items={analysis.onlyA} tone="a" />
            <ExclusiveList label={`Somente em B (${analysis.onlyB.length})`} items={analysis.onlyB} tone="b" />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

function BasketSummaryCard({
  label,
  name,
  total,
  count,
  tone,
}: {
  label: string;
  name: string;
  total: number;
  count: number;
  tone: "a" | "b";
}) {
  const accent =
    tone === "a"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "border-sky-500/40 bg-sky-500/5";
  return (
    <div className={`rounded-xl border ${accent} p-3`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-[13px] font-semibold text-foreground">
        {name}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground">
        {fmt(total)}
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {count} {count === 1 ? "item" : "itens"}
      </p>
    </div>
  );
}

function ExclusiveList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "a" | "b";
}) {
  const accent = tone === "a" ? "text-emerald-700 dark:text-emerald-300" : "text-sky-700 dark:text-sky-300";
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className={`font-mono text-[11px] uppercase tracking-[0.18em] ${accent}`}>{label}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Nenhum item exclusivo.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-[12px] text-foreground">
          {items.map((it) => (
            <li key={it}>· {it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================= SAVE NAMED DIALOG ============================= */

function SaveNamedDialog({
  defaultName,
  submitLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  defaultName: string;
  submitLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 80;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-display text-[14px] font-semibold text-foreground">Salvar cesta</p>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border p-1 text-muted-foreground hover:bg-surface"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <label className="mt-3 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Nome da cesta
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !busy) onConfirm(trimmed);
          }}
          placeholder="Ex: Cesta do mês, Feira do sábado…"
          className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 font-display text-[14px] text-foreground outline-none focus:border-primary"
        />
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {trimmed.length}/80 caracteres
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-primary/5 hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() => onConfirm(trimmed)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================= BASKET DETAIL DIALOG ============================= */

type DrilldownRow = {
  label: string;
  productName: string | null;
  establishmentId: string | null;
  establishmentName: string | null;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number | null;
};

function extractDrilldown(detail: SavedBasketDetail): {
  variant: "compare" | "budget" | "manual";
  headline: string;
  rows: DrilldownRow[];
  total: number;
  meta: string[];
} {
  const snapshot = detail.snapshot as unknown as {
    variant?: string;
    data?: BasketComparisonResult;
    result?: BudgetBasketResult;
    items?: Array<{
      label: string;
      productName: string | null;
      establishmentId: string | null;
      establishmentName: string | null;
      unitPrice: number | null;
      quantity: number;
      lineTotal: number | null;
    }>;
    total?: number;
  } | null;

  // Compare snapshot — highlight best store, per-item breakdown
  if (snapshot?.variant === "compare" && snapshot.data) {
    const d = snapshot.data;
    const best = d.stores[0];
    const rows: DrilldownRow[] = d.essentials.map((ess, i) => {
      const it = best?.items[i] ?? null;
      const avg = d.averagePrices[ess.key];
      if (it) {
        return {
          label: ess.label,
          productName: it.productName,
          establishmentId: best.establishmentId,
          establishmentName: best.establishmentName,
          unitPrice: it.price,
          quantity: 1,
          lineTotal: it.price,
        };
      }
      // Fall back to the cheapest overall for that item
      const cheap = d.cheapest.find((c) => c.key === ess.key);
      if (cheap) {
        return {
          label: ess.label,
          productName: cheap.productName + " (outro mercado)",
          establishmentId: cheap.establishmentId,
          establishmentName: cheap.establishmentName,
          unitPrice: cheap.price,
          quantity: 1,
          lineTotal: cheap.price,
        };
      }
      return {
        label: ess.label,
        productName: typeof avg === "number" ? "média de mercado" : null,
        establishmentId: null,
        establishmentName: null,
        unitPrice: typeof avg === "number" ? avg : null,
        quantity: 1,
        lineTotal: typeof avg === "number" ? avg : null,
      };
    });
    const total = rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
    return {
      variant: "compare",
      headline: best ? `Melhor mercado: ${best.establishmentName}` : "Comparação",
      rows,
      total: Number(total.toFixed(2)),
      meta: [
        `${d.stores.length} mercados analisados`,
        `${d.totalEssentials} itens da cesta`,
        `janela ${d.windowDays} dias`,
      ],
    };
  }

  if (snapshot?.variant === "budget" && snapshot.result) {
    const r = snapshot.result;
    const rows: DrilldownRow[] = r.items.map((it) => ({
      label: it.label,
      productName: it.productName,
      establishmentId: it.establishmentId,
      establishmentName: it.establishmentName,
      unitPrice: it.price,
      quantity: 1,
      lineTotal: it.price,
    }));
    return {
      variant: "budget",
      headline: `Orçamento de R$ ${r.budget.toFixed(2).replace(".", ",")}`,
      rows,
      total: r.total,
      meta: [
        `${r.items.length} itens escolhidos`,
        r.remaining >= 0
          ? `sobra R$ ${r.remaining.toFixed(2).replace(".", ",")}`
          : `R$ ${Math.abs(r.remaining).toFixed(2).replace(".", ",")} acima`,
      ],
    };
  }

  if (snapshot?.variant === "manual" && Array.isArray(snapshot.items)) {
    const items = snapshot.items;
    const rows: DrilldownRow[] = items.map((it) => ({
      label: it.label,
      productName: it.productName,
      establishmentId: it.establishmentId,
      establishmentName: it.establishmentName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
    }));
    const total =
      typeof snapshot.total === "number"
        ? snapshot.total
        : rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
    return {
      variant: "manual",
      headline: "Cesta montada manualmente",
      rows,
      total: Number(total.toFixed(2)),
      meta: [`${rows.length} tipos de itens`],
    };
  }

  return {
    variant: "compare",
    headline: detail.name,
    rows: [],
    total: 0,
    meta: ["Formato de cesta antigo — abra novamente para atualizar."],
  };
}

/**
 * Exporta um snapshot de cesta salva (qualquer variante) em PDF, reutilizando
 * o gerador da cesta manual. Cobre compare/budget/manual sem duplicar código.
 */
function exportSavedBasketDetailToPdf(detail: SavedBasketDetail, name: string) {
  const parsed = extractDrilldown(detail);
  if (parsed.rows.length === 0) {
    toast.error("Cesta sem itens para exportar.");
    return;
  }
  const items = parsed.rows.map((r, idx) => ({
    key: `saved-${idx}` as EssentialKey,
    label: r.label,
    quantity: r.quantity ?? 1,
    productName: r.productName ?? null,
    establishmentName: r.establishmentName ?? null,
    unitPrice: r.unitPrice,
    avgPrice: null as number | null,
  }));
  const totalUnits = items.reduce((s, it) => s + (it.quantity || 0), 0);
  exportManualBasketPdf({
    items,
    total: parsed.total,
    estimatedAvgTotal: parsed.total,
    savings: 0,
    totalUnits,
    missingCount: 0,
  });
  toast.success(`PDF exportado — ${name}`);
}



function BasketDetailDialog({
  detail,
  onClose,
}: {
  detail: SavedBasketDetail;
  onClose: () => void;
}) {
  const parsed = useMemo(() => extractDrilldown(detail), [detail]);
  const summaryText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`🧺 ${detail.name}`);
    lines.push(parsed.headline);
    lines.push("");
    parsed.rows.forEach((r) => {
      const price =
        r.lineTotal != null ? `R$ ${r.lineTotal.toFixed(2).replace(".", ",")}` : "—";
      const store = r.establishmentName ? ` @ ${r.establishmentName}` : "";
      const qty = r.quantity > 1 ? ` (${r.quantity}x)` : "";
      lines.push(`• ${r.label}${qty}: ${r.productName ?? "—"}${store} — ${price}`);
    });
    lines.push("");
    lines.push(`Total: R$ ${parsed.total.toFixed(2).replace(".", ",")}`);
    return lines.join("\n");
  }, [detail, parsed]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-semibold text-foreground">
              {detail.name}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {parsed.headline} · {parsed.meta.join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-surface"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {parsed.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não há detalhes para exibir para esta cesta.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Item</th>
                    <th className="px-3 py-2 font-semibold">Produto</th>
                    <th className="px-3 py-2 font-semibold">Mercado mais barata</th>
                    <th className="px-3 py-2 text-right font-semibold">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {parsed.rows.map((r, i) => (
                    <tr key={i} className="bg-background">
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {r.label}
                        {r.quantity > 1 && (
                          <span className="ml-1 text-muted-foreground">×{r.quantity}</span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground">
                        {r.productName ?? "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground">
                        {r.establishmentId && r.establishmentName ? (
                          <Link
                            to="/loja/$id"
                            params={{ id: r.establishmentId }}
                            search={{ q: "" }}
                            className="hover:text-primary hover:underline"
                          >
                            {r.establishmentName}
                          </Link>
                        ) : (
                          r.establishmentName ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.lineTotal != null ? (
                          <span className="text-primary">
                            {fmt(r.lineTotal)}
                          </span>
                        ) : (
                          <span className="text-warning">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5">
                    <td colSpan={3} className="px-3 py-2 font-display text-[12.5px] font-semibold text-foreground">
                      Total estimado
                    </td>
                    <td className="px-3 py-2 text-right font-display text-[14px] font-semibold tabular-nums text-primary">
                      {fmt(parsed.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summaryText);
                toast.success("Resumo copiado.");
              } catch {
                toast.error("Não foi possível copiar.");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-primary/5"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Copiar resumo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============================= ASSISTANT ============================= */

type ChatTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; actions?: AssistantAction[] };

const ACTION_LABEL: Record<AssistantAction["type"], string> = {
  set_mode: "modo",
  set_budget: "orçamento",
  set_filters: "filtros",
  add_item: "adicionar",
  remove_item: "remover",
  clear_manual: "limpar",
  explain: "nota",
};

function describeAction(a: AssistantAction): string {
  switch (a.type) {
    case "set_mode":
      return a.mode === "budget" ? "orçamento" : a.mode === "manual" ? "manual" : "comparar";
    case "set_budget":
      return `R$ ${a.amount.toFixed(2).replace(".", ",")}`;
    case "set_filters":
      return [a.city ? `cidade "${a.city}"` : null, a.radiusKm ? `${a.radiusKm} km` : null]
        .filter(Boolean).join(" · ") || "limpar";
    case "add_item":
      return `${a.qty}× ${a.key}`;
    case "remove_item":
      return a.key;
    case "clear_manual":
      return "todos itens";
    case "explain":
      return "";
  }
}

const QUICK_PROMPTS = [
  "Tenho 80 reais",
  "Adicione arroz, feijão e óleo",
  "Compare mercados em Feijó",
  "Limpar minha cesta",
];

function AssistantSidePanel({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (a: AssistantAction) => void;
}) {
  const ask = useServerFn(askBasketAssistant);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Oi! Posso montar sua cesta por orçamento, comparar mercados ou adicionar/remover itens. Me diga quanto quer gastar ou o que precisa.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    const history: AssistantMessage[] = [
      ...turns
        .filter((t) => t.role === "user" || t.role === "assistant")
        .map((t) => ({ role: t.role, content: t.content }) as AssistantMessage),
      { role: "user", content: text },
    ];
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await ask({ data: { messages: history } });
      for (const a of r.actions) onAction(a);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: r.reply, actions: r.actions },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Falha: ${err instanceof Error ? err.message : "erro"}`,
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        role="dialog"
        aria-label="Assistente da cesta"
        aria-hidden={!open}
        className={
          "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out " +
          (open ? "translate-x-0" : "translate-x-full pointer-events-none")
        }
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground leading-none">
                Assistente IA
              </p>
              <p className="font-display text-[14px] font-semibold leading-tight text-foreground">
                Monte sua cesta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-surface"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-1.5"}>
              <div
                className={
                  "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap " +
                  (m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground border border-border")
                }
              >
                {m.content}
              </div>
              {m.role === "assistant" && m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.actions
                    .filter((a) => a.type !== "explain")
                    .map((a, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-primary"
                      >
                        <Check className="h-3 w-3" />
                        {ACTION_LABEL[a.type]}
                        {describeAction(a) && <span className="text-primary/80 normal-case tracking-normal">· {describeAction(a)}</span>}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando…
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={busy}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <footer className="border-t border-border p-3">
          <AiQuotaWarning className="mb-2" />
          <AiCostEstimate
            draft={input}
            historyChars={turns.reduce((s, t) => s + t.content.length, 0)}
            className="mb-2"
          />
          <div className="flex items-end gap-2">

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ex.: tenho 80 reais, adicione arroz e feijão"
              className="min-h-10 max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Powered by Lovable AI · Gemini
          </p>
        </footer>
      </aside>
    </>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function buildBasketSummary(
  data: BasketComparisonResult,
  computeEstimates: (s: BasketComparisonResult["stores"][number]) => {
    displayTotal: number;
    minEstimate: number;
    maxEstimate: number;
  },
): string {
  const fmtBR = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const lines: string[] = [];
  lines.push("🧺 RESUMO DA CESTA — PreçoCerto");
  lines.push(new Date().toLocaleDateString("pt-BR"));
  lines.push("");

  const best = data.stores[0];
  const bestEst = computeEstimates(best);
  lines.push(`✅ Mais barata: ${best.establishmentName}`);
  lines.push(`   Total estimado: ${fmtBR(bestEst.displayTotal)}`);
  lines.push(`   Itens: ${best.itemsFound}/${best.totalItems} (cobertura ${(best.coverage * 100).toFixed(0)}%)`);
  lines.push("");

  lines.push("🏆 Ranking por mercado:");
  data.stores.slice(0, 5).forEach((s, idx) => {
    const est = computeEstimates(s);
    lines.push(
      `${String(idx + 1).padStart(2, "0")}. ${s.establishmentName} — ${fmtBR(est.displayTotal)} (${s.itemsFound}/${s.totalItems})`,
    );
  });
  lines.push("");

  lines.push("🛒 Itens (mercado mais barata):");
  best.items.forEach((it, i) => {
    const label = data.essentials[i].label;
    if (it) {
      lines.push(`• ${label}: ${it.productName} — ${fmtBR(it.price)}`);
    } else {
      const avg = data.averagePrices[data.essentials[i].key];
      lines.push(
        `• ${label}: sem preço nesta mercado${typeof avg === "number" ? ` (média R$ ${avg.toFixed(2).replace(".", ",")})` : ""}`,
      );
    }
  });
  lines.push("");
  lines.push(`Analisado em ${data.windowDays} dias · ${data.stores.length} mercados`);
  return lines.join("\n");
}

