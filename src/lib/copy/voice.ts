/**
 * PreçoCerto Feijó — Guia de voz
 * ----------------------------------------------------------------
 * Fonte única de verdade para o tom de voz do produto.
 * Este arquivo NÃO é importado por componentes: serve como referência
 * de curadoria para futuras edições de copy. Se você editar um texto
 * user-facing, valide contra as regras abaixo antes de aprovar.
 *
 * Persona
 * -------
 * Consumidor de Feijó/AC, sensível a preço, cético com "app da moda",
 * valoriza dado local e economia real no fim do mês.
 *
 * Promessa central
 * ----------------
 * "Comprar melhor, todo dia, sem pagar a mais."
 *
 * Pilares
 * -------
 * 1. Clareza > persuasão barata.
 * 2. Dado concreto > adjetivo ("R$ 4,29" > "muito barato").
 * 3. Vizinhança > marketing genérico ("mercados de Feijó" > "sua região").
 * 4. Ação imediata > promessa vaga ("Veja o preço agora" > "Descubra o melhor").
 *
 * Faz
 * ---
 * • Frases curtas, verbos no imperativo suave: veja, compare, ative, receba.
 * • Números reais e datados ("atualizado hoje", "13 mercados").
 * • Reduzir risco cedo: "grátis", "sem cartão", "cancele quando quiser".
 * • Nomear o local: Feijó, bairro, mercado por nome.
 *
 * Não faz
 * -------
 * • Superlativos vazios: "o melhor", "revolucionário", "incrível".
 * • Urgência forjada: "últimas horas", "só hoje", "corra".
 * • Gírias, emojis decorativos, "🚀 vamos juntos".
 * • Jargão de produto: "onboarding", "engajamento", "SaaS".
 * • Voz passiva quando ativa serve ("O código é enviado" → "Enviamos o código").
 *
 * Estados & tom
 * -------------
 * • Erro: humano, orienta o próximo passo. Sem culpa do usuário.
 *   "Código inválido" → "Não encontramos esse código. Verifique se copiou tudo do e-mail."
 * • Vazio: convite, não desculpa.
 *   "Nenhum resultado" → "Nada por aqui ainda. Tente buscar por 'arroz' ou 'feijão'."
 * • Loading: silencioso quando <1s. Descritivo quando >1s.
 *   "Carregando..." → "Consultando os mercados de Feijó…"
 *
 * Microcopy — templates
 * ---------------------
 * • CTA primário: verbo + objeto direto. "Ver preços", "Comparar mercados", "Ativar licença".
 * • CTA secundário: convite baixo custo. "Como funciona", "Ver planos".
 * • Placeholder de busca: exemplo real. "Arroz Tio João 5kg" > "Digite aqui".
 * • Confirmação: consequência + reversão. "Alerta criado. Avisamos por e-mail; cancele quando quiser."
 *
 * Regra do "então?"
 * -----------------
 * Depois de escrever qualquer frase, pergunte "então?". Se a resposta
 * for "nada" ou "óbvio", corte. Toda frase precisa entregar informação
 * nova ou levar a uma ação.
 */
export const VOICE = {
  brand: "PreçoCerto Feijó",
  city: "Feijó/AC",
  promise: "Comprar melhor, todo dia, sem pagar a mais.",
} as const;
