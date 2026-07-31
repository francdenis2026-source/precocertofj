import { ListRowsSkeleton } from "@/components/feedback";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/brand/AppShell";
import { useSessionGate } from "@/hooks/use-session-gate";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  addListItem,
  addAdhocListItem,
  markItemPurchased,
  computeBestPrices,
  createShoppingList,
  deleteShoppingList,
  getShoppingList,
  listMyShoppingLists,
  removeListItem,
  renameShoppingList,
  searchCatalog,
  updateListItem,
  type CatalogSuggestion,
} from "@/lib/shopping-list.functions";
import {
  listFavoriteItems,
  listFavoriteMarkets,
  toggleFavoriteItem,
  toggleFavoriteMarket,
} from "@/lib/favorites.functions";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Search,
  Check,
  X,
  ShoppingCart,
  Sparkles,
  MapPin,
  Star,
  Route as RouteIcon,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product/ProductImage";
import { useSession } from "@/hooks/useSession";
import { useConfirm } from "@/components/ui/confirm-provider";
import { ListaVisitorPreview } from "@/components/paywall/ListaVisitorPreview";
import { Price } from "@/components/ds/Price";



export const Route = createFileRoute("/lista")({
  // Deep link: /lista?id=<uuid> abre e edita direto a lista escolhida.
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lista de compras — PreçoCerto" },
      {
        name: "description",
        content:
          "Monte sua lista de compras e descubra o melhor mercado e o melhor preço item a item.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ListaPage,
});

function ListaPage() {
  const { user, loading } = useSession();
  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!user) {
    return (
      <AppShell>
        <ListaVisitorPreview />
      </AppShell>
    );
  }
  return (
    <ProtectedGate>
      <ListaContent />
    </ProtectedGate>
  );
}


function ListaContent() {
  const qc = useQueryClient();
  const { hasSession } = useSessionGate();
  const { confirm } = useConfirm();
  const listsFn = useServerFn(listMyShoppingLists);
  const createFn = useServerFn(createShoppingList);
  const renameFn = useServerFn(renameShoppingList);
  const deleteFn = useServerFn(deleteShoppingList);


  const navigate = Route.useNavigate();
  const { id: searchId } = Route.useSearch();

  const [selectedId, setSelectedId] = useState<string | null>(searchId ?? null);

  // URL manda: ao chegar com ?id=, seleciona a lista correspondente.
  useEffect(() => {
    if (searchId && searchId !== selectedId) setSelectedId(searchId);
  }, [searchId, selectedId]);

  const selectList = (id: string | null) => {
    setSelectedId(id);
    void navigate({ search: id ? { id } : {}, replace: true });
  };
  const [newName, setNewName] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [listSort, setListSort] = useLocalStorageState<"updated" | "name">(
    "app:lists:sort",
    "updated",
    { validate: (v): v is "updated" | "name" => v === "updated" || v === "name" },
  );
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Navegação por teclado nas listas salvas (roving tabindex + atalhos).
  const newNameRef = useRef<HTMLInputElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const registerRow = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };
  const focusRow = (id: string) => {
    requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  };


  const listsQuery = useQuery({
    queryKey: ["shopping-lists"],
    queryFn: () => listsFn(),
    enabled: hasSession,
  });

  useEffect(() => {
    if (!listsQuery.data) return;
    // ?id inválido (lista removida) cai na primeira lista disponível.
    const exists = selectedId && listsQuery.data.some((l) => l.id === selectedId);
    if (!exists && listsQuery.data.length > 0) {
      selectList(listsQuery.data[0].id);
    }
  }, [listsQuery.data, selectedId]);

  const createMut = useMutation({
    mutationFn: (name: string) => createFn({ data: { name } }),
    onSuccess: (r) => {
      setNewName("");
      selectList(r.id);
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
      toast.success("Lista criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameFn({ data: v }),
    onSuccess: () => {
      setRenameId(null);
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
      qc.invalidateQueries({ queryKey: ["shopping-list", renameId] });
      toast.success("Nome atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_r, id) => {
      if (selectedId === id) selectList(null);
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
      toast.success("Lista excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allLists = listsQuery.data ?? [];
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const lists = useMemo(() => {
    const q = norm(listFilter);
    const base = q ? allLists.filter((l) => norm(l.name).includes(q)) : allLists.slice();
    return base.sort((a, b) =>
      listSort === "name"
        ? a.name.localeCompare(b.name, "pt-BR")
        : new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
    );
  }, [allLists, listFilter, listSort]);

  const startRename = (l: { id: string; name: string }) => {
    setRenameId(l.id);
    setRenameText(l.name);
  };

  const cancelRename = () => {
    const id = renameId;
    setRenameId(null);
    if (id) focusRow(id);
  };

  const askDelete = async (l: { id: string; name: string }) => {
    const ok = await confirm({
      title: `Excluir a lista "${l.name}"?`,
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) deleteMut.mutate(l.id);
  };

  // Setas navegam, Enter abre, F2 renomeia, Delete exclui, Esc sai da lista.
  const onListKeyDown = (e: React.KeyboardEvent, index: number) => {
    const l = lists[index];
    if (!l) return;
    const go = (i: number) => {
      const next = lists[(i + lists.length) % lists.length];
      if (!next) return;
      selectList(next.id);
      focusRow(next.id);
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        go(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        go(index - 1);
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(lists.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectList(l.id);
        break;
      case "F2":
        e.preventDefault();
        startRename(l);
        break;
      case "Delete":
        e.preventDefault();
        void askDelete(l);
        break;
      case "Escape":
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
        break;
      default:
        break;
    }
  };

  // Atalhos globais da página: Alt+L foca a lista selecionada, Alt+N cria.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const key = ev.key.toLowerCase();
      if (key === "n") {
        ev.preventDefault();
        newNameRef.current?.focus();
        return;
      }
      if (key === "f") {
        ev.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select();
        return;
      }
      if (key === "l") {
        ev.preventDefault();
        const target = selectedId ?? lists[0]?.id;
        if (target) focusRow(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lists, selectedId]);



  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-3 md:py-4">
        {/* Editorial hero — compacto */}
        <section className="relative mb-5 overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground md:p-6">
          <div
            className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent"
            aria-hidden
          />
          <div
            className="absolute -right-24 top-16 h-28 w-28 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
              <ShoppingCart className="h-3 w-3" /> Suas listas
            </span>
            <h1 className="mt-3 font-display text-[22px] font-bold leading-tight md:text-[26px]">
              Lista de compras, sem surpresa no caixa.
            </h1>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-primary-foreground/85">
              Adicione produtos do catálogo, marque o que já comprou e descubra
              o melhor mercado para todo o carrinho.
            </p>
          </div>
        </section>


        <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim()) createMut.mutate(newName.trim());
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={newNameRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setNewName("");
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Nova lista..."
                  aria-label="Nome da nova lista"
                  aria-keyshortcuts="Alt+N"
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={createMut.isPending || !newName.trim()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Criar lista"
                >
                  {createMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </form>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={filterRef}
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setListFilter("");
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Filtrar minhas listas..."
                  aria-label="Filtrar minhas listas salvas"
                  aria-keyshortcuts="Alt+F"
                  className="h-8 w-full rounded-full border border-border bg-background pl-8 pr-8 text-[12.5px] outline-none focus:ring-2 focus:ring-primary/40"
                />
                {listFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setListFilter("");
                      filterRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {allLists.length > 0 && (
                  <>
                    {listFilter
                      ? `${lists.length} de ${allLists.length} listas`
                      : `${allLists.length} ${allLists.length === 1 ? "lista salva" : "listas salvas"}`}{" "}
                    ·{" "}
                  </>
                )}
                <kbd>Alt</kbd>+<kbd>N</kbd> nova · <kbd>Alt</kbd>+<kbd>F</kbd>{" "}
                filtrar · <kbd>F2</kbd> renomear · <kbd>Del</kbd> excluir
              </p>
            </div>
            <ul
              role="listbox"
              aria-label="Minhas listas salvas"
              className="max-h-[52vh] divide-y divide-border overflow-y-auto"
            >
              {listsQuery.isLoading && (
                <li className="p-2">
                  <ListRowsSkeleton rows={4} />
                </li>
              )}
              {lists.length === 0 && !listsQuery.isLoading && (
                <li className="p-4 text-[13px] text-muted-foreground">
                  {listFilter
                    ? `Nenhuma lista com "${listFilter}".`
                    : "Nenhuma lista ainda. Crie a primeira acima."}
                </li>
              )}
              {lists.map((l, index) => {
                const isActive = l.id === selectedId;
                const isRenaming = renameId === l.id;
                return (
                  <li
                    key={l.id}
                    role="option"
                    aria-selected={isActive}
                    className={`flex items-center gap-1.5 px-2.5 py-2 ${
                      isActive ? "bg-muted/50" : ""
                    }`}
                  >
                    {isRenaming ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (renameText.trim())
                            renameMut.mutate({ id: l.id, name: renameText.trim() });
                        }}
                        className="flex flex-1 items-center gap-1.5"
                      >
                        <input
                          autoFocus
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRename();
                            }
                          }}
                          aria-label={`Novo nome para ${l.name}`}
                          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[13px]"
                        />
                        <button
                          type="submit"
                          className="text-primary"
                          aria-label="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="text-muted-foreground"
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          ref={registerRow(l.id)}
                          onClick={() => selectList(l.id)}
                          onKeyDown={(e) => onListKeyDown(e, index)}
                          tabIndex={isActive || (!selectedId && index === 0) ? 0 : -1}
                          aria-current={isActive ? "true" : undefined}
                          className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left"
                        >
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {l.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {l.itemCount} {l.itemCount === 1 ? "item" : "itens"}
                          </p>
                        </button>
                        <button
                          onClick={() => startRename(l)}
                          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Renomear ${l.name}`}
                          aria-keyshortcuts="F2"
                          title="Renomear (F2)"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void askDelete(l)}
                          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"
                          aria-label={`Excluir ${l.name}`}
                          aria-keyshortcuts="Delete"
                          title="Excluir (Del)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>


          {/* Main */}
          <section>
            {selectedId ? (
              <ListDetail listId={selectedId} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Selecione uma lista ou crie uma nova para começar.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* ============================================================ */
/* ListDetail: items + autocomplete + best prices              */
/* ============================================================ */

function ListDetail({ listId }: { listId: string }) {
  const qc = useQueryClient();
  const { prompt } = useConfirm();
  const detailFn = useServerFn(getShoppingList);
  const addFn = useServerFn(addListItem);
  const updateFn = useServerFn(updateListItem);
  const removeFn = useServerFn(removeListItem);
  const bestFn = useServerFn(computeBestPrices);
  const favItemsFn = useServerFn(listFavoriteItems);
  const favMktFn = useServerFn(listFavoriteMarkets);
  const toggleFavItemFn = useServerFn(toggleFavoriteItem);
  const toggleFavMktFn = useServerFn(toggleFavoriteMarket);

  const detailQuery = useQuery({
    queryKey: ["shopping-list", listId],
    queryFn: () => detailFn({ data: { id: listId } }),
  });

  const bestQuery = useQuery({
    queryKey: ["shopping-list-best", listId, detailQuery.data?.items.length ?? 0],
    queryFn: () => bestFn({ data: { listId } }),
    enabled: !!detailQuery.data && detailQuery.data.items.length > 0,
    staleTime: 30_000,
  });

  const favItemsQuery = useQuery({
    queryKey: ["favorite-items"],
    queryFn: () => favItemsFn(),
    staleTime: 60_000,
  });

  const favMarketsQuery = useQuery({
    queryKey: ["favorite-markets"],
    queryFn: () => favMktFn(),
    staleTime: 60_000,
  });

  const favItemSet = useMemo(
    () => new Set((favItemsQuery.data ?? []).map((f) => f.catalogId)),
    [favItemsQuery.data],
  );
  const favMarketSet = useMemo(
    () => new Set((favMarketsQuery.data ?? []).map((f) => f.marketName)),
    [favMarketsQuery.data],
  );

  const invalidateFav = () => {
    qc.invalidateQueries({ queryKey: ["favorite-items"] });
    qc.invalidateQueries({ queryKey: ["favorite-markets"] });
    qc.invalidateQueries({ queryKey: ["app-summary"] });
  };

  const toggleFavItemMut = useMutation({
    mutationFn: (catalogId: string) => toggleFavItemFn({ data: { catalogId } }),
    onSuccess: (r) => {
      invalidateFav();
      toast.success(r.favorited ? "Favorito adicionado" : "Favorito removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFavMktMut = useMutation({
    mutationFn: (marketName: string) =>
      toggleFavMktFn({ data: { marketName } }),
    onSuccess: (r) => {
      invalidateFav();
      toast.success(r.favorited ? "Mercado favoritado" : "Mercado removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: (v: { catalogId: string; quantity: number }) =>
      addFn({ data: { listId, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAdhocFn = useServerFn(addAdhocListItem);
  const markPurchasedFn = useServerFn(markItemPurchased);
  const addAdhocMut = useMutation({
    mutationFn: (v: { displayName: string; quantity: number; category: string | null; unit: string | null; notes: string | null }) =>
      addAdhocFn({ data: { listId, ...v } }),
    onSuccess: () => {
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const markPurchasedMut = useMutation({
    mutationFn: (v: { id: string; purchased: boolean; price?: number | null }) =>
      markPurchasedFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list", listId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; quantity?: number; checked?: boolean; displayName?: string; category?: string | null; unit?: string | null; notes?: string | null; purchasedPrice?: number | null }) =>
      updateFn({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["shopping-list", listId] });
      const prev = qc.getQueryData<{ items: Array<Record<string, unknown>> }>(["shopping-list", listId]);
      if (prev) {
        qc.setQueryData(["shopping-list", listId], {
          ...prev,
          items: prev.items.map((it) => (it as { id: string }).id === v.id ? {
            ...it,
            ...(v.quantity !== undefined ? { quantity: v.quantity } : {}),
            ...(v.checked !== undefined ? { checked: v.checked } : {}),
            ...(v.displayName !== undefined ? { displayName: v.displayName } : {}),
            ...(v.category !== undefined ? { category: v.category } : {}),
            ...(v.unit !== undefined ? { unit: v.unit } : {}),
            ...(v.notes !== undefined ? { notes: v.notes } : {}),
            ...(v.purchasedPrice !== undefined ? { purchasedPrice: v.purchasedPrice } : {}),
          } : it),
        });
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["shopping-list", listId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["shopping-list", listId] }),
  });

  const [editing, setEditing] = useState<null | { id: string; displayName: string; category: string; unit: string; notes: string; purchasedPrice: number | null }>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list", listId] });
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const detail = detailQuery.data;
  if (!detail) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="font-display text-2xl text-foreground">{detail.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.items.length} {detail.items.length === 1 ? "item" : "itens"}
          </p>
        </div>
        <div className="border-b border-border p-5">
          <CatalogAutocomplete
            onPick={(s, quantity) =>
              addMut.mutate({ catalogId: s.id, quantity })
            }
            busy={addMut.isPending}
          />
          <AdhocItemForm
            onAdd={(v) => addAdhocMut.mutate(v)}
            busy={addAdhocMut.isPending}
          />
        </div>

        <ul className="divide-y divide-border">
          {detail.items.length === 0 && (
            <li className="p-5 text-center text-sm text-muted-foreground">
              Nenhum item ainda. Use a busca acima para adicionar produtos do
              catálogo.
            </li>
          )}
          {detail.items.map((it) => {
            const isFav = it.catalogId ? favItemSet.has(it.catalogId) : false;
            return (
              <li key={it.id} className="flex items-center gap-3 p-4">
                <input
                  type="checkbox"
                  checked={it.checked}
                  onChange={async (e) => {
                    const purchased = e.target.checked;
                    if (purchased && !it.purchasedAt) {
                      const raw = await prompt({
                        title: `Preço pago por ${it.displayName}`,
                        description: "Informe o valor em R$ (opcional).",
                        placeholder: "0,00",
                        inputType: "text",
                        confirmLabel: "Registrar",
                      });
                      const price = raw ? Number(raw.replace(",", ".")) : null;
                      markPurchasedMut.mutate({ id: it.id, purchased: true, price: Number.isFinite(price as number) ? price : null });
                    } else {
                      markPurchasedMut.mutate({ id: it.id, purchased: false });
                    }
                  }}
                  className="h-4 w-4 accent-primary"
                />

                <button
                  onClick={() => it.catalogId && toggleFavItemMut.mutate(it.catalogId)}
                  disabled={!it.catalogId}
                  aria-label={isFav ? "Remover favorito" : "Favoritar"}
                  className={
                    !it.catalogId
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : isFav
                      ? "text-accent hover:text-accent/80"
                      : "text-muted-foreground hover:text-accent"
                  }
                >
                  <Star
                    className={`h-4 w-4 ${isFav ? "fill-current" : ""}`}
                  />
                </button>
                <ProductImage
                  src={it.imageUrl}
                  alt={it.displayName}
                  width={48}
                  height={48}
                  fallbackLabel={it.displayName}
                  className="h-12 w-12 flex-none rounded-lg bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      it.checked
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                  {it.displayName}
                  </p>
                  {(it.brand || it.defaultUnit || it.category || it.unit) && (
                    <p className="text-xs text-muted-foreground">
                      {[it.brand, it.category, it.defaultUnit ?? it.unit].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {it.purchasedAt ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ Comprado em {new Date(it.purchasedAt).toLocaleDateString("pt-BR")}
                      {it.purchasedPrice != null && ` · ${it.purchasedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                    </p>
                  ) : it.purchasedPrice != null ? (
                    <p className="text-xs text-muted-foreground">
                      Preço estimado: {it.purchasedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  ) : null}
                </div>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={it.quantity}
                  onChange={(e) => {
                    const q = Number(e.target.value);
                    if (q > 0) updateMut.mutate({ id: it.id, quantity: q });
                  }}
                  className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm"
                />
                {!it.catalogId && !it.purchasedAt && (
                  <button
                    onClick={() => setEditing({
                      id: it.id,
                      displayName: it.displayName,
                      category: it.category ?? "",
                      unit: it.unit ?? "",
                      notes: it.notes ?? "",
                      purchasedPrice: it.purchasedPrice ?? null,
                    })}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => removeMut.mutate(it.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {detail.items.length > 0 && (
        <BestPricesPanel
          data={bestQuery.data}
          loading={bestQuery.isLoading || bestQuery.isFetching}
          favMarketSet={favMarketSet}
          onToggleFavMarket={(name) => toggleFavMktMut.mutate(name)}
        />
      )}

      <EditAdhocDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          updateMut.mutate(v, {
            onSuccess: () => {
              toast.success("Item atualizado");
              setEditing(null);
            },
          });
        }}
        busy={updateMut.isPending}
      />
    </div>
  );
}

function EditAdhocDialog({
  item,
  onClose,
  onSave,
  busy,
}: {
  item: null | { id: string; displayName: string; category: string; unit: string; notes: string; purchasedPrice: number | null };
  onClose: () => void;
  onSave: (v: { id: string; displayName: string; category: string | null; unit: string | null; notes: string | null; purchasedPrice: number | null }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.displayName);
      setCategory(item.category);
      setUnit(item.unit);
      setNotes(item.notes);
      setPrice(item.purchasedPrice != null ? String(item.purchasedPrice).replace(".", ",") : "");
    }
  }, [item]);

  if (!item) return null;
  const parsedPrice = price.trim() ? Number(price.replace(",", ".")) : null;
  const priceValid = parsedPrice === null || (Number.isFinite(parsedPrice) && parsedPrice >= 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-display text-lg text-foreground">Editar item</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Alimentação, Limpeza..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Unidade</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, L, un" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Preço pago (R$)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 12,90"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {!priceValid && <p className="mt-1 text-xs text-destructive">Preço inválido</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Cancelar</button>
          <button
            disabled={busy || !name.trim() || !priceValid}
            onClick={() => onSave({
              id: item.id,
              displayName: name.trim(),
              category: category.trim() || null,
              unit: unit.trim() || null,
              notes: notes.trim() || null,
              purchasedPrice: parsedPrice,
            })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Autocomplete                                                */
/* ============================================================ */

function CatalogAutocomplete({
  onPick,
  busy,
}: {
  onPick: (s: CatalogSuggestion, quantity: number) => void;
  busy: boolean;
}) {
  const searchFn = useServerFn(searchCatalog);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suggestQuery = useQuery({
    queryKey: ["catalog-search", debounced],
    queryFn: () => searchFn({ data: { query: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const suggestions = useMemo(
    () => (suggestQuery.data ?? []) as CatalogSuggestion[],
    [suggestQuery.data],
  );

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar produto do catálogo (mín. 2 letras)..."
            className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > 0) setQty(v);
          }}
          className="w-20 rounded-full border border-border bg-background px-3 py-2 text-center text-sm"
          aria-label="Quantidade"
        />
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {suggestQuery.isLoading && (
            <div className="p-3 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Buscando...
            </div>
          )}
          {!suggestQuery.isLoading && suggestions.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              Nenhum produto no catálogo.
            </div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.id}
              disabled={busy}
              onClick={() => {
                onPick(s, qty);
                setQ("");
                setOpen(false);
                setQty(1);
              }}
              className="flex w-full items-center gap-3 border-b border-border p-3 text-left last:border-0 hover:bg-muted/50 disabled:opacity-50"
            >
              <ProductImage
                src={s.imageUrl}
                alt={s.displayName}
                width={40}
                height={40}
                fallbackLabel={s.displayName}
                className="h-10 w-10 flex-none rounded-md bg-muted"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {s.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[s.brand, s.defaultUnit, s.barcode].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/* Best Prices Panel                                           */
/* ============================================================ */

function BestPricesPanel({
  data,
  loading,
  favMarketSet,
  onToggleFavMarket,
}: {
  data:
    | Awaited<ReturnType<typeof computeBestPrices>>
    | undefined;
  loading: boolean;
  favMarketSet: Set<string>;
  onToggleFavMarket: (name: string) => void;
}) {
  const FavBtn = ({ name }: { name: string }) => {
    const isFav = favMarketSet.has(name);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavMarket(name);
        }}
        aria-label={isFav ? "Remover mercado dos favoritos" : "Favoritar mercado"}
        className={
          isFav
            ? "text-accent hover:text-accent/80"
            : "text-muted-foreground hover:text-accent"
        }
      >
        <Star className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-5">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-display text-xl text-foreground">Melhor preço</h3>
          <p className="text-xs text-muted-foreground">
            Baseado no catálogo do admin e nos preços observados nos mercados.
          </p>
        </div>
      </div>

      {loading && (
        <div className="p-5 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Calculando...
        </div>
      )}

      {!loading && data && (
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {/* Best cart */}
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Melhor mercado para o carrinho
            </p>
            {data.bestCart ? (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="flex-1 font-display text-2xl text-foreground">
                    {data.bestCart.marketName}
                  </p>
                  <FavBtn name={data.bestCart.marketName} />
                </div>
                <p className="mt-3 font-mono text-3xl font-semibold text-foreground">
                  R$ {data.bestCart.total.toFixed(2).replace(".", ",")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.bestCart.itemsCovered} de {data.bestCart.itemsTotal} itens
                  disponíveis
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há preços suficientes registrados para estes itens.
              </p>
            )}

            {data.markets.length > 1 && (
              <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
                {data.markets.slice(1).map((m) => (
                  <li
                    key={m.marketName}
                    className="flex items-center gap-3 p-3 text-sm"
                  >
                    <FavBtn name={m.marketName} />
                    <span className="flex-1 text-foreground">{m.marketName}</span>
                    <span className="text-right">
                      <span className="font-mono text-foreground">
                        R$ {m.total.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.itemsCovered}/{m.itemsTotal}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Per item */}
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Melhor preço item a item
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.items.map((it) => (
                <li key={it.itemId} className="p-3">
                  <p className="text-sm font-medium text-foreground">
                    {it.displayName}{" "}
                    <span className="text-xs text-muted-foreground">
                      × {it.quantity}
                    </span>
                  </p>
                  {it.best ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="inline h-3 w-3" />
                      <span>{it.best.marketName}</span>
                      <span>—</span>
                      <span className="font-mono text-foreground">
                        R$ {it.best.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="ml-auto">
                        <FavBtn name={it.best.marketName} />
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sem preços registrados ainda.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!loading && data?.splitRoute && (
        <SplitRoutePanel route={data.splitRoute} favMarketSet={favMarketSet} onToggleFavMarket={onToggleFavMarket} />
      )}
    </div>
  );
}

/* ============================================================ */
/* Roteiro otimizado — dividir compra entre mercados               */
/* ============================================================ */

function SplitRoutePanel({
  route,
  favMarketSet,
  onToggleFavMarket,
}: {
  route: NonNullable<Awaited<ReturnType<typeof computeBestPrices>>["splitRoute"]>;
  favMarketSet: Set<string>;
  onToggleFavMarket: (name: string) => void;
}) {
  const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const hasSavings =
    route.assignments.length >= 2 &&
    route.singleMarketTotal !== null &&
    route.savings > 0;
  const multiStore = route.assignments.length >= 2;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-savings/30 bg-gradient-to-br from-savings/8 via-card to-primary/5">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-savings/20 text-savings">
          <RouteIcon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-xl text-foreground">
            Roteiro otimizado
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {multiStore
              ? `Divida a compra entre ${route.assignments.length} mercados para pagar o menor preço em cada item.`
              : "Todos os itens estão mais baratos no mesmo mercado — sem necessidade de dividir."}
          </p>
        </div>
        {hasSavings && (
          <div className="text-right">
            <p className="inline-flex items-center gap-1 rounded-full bg-savings px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-savings-foreground">
              <TrendingDown className="h-3 w-3" strokeWidth={3} />
              -{route.savingsPct.toFixed(1)}%
            </p>
            <p className="mt-1 inline-flex items-baseline gap-1 text-sm font-bold text-savings">
              economia <Price value={route.savings} size="sm" tone="savings" />
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <ul className="space-y-3">
          {route.assignments.map((a, idx) => (
            <li
              key={a.marketName}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[12px] font-black text-primary-foreground">
                  {idx + 1}
                </span>
                <p className="flex-1 font-display text-[15px] font-bold text-foreground">
                  {a.marketName}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavMarket(a.marketName);
                  }}
                  aria-label={
                    favMarketSet.has(a.marketName)
                      ? "Remover mercado dos favoritos"
                      : "Favoritar mercado"
                  }
                  className={
                    favMarketSet.has(a.marketName)
                      ? "text-accent hover:text-accent/80"
                      : "text-muted-foreground hover:text-accent"
                  }
                >
                  <Star
                    className={`h-4 w-4 ${favMarketSet.has(a.marketName) ? "fill-current" : ""}`}
                  />
                </button>
                <Price value={a.subtotal} size="sm" />
              </div>
              <ul className="divide-y divide-border/60">
                {a.items.map((it) => (
                  <li
                    key={it.itemId}
                    className="flex items-center gap-3 px-4 py-2 text-xs"
                  >
                    <span className="flex-1 truncate text-foreground">
                      {it.displayName}
                      <span className="ml-1 text-muted-foreground">
                        × {it.quantity}
                      </span>
                    </span>
                    <Price value={it.unitPrice * it.quantity} size="xs" />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <aside className="flex flex-col justify-between rounded-xl border border-border bg-background p-4 md:w-56">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Roteiro
            </p>
            <Price as="p" value={route.total} size="xl" tone="savings" className="mt-1" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {route.itemsCovered} de {route.itemsTotal} itens
            </p>
          </div>

          {route.singleMarketTotal !== null && route.singleMarketName && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Uma mercado só
              </p>
              <Price as="p" value={route.singleMarketTotal} size="lg" className="mt-1" />
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                em {route.singleMarketName}
              </p>
              {hasSavings ? (
                <p className="mt-2 rounded-full bg-savings/15 px-2 py-1 text-center text-[11px] font-bold text-savings">
                  Economize <Price value={route.savings} size="xs" tone="savings" />
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Não compensa dividir agora.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   AdhocItemForm — adicionar consumíveis sem catálogo
   (gás, combustível, limpeza, alimentação avulsa)
   ============================================================ */

type AdhocInput = {
  displayName: string;
  quantity: number;
  category: string | null;
  unit: string | null;
  notes: string | null;
};

const ADHOC_CATEGORIES = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "limpeza", label: "Limpeza" },
  { value: "higiene", label: "Higiene" },
  { value: "gas", label: "Gás" },
  { value: "combustivel", label: "Combustível" },
  { value: "outros", label: "Outros" },
];

function AdhocItemForm({
  onAdd,
  busy,
}: {
  onAdd: (v: AdhocInput) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [cat, setCat] = useState("alimentacao");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    const n = name.trim();
    if (!n) {
      toast.error("Informe o nome do item");
      return;
    }
    onAdd({
      displayName: n,
      quantity: qty > 0 ? qty : 1,
      category: cat || null,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    });
    setName("");
    setQty(1);
    setUnit("");
    setNotes("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar item avulso (gás, combustível, limpeza…)
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_90px_140px_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Botijão de gás 13kg"
          maxLength={200}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          aria-label="Quantidade"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          {ADHOC_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "..." : "Adicionar"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unidade (kg, L, un…)"
          maxLength={20}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observação (opcional)"
          maxLength={200}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />
      </div>
    </div>
  );
}


