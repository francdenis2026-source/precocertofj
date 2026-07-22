import { useEffect } from "react";

/**
 * Dicionário de termos comuns em inglês que devem aparecer em PT-BR
 * na interface. Substituições preservam capitalização inicial (Title → Título,
 * TITLE → TÍTULO, title → título).
 */
export const PT_TERMS: Record<string, string> = {
  // Ações
  save: "salvar",
  cancel: "cancelar",
  delete: "excluir",
  remove: "remover",
  edit: "editar",
  add: "adicionar",
  submit: "enviar",
  send: "enviar",
  next: "próximo",
  previous: "anterior",
  back: "voltar",
  close: "fechar",
  open: "abrir",
  continue: "continuar",
  confirm: "confirmar",
  update: "atualizar",
  refresh: "atualizar",
  reload: "recarregar",
  reset: "redefinir",
  clear: "limpar",
  copy: "copiar",
  share: "compartilhar",
  download: "baixar",
  upload: "enviar",
  search: "buscar",
  filter: "filtrar",

  // Auth
  login: "entrar",
  logout: "sair",
  signup: "cadastrar",
  register: "cadastrar",

  // Navegação
  home: "início",
  dashboard: "resumo",
  settings: "ajustes",
  profile: "perfil",
  account: "conta",

  // Estado
  loading: "carregando",
  error: "erro",
  warning: "aviso",
  success: "sucesso",
  yes: "sim",
  no: "não",
  page: "página",
};

/** Frases exatas — substituídas antes das palavras isoladas. */
export const PT_PHRASES: Array<[RegExp, string]> = [
  [/\bTry again\b/g, "Tentar novamente"],
  [/\bGo home\b/g, "Ir para o início"],
  [/\bGo back\b/g, "Voltar"],
  [/\bSign in\b/g, "Entrar"],
  [/\bSign up\b/g, "Cadastrar"],
  [/\bSign out\b/g, "Sair"],
  [/\bLog in\b/g, "Entrar"],
  [/\bLog out\b/g, "Sair"],
  [/\bPage not found\b/g, "Página não encontrada"],
  [/\bNot found\b/g, "Não encontrado"],
  [/\bLoading\.\.\./g, "Carregando..."],
  [/\bSee more\b/g, "Ver mais"],
  [/\bShow more\b/g, "Mostrar mais"],
  [/\bShow less\b/g, "Mostrar menos"],
  [/\bView all\b/g, "Ver todos"],
  [/\bLearn more\b/g, "Saiba mais"],
  [/\bComing soon\b/g, "Em breve"],
  [/\bRead more\b/g, "Leia mais"],
];

function applyCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase())
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

const WORD_ENTRIES = Object.entries(PT_TERMS);
const WORD_REGEX = new RegExp(
  `\\b(${WORD_ENTRIES.map(([k]) => k).join("|")})\\b`,
  "gi",
);

/** Substitui termos em uma string preservando capitalização. */
export function translateTerms(input: string): string {
  if (!input) return input;
  let out = input;
  for (const [re, rep] of PT_PHRASES) out = out.replace(re, rep);
  out = out.replace(WORD_REGEX, (match) => {
    const rep = PT_TERMS[match.toLowerCase()];
    return rep ? applyCase(match, rep) : match;
  });
  return out;
}

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SVG",
  "NOSCRIPT",
]);

function shouldSkip(node: Node | null): boolean {
  let el: Node | null = node;
  while (el) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as HTMLElement;
      if (SKIP_TAGS.has(e.tagName)) return true;
      if (e.isContentEditable) return true;
      if (e.hasAttribute("data-no-translate")) return true;
    }
    el = el.parentNode;
  }
  return false;
}

function translateNode(node: Node) {
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node.nodeValue;
  if (!text || !text.trim()) return;
  if (shouldSkip(node)) return;
  const next = translateTerms(text);
  if (next !== text) node.nodeValue = next;
}

function walk(root: Node) {
  if (shouldSkip(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let cur = walker.nextNode();
  while (cur) {
    nodes.push(cur);
    cur = walker.nextNode();
  }
  nodes.forEach(translateNode);
}

/**
 * Hook global: escuta mutações no `document.body` e reescreve nós de texto
 * puros usando o dicionário PT_TERMS/PT_PHRASES. É idempotente e conservador
 * (ignora inputs, editors, code, etc.). Deve ser montado uma única vez no
 * componente raiz, apenas no cliente.
 */
export function useAutoTranslate() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    walk(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData" && m.target) {
          translateNode(m.target);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) translateNode(n);
            else if (n.nodeType === Node.ELEMENT_NODE) walk(n);
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);
}
