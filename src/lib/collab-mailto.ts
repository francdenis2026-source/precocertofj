/**
 * Utilitários para gerar links `mailto:` da rede colaborativa.
 *
 * O e-mail é sempre enviado por um usuário logado que já possui um
 * TOKEN ÚNICO DE COLABORADOR (formato PC-XXXX-XXXX). O token vai
 * embutido no assunto para que o painel administrativo cruze
 * automaticamente o e-mail recebido com a conta do usuário.
 */

export const COLLAB_EMAIL = "economizafeijo@gmail.com";

const SUBJECT_PREFIX = "Colaboração PreçoCerto";

function buildBody(token: string): string {
  return [
    "Olá, equipe PreçoCerto!",
    "",
    `Meu token de colaborador: ${token}`,
    "(não altere esta linha — é o que vincula o envio à minha conta)",
    "",
    "── DADOS DA COMPRA ──",
    "• Mercado: ",
    "• Bairro / cidade: ",
    "• Data da compra: __/__/____",
    "• Quantidade de notas anexadas: ",
    "",
    "── CHECKLIST (marque com X) ──",
    "[ ] Anexei foto legível da nota fiscal (frente completa)",
    "[ ] O nome do mercado aparece claramente",
    "[ ] Os preços dos produtos estão legíveis",
    "",
    "Recompensa: 7 dias grátis por nota aprovada, até o teto de 30 dias/mês.",
    "",
    "Obrigado por manter o PreçoCerto colaborativo!",
  ].join("\n");
}

/**
 * Gera o mailto com token embutido no assunto e no corpo.
 * Só deve ser usado no fluxo autenticado (`/colaborar` logado).
 */
export function collabMailtoHref(token: string): string {
  const t = (token || "").trim().toUpperCase();
  const subject = t ? `${SUBJECT_PREFIX} [${t}] — Nota fiscal` : `${SUBJECT_PREFIX} — Nota fiscal`;
  return `mailto:${COLLAB_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildBody(t))}`;
}

/**
 * Regex para extrair o token do assunto/corpo de um e-mail recebido.
 * Aceita ambos "PC-XXXX-XXXX" e "PCXXXXXXXX".
 */
export const COLLAB_TOKEN_REGEX = /PC-?[A-Z0-9]{4}-?[A-Z0-9]{4}/i;
