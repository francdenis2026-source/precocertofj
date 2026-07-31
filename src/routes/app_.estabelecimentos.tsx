import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, MapPin, Search as SearchIcon, Store } from "lucide-react";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { Input } from "@/components/ui/input";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import { listPublicStores } from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const Route = createFileRoute("/app_/estabelecimentos")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos — PreçoCerto Feijó" },
      {
        name: "description",
        content:
          "Todos os mercados e farmácias cadastrados no PreçoCerto Feijó. Abra a página de cada loja para ver endereço, atendimento e produtos.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Estabelecimentos — PreçoCerto Feijó" },
      {
        property: "og:description",
        content: "Veja endereço, atendimento e produtos de cada estabelecimento de Feijó.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <StoresPage />
    </ProtectedGate>
  ),
});

function StoresPage() {
  const fetchStores = useServerFn(listPublicStores);
  const [q, setQ] = useState("");

  const storesQ = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => fetchStores(),
    staleTime: 5 * 60_000,
  });

  const stores = useMemo(() => storesQ.data ?? [], [storesQ.data]);
  const logos = useSignedLogoUrls(useMemo(() => stores.map((s) => s.logoUrl), [stores]));

  const filtered = useMemo(() => {
    const needle = norm(q);
    const base = [...stores].sort((a, b) => b.productCount - a.productCount);
    if (!needle) return base;
    return base.filter(
      (s) =>
        norm(s.name).includes(needle) ||
        norm(s.neighborhood ?? "").includes(needle) ||
        norm(s.city).includes(needle),
    );
  }, [stores, q]);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-3 py-2 md:px-4">
        <header className="rounded-lg border border-border/70 bg-card/94 px-3 py-2 shadow-sm backdrop-blur-md">
          <Link
            to="/app"
            className={cn(tc.metaMuted, "inline-flex items-center gap-1 hover:text-foreground")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Voltar ao painel
          </Link>
          <h1 className={cn(tc.h1, "mt-1")}>Estabelecimentos</h1>
          <p className={cn(tc.sectionNote, "mt-0.5")}>
            Toque em um card para abrir a página do local com endereço, atendimento e produtos.
          </p>
          <label className="relative mt-2 block">
            <span className="sr-only">Buscar estabelecimento</span>
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar mercado, farmácia, bairro…"
              className={cn(tc.body, "h-9 rounded-md bg-background/80 pl-9")}
              maxLength={60}
              autoComplete="off"
            />
          </label>
        </header>

        <section aria-live="polite" aria-busy={storesQ.isLoading}>
          {storesQ.isLoading ? (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[72px] animate-pulse rounded-lg border border-border/60 bg-card/70"
                  style={{ opacity: 1 - i * 0.08 }}
                />
              ))}
            </ul>
          ) : storesQ.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
              <p className={tc.body}>Não conseguimos carregar os estabelecimentos.</p>
              <button
                type="button"
                onClick={() => storesQ.refetch()}
                className={cn(
                  tc.control,
                  "mt-3 h-9 rounded-md border border-border px-3 hover:bg-muted",
                )}
              >
                Tentar novamente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-card/94 p-5 text-center backdrop-blur-md">
              <Store className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
              <p className={cn(tc.itemTitle, "mt-2")}>Nenhum estabelecimento encontrado</p>
              <p className={cn(tc.meta, "mt-1")}>Tente outro nome ou bairro.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((s) => {
                const logo = s.logoUrl ? (logos[s.logoUrl] ?? s.logoUrl) : null;
                return (
                  <li key={s.id}>
                    <Link
                      to="/app/loja/$id"
                      params={{ id: s.id }}
                      className="grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border border-border/70 bg-card/94 p-2.5 shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-muted/40 active:bg-muted/60"
                    >
                      <StoreLogo src={logo} name={s.name} className="h-9 w-9" />
                      <span className="min-w-0">
                        <span className={cn(tc.storeName, "block truncate")}>{s.name}</span>
                        <span className={cn(tc.metaMuted, "flex items-center gap-1 truncate")}>
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {s.neighborhood ? `${s.neighborhood} · ` : ""}
                          {s.city}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                            s.productCount > 0
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {s.productCount} {s.productCount === 1 ? "produto" : "produtos"}
                        </span>
                      </span>

                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
