export type Corte = {
  nome: string;
  nota?: string;
};

export type Dica = {
  key: string;
  titulo: string;
  descricao: string;
  cortes: Corte[];
  variacoes?: string[];
};

export const PREPARO_DICAS: Dica[] = [
  {
    key: "cozidao",
    titulo: "Cozidão",
    descricao:
      "Cortes com fibras longas e ossos que soltam colágeno. Cozinhe em fogo baixo, com bastante líquido, por tempo prolongado — ideal para caldos encorpados.",
    cortes: [
      { nome: "Músculo", nota: "clássico do caldo, solta muito colágeno" },
      { nome: "Acém", nota: "econômico e macio após longo cozimento" },
      { nome: "Peito com osso", nota: "sabor intenso, ótimo para sopas" },
      { nome: "Costela ripa", nota: "gordura equilibrada, desfia fácil" },
      { nome: "Pé de costela" },
      { nome: "Pescoço" },
      { nome: "Rabo bovino" },
      { nome: "Ossobuco (canela)", nota: "tutano cremoso enriquece o caldo" },
      { nome: "Agulha" },
      { nome: "Pá com osso" },
    ],
    variacoes: ["Língua bovina", "Mocotó", "Buchada"],
  },
  {
    key: "assado",
    titulo: "Assado de Panela",
    descricao:
      "Peças magras e uniformes. Sele bem em gordura quente, depois cozinhe tampado com líquido curto até a carne desmanchar ao garfo.",
    cortes: [
      { nome: "Patinho", nota: "magro, fatia bem sem esfarelar" },
      { nome: "Coxão duro", nota: "clássico do assado, firme e saboroso" },
      { nome: "Coxão mole", nota: "mais macio, ideal para fatias finas" },
      { nome: "Lagarto", nota: "peça uniforme para rosbife e frio" },
      { nome: "Paleta (pá sem osso)", nota: "econômico, desfia fácil" },
      { nome: "Peito desossado" },
      { nome: "Acém", nota: "ótima relação custo-benefício" },
      { nome: "Miolo de acém" },
    ],
    variacoes: ["Chã de dentro", "Ponta de agulha", "Língua"],
  },
  {
    key: "churrasco",
    titulo: "Churrasco",
    descricao:
      "Cortes com boa marmorização ou capa de gordura. Fogo forte e brasa firme — deixe descansar antes de fatiar para preservar os sucos.",
    cortes: [
      { nome: "Picanha", nota: "rainha do churrasco, capa de gordura preservada" },
      { nome: "Fraldinha", nota: "fibras longas, muito suculenta" },
      { nome: "Maminha", nota: "macia e discreta, agrada a todos" },
      { nome: "Contra filé (bife ancho)", nota: "marmoreio equilibrado" },
      { nome: "Alcatra", nota: "versátil, aceita bem sal grosso" },
      { nome: "Costela ripa/janela", nota: "assar por horas em brasa baixa" },
      { nome: "Cupim", nota: "gordura entremeada, cozimento longo" },
      { nome: "Bisteca (chuleta)" },
      { nome: "Ponta de agulha" },
      { nome: "Prime rib / ancho" },
    ],
    variacoes: ["Coração de alcatra", "Baby beef", "Denver steak", "Tomahawk"],
  },
  {
    key: "strogonoff",
    titulo: "Strogonoff",
    descricao:
      "Cortes macios em tiras finas, no sentido contrário às fibras. Selar rapidamente em fogo alto e finalizar com o creme fora do fogo forte.",
    cortes: [
      { nome: "Filé mignon", nota: "opção nobre, extremamente macia" },
      { nome: "Alcatra", nota: "equilíbrio entre sabor e maciez" },
      { nome: "Coxão mole", nota: "econômico, funciona muito bem em tiras" },
      { nome: "Miolo de alcatra" },
      { nome: "Patinho", nota: "magro, cortar bem fino contra a fibra" },
      { nome: "Contra filé" },
    ],
    variacoes: ["Maminha em tiras", "Fraldinha em tiras finas"],
  },
  {
    key: "ensopado",
    titulo: "Ensopado / Guisado",
    descricao:
      "Cortes ricos em colágeno ou moídos. Refogue bem os temperos, acrescente o líquido aos poucos e cozinhe até o molho encorpar.",
    cortes: [
      { nome: "Músculo", nota: "referência para guisado encorpado" },
      { nome: "Acém", nota: "macio após 40–60 min de cozimento" },
      { nome: "Paleta", nota: "desfia com facilidade" },
      { nome: "Peito", nota: "bom para picadinhos com molho" },
      { nome: "Rabo bovino", nota: "molho encorpado e gelatinoso" },
      { nome: "Carne moída (patinho ou acém)", nota: "escolha 2ª passada para picadinho" },
      { nome: "Fraldinha em cubos" },
      { nome: "Ossobuco" },
    ],
    variacoes: ["Dobradinha", "Rabada", "Buchada de bode"],
  },
  {
    key: "grelhado",
    titulo: "Grelhado",
    descricao:
      "Cortes macios em bifes de 2 a 3 cm. Grelha bem quente, sele por poucos minutos de cada lado e evite virar mais que uma vez.",
    cortes: [
      { nome: "Contra filé", nota: "bife de chapa clássico" },
      { nome: "Picanha em bifes", nota: "capa de gordura vira crocante" },
      { nome: "Alcatra", nota: "macia e uniforme" },
      { nome: "Filé mignon", nota: "medalhões altos, ponto ao gosto" },
      { nome: "Coxão mole", nota: "bife tradicional do dia a dia" },
      { nome: "Maminha em bifes" },
      { nome: "Fraldinha em bifes altos" },
      { nome: "T-bone / Chorizo" },
      { nome: "Bife de fígado", nota: "grelhar rápido, não passar do ponto" },
    ],
    variacoes: ["Flat iron", "Denver steak", "Bife ancho", "Prime rib"],
  },
];

export function favoriteKey(dicaKey: string, corteNome: string): string {
  return `${dicaKey}::${corteNome}`;
}
