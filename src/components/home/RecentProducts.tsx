import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Store, Radio, ArrowRight, ChevronRight } from "lucide-react";
import { getRecentProducts } from "@/lib/products-public.functions";
import { getLiveTickerStats } from "@/lib/products-public.functions";
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


      {/* MOBILE: letreiro digital (marquee) — economiza tela vertical */}
      <div
        className="price-marquee-viewport sm:hidden -mx-4 overflow-hidden border-y py-3"
        style={{ borderColor: P.line, background: P.card }}
        aria-label="Atualizações recentes de preço"
      >
        <div className="price-marquee flex w-max items-center gap-3 px-4">

          {[...data, ...data].map((p, i) => {
            const f = freshness(p.when);
            return (
              <Link
                key={`${p.slug}-${i}`}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="inline-flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-sm"
                style={{ borderColor: P.line, background: "var(--pc-home-bg, transparent)", color: P.heading }}
                aria-label={`${p.name} — ${brl(p.price)} em ${p.marketName ?? "mercados"}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${f.dotClass}`}
                  aria-hidden
                />
                <div className="flex min-w-0 flex-col leading-tight gap-0.5">
                  <span
                    className="whitespace-nowrap text-[15px] font-semibold"
                    title={p.name}
                  >
                    {shortName(p.name, 24)}
                  </span>
                  <span className="market-name whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--market-accent)]">
                    {shortName(p.marketName ?? "vários mercados", 22)}
                  </span>
                </div>
                <span
                  className={`${serif} tabular-nums text-[22px] font-semibold leading-none pl-1 shrink-0`}
                  style={{ color: P.gold, letterSpacing: "-0.02em" }}
                >
                  {brl(p.price)}
                </span>
              </Link>
            );

          })}
        </div>
      </div>


      {/* SM+: grid completo com mais detalhes */}
      <ul className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {data.map((p) => (
          <li key={p.slug}>
            <Link
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="group block h-full rounded-2xl border p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              style={{ borderColor: P.line, background: P.card, color: P.heading }}
              aria-label={`Ver histórico de ${p.name} em ${p.marketName ?? "mercados de Feijó"}`}
            >
              {(() => {
                const f = freshness(p.when);
                return (
                  <div
                    className={`mb-2 inline-flex items-center gap-1 rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ${f.ringClass} ${f.textClass}`}
                    title={`Status baseado na última coleta (${relative(p.when)})`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${f.dotClass}`} aria-hidden />
                    {f.label}
                  </div>
                );
              })()}
              <div
                className="mb-2 line-clamp-2 text-[12.5px] font-semibold leading-tight sm:text-[13px]"
                style={{ color: P.heading }}
              >
                {p.name}
              </div>
              <div
                className={`${serif} tabular-nums font-semibold`}
                style={{
                  color: P.gold,
                  fontSize: "clamp(1.15rem, 2.1vw, 1.45rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {brl(p.price)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11.5px]">
                <Store
                  className="h-3.5 w-3.5 shrink-0 text-[var(--market-accent)] transition-colors group-hover:text-[var(--market-accent-hover)]"
                />
                <span className="market-name truncate text-[12px] font-bold uppercase tracking-[0.05em] text-[var(--market-accent)]">
                  {p.marketName ?? "Vários mercados"}
                </span>


              </div>

              <div
                className="mt-0.5 flex items-center gap-1 text-[10px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span>Coletado {relative(p.when)}</span>
                {p.stores > 1 ? (
                  <span className="ml-auto rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider" style={{ color: P.goldSoft }}>
                    {p.stores} mercados
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

