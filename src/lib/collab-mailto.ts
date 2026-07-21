/**
 * Utilitários para gerar links `mailto:` profissionais para colaboração.
 * Mantém assunto, corpo estruturado e checklist idênticos em toda a plataforma.
 */

export const COLLAB_EMAIL = "economizafeijo@gmail.com";

const SUBJECT = "Colaboração — Nota fiscal para PreçoCerto";

const BODY_LINES = [
  "Olá, equipe PreçoCerto!",
  "",
  "Estou enviando meu(s) comprovante(s) de compra para ajudar a manter os preços atualizados.",
  "",
  "── DADOS DA COLABORAÇÃO ──",
  "• Nome completo: ",
  "• Mercado favorito: ",
  "• Cidade / bairro: ",
  "• Data da compra: __/__/____",
  "• Quantidade de notas anexadas: ",
  "",
  "── CHECKLIST (marque com X) ──",
  "[ ] Anexei foto legível da nota fiscal (frente completa)",
  "[ ] O nome do mercado aparece claramente",
  "[ ] Os preços dos produtos estão legíveis",
  "[ ] Estou de acordo em receber 30 dias de acesso após conferência",
  "",
  "── MEU CPF (para vincular os 30 dias) ──",
  "CPF: ",
  "",
  "Obrigado por manter o PreçoCerto colaborativo!",
];

export function collabMailtoHref(): string {
  return `mailto:${COLLAB_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY_LINES.join("\n"))}`;
}

export const COLLAB_CHECKLIST: Array<{ label: string; hint?: string }> = [
  { label: "Seu nome completo", hint: "Para vincular à sua conta" },
  { label: "Mercado favorito", hint: "Onde você comprou" },
  { label: "Data da compra", hint: "Aparece impressa na nota" },
  { label: "Foto legível da nota fiscal", hint: "Frente completa, sem cortes" },
];
