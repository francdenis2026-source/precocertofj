/**
 * Admin · Gestão da Cesta Básica
 *
 * Permite ao administrador gerenciar as versões do conjunto de itens da
 * cesta (basket_item_sets) e, para cada versão, editar quantidade e
 * habilitar/desabilitar itens (basket_items). Só uma versão fica ativa;
 * ativar uma nova desativa as demais automaticamente na RPC do server.
 *
 * Fluxo típico:
 *   1. Selecionar uma versão existente (ou criar uma nova a partir da
 *      versão atual + itens padrão da ESSENTIALS).
 *   2. Ajustar quantidades e enabled por item.
 *   3. Ativar a versão para publicar em /cesta-basica.
 *
 * Alterações são auditadas em admin_audit_log pelas server functions.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  ShoppingBasket,
} from "lucide-react";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  listBasketSets,
  listBasketItemsForSet,
  createBasketSet,
  updateBasketItem,
  activateBasketSet,
  deleteBasketSet,
} from "@/lib/basket-admin.functions";

export const Route = createFileRoute("/admin_/cesta")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Cesta Básica — Admin PreçoCerto" },
      {
        name: "description",
        content:
          "Gerencie as versões do conjunto de itens da cesta básica: quantidades, habilitação e ativação.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <CestaAdminPage />
    </AppShell>
  ),
});

function CestaAdminPage() {
  const qc = useQueryClient();
  const listSets = useServerFn(listBasketSets);
  const listItems = useServerFn(listBasketItemsForSet);
  const createSet = useServerFn(createBasketSet);
  const updateItem = useServerFn(updateBasketItem);
  const activate = useServerFn(activateBasketSet);
  const removeSet = useServerFn(deleteBasketSet);

  const setsQuery = useQuery({
    queryKey: ["admin", "basket-sets"],
    queryFn: () => listSets(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sets = setsQuery.data ?? [];

  // Seleciona automaticamente o ativo (ou o primeiro) quando lista chega.
  useEffect(() => {
    if (!selectedId && sets.length > 0) {
      const active = sets.find((s) => s.active);
      setSelectedId(active?.id ?? sets[0].id);
    }
  }, [sets, selectedId]);

  const itemsQuery = useQuery({
    queryKey: ["admin", "basket-items", selectedId],
    queryFn: () => listItems({ data: { setId: selectedId! } }),
    enabled: !!selectedId,
  });

  const items = itemsQuery.data ?? [];
  const selectedSet = sets.find((s) => s.id === selectedId) ?? null;

  const updateMut = useMutation({
    mutationFn: (v: { itemId: string; enabled?: boolean; quantity?: number }) =>
      updateItem({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "basket-items", selectedId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const createMut = useMutation({
    mutationFn: (label: string) => createSet({ data: { label } }),
    onSuccess: (created: { id: string }) => {
      qc.invalidateQueries({ queryKey: ["admin", "basket-sets"] });
      setSelectedId(created.id);
      toast.success("Nova versão criada");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao criar versão"),
  });

  const activateMut = useMutation({
    mutationFn: (setId: string) => activate({ data: { setId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "basket-sets"] });
      toast.success("Versão ativada — /cesta-basica já reflete a mudança.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao ativar"),
  });

  const deleteMut = useMutation({
    mutationFn: (setId: string) => removeSet({ data: { setId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "basket-sets"] });
      setSelectedId(null);
      toast.success("Versão removida");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  const enabledCount = useMemo(() => items.filter((i) => i.enabled).length, [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hub · Vitrine
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
            <ShoppingBasket className="h-6 w-6 text-[color:var(--pc-accent-gold,#c9a24a)]" />
            Cesta Básica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Versione, edite e publique o conjunto de itens usado no comparador e no veredito.
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link to="/admin/vitrine" search={{}} as any>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao hub
          </Link>
        </Button>
      </header>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Versões */}
        <aside className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Versões</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => createMut.mutate(`Cesta ${new Date().toLocaleDateString("pt-BR")}`)}
              disabled={createMut.isPending}
              aria-label="Criar nova versão"
            >
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {setsQuery.isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
          ) : sets.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Nenhuma versão. Crie a primeira para começar.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {sets.map((s) => {
                const isSel = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={
                        "w-full rounded-lg border px-3 py-2 text-left transition " +
                        (isSel
                          ? "border-[color:var(--pc-accent-gold,#c9a24a)] bg-background"
                          : "border-border hover:bg-background/60")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          v{s.version} · {s.label}
                        </span>
                        {s.active ? (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> ativa
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Itens */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          {!selectedSet ? (
            <p className="text-sm text-muted-foreground">
              Selecione uma versão à esquerda para editar seus itens.
            </p>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Itens · v{selectedSet.version} · {selectedSet.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {enabledCount} de {items.length} itens habilitados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedSet.active ? (
                    <Button
                      size="sm"
                      onClick={() => activateMut.mutate(selectedSet.id)}
                      disabled={activateMut.isPending}
                    >
                      {activateMut.isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      )}
                      Ativar esta versão
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Publicada em /cesta-basica
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={selectedSet.active || deleteMut.isPending}
                    onClick={() => {
                      if (confirm(`Remover versão v${selectedSet.version}?`)) {
                        deleteMut.mutate(selectedSet.id);
                      }
                    }}
                    title={selectedSet.active ? "Desative antes de remover" : "Remover versão"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {itemsQuery.isLoading ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {it.label}
                        </p>
                        <p className="text-[12.5px] text-muted-foreground">
                          chave: {it.key}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Qtd</span>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.1}
                          defaultValue={it.quantity}
                          disabled={updateMut.isPending}
                          className="h-8 w-20 text-right tabular-nums"
                          onBlur={(e) => {
                            const q = Number(e.currentTarget.value);
                            if (!Number.isFinite(q) || q <= 0 || q === it.quantity) return;
                            updateMut.mutate({ itemId: it.id, quantity: q });
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={it.enabled}
                          disabled={updateMut.isPending}
                          onChange={(e) => {
                            updateMut.mutate({ itemId: it.id, enabled: e.currentTarget.checked });
                          }}
                          className="h-4 w-4 accent-[color:var(--pc-accent-gold,#c9a24a)]"
                        />
                        <span className="text-muted-foreground">ativo</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
