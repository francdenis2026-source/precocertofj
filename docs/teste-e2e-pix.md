# Teste E2E — Pedido → Pix → Webhook → License Code

Fluxo completo para validar que um pagamento Pix real (ou de teste) chega
até a geração automática do `license_code` no Mercado Pago.

---

## Pré-requisitos

1. Secrets configurados no projeto:
   - `MP_ACCESS_TOKEN` — token da sua aplicação MP
     - Sandbox: começa com `TEST-...`
     - Produção: começa com `APP_USR-...`
   - `MP_WEBHOOK_SECRET` — segredo forte (mesma string dos dois lados)

2. Webhook cadastrado no painel MP (Developers → Sua aplicação → Webhooks):
   - URL: `https://preco-certo-fj.lovable.app/api/public/mp-webhook`
   - Eventos: **Pagamentos** (`payment`)
   - Segredo: mesmo valor de `MP_WEBHOOK_SECRET`

3. Se estiver em **sandbox**, crie um comprador de teste em
   https://www.mercadopago.com.br/developers/panel/test-users
   (use o email/senha desse comprador ao pagar).

---

## Passo a passo

### 1) Gerar o pedido

- Abra `https://preco-certo-fj.lovable.app/planos`
- Escolha um plano pago (ex.: **Mensal — R$ 19,90**)
- Faça login se ainda não estiver logado
- Você será redirecionado para `/checkout/<orderId>`

Verifique na tela:
- Nome do plano, valor total e status `Aguardando pagamento`
- (Opcional) aplique um cupom pra confirmar o desconto

### 2) Pagar com Pix

- Clique em **"Pagar com Mercado Pago"** — você é redirecionado para o
  Checkout Pro
- Selecione **Pix**, gere o QR Code
- Pague com o app do banco (produção) ou com o comprador de teste (sandbox)

### 3) Webhook aprova automaticamente

Em paralelo, abra em outra aba: `/admin/webhooks`

Você verá em até ~10 segundos uma linha nova:
- `event_type`: `payment.updated`
- `status`: `processed`
- `signature_valid`: `true`

Se algo der errado, o `error` mostra o motivo (assinatura inválida,
pedido não encontrado, MP retornou erro, etc.).

### 4) Código de licença aparece

Volte para `/checkout/<orderId>`:
- O polling detecta em até 4s e a tela muda para **"Pagamento aprovado"**
- O `license_code` (formato `PCFJXXXX-XXXX-XXXX`) aparece com botões
  **Copiar** e **Ativar**
- Também disponível em `/minhas-licencas`

---

## Simulação sem Mercado Pago (dev/admin)

Se ainda não tem o token de teste ou quer validar só a parte interna:

1. No `/checkout/<orderId>` como admin, aparece um card extra
2. Clique em **"Simular pagamento (dev)"**
3. O RPC `approve_checkout_order` roda direto e gera o `license_code`
4. Uma linha `simulated.payment` é registrada em `/admin/webhooks` para
   auditoria (marcada como sintética)

Isso **não** passa pelo MP — use apenas em ambiente controlado.

---

## Checklist rápido

- [ ] `MP_ACCESS_TOKEN` salvo (formato validado no `/admin/webhooks`)
- [ ] `MP_WEBHOOK_SECRET` salvo (mesmo valor no MP)
- [ ] Webhook cadastrado no painel MP com evento `payment`
- [ ] Pedido criado em `/planos`
- [ ] Redirecionamento para MP funcionou
- [ ] Pix pago (real ou sandbox)
- [ ] Log `processed` visível em `/admin/webhooks`
- [ ] License code aparece em `/checkout/<id>` e em `/minhas-licencas`

---

## Solução de problemas

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| "Token inválido" ao criar preferência | `MP_ACCESS_TOKEN` faltando ou mal formatado | Reenvie o token; deve começar com `APP_USR-` ou `TEST-` |
| Webhook chega com `signature_valid: false` | Segredo diferente entre app e MP | Regravar `MP_WEBHOOK_SECRET` com o mesmo valor cadastrado no MP |
| Webhook chega mas status fica `skipped_duplicate` | Notificação repetida (MP reenvia) | Comportamento esperado — a idempotência bloqueia duplicidade |
| Pagou mas o código não aparece | Webhook não chegou ou pedido diferente | Confira `/admin/webhooks` — se não há linha nova, o MP não notificou (verifique URL cadastrada) |
| "Pedido não encontrado" no log | `external_reference` divergente | Não altere o campo `external_reference` na preferência |
