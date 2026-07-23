export type ProteinaId = "boi" | "frango" | "porco" | "cordeiro" | "cabrito" | "peixe";

export type Corte = {
  nome: string;
  nota?: string;
};

export type Variacao = {
  nome: string;
  tempo: string;
  modo: string;
  proteinas?: ProteinaId[]; // padrão: ["boi"]
};

export type Dica = {
  key: string;
  titulo: string;
  descricao: string;
  tempo: string;
  modo: string;
  cortes: Corte[];
  variacoes?: Variacao[];
  proteinas?: ProteinaId[]; // padrão: ["boi"]
};

export const PROTEINAS: { id: ProteinaId; label: string; emoji: string }[] = [
  { id: "boi", label: "Boi", emoji: "🐄" },
  { id: "frango", label: "Frango", emoji: "🐔" },
  { id: "porco", label: "Porco", emoji: "🐖" },
  { id: "cordeiro", label: "Cordeiro", emoji: "🐑" },
  { id: "cabrito", label: "Cabrito / Bode", emoji: "🐐" },
  { id: "peixe", label: "Peixe", emoji: "🐟" },
];

export const PREPARO_DICAS: Dica[] = [
  {
    key: "cozidao",
    titulo: "Cozidão",
    descricao:
      "Cortes com fibras longas e ossos que soltam colágeno. Cozinhe em fogo baixo, com bastante líquido, por tempo prolongado — ideal para caldos encorpados.",
    tempo: "2h – 3h30 (panela comum) · 40–60 min (pressão)",
    modo: "Fogo baixo, panela tampada, submerso em líquido",
    proteinas: ["boi"],
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
    variacoes: [
      { nome: "Língua bovina", tempo: "2h30 – 3h", modo: "Fogo baixo, água com louro; retirar a pele ainda quente", proteinas: ["boi"] },
      { nome: "Mocotó", tempo: "3h – 4h (pressão: 1h30)", modo: "Fogo baixo em bastante líquido; caldo bem gelatinoso", proteinas: ["boi"] },
      { nome: "Buchada", tempo: "3h – 4h", modo: "Fogo baixo, panela tampada, com temperos verdes", proteinas: ["cabrito"] },
      { nome: "Galinha caipira ao caldo", tempo: "1h30 – 2h30", modo: "Fogo baixo, submersa em água com temperos verdes", proteinas: ["frango"] },
      { nome: "Costelinha suína cozida", tempo: "1h – 1h30 (pressão: 30 min)", modo: "Fogo baixo, tampada, líquido curto com louro e alho", proteinas: ["porco"] },
    ],
  },
  {
    key: "assado",
    titulo: "Assado de Panela",
    descricao:
      "Peças magras e uniformes. Sele bem em gordura quente, depois cozinhe tampado com líquido curto até a carne desmanchar ao garfo.",
    tempo: "1h30 – 2h30 (panela comum) · 35–45 min (pressão)",
    modo: "Selar em fogo alto, depois fogo baixo tampado, líquido curto",
    proteinas: ["boi"],
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
    variacoes: [
      { nome: "Chã de dentro", tempo: "1h30 – 2h", modo: "Selar bem e cozinhar tampado em fogo baixo", proteinas: ["boi"] },
      { nome: "Ponta de agulha", tempo: "2h – 2h30", modo: "Fogo baixo, panela tampada; ótima com molho de tomate", proteinas: ["boi"] },
      { nome: "Língua", tempo: "2h – 3h", modo: "Cozinhar tampada em fogo baixo até macia; finalizar em molho", proteinas: ["boi"] },
      { nome: "Pernil suíno assado", tempo: "2h30 – 3h30 (forno)", modo: "Selar e finalizar em forno médio, coberto com papel-alumínio", proteinas: ["porco"] },
      { nome: "Lombo de porco recheado", tempo: "1h30 – 2h", modo: "Selar em fogo alto e assar em forno médio até 68 °C internos", proteinas: ["porco"] },
      { nome: "Frango assado inteiro", tempo: "1h – 1h20 (forno)", modo: "Forno médio-alto; regar com o próprio suco", proteinas: ["frango"] },
      { nome: "Paleta de cordeiro", tempo: "2h30 – 3h30", modo: "Cozimento lento em forno baixo, com vinho e ervas", proteinas: ["cordeiro"] },
    ],
  },
  {
    key: "churrasco",
    titulo: "Churrasco",
    descricao:
      "Cortes com boa marmorização ou capa de gordura. Fogo forte e brasa firme — deixe descansar antes de fatiar para preservar os sucos.",
    tempo: "15–40 min (peças médias) · 4h – 8h (costela)",
    modo: "Brasa forte para bifes; brasa branda e afastada para peças grandes",
    proteinas: ["boi"],
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
    variacoes: [
      { nome: "Coração de alcatra", tempo: "25–35 min", modo: "Espeto em brasa média-alta; virar poucas vezes", proteinas: ["boi"] },
      { nome: "Baby beef", tempo: "20–30 min", modo: "Brasa forte; ponto ao malpassado, descansar 5 min", proteinas: ["boi"] },
      { nome: "Denver steak", tempo: "6–10 min", modo: "Grelha muito quente; 3 min de cada lado", proteinas: ["boi"] },
      { nome: "Tomahawk", tempo: "35–50 min", modo: "Selar direto na brasa e finalizar em zona indireta", proteinas: ["boi"] },
      { nome: "Costela suína (ribs)", tempo: "2h30 – 4h", modo: "Brasa branda e afastada; pincelar com molho no final", proteinas: ["porco"] },
      { nome: "Linguiça artesanal", tempo: "15–25 min", modo: "Brasa média; furar apenas ao virar para dourar por igual", proteinas: ["porco"] },
      { nome: "Coração de frango", tempo: "12–18 min", modo: "Espeto em brasa alta; salga fina no ponto", proteinas: ["frango"] },
      { nome: "Coxa e sobrecoxa desossadas", tempo: "25–35 min", modo: "Brasa média; iniciar pele para baixo", proteinas: ["frango"] },
      { nome: "Costeleta de cordeiro", tempo: "8–12 min", modo: "Grelha muito quente; 3–4 min de cada lado", proteinas: ["cordeiro"] },
      { nome: "Paleta de cordeiro no espeto", tempo: "3h – 4h", modo: "Brasa afastada, giro lento com ervas frescas", proteinas: ["cordeiro"] },
    ],
  },
  {
    key: "strogonoff",
    titulo: "Strogonoff",
    descricao:
      "Cortes macios em tiras finas, no sentido contrário às fibras. Selar rapidamente em fogo alto e finalizar com o creme fora do fogo forte.",
    tempo: "25 – 35 min no total",
    modo: "Selar em fogo alto por poucos minutos, finalizar em fogo baixo",
    proteinas: ["boi"],
    cortes: [
      { nome: "Filé mignon", nota: "opção nobre, extremamente macia" },
      { nome: "Alcatra", nota: "equilíbrio entre sabor e maciez" },
      { nome: "Coxão mole", nota: "econômico, funciona muito bem em tiras" },
      { nome: "Miolo de alcatra" },
      { nome: "Patinho", nota: "magro, cortar bem fino contra a fibra" },
      { nome: "Contra filé" },
    ],
    variacoes: [
      { nome: "Maminha em tiras", tempo: "15–20 min", modo: "Selar em frigideira bem quente, creme só ao final", proteinas: ["boi"] },
      { nome: "Fraldinha em tiras finas", tempo: "15–20 min", modo: "Cortar contra a fibra; selar rápido em fogo alto", proteinas: ["boi"] },
      { nome: "Strogonoff de frango (peito em cubos)", tempo: "20–25 min", modo: "Selar em fogo alto; finalizar com creme em fogo baixo", proteinas: ["frango"] },
      { nome: "Strogonoff de lombo suíno", tempo: "20–25 min", modo: "Selar em tiras; molho encorpado com mostarda", proteinas: ["porco"] },
    ],
  },
  {
    key: "ensopado",
    titulo: "Ensopado / Guisado",
    descricao:
      "Cortes ricos em colágeno ou moídos. Refogue bem os temperos, acrescente o líquido aos poucos e cozinhe até o molho encorpar.",
    tempo: "1h – 2h (panela comum) · 30–45 min (pressão)",
    modo: "Refogar em fogo médio-alto e cozinhar tampado em fogo baixo",
    proteinas: ["boi"],
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
    variacoes: [
      { nome: "Dobradinha", tempo: "2h – 2h30", modo: "Fogo baixo com feijão branco e temperos verdes", proteinas: ["boi"] },
      { nome: "Rabada", tempo: "2h30 – 3h30 (pressão: 1h)", modo: "Fogo baixo, molho encorpado com agrião ao final", proteinas: ["boi"] },
      { nome: "Buchada de bode", tempo: "3h – 4h", modo: "Fogo baixo, panela tampada, com temperos regionais", proteinas: ["cabrito"] },
      { nome: "Frango ao molho pardo / cabidela", tempo: "45 min – 1h", modo: "Refogar bem e cozinhar em fogo baixo tampado", proteinas: ["frango"] },
      { nome: "Costelinha de porco com mandioca", tempo: "1h – 1h30 (pressão: 30 min)", modo: "Refogar, cobrir com água e cozinhar tampado em fogo baixo", proteinas: ["porco"] },
      { nome: "Ensopado de cordeiro", tempo: "1h30 – 2h", modo: "Refogar em vinho e ervas, cozinhar tampado em fogo baixo", proteinas: ["cordeiro"] },
    ],
  },
  {
    key: "grelhado",
    titulo: "Grelhado",
    descricao:
      "Cortes macios em bifes de 2 a 3 cm. Grelha bem quente, sele por poucos minutos de cada lado e evite virar mais que uma vez.",
    tempo: "6 – 12 min por bife (2–3 cm)",
    modo: "Grelha/chapa muito quente, selar rápido dos dois lados",
    proteinas: ["boi"],
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
    variacoes: [
      { nome: "Flat iron", tempo: "6–8 min", modo: "Grelha forte, 3 min de cada lado; descansar 3 min", proteinas: ["boi"] },
      { nome: "Denver steak", tempo: "6–10 min", modo: "Chapa muito quente; virar apenas uma vez", proteinas: ["boi"] },
      { nome: "Bife ancho", tempo: "8–12 min", modo: "Chapa alta; selar bem antes de baixar o fogo", proteinas: ["boi"] },
      { nome: "Prime rib", tempo: "10–14 min por bife alto", modo: "Selar rápido e finalizar em fogo médio", proteinas: ["boi"] },
      { nome: "Filé de peito de frango", tempo: "8–12 min", modo: "Chapa quente; virar uma vez, deixar dourar", proteinas: ["frango"] },
      { nome: "Bisteca suína (chuleta)", tempo: "10–14 min", modo: "Grelha alta; selar e finalizar em fogo médio", proteinas: ["porco"] },
      { nome: "Filé de peixe (linguado, tilápia)", tempo: "4–7 min", modo: "Chapa quente com azeite; virar apenas uma vez", proteinas: ["peixe"] },
      { nome: "Posta de salmão", tempo: "6–9 min", modo: "Chapa média-alta; pele para baixo até crocante", proteinas: ["peixe"] },
      { nome: "Costeleta de cordeiro", tempo: "8–12 min", modo: "Grelha muito quente; 3–4 min de cada lado", proteinas: ["cordeiro"] },
    ],
  },
];

export function favoriteKey(dicaKey: string, corteNome: string): string {
  return `${dicaKey}::${corteNome}`;
}
