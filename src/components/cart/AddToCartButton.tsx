import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart.functions";
import { setPendingCartItem, type PendingCartItem } from "@/lib/pending-cart";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { cn } from "@/lib/utils";

export interface AddToCartButtonProps {
  catalogId?: string;
  slug?: string;
  label?: string;
  quantity?: number;
  variant?: "solid" | "ghost" | "compact";
  className?: string;
  onAdded?: () => void;
  stopPropagation?: boolean;
}

/**
 * Botão universal para adicionar um produto à cesta.
 * - Se o usuário não estiver autenticado, guarda a intenção em sessionStorage
 *   e redireciona para /login. Após o login, o item é adicionado
 *   automaticamente pela home.
 * - Se autenticado, chama addToCart e invalida o cache da cesta.
 */
export function AddToCartButton({
  catalogId,
  slug,
  label,
  quantity = 1,
  variant = "solid",
  className,
  onAdded,
  stopPropagation = true,
}: AddToCartButtonProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addFn = useServerFn(addToCart);
  const promptSignIn = usePromptSignIn();
  const [added, setAdded] = useState(false);

  const mutation = useMutation({
    mutationFn: async () =>
      addFn({ data: { catalogId, slug, quantity } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      setAdded(true);
      toast.success(label ? `${label} adicionado à cesta` : "Adicionado à cesta", {
        action: {
          label: "Ver cesta",
          onClick: () => navigate({ to: "/cesta" }),
        },
      });
      onAdded?.();
      window.setTimeout(() => setAdded(false), 1600);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao adicionar";
      toast.error(msg);
    },
  });

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mutation.isPending) return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const pending: PendingCartItem = { catalogId, slug, quantity, label };
      setPendingCartItem(pending);
      await promptSignIn({
        intent: "favorite-item",
        title: label ? `Entre para adicionar ${label} à cesta` : "Entre para montar sua cesta",
        benefits: [
          "Guardamos este produto para adicionar depois do login",
          "Voltamos para a home e concluímos a inclusão sozinhos",
          "Você pode gerenciar quantidades direto na sua cesta",
        ],
        returnTo: "/",
      });
      return;
    }
    mutation.mutate();
  }


  const isBusy = mutation.isPending;
  const showCheck = added;

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.12em] transition disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  const variantClasses: Record<NonNullable<AddToCartButtonProps["variant"]>, string> = {
    solid:
      "bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-[10px]",
    ghost:
      "border border-primary/30 text-primary hover:bg-primary/10 px-3 py-1.5 text-[10px]",
    compact:
      "bg-foreground text-background hover:bg-foreground/90 px-2 py-1 text-[9px]",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-label={label ? `Adicionar ${label} à cesta` : "Adicionar à cesta"}
      className={cn(base, variantClasses[variant], className)}
    >
      {isBusy ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
      ) : showCheck ? (
        <Check className="h-3 w-3" strokeWidth={2.4} />
      ) : (
        <ShoppingBag className="h-3 w-3" strokeWidth={2.4} />
      )}
      <span>{showCheck ? "Na cesta" : "Cesta"}</span>
    </button>
  );
}
