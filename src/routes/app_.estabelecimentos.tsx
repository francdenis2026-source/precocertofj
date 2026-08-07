import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, MapPin, Search as SearchIcon, Store, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { Input } from "@/components/ui/input";
import { StoreLogo } from "@/components/app/StoreLogo";
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
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Estabelecimentos"
          description="Toque em um card para abrir a página do local com endereço, atendimento e produtos."
          breadcrumbs={[{ label: "Painel", to: "/app" }, { label: "Estabelecimentos" }]}
          actions={
            <div className="relative w-full sm:w-64">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar mercado..."
                className="h-10 rounded-xl bg-[var(--bg-surface)] pl-9 shadow-sm"
                maxLength={60}
                autoComplete="off"
              />
            </div>
          }
        />

        <section aria-live="polite" aria-busy={storesQ.isLoading}>
          {storesQ.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : storesQ.isError ? (
            <div className="rounded-[24px] border border-destructive/20 bg-destructive/5 p-8 text-center">
              <p className="text-sm font-medium">Não conseguimos carregar os estabelecimentos.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => storesQ.refetch()}
                className="mt-4 rounded-xl"
              >
                Tentar novamente
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border bg-[var(--bg-surface)] p-12 text-center">
              <Store className="mx-auto h-8 w-8 text-muted-foreground opacity-20" aria-hidden />
              <p className="mt-4 text-sm font-bold">Nenhum estabelecimento encontrado</p>
              <p className="text-xs text-muted-foreground">Tente outro nome ou bairro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((s) => {
                const logo = s.logoUrl ? (logos[s.logoUrl] ?? s.logoUrl) : null;
                return (
                  <Link
                    key={s.id}
                    to="/loja/$id"
                      search={{ search: "" }}
                      params={{ id: s.id }}
                    search={{ search: "" }}
                    className="pc-card group flex flex-col items-start gap-4 p-5"
                  >
                    <div className="flex w-full items-start justify-between">
                      <StoreLogo src={logo} name={s.name} className="h-14 w-14 rounded-2xl shadow-sm transition-transform group-hover:scale-105" />
                      <div className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                        s.productCount > 0
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {s.productCount} {s.productCount === 1 ? "produto" : "produtos"}
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                        {s.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">
                          {s.neighborhood ? `${s.neighborhood} · ` : ""}
                          {s.city}
                        </span>
                      </p>
                    </div>

                    <div className="mt-2 flex w-full items-center justify-between border-t border-border/40 pt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-[var(--brand-primary)]">Ver catálogo</span>
                      <ArrowRight className="h-4 w-4 text-[var(--brand-primary)] transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
