import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionGate } from "@/hooks/use-session-gate";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  getAppSummary,
  removeFavoriteItem,
  removeFavoriteMarket,
  reorderFavoriteItems,
  reorderFavoriteMarkets,
  addFavoriteToList,
} from "@/lib/favorites.functions";
import { listMyShoppingLists } from "@/lib/shopping-list.functions";
import { getMyAccount } from "@/lib/account.functions";
import {
  listPublicStores,
  type PublicStore,
} from "@/lib/stores-public.functions";

/**
 * Central data hook for the authenticated home page. Wires together
 * every server function the page needs (summary, account, lists,
 * public stores) plus the mutations that mutate favorites, and exposes
 * a small map for looking up known public stores by name.
 */
export function useAppHomeData() {
  const qc = useQueryClient();
  // Só chama server functions protegidas quando existe sessão: sem token o
  // servidor responde "Unauthorized: No authorization header provided".
  const { hasSession } = useSessionGate();

  const summaryFn = useServerFn(getAppSummary);
  const accountFn = useServerFn(getMyAccount);
  const listsFn = useServerFn(listMyShoppingLists);
  const removeItemFn = useServerFn(removeFavoriteItem);
  const removeMarketFn = useServerFn(removeFavoriteMarket);
  const reorderItemsFn = useServerFn(reorderFavoriteItems);
  const reorderMarketsFn = useServerFn(reorderFavoriteMarkets);
  const addToListFn = useServerFn(addFavoriteToList);

  const summaryQuery = useQuery({
    queryKey: ["app-summary"],
    queryFn: () => summaryFn(),
    enabled: hasSession,
  });
  const accountQuery = useQuery({
    queryKey: ["account"],
    queryFn: () => accountFn(),
    enabled: hasSession,
  });
  const listsQuery = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => listsFn(),
    enabled: hasSession,
  });
  const publicStoresQuery = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listPublicStores(),
    staleTime: 60_000,
  });

  const storesByName = useMemo(() => {
    const map = new Map<string, PublicStore>();
    for (const s of publicStoresQuery.data ?? []) {
      map.set(s.name.trim().toLowerCase(), s);
    }
    return map;
  }, [publicStoresQuery.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["app-summary"] });
    qc.invalidateQueries({ queryKey: ["my-lists"] });
  };

  const removeItem = useMutation({
    mutationFn: (favoriteId: string) => removeItemFn({ data: { favoriteId } }),
    onSuccess: invalidate,
  });
  const removeMarket = useMutation({
    mutationFn: (favoriteId: string) => removeMarketFn({ data: { favoriteId } }),
    onSuccess: invalidate,
  });
  const reorderItems = useMutation({
    mutationFn: (ids: string[]) => reorderItemsFn({ data: { ids } }),
    onSuccess: invalidate,
  });
  const reorderMarkets = useMutation({
    mutationFn: (ids: string[]) => reorderMarketsFn({ data: { ids } }),
    onSuccess: invalidate,
  });
  const addToList = useMutation({
    mutationFn: (input: { catalogId: string; listId: string }) =>
      addToListFn({ data: input }),
    onSuccess: invalidate,
  });

  return {
    summaryQuery,
    accountQuery,
    listsQuery,
    storesByName,
    mutations: { removeItem, removeMarket, reorderItems, reorderMarkets, addToList },
  };
}
