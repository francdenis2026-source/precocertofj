import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Heart, ListPlus, Loader2 } from "lucide-react";
import { StorefrontMark } from "@/components/icons/StorefrontMark";
import { toast } from "sonner";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { supabase } from "@/integrations/supabase/client";
import { resolveCatalogId } from "@/lib/cart.functions";
import { toggleFavoriteItem } from "@/lib/favorites.functions";
import { addListItem, listMyShoppingLists } from "@/lib/shopping-list.functions";
import { cn } from "@/lib/utils";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { useGuestGate } from "@/hooks/useGuestGate";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";

export interface ProductQuickActionsProps {
  catalogId?: string | null;
  slug?: string;
  label: string;
  className?: string;
  /** Se fornecido, abre modal de comparação; senão navega para /produto-publico/$slug */
  onCompare?: () => void;
}

export function ProductQuickActions({
  catalogId,
  slug,
  label,
  className,
  onCompare,
}: ProductQuickActionsProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const favoriteFn = useServerFn(toggleFavoriteItem);
  const listsFn = useServerFn(listMyShoppingLists);
  const addToListFn = useServerFn(addListItem);
  const resolveFn = useServerFn(resolveCatalogId);
  const promptSignIn = usePromptSignIn();
  const [authed, setAuthed] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [resolvedCatalogId, setResolvedCatalogId] = useState<string | null>(catalogId ?? null);
  const favoriteGate = useGuestGate("favorite" as const);

  useEffect(() => {
    setResolvedCatalogId(catalogId ?? null);
  }, [catalogId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const listsQuery = useQuery({
    queryKey: ["shopping-lists", "quick-actions"],
    queryFn: () => listsFn(),
    enabled: authed,
    staleTime: 30_000,
  });

  const redirectToLogin = () => {
    void promptSignIn({
      intent: "favorite-item",
      payload: { catalogId: resolvedCatalogId, slug, label },
    });
  };


  const ensureCatalogId = async (): Promise<string> => {
    if (resolvedCatalogId) return resolvedCatalogId;
    if (!slug) throw new Error("Produto não encontrado no catálogo");
    const resolved = await resolveFn({ data: { slug } });
    if (!resolved.catalogId) throw new Error("Produto não encontrado no catálogo");
    setResolvedCatalogId(resolved.catalogId);
    return resolved.catalogId;
  };

  const favoriteMutation = useMutation({
    mutationFn: async () => favoriteFn({ data: { catalogId: await ensureCatalogId() } }),
    onSuccess: (result) => {
      setFavorited(result.favorited);
      qc.invalidateQueries({ queryKey: ["favorite-items"] });
      toast.success(result.favorited ? "Favorito adicionado" : "Favorito removido");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao favoritar");
    },
  });

  const listMutation = useMutation({
    mutationFn: async (listId: string) =>
      addToListFn({ data: { listId, catalogId: await ensureCatalogId(), quantity: 1 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-lists"] });
      toast.success("Produto enviado para a lista");
      setListOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar para lista");
    },
  });

  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  const canSave = Boolean(catalogId || slug);

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {(slug || catalogId) && (
        onCompare ? (
          <button
            type="button"
            className={buttonClass}
            aria-label={`Comparar preço de ${label} em todos os mercados`}
            title="Comparar em todos os mercados"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCompare();
            }}
          >
            <StorefrontMark className="h-3.5 w-3.5" strokeWidth={1.9} />
          </button>
        ) : slug ? (
          <Link
            to="/produto-publico/$slug"
            params={{ slug }}
            className={buttonClass}
            aria-label={`Ver preço de ${label} em todos os mercados`}
            title="Ver em todos os mercados"
            onClick={(event) => event.stopPropagation()}
          >
            <StorefrontMark className="h-3.5 w-3.5" strokeWidth={1.9} />
          </Link>
        ) : null
      )}

      {canSave && (
        <button
          type="button"
          className={cn(buttonClass, favorited && "border-primary/40 bg-primary/10 text-primary")}
          disabled={favoriteMutation.isPending}
          aria-label={favorited ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}
          title={favorited ? "Remover dos favoritos" : "Favoritar"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!authed) {
              // Visitantes: consomem cota antes de sugerir cadastro.
              if (!favoriteGate.allow(slug ?? catalogId ?? label)) return;
              redirectToLogin();
              return;
            }
            favoriteMutation.mutate();
          }}
        >
          {favoriteMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
          ) : favorited ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          ) : (
            <Heart className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
        </button>
      )}

      <AddToCartButton
        catalogId={resolvedCatalogId ?? catalogId ?? undefined}
        slug={slug}
        label={label}
        variant="compact"
        className="h-8 px-2.5 normal-case tracking-normal"
      />

      {canSave && (
        <div className="relative">
          <button
            type="button"
            className={buttonClass}
            aria-label={`Enviar ${label} para uma lista`}
            title="Enviar para lista"
            disabled={listMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!authed) {
                redirectToLogin();
                return;
              }
              if (!resolvedCatalogId && slug) {
                ensureCatalogId()
                  .then(() => setListOpen((value) => !value))
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "Produto não encontrado");
                  });
                return;
              }
              setListOpen((value) => !value);
            }}
          >
            {listMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <ListPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
          </button>

          {listOpen && (
            <>
              <button
                type="button"
                aria-label="Fechar opções de lista"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setListOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-52 rounded-lg border border-border bg-card p-1 shadow-lg">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Enviar para
                </p>
                {(listsQuery.data ?? []).length > 0 ? (
                  (listsQuery.data ?? []).map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        listMutation.mutate(list.id);
                      }}
                    >
                      {list.name}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setListOpen(false);
                      navigate({ to: "/lista" });
                    }}
                  >
                    Criar primeira lista
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}