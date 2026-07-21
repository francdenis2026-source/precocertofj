/**
 * Mapa central de códigos de erro do fluxo de foto de produto.
 * Usado tanto no cliente (dialogs de upload / web picker) quanto no servidor
 * (server route de upload e server functions de web).
 *
 * Cada código carrega:
 *  - title:  título curto exibido no card de erro
 *  - cause:  explicação da causa provável
 *  - action: ação recomendada ao admin
 */

export type UploadErrorCode =
  | "FILE_TOO_BIG"
  | "BAD_MIME"
  | "TOO_SMALL"
  | "NETWORK"
  | "RATE_LIMITED"
  | "STORAGE_FAIL"
  | "UNAUTHORIZED"
  | "NO_IMAGE_FOUND"
  | "REMOTE_FETCH_FAIL"
  | "INVALID_URL"
  | "NO_CREDITS"
  | "UNKNOWN";

export type UploadErrorInfo = {
  title: string;
  cause: string;
  action: string;
};

export const UPLOAD_ERRORS: Record<UploadErrorCode, UploadErrorInfo> = {
  FILE_TOO_BIG: {
    title: "Arquivo muito grande",
    cause: "A imagem excede o limite de 5 MB.",
    action: "Comprima ou redimensione (recomendado 1000×1000, JPG qualidade 85%).",
  },
  BAD_MIME: {
    title: "Formato inválido",
    cause: "Apenas JPG, PNG, WEBP e GIF são aceitos.",
    action: "Reexporte a imagem como JPG ou PNG.",
  },
  TOO_SMALL: {
    title: "Arquivo suspeito",
    cause: "A imagem tem menos de 1 KB — provavelmente está vazia ou corrompida.",
    action: "Verifique o arquivo original e envie novamente.",
  },
  NETWORK: {
    title: "Conexão instável",
    cause: "O envio foi interrompido antes de completar.",
    action: "Verifique sua conexão. O sistema já tentou novamente uma vez automaticamente.",
  },
  RATE_LIMITED: {
    title: "Muitas requisições",
    cause: "O gateway limitou temporariamente as chamadas (HTTP 429).",
    action: "Aguarde ~30 segundos e tente de novo.",
  },
  STORAGE_FAIL: {
    title: "Falha no armazenamento",
    cause: "O storage do Cloud rejeitou o upload.",
    action: "Falha transitória — tente novamente em alguns segundos.",
  },
  UNAUTHORIZED: {
    title: "Sessão expirada",
    cause: "Sua sessão de admin não é mais válida.",
    action: "Saia e entre novamente para continuar.",
  },
  NO_IMAGE_FOUND: {
    title: "Nenhuma imagem encontrada",
    cause: "A busca na web não retornou resultados confiáveis.",
    action: "Tente enviar upload manual ou use \"Gerar via IA\".",
  },
  REMOTE_FETCH_FAIL: {
    title: "Não foi possível baixar a imagem",
    cause: "A URL escolhida não respondeu com uma imagem válida.",
    action: "Escolha outra opção da galeria ou tente uma nova busca.",
  },
  INVALID_URL: {
    title: "URL inválida",
    cause: "A URL da imagem candidata não é HTTP(S) ou está malformada.",
    action: "Escolha outra opção da galeria.",
  },
  NO_CREDITS: {
    title: "Créditos da IA esgotados",
    cause: "O workspace ficou sem créditos na AI Gateway (HTTP 402).",
    action: "Adicione créditos em Settings → Plans & credits ou aguarde a próxima recarga mensal.",
  },
  UNKNOWN: {
    title: "Falha inesperada",
    cause: "Ocorreu um erro que ainda não temos mapeado.",
    action: "Tente novamente. Se persistir, entre em contato com o suporte.",
  },
};

/**
 * Tenta inferir um `UploadErrorCode` a partir de uma mensagem de erro
 * livre (Error.message, texto de resposta HTTP, etc.).
 */
export function inferErrorCode(msg: string | undefined | null): UploadErrorCode {
  if (!msg) return "UNKNOWN";
  const s = msg.toLowerCase();
  if (/too big|too large|maior|excede|5\s?mb|payload/.test(s)) return "FILE_TOO_BIG";
  if (/mime|formato|tipo (não|nao)|unsupported/.test(s)) return "BAD_MIME";
  if (/too small|pequeno|corromp/.test(s)) return "TOO_SMALL";
  if (/402|payment_required|not enough credits|sem cr(é|e)dit/.test(s)) return "NO_CREDITS";
  if (/rate|429/.test(s)) return "RATE_LIMITED";
  if (/unauthor|401|forbidden|403|sess(ã|a)o/.test(s)) return "UNAUTHORIZED";
  if (/storage|bucket|upload falhou|falha.*upload/.test(s)) return "STORAGE_FAIL";
  if (/network|failed to fetch|timeout|econn|abort|offline|503|504/.test(s)) return "NETWORK";
  if (/n(ã|a)o encontrad|no image|empty result/.test(s)) return "NO_IMAGE_FOUND";
  if (/remote fetch|imagem remota|content-type/.test(s)) return "REMOTE_FETCH_FAIL";
  if (/invalid url|url invalid/.test(s)) return "INVALID_URL";
  return "UNKNOWN";
}

/**
 * Classe de erro que carrega um código; server functions/routes podem
 * lançar isso e o cliente reconhece.
 */
export class UploadError extends Error {
  code: UploadErrorCode;
  constructor(code: UploadErrorCode, message?: string) {
    super(message ?? UPLOAD_ERRORS[code].title);
    this.code = code;
    this.name = "UploadError";
  }
}
