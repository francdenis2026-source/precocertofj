import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyScans, type MyScan, type ScanStatus } from "@/lib/scans-history.functions";
import { listMyProducts, type MyProduct } from "@/lib/product-detail.functions";
import { useSession } from "@/hooks/useSession";
import { MobileNav } from "@/components/nav/MobileNav";
import { verdictLabel } from "@/lib/scan-utils";
import { History, ArrowLeft, ImageOff, ChevronRight, Package } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — PreçoCerto" },
      { name: "description", content: "Scans e produtos cadastrados por status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

type Tab = "todos" | ScanStatus | "cadastrados";

const TABS: { id: Tab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "capturado", label: "Capturados" },
  { id: "revisado", label: "Revisados" },
  { id: "salvo", label: "Salvos" },
  { id: "cadastrados", label: "Cadastrados" },
];

const STATUS_STYLE: Record<ScanStatus, string> = {
  capturado: "bg-warning/15 text-warning border-warning/30",
  revisado: "bg-primary/15 text-primary border-primary/30",
  salvo: "bg-neon/15 text-neon border-neon/30",
};

function HistoryPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchScans = useServerFn(listMyScans);
  const fetchProducts = useServerFn(listMyProducts);
  const [scans, setScans] = useState<MyScan[] | null>(null);
  const [products, setProducts] = useState<MyProduct[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("todos");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/historico" } as never });
      return;
    }
    Promise.all([fetchScans({}), fetchProducts({})])
      .then(([s, p]) => {
        setScans(s);
        setProducts(p);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [user, loading, navigate, fetchScans, fetchProducts]);

  const filteredScans = useMemo(() => {
    if (!scans) return null;
    if (tab === "todos") return scans;
    if (tab === "cadastrados") return [];
    return scans.filter((s) => s.status === tab);
  }, [scans, tab]);

  const counts = useMemo(() => {
    const c = { capturado: 0, revisado: 0, salvo: 0 };
    for (const s of scans ?? []) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [scans]);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-md px-3 py-4 sm:px-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="rounded-full border border-primary/20 p-1.5 text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Histórico
            </span>
          </div>
        </header>

        <nav className="mb-4 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge =
              t.id === "capturado"
                ? counts.capturado
                : t.id === "revisado"
                ? counts.revisado
                : t.id === "salvo"
                ? counts.salvo
                : t.id === "cadastrados"
                ? products?.length ?? 0
                : scans?.length ?? 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t.label}
                {scans && (
                  <span className="ml-1.5 opacity-70">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {err && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
            {err}
          </p>
        )}

        {scans === null && !err && (
          <p className="font-mono text-xs text-muted-foreground">Carregando…</p>
        )}

        {tab === "cadastrados" && products && (
          <>
            {products.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  Nenhum produto cadastrado ainda.
                </p>
                <Link
                  to="/"
                  className="mt-3 inline-block rounded-lg bg-capture px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
                >
                  Cadastrar produto
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/produto/$id"
                      params={{ id: p.id }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-capture/20 bg-surface p-2 transition hover:border-capture/60"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-capture/10">
                        <Package className="h-5 w-5 text-capture" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{p.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {p.category} · {p.unit} · EAN {p.ean}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-bold text-capture">
                        R$ {p.currentPrice.toFixed(2).replace(".", ",")}
                      </p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab !== "cadastrados" && filteredScans && (
          <>
            {filteredScans.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  Nenhum scan neste status.
                </p>
                <Link
                  to="/"
                  className="mt-3 inline-block rounded-lg bg-neon px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
                >
                  Fazer scan
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredScans.map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/historico/$id"
                      params={{ id: s.id }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-primary/10 bg-surface p-2 transition hover:border-primary/40"
                    >
                      <ProductImage
                        src={s.imageUrl}
                        alt={s.productName ?? "scan"}
                        width={56}
                        height={56}
                        fallbackIcon={ImageOff}
                        fallbackLabel={s.productName ?? undefined}
                        className="h-14 w-14 shrink-0 rounded-xl bg-background"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {s.productName ?? "Sem nome"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest ${STATUS_STYLE[s.status]}`}
                          >
                            {s.status}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-bold text-neon">
                          {s.priceCaptured
                            ? `R$ ${s.priceCaptured.toFixed(2).replace(".", ",")}`
                            : "—"}
                        </p>
                        <p
                          className={`font-mono text-[9px] font-bold uppercase ${
                            s.verdict === "barato"
                              ? "text-neon"
                              : s.verdict === "caro"
                              ? "text-destructive"
                              : s.verdict === "justo"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {verdictLabel[
                            s.verdict as "barato" | "justo" | "caro" | "unknown"
                          ] ?? s.verdict}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
