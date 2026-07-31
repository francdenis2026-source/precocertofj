import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  LineChart,
  Clock,
  Crown,
  MapPin,
  Phone,
  Search as SearchIcon,
  Store,
  X,
} from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { ProductCompareSheet } from "@/components/app/ProductCompareSheet";
import { ProductPriceHistory } from "@/components/app/ProductPriceHistory";
import { PriceDropAlertToggle } from "@/components/app/PriceDropAlertToggle";
import { formatUpdatedAt } from "@/components/app/PriceTrend";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Price } from "@/components/ds/Price";
import {
  compareStoreCart,
  getPublicStoreCatalog,
  type CartCompareStore,
} from "@/lib/stores-public.functions";
import { getStoreContactInfo } from "@/lib/store-contact.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

type SortKey = "price-asc" | "price-desc" | "name" | "recent";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "price-asc", label: "Menor preço" },
  { id: "price-desc", label: "Maior preço" },
  { id: "name", label: "A → Z" },
  { id: "recent", label: "Recentes" },
];

export const Route = createFileRoute("/app_/loja/$id")({
  head: () => ({
    meta: [
      { title: "Estabelecimento — PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Endereço, atendimento e lista de produtos do estabelecimento, com seleção de itens para comparar preços entre os mercados de Feijó.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Estabelecimento — PreçoCerto Feijó" },
      {
        property: "og:description",
        content: "Veja produtos deste local e compare os preços com outros estabelecimentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <AppStorePage />
    </ProtectedGate>
  ),
});

function AppStorePage() {
  const { id } = Route.useParams();
  const fetchCatalog = useServerFn(getPublicStoreCatalog);
  const fetchContact = useServerFn(getStoreContactInfo);
  const runCompare = useServerFn(compareStoreCart);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [compareKey, setCompareKey] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const catalogQ = useQuery({
    queryKey: ["public-store", id],
    queryFn: () => fetchCatalog({ data: { id } }),
    staleTime: 60_000,
  });

  const contactQ = useQuery({
    queryKey: ["store-contact", id],
    queryFn: () => fetchContact({ data: { id } }),
    staleTime: 10 * 60_000,
  });

  const compareMut = useMutation({
    mutationFn: (items: string[]) =>
      runCompare({
        data: { storeId: id, items: items.map((productName) => ({ productName, quantity: 1 })) },
      }),
  });

  const store = catalogQ.data?.store;
  const products = useMemo(() => catalogQ.data?.products ?? [], [catalogQ.data]);
  const categories = catalogQ.data?.categories ?? [];

  const list = useMemo(() => {
    const needle = norm(q);
    let out = products.filter((p) => (category ? p.category === category : true));
    if (needle) {
      out = out.filter((p) => norm(`${p.productName} ${p.brand ?? ""}`).includes(needle));
    }
    const sorted = [...out];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "recent":
        sorted.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
        break;
      default:
        sorted.sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    }
    return sorted;
  }, [products, q, category, sort]);

  const toggle = (name: string) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name].slice(0, 30),
    );

  const results = compareMut.data ?? [];

  return (
    <AppShell>
      <div className="app-dashboard pc-page">
        <header className="pc-pad rounded-xl border border-border/70 bg-card/94 shadow-sm backdrop-blur-md">
          <Link
            to="/app/estabelecimentos"
            className={cn(tc.metaMuted, "inline-flex items-center gap-1 hover:text-foreground")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Estabelecimentos
          </Link>

          {catalogQ.isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-muted/70" />
            </div>
          ) : catalogQ.isError || !store ? (
            <div className="mt-2">
              <h1 className={tc.h1}>Estabelecimento indisponível</h1>
              <p className={cn(tc.meta, "mt-1")}>
                Não foi possível carregar este local. Volte à lista e tente novamente.
              </p>
            </div>
          ) : (
            <>
              <h1 className={cn(tc.h1, "mt-1")}>{store.name}</h1>
              <dl className="mt-1.5 grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow icon={MapPin} label="Endereço">
                  {[store.address, store.neighborhood, `${store.city}/${store.state}`]
                    .filter(Boolean)
                    .join(" · ")}
                </InfoRow>
                <InfoRow icon={Clock} label="Atendimento">
                  {contactQ.data?.notes?.trim() || "Horário não informado pelo estabelecimento"}
                </InfoRow>
                <InfoRow icon={Phone} label="Contato">
                  {contactQ.data?.phone?.trim() || "Telefone não informado"}
                </InfoRow>
                <InfoRow icon={CalendarClock} label="Atualização">
                  {store.lastUpdate
                    ? new Date(store.lastUpdate).toLocaleDateString("pt-BR")
                    : "sem registros"}{" "}
                  · {products.length} produtos
                </InfoRow>
              </dl>
            </>
          )}
        </header>

        <div className="grid gap-2 lg:grid-cols-12">
          {/* Lista de produtos */}
          <section
            aria-label="Produtos do estabelecimento"
            className="flex flex-col gap-2 lg:col-span-7 xl:col-span-8"
          >
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-card/94 p-2 shadow-sm backdrop-blur-md">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="relative min-w-0">
                  <span className="sr-only">Buscar produto na loja</span>
                  <SearchIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar produto nesta loja…"
                    className={cn(tc.body, "h-9 rounded-md bg-background/80 pl-9 pr-8")}
                    maxLength={80}
                    inputMode="search"
                    autoComplete="off"
                  />
                  {q && (
                    <button
                      type="button"
                      aria-label="Limpar busca"
                      onClick={() => setQ("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>
                <div
                  role="radiogroup"
                  aria-label="Ordenar produtos"
                  className="flex shrink-0 flex-wrap items-center gap-1"
                >
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={sort === s.id}
                      onClick={() => setSort(s.id)}
                      className={cn(
                        tc.control,
                        "h-8 rounded-md border px-2 transition-colors",
                        sort === s.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div
                  role="radiogroup"
                  aria-label="Filtrar por categoria"
                  className="flex gap-1.5 overflow-x-auto pb-0.5"
                >
                  <Chip active={!category} onClick={() => setCategory(null)}>
                    Todas
                  </Chip>
                  {categories.map((c) => (
                    <Chip
                      key={c.key}
                      active={category === c.label}
                      onClick={() => setCategory(category === c.label ? null : c.label)}
                    >
                      {c.label} ({c.count})
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div aria-live="polite" aria-busy={catalogQ.isLoading}>
              {catalogQ.isLoading ? (
                <ul className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <li
                      key={i}
                      className="h-14 animate-pulse rounded-lg border border-border/60 bg-card/70"
                      style={{ opacity: 1 - i * 0.07 }}
                    />
                  ))}
                </ul>
              ) : catalogQ.isError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
                  <p className={tc.body}>Não conseguimos carregar os produtos desta loja.</p>
                  <button
                    type="button"
                    onClick={() => catalogQ.refetch()}
                    className={cn(
                      tc.control,
                      "mt-3 h-9 rounded-md border border-border px-3 hover:bg-muted",
                    )}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : list.length === 0 ? (
                <div className="rounded-lg border border-border/70 bg-card/94 p-5 text-center backdrop-blur-md">
                  <Store className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
                  <p className={cn(tc.itemTitle, "mt-2")}>Nenhum produto encontrado</p>
                  <p className={cn(tc.meta, "mt-1")}>
                    {q
                      ? `Nada para “${q}” nesta loja.`
                      : "Este local ainda não tem produtos nesta categoria."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md">
                  {list.map((p) => {
                    const checked = selected.includes(p.productName);
                    return (
                      <li key={p.slug} className="px-3 py-2 transition-colors hover:bg-muted/40">
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(p.productName)}
                            aria-label={`Selecionar ${p.productName} para comparar`}
                          />
                          <div className="min-w-0">
                            <p className={cn(tc.itemTitle, "truncate")}>{p.productName}</p>
                            <p className={cn(tc.metaMuted, "truncate")}>
                              {p.category}
                              {p.brand ? ` · ${p.brand}` : ""} · atualizado{" "}
                              {formatUpdatedAt(p.lastDate)}
                            </p>
                          </div>
                          <Price value={p.price} size="sm" />
                          <button
                            type="button"
                            onClick={() =>
                              setHistoryFor(historyFor === p.productName ? null : p.productName)
                            }
                            aria-expanded={historyFor === p.productName}
                            aria-label={`Ver histórico de preços de ${p.productName}`}
                            className={cn(
                              "grid h-8 w-8 place-items-center rounded-md transition-colors",
                              historyFor === p.productName
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <LineChart className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <PriceDropAlertToggle
                            productName={p.productName}
                            establishmentId={id}
                            storeName={contactQ.data?.name ?? null}
                            targetPrice={p.price}
                          />
                          <button
                            type="button"
                            onClick={() => setCompareKey(p.productName)}
                            aria-label={`Comparar preços de ${p.productName}`}
                            className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          >
                            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>

                        {historyFor === p.productName && (
                          <ProductPriceHistory
                            className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2"
                            establishmentId={id}
                            productName={p.productName}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Comparação da seleção */}
          <section aria-label="Comparar seleção" className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-3 space-y-2 rounded-lg border border-border/70 bg-card/94 p-3 shadow-sm backdrop-blur-md">
              <div>
                <h2 className={tc.itemTitle}>Comparar seleção</h2>
                <p className={cn(tc.metaMuted, "mt-0.5")}>
                  {selected.length === 0
                    ? "Marque produtos na lista para comparar o total entre estabelecimentos."
                    : `${selected.length} ${selected.length === 1 ? "item selecionado" : "itens selecionados"}`}
                </p>
              </div>

              {selected.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {selected.map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        onClick={() => toggle(n)}
                        className={cn(
                          tc.metaMuted,
                          "inline-flex max-w-[190px] items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{n}</span>
                        <X className="h-3 w-3 shrink-0" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={selected.length === 0 || compareMut.isPending}
                  onClick={() => compareMut.mutate(selected)}
                  className={cn(
                    tc.control,
                    "h-9 flex-1 rounded-md bg-primary px-3 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
                  )}
                >
                  {compareMut.isPending ? "Comparando…" : "Comparar preços"}
                </button>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected([]);
                      compareMut.reset();
                    }}
                    className={cn(
                      tc.control,
                      "h-9 rounded-md border border-border px-3 hover:bg-muted",
                    )}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {compareMut.isPending && (
                <ul className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/50"
                    />
                  ))}
                </ul>
              )}

              {compareMut.isError && (
                <p
                  className={cn(
                    tc.meta,
                    "rounded-lg border border-destructive/40 bg-destructive/5 p-3",
                  )}
                >
                  Não foi possível comparar agora. Tente de novo em instantes.
                </p>
              )}

              {!compareMut.isPending && results.length > 0 && (
                <ol className="space-y-1.5">
                  {[...results]
                    .sort((a, b) => a.total - b.total)
                    .map((r, i) => (
                      <CompareRow key={r.storeId} row={r} best={i === 0} />
                    ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </div>

      <ProductCompareSheet productKey={compareKey} onClose={() => setCompareKey(null)} />
    </AppShell>
  );
}

function CompareRow({ row, best }: { row: CartCompareStore; best: boolean }) {
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 py-2",
        best ? "border-savings/40 bg-savings/[0.07]" : "border-border/70 bg-background",
      )}
    >
      <span className="min-w-0">
        <span className={cn(tc.storeName, "flex items-center gap-1 truncate")}>
          {best && <Crown className="h-3.5 w-3.5 shrink-0 text-savings" aria-hidden />}
          {row.storeName}
        </span>
        <span className={cn(tc.metaMuted, "block truncate")}>
          {row.matchedCount}/{row.totalCount} itens encontrados
          {row.isReference ? " · loja atual" : ""}
        </span>
      </span>
      <Price value={row.total} size="sm" tone={best ? "best" : "default"} />
    </li>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className={tc.tableHead}>{label}</dt>
        <dd className={cn(tc.metaMuted, "truncate")}>{children}</dd>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        tc.chip,
        "h-7 shrink-0 rounded-full border px-2.5 transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
