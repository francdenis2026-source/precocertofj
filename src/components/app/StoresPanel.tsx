import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info, Loader2, Search as SearchIcon } from "lucide-react";

import { StoreLogo } from "@/components/app/StoreLogo";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import type { PublicStore } from "@/lib/stores-public.functions";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Lista de estabelecimentos do painel do cliente. Cada item abre a página
 * dedicada da loja (`/loja/:id`) com o catálogo completo; o botão lateral
 * abre o resumo rápido em drawer.
 */
export function StoresPanel({
  stores,
  loading,
  onOpenDetails,
}: {
  stores: PublicStore[];
  loading?: boolean;
  onOpenDetails: (name: string) => void;
}) {
  const [q, setQ] = useState("");

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
    <section
      aria-label="Estabelecimentos"
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/94 shadow-sm backdrop-blur-md"
    >
      <header className="shrink-0 space-y-2 border-b border-border/70 px-3 py-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <h2 className={cn(tc.itemTitle, "truncate")}>Estabelecimentos</h2>
            <p className={cn(tc.metaMuted, "truncate")}>
              {stores.length} lojas · abra para ver produtos e preços
            </p>
          </div>
          <Link
            to="/app/estabelecimentos"
            className={cn(
              tc.control,
              "shrink-0 rounded-md border border-border px-2.5 py-1 text-primary transition-colors hover:border-primary/50",
            )}
          >
            Ver todos
          </Link>
        </div>
        <label className="relative block">
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

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {loading ? (
          <div className={cn(tc.meta, "flex items-center gap-2 p-4")}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando lojas…
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(tc.meta, "p-4 text-center")}>Nenhum estabelecimento encontrado.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((s) => {
              const logo = s.logoUrl ? (logos[s.logoUrl] ?? s.logoUrl) : null;
              return (
                <li
                  key={s.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <StoreLogo src={logo} name={s.name} className="h-8 w-8" />
                  <Link
                    to="/app/loja/$id"
                    params={{ id: s.id }}
                    className="min-w-0 focus-visible:underline"
                  >
                    <span className={cn(tc.storeName, "block truncate")}>{s.name}</span>
                    <span className={cn(tc.metaMuted, "flex items-center gap-1.5 truncate")}>
                      {s.neighborhood ? <span className="truncate">{s.neighborhood}</span> : null}
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                          s.productCount > 0
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {s.productCount} {s.productCount === 1 ? "item" : "itens"}
                      </span>
                    </span>
                  </Link>

                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Resumo rápido de ${s.name}`}
                      onClick={() => onOpenDetails(s.name)}
                      className="grid h-7 w-7 place-items-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <Link
                      to="/app/loja/$id"
                      params={{ id: s.id }}
                      aria-label={`Abrir página de ${s.name}`}
                      className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
