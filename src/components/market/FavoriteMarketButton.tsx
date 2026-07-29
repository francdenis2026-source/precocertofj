import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { useGuestGate } from "@/hooks/useGuestGate";
import { GuestGateDialog } from "@/components/gate/GuestGateDialog";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import {
  listFavoriteMarkets,
  toggleFavoriteMarket,
} from "@/lib/favorites.functions";

/**
 * Botão de favoritar mercado. Persiste em `favorite_markets` (chave =
 * `market_name`), com estado otimista. Oculto para visitantes.
 *
 * `variant="overlay"` = flutuante circular (para cima de cards).
 * `variant="inline"`  = chip com rótulo, para toolbars/headers.
 */
export function FavoriteMarketButton({
  marketName,
  variant = "overlay",
  className,
}: {
  marketName: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const { user, loading } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listFavoriteMarkets);
  const toggleFn = useServerFn(toggleFavoriteMarket);
  const gate = useGuestGate("favorite");
  const promptSignIn = usePromptSignIn();

  const { data: favorites } = useQuery({
    queryKey: ["favorite-markets"],
    queryFn: () => listFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = !!favorites?.some(
    (f) => f.marketName.trim().toLowerCase() === marketName.trim().toLowerCase(),
  );

  const mutation = useMutation({
    mutationFn: () => toggleFn({ data: { marketName } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["favorite-markets"] });
      qc.invalidateQueries({ queryKey: ["app-summary"] });
      toast.success(
        res.favorited
          ? `${marketName} salvo em favoritos`
          : `${marketName} removido dos favoritos`,
      );
    },
    onError: (err) => toast.error((err as Error).message ?? "Não foi possível salvar"),
  });

  if (loading) return null;

  const label = isFav ? "Remover dos favoritos" : "Salvar como favorito";
  const handle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      // Visitantes: consomem cota antes de sugerir cadastro.
      if (!gate.allow(`market:${marketName}`)) return;
      void promptSignIn({ intent: "favorite-item", payload: { marketName } });
      return;
    }
    if (mutation.isPending) return;
    mutation.mutate();
  };

  const gateDialog = (
    <GuestGateDialog
      open={gate.open}
      onOpenChange={gate.setOpen}
      action="favorite"
      title="Favoritos são grátis para quem tem conta"
      description="Crie sua conta grátis (7 dias sem cartão) para acompanhar seus mercados preferidos e comparar totais rapidamente."
    />
  );

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={handle}
          disabled={mutation.isPending}
          aria-pressed={isFav}
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
            isFav
              ? "border-brand-gold bg-brand-gold text-brand-navy"
              : "border-border bg-card text-foreground hover:border-brand-gold/60",
            mutation.isPending && "opacity-60",
            className,
          )}
        >
          <Star
            className={cn("h-3.5 w-3.5", isFav && "fill-current")}
            strokeWidth={2}
            aria-hidden
          />
          {isFav ? "Favorito" : "Favoritar"}
        </button>
        {gateDialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={mutation.isPending}
        aria-pressed={isFav}
        aria-label={label}
        title={label}
        className={cn(
          "inline-grid h-8 w-8 place-items-center rounded-full border shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
          isFav
            ? "border-brand-gold bg-brand-gold text-brand-navy"
            : "border-border/70 bg-background/90 text-muted-foreground hover:border-brand-gold hover:text-brand-gold",
          mutation.isPending && "opacity-60",
          className,
        )}
      >
        <Star className={cn("h-4 w-4", isFav && "fill-current")} strokeWidth={2} aria-hidden />
      </button>
      {gateDialog}
    </>
  );
}
