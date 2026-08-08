import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Mail,
  MapPin,
  Smartphone,
  Store,
  Tag,
  Target,
  Trash2,
  TrendingDown,
} from "lucide-react";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  listPriceAlerts,
  markAllAlertsRead,
  deleteAlert,
  type NotificationPrefs,
} from "@/lib/notifications.functions";
import {
  listFavoriteItems,
  setFavoriteItemStore,
  setFavoriteItemTarget,
  removeFavoriteItem,
} from "@/lib/favorites.functions";
import { listPublicStores } from "@/lib/stores-public.functions";
import { PriceAlertSubscriptions } from "@/components/alerts/PriceAlertSubscriptions";
import { NearbyDropAlertsCard } from "@/components/alerts/NearbyDropAlertsCard";
import {
  PageHeader,
  SectionCard,
  StatGrid,
  DataToolbar,
  EmptyState,
  LoadingSkeleton,
  type Stat,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ds/Price";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Central de notificações — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <Alertas />
    </ProtectedGate>
  ),
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Alertas() {
  const qc = useQueryClient();
  const prefsFn = useServerFn(getNotificationPrefs);
  const updateFn = useServerFn(updateNotificationPrefs);
  const alertsFn = useServerFn(listPriceAlerts);
  const markReadFn = useServerFn(markAllAlertsRead);
  const deleteFn = useServerFn(deleteAlert);

  const prefsQuery = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => prefsFn(),
  });
  const alertsQuery = useQuery({
    queryKey: ["price-alerts"],
    queryFn: () => alertsFn(),
  });

  const savePrefs = useMutation({
    mutationFn: (data: NotificationPrefs) => updateFn({ data }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
  const markRead = useMutation({
    mutationFn: () => markReadFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-alerts"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-alerts"] }),
  });

  // ---- Produtos monitorados (favoritos + estabelecimento escolhido) ----
  const favoritesFn = useServerFn(listFavoriteItems);
  const storesFn = useServerFn(listPublicStores);
  const setStoreFn = useServerFn(setFavoriteItemStore);
  const setTargetFn = useServerFn(setFavoriteItemTarget);
  const removeFavFn = useServerFn(removeFavoriteItem);

  const favoritesQuery = useQuery({
    queryKey: ["favorite-items"],
    queryFn: () => favoritesFn(),
  });
  const storesQuery = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => storesFn(),
  });

  const invalidateFav = () =>
    qc.invalidateQueries({ queryKey: ["favorite-items"] });

  const setStore = useMutation({
    mutationFn: (v: { favoriteId: string; establishmentId: string | null }) =>
      setStoreFn({ data: v }),
    onSuccess: invalidateFav,
  });
  const setTarget = useMutation({
    mutationFn: (v: { favoriteId: string; targetPrice: number | null }) =>
      setTargetFn({ data: v }),
    onSuccess: invalidateFav,
  });
  const removeFav = useMutation({
    mutationFn: (favoriteId: string) => removeFavFn({ data: { favoriteId } }),
    onSuccess: invalidateFav,
  });

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  useEffect(() => {
    if (prefsQuery.data && !prefs) setPrefs(prefsQuery.data);
  }, [prefsQuery.data, prefs]);

  const update = (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs.mutate(next);
  };

  const [filter, setFilter] = useState<"todos" | "nao-lidos" | "itens" | "mercados">(
    "todos",
  );

  const alerts = (alertsQuery.data ?? []).filter((a) => {
    if (filter === "nao-lidos") return !a.readAt;
    if (filter === "itens")
      return a.kind === "item_price_drop" || a.kind === "item_target_hit";
    if (filter === "mercados") return a.kind === "market_price_drop";
    return true;
  });

  const totalAlerts = alertsQuery.data?.length ?? 0;
  const naoLidos = alertsQuery.data?.filter((a) => !a.readAt).length ?? 0;
  const totalFavoritos = favoritesQuery.data?.length ?? 0;
  const monitorados = favoritesQuery.data?.filter((f) => !!f.preferredEstablishmentId).length ?? 0;

  const stats: Stat[] = [
    { label: "Alertas", value: totalAlerts, icon: BellRing, tone: "primary" },
    { label: "Não lidos", value: naoLidos, icon: Bell, tone: naoLidos > 0 ? "warning" : "default" },
    { label: "Favoritos", value: totalFavoritos, icon: Tag },
    { label: "Monitorados", value: monitorados, icon: Store, tone: "success" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/app" }, { label: "Alertas" }]}
          title="Central de alertas"
          description="Notificações em tempo real quando um favorito cai de preço ou bate a meta."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => markRead.mutate()}
              disabled={markRead.isPending || naoLidos === 0}
            >
              Marcar tudo como lido
            </Button>
          }
        />

        <StatGrid stats={stats} className="mb-6" />

        <SectionCard
          title="Notificações recentes"
          description="Filtre por status ou tipo para focar no que importa."
          bodyClassName="p-0"
        >
          <div className="border-b border-border/50 p-3 md:p-4">
            <DataToolbar
              filters={[
                { key: "todos" as const, label: "Todos" },
                { key: "nao-lidos" as const, label: "Não lidos" },
                { key: "itens" as const, label: "Itens" },
                { key: "mercados" as const, label: "Mercados" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={
                    "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] transition " +
                    (filter === t.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground")
                  }
                >
                  {t.label}
                </button>
              ))}
            />
          </div>

          <div className="p-3 md:p-4">
            {alertsQuery.isLoading ? (
              <LoadingSkeleton rows={4} />
            ) : alerts.length === 0 ? (
              <EmptyState
                icon={BellRing}
                title="Nenhum alerta ainda"
                description="Favorite produtos e mercados para começar a acompanhar quedas de preço."
              />
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => {
                  const icon =
                    a.kind === "market_price_drop"
                      ? MapPin
                      : a.kind === "item_target_hit"
                        ? Target
                        : TrendingDown;
                  const Icon = icon;
                  const title =
                    a.kind === "market_price_drop"
                      ? `${a.marketName} — carrinho mais barato`
                      : a.kind === "item_target_hit"
                        ? `${a.displayName ?? "Item"} atingiu seu preço-alvo`
                        : `${a.displayName ?? "Item"} caiu de preço`;
                  const body =
                    a.prevPrice !== null && a.newPrice !== null
                      ? `de ${brl(a.prevPrice)} para ${brl(a.newPrice)}${a.marketName ? ` no ${a.marketName}` : ""}${a.diffPct !== null ? ` (${a.diffPct.toFixed(1)}%)` : ""}`
                      : "";
                  return (
                    <li
                      key={a.id}
                      className={
                        "flex gap-4 rounded-[var(--radius-xl)] border p-4 transition-colors " +
                        (!a.readAt
                          ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/[0.06]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)]")
                      }
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-savings text-savings-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-foreground">{title}</p>
                          {!a.readAt && (
                            <span className="h-1.5 w-1.5 rounded-full bg-savings" />
                          )}
                        </div>
                        {body && (
                          <p className="mt-1 text-[13.5px] text-muted-foreground">{body}</p>
                        )}
                        <p className="mt-2 font-mono text-[12px] uppercase tracking-widest text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <button
                        onClick={() => remove.mutate(a.id)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Descartar alerta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SectionCard>

        <div className="mt-6">
          <NearbyDropAlertsCard />
        </div>

        <div className="mt-6">
          <PriceAlertSubscriptions />
        </div>

        <div className="mt-6">
          <FavoritesSection
            isLoading={favoritesQuery.isLoading}
            favorites={favoritesQuery.data ?? []}
            stores={storesQuery.data ?? []}
            onStoreChange={(id, estabId) =>
              setStore.mutate({ favoriteId: id, establishmentId: estabId })
            }
            onTargetChange={(id, tp) =>
              setTarget.mutate({ favoriteId: id, targetPrice: tp })
            }
            onRemove={(id) => removeFav.mutate(id)}
          />
        </div>

        <SectionCard
          className="mt-6"
          title="Preferências de notificação"
          description="Escolha por onde receber e defina os limites."
        >
          {!prefs ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <>
              <ul className="divide-y divide-border">
                <ChannelToggle
                  icon={Bell}
                  label="Notificações no app"
                  hint="Aparecem aqui na central de alertas."
                  value={prefs.inApp}
                  onChange={(v) => update({ inApp: v })}
                />
                <ChannelToggle
                  icon={Mail}
                  label="E-mail"
                  hint="Resumo diário quando algum favorito cair."
                  value={prefs.email}
                  onChange={(v) => update({ email: v })}
                />
                <ChannelToggle
                  icon={Smartphone}
                  label="Push (celular)"
                  hint="Requer permissão do navegador."
                  value={prefs.push}
                  onChange={(v) => update({ push: v })}
                />
              </ul>

              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <ThresholdField
                  icon={TrendingDown}
                  label="Alerta de queda em itens"
                  hint="Percentual mínimo de queda para gerar um alerta."
                  value={prefs.priceDropPct}
                  unit="%"
                  min={0}
                  max={80}
                  step={1}
                  onChange={(v) => update({ priceDropPct: v })}
                />
                <ThresholdField
                  icon={Tag}
                  label="Economia mínima em mercados"
                  hint="Só alerta quando o carrinho ficar ao menos esse valor mais barato."
                  value={prefs.marketSavingsMin}
                  unit="R$"
                  min={0}
                  max={200}
                  step={1}
                  onChange={(v) => update({ marketSavingsMin: v })}
                />
                <div className="flex items-center justify-between text-[14px]">
                  <div>
                    <p className="text-foreground">Somente ao atingir preço-alvo</p>
                    <p className="text-[13px] text-muted-foreground">
                      Ignora alertas de queda geral e só avisa quando o preço
                      encostar no seu alvo.
                    </p>
                  </div>
                  <Toggle
                    value={prefs.targetPriceOnly}
                    onChange={(v) => update({ targetPriceOnly: v })}
                  />
                </div>
              </div>
              {savePrefs.isPending && (
                <p className="mt-4 text-[13px] text-muted-foreground">Salvando...</p>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

function ChannelToggle({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </li>
  );
}

function ThresholdField({
  icon: Icon,
  label,
  hint,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  hint: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
        <span className="font-mono text-sm text-foreground">
          {value}
          {unit === "%" ? "%" : ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-primary"
      />
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={
        "inline-flex h-6 w-10 items-center rounded-full p-0.5 transition-colors " +
        (value ? "bg-savings" : "bg-muted")
      }
    >
      <span
        className={
          "h-5 w-5 rounded-full bg-card transition-transform " +
          (value ? "translate-x-4" : "")
        }
      />
    </button>
  );
}

type FavoritesFilter = "todos" | "com-estabelecimento" | "sem-estabelecimento";

function FavoritesSection({
  isLoading,
  favorites,
  stores,
  onStoreChange,
  onTargetChange,
  onRemove,
}: {
  isLoading: boolean;
  favorites: FavoriteRowFav[];
  stores: FavoriteRowStore[];
  onStoreChange: (id: string, establishmentId: string | null) => void;
  onTargetChange: (id: string, targetPrice: number | null) => void;
  onRemove: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FavoritesFilter>("todos");

  const filtered = favorites.filter((f) => {
    if (filter === "com-estabelecimento") return !!f.preferredEstablishmentId;
    if (filter === "sem-estabelecimento") return !f.preferredEstablishmentId;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ap = a.preferredEstablishmentId && a.currentPrice !== null ? a.currentPrice : null;
    const bp = b.preferredEstablishmentId && b.currentPrice !== null ? b.currentPrice : null;
    if (ap === null && bp === null) return a.displayName.localeCompare(b.displayName);
    if (ap === null) return 1;
    if (bp === null) return -1;
    return ap - bp;
  });

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Produtos monitorados
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha em qual estabelecimento quer receber alerta quando o preço
            cair, e defina um preço-alvo opcional.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "todos" as const, label: "Todos" },
          { key: "com-estabelecimento" as const, label: "Com estabelecimento" },
          { key: "sem-estabelecimento" as const, label: "Sem estabelecimento" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition " +
              (filter === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4">
          <LoadingSkeleton rows={3} />
        </div>
      ) : favorites.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Tag}
            title="Nenhum favorito ainda"
            description="Toque no coração de um produto para começar a monitorar."
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Tag} title="Nenhum favorito nesse filtro" />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {sorted.map((f) => (
            <FavoriteRow
              key={f.id}
              favorite={f}
              stores={stores}
              onStoreChange={(estabId) => onStoreChange(f.id, estabId)}
              onTargetChange={(tp) => onTargetChange(f.id, tp)}
              onRemove={() => onRemove(f.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}



type FavoriteRowFav = {
  id: string;
  displayName: string;
  brand: string | null;
  imageUrl: string | null;
  targetPrice: number | null;
  preferredEstablishmentId: string | null;
  preferredEstablishmentName: string | null;
  currentPrice: number | null;
  currentPriceAt: string | null;
  previousPrice: number | null;
  previousPriceAt: string | null;
};

type FavoriteRowStore = { id: string; name: string; city: string | null };


function FavoriteRow({
  favorite,
  stores,
  onStoreChange,
  onTargetChange,
  onRemove,
}: {
  favorite: FavoriteRowFav;
  stores: FavoriteRowStore[];
  onStoreChange: (establishmentId: string | null) => void;
  onTargetChange: (targetPrice: number | null) => void;
  onRemove: () => void;
}) {
  const [target, setTargetInput] = useState<string>(
    favorite.targetPrice !== null ? String(favorite.targetPrice) : "",
  );

  const commitTarget = () => {
    const raw = target.trim().replace(",", ".");
    if (raw === "") {
      if (favorite.targetPrice !== null) onTargetChange(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if (n !== favorite.targetPrice) onTargetChange(Number(n.toFixed(2)));
  };

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        {favorite.imageUrl ? (
          <img
            src={favorite.imageUrl}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Tag className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {favorite.displayName}
          </p>
          {favorite.brand && (
            <p className="truncate text-xs text-muted-foreground">
              {favorite.brand}
            </p>
          )}
          {favorite.preferredEstablishmentId ? (
            favorite.currentPrice !== null ? (
              <>
                <p className="mt-1 text-xs">
                  <Price value={favorite.currentPrice} size="sm" />
                  <span className="text-muted-foreground">
                    {" "}
                    em {favorite.preferredEstablishmentName ?? "estabelecimento"}
                    {favorite.currentPriceAt
                      ? ` · ${new Date(favorite.currentPriceAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                      : ""}
                  </span>
                </p>
                {favorite.previousPrice !== null &&
                  favorite.previousPrice !== favorite.currentPrice && (() => {
                    const diff = favorite.currentPrice - favorite.previousPrice;
                    const pct = (diff / favorite.previousPrice) * 100;
                    const down = diff < 0;
                    return (
                      <p
                        className={
                          "mt-0.5 font-mono text-[11px] " +
                          (down ? "text-savings" : "text-destructive")
                        }
                      >
                        {down ? "▼" : "▲"}{" "}
                        <Price value={Math.abs(diff)} size="xs" prefix={false} /> ({pct > 0 ? "+" : ""}
                        {pct.toFixed(1)}%)
                        <span className="text-muted-foreground">
                          {" "}vs.{" "}
                          <Price value={favorite.previousPrice} size="xs" tone="muted" />
                          {favorite.previousPriceAt
                            ? ` · ${new Date(favorite.previousPriceAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                            : ""}
                        </span>
                      </p>
                    );
                  })()}
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Sem preço registrado neste estabelecimento ainda.
              </p>
            )
          ) : null}
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <label className="relative">
          <span className="sr-only">Estabelecimento</span>
          <Store className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <select
            value={favorite.preferredEstablishmentId ?? ""}
            onChange={(e) =>
              onStoreChange(e.target.value === "" ? null : e.target.value)
            }
            className="h-9 rounded-lg border border-border bg-background pl-7 pr-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Qualquer estabelecimento</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.city ? ` — ${s.city}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <span className="sr-only">Preço-alvo</span>
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="alvo"
            value={target}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={commitTarget}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-9 w-24 rounded-lg border border-border bg-background pl-8 pr-2 text-xs text-foreground focus:border-primary focus:outline-none"
          />
        </label>

        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Remover favorito"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
