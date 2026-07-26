import { Sparkles, Check, Lock, ShoppingCart, TrendingDown } from "lucide-react";
import { LockOverlay } from "@/components/paywall/LockOverlay";
import { PaywallInline } from "@/components/paywall/PaywallInline";
import { FreeQuotaBadge } from "@/components/paywall/FreeQuotaBadge";
import { useEffect, useState } from "react";
import { useTeaserQuota } from "@/hooks/use-teaser-quota";
import { isTeaserLocked } from "@/lib/teaser-rule";

function buildLoginHref(): string {
  if (typeof window === "undefined") return "/login";
  return `/login?redirect=${encodeURIComponent("/lista")}`;
}

/**
 * Preview de "Lista de compras" para visitantes não autenticados.
 * Renderiza uma lista fictícia deterministicamente com alguns itens abertos
 * e outros bloqueados, e força o CTA de cadastro em qualquer ação real
 * (adicionar item, salvar lista, comparar mercado).
 *
 * Usar somente quando a sessão real do usuário não existe — a página
 * autenticada continua entregue por `ListaContent` via `ProtectedGate`.
 */
const DEMO_ITEMS = [
  { id: "leite-integral-1l", name: "Leite integral 1L", brand: "Italac", price: 5.49, saving: "-12%" },
  { id: "arroz-branco-5kg", name: "Arroz branco tipo 1 5kg", brand: "Camil", price: 27.9, saving: "-18%" },
  { id: "feijao-carioca-1kg", name: "Feijão carioca 1kg", brand: "Kicaldo", price: 7.89, saving: "-9%" },
  { id: "cafe-torrado-500g", name: "Café torrado e moído 500g", brand: "Pilão", price: 18.9, saving: "-14%" },
  { id: "acucar-refinado-1kg", name: "Açúcar refinado 1kg", brand: "União", price: 4.19, saving: "-7%" },
  { id: "oleo-soja-900ml", name: "Óleo de soja 900ml", brand: "Soya", price: 6.29, saving: "-11%" },
  { id: "sabao-po-1kg", name: "Sabão em pó 1kg", brand: "OMO", price: 12.9, saving: "-15%" },
  { id: "pao-forma-500g", name: "Pão de forma 500g", brand: "Pullman", price: 8.79, saving: "-10%" },
];

export function ListaVisitorPreview() {
  useTeaserQuota(); // apenas para manter a badge em sincronia
  const [href, setHref] = useState("/login");
  useEffect(() => setHref(buildLoginHref()), []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:p-9">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-accent" aria-hidden />
        <div className="absolute -right-24 top-20 h-32 w-32 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            <ShoppingCart className="h-3 w-3" /> Prévia da lista de compras
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.05] md:text-5xl">
            Monte a lista.<br />Descubra o mercado mais barato.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/85">
            Este é um exemplo do que sua lista salva mostra. Crie sua conta em 30 segundos
            para adicionar seus próprios itens, salvar várias listas e ver em qual
            supermercado o carrinho inteiro sai mais barato.
          </p>
          <div className="mt-4">
            <FreeQuotaBadge variant="inline" className="!border-white/30 !bg-white/10 [&_span]:!text-primary-foreground [&_a]:!bg-primary-foreground [&_a]:!text-primary" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg text-foreground">Compras do mês (exemplo)</h2>
            <p className="text-xs text-muted-foreground">
              {DEMO_ITEMS.length} itens · uma amostra do que sua lista mostrará
            </p>
          </div>

          <ul className="divide-y divide-border" aria-label="Prévia de itens da lista">
            {DEMO_ITEMS.map((item, idx) => {
              const locked = isTeaserLocked(item.id, idx);
              const Row = (
                <div className="flex items-center gap-3 p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-background">
                    <Check className="h-3 w-3 text-muted-foreground" aria-hidden />
                  </span>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      R$ {item.price.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-savings-foreground">
                      <TrendingDown className="h-3 w-3" aria-hidden /> {item.saving}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={item.id}>
                  {locked ? (
                    <div className="relative h-[68px]">
                      <LockOverlay locked variant="compact">
                        {Row}
                      </LockOverlay>
                    </div>
                  ) : (
                    Row
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={() => (window.location.href = href)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Criar conta grátis para salvar minha lista
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Sua lista fica salva na conta e você pode ativar alertas de preço.
            </p>
          </div>
        </div>

        <aside className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background p-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
              O que você desbloqueia
            </p>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-savings" strokeWidth={2.6} aria-hidden />
              Salvar várias listas e checar itens no mercado
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-savings" strokeWidth={2.6} aria-hidden />
              Sugestão automática do mercado mais barato para todo o carrinho
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-savings" strokeWidth={2.6} aria-hidden />
              Alerta quando um item favorito baixar de preço
            </li>
          </ul>
          <div className="mt-5">
            <PaywallInline
              title="Comece grátis"
              subtitle="Sem cartão. Cadastre em 30s e mantenha sua lista sincronizada."
              benefits={[]}
              eyebrow="Membro"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
