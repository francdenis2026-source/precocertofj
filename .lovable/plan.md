## Escopo

Oito melhorias sobre a Cesta Básica, Medidores e Lista de Compras. Vou entregá-las em quatro blocos, cada um em edições paralelas.

## Bloco 1 — Cesta Básica: PDF, "sem preço", filtro e compartilhamento

**1.1 Exportação em PDF (`src/lib/basket-pdf.ts` novo)**
- `jsPDF` + `jspdf-autotable` (já usados em `pdf-export.ts` e `medidores-pdf.ts`).
- Cabeçalho PreçoCerto + data + filtros aplicados.
- Ranking de estabelecimentos (posição, loja, cobertura X/Y, total).
- Tabela item×loja com preços; célula "—" para faltantes.
- Rodapé com total mais barato teórico.

**1.2 Estado "sem preço" por item**
- Em `getBasketComparison` já sabemos `items[i] === null` por loja. Vou expor também `missingByItem: Record<EssentialKey, { count, stores: string[] }>` para tooltip/legenda.
- UI em `cesta-basica.tsx`: badge "sem preço em N lojas" no card do item; nota no total da loja explicando que cobertura parcial subestima o valor real.

**1.3 Filtro por proximidade (raio/CEP)**
- Aproveita `establishments.latitude/longitude` (já existentes no schema).
- Input de CEP + raio (5/10/25 km). Geocode do CEP via ViaCEP + Nominatim (server-side, com cache in-memory por chamada) num novo `geocode.server.ts`.
- Passa `originLat/originLng/radiusKm` para `getBasketComparison`; filtra lojas por Haversine antes do ranking.
- Se CEP inválido/sem coordenada: fallback silencioso (mostra tudo) + toast.

**1.4 Link compartilhável**
- Serializar filtros no querystring (`?cep=...&raio=...&modo=...&orcamento=...`).
- `ShareButton` (já existe em `ds/ShareButton.tsx`) no topo da página.
- Ao abrir com params, hidrata estado inicial → mesmo resultado em outro dispositivo (dados vêm do banco).

## Bloco 2 — Cestas favoritas

- Nova tabela `saved_baskets` (id, user_id, name, filters jsonb, snapshot jsonb, created_at) com RLS por `auth.uid()` + GRANTs padrão.
- `src/lib/saved-baskets.functions.ts`: `saveBasket`, `listBaskets`, `deleteBasket`, `loadBasket` (protegido por `requireSupabaseAuth`).
- UI em `cesta-basica.tsx`: botão "Salvar cesta" + drawer "Minhas cestas" com "Abrir" (aplica filtros/modo) e "Excluir".
- Visitantes não logados: CTA "Entre para salvar".

## Bloco 3 — Assistente inteligente de cesta

- Novo componente `BasketAssistant.tsx` (chat lateral em `/cesta-basica`).
- Server fn `askBasketAssistant` usando Lovable AI Gateway (`google/gemini-2.5-flash`), tool-calling com ferramentas: `set_budget`, `set_radius`, `add_item`, `remove_item`, `pick_store`, `explain_choice`.
- Contexto: comparação atual + orçamento + filtros. Model retorna sugestões ("com R$ 80, priorize arroz+feijão+óleo em X, você economiza Y vs média").
- Histórico enviado a cada turno (stateless model). Sem persistência inicial.

## Bloco 4 — Auditoria + recálculo instantâneo (Medidores/Lista)

**4.1 Auditoria**
- Nova tabela `edit_audit_log` (id, user_id, entity_type ['shopping_item'|'finance_tx'], entity_id, action, before jsonb, after jsonb, created_at) com RLS `user_id = auth.uid()`.
- Trigger `AFTER UPDATE/DELETE` em `shopping_list_items` e `finance_transactions` grava diff.
- Botão "Histórico" ao lado de cada item avulso e leitura, abrindo drawer com timeline "antes → depois" + data.

**4.2 Recálculo instantâneo garantido**
- Já há `invalidateQueries` em Medidores. Reforço: `refetchOnMount: 'always'` + versionar `queryKey` com `updated_at` da última leitura editada; sparklines/gauges recomputam via `useMemo` já dependente do dataset. Também remover cache stale de R$/unidade que pudesse persistir após refresh (`staleTime: 0` para leituras).
- Em Lista, garantir que edição de `purchasedPrice`+`unit` re-render R$/unidade nos cards (recalcular no derived state, sem depender de campo pré-computado).

## Detalhes técnicos

- Todas server fns novas: TanStack `createServerFn`, RLS via `requireSupabaseAuth`, sem `supabaseAdmin` para dados do usuário.
- Migrations com GRANTs completos e `service_role` incluído.
- PDF gerado no cliente (mesma abordagem de `medidores-pdf.ts`).
- Geocoder server-side com timeout de 3s e fallback gracioso.
- AI Assistant: modelo padrão do gateway, sem novos secrets.

## Ordem de entrega

1. Migrations (`saved_baskets`, `edit_audit_log` + triggers).
2. Backend: `basket.functions.ts` (filtros/missing), `saved-baskets.functions.ts`, `geocode.server.ts`, `basket-assistant.functions.ts`, audit fetch fn.
3. Frontend: `cesta-basica.tsx` refactor (filtros + missing + share + save + assistant), `basket-pdf.ts`, drawer de histórico em `lista.tsx` e `MedidoresPanel.tsx`, ajustes de recálculo.

Confirma que posso seguir? Ou quer priorizar um subconjunto primeiro (ex: PDF + missing + favoritas antes do assistente IA)?