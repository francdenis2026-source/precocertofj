/**
 * Classificador de "tipo de produto" — mais granular que categoria.
 * Ex.: "laticinios" → { leite | queijo | iogurte | manteiga | requeijao }.
 *
 * Usado nos filtros do ranking (home) e de /melhores-precos.
 * Segue os mesmos padrões pt-BR (com/sem acento) usados no classificador
 * de categoria em `stores-public.functions.ts::classifyRank`.
 */

export type ProductType =
  // laticinios
  | "leite" | "queijo" | "iogurte" | "manteiga" | "requeijao"
  // higiene
  | "sabonete" | "shampoo" | "papel_higienico" | "fralda" | "desodorante" | "pasta_dental" | "absorvente"
  // limpeza
  | "sabao_po" | "sabao_liquido" | "detergente" | "amaciante" | "agua_sanitaria" | "desinfetante"
  // mercearia
  | "arroz" | "feijao" | "oleo" | "cafe" | "acucar" | "macarrao" | "farinha" | "molho" | "azeite" | "enlatados"
  // biscoitos
  | "recheado" | "wafer" | "cracker" | "cookie"
  // bebidas
  | "refrigerante" | "suco" | "agua_mineral" | "cerveja" | "energetico"
  // bebidas em pó
  | "achocolatado" | "cafe_soluvel" | "leite_po"
  // doces
  | "chocolate" | "bala" | "sobremesa"
  // carnes
  | "bovina" | "suina" | "aves" | "embutidos" | "peixe"
  // padaria
  | "pao" | "bolo" | "torrada"
  // congelados
  | "nuggets" | "pizza_congelada" | "batata_frita" | "acai"
  | "outros";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  leite: "Leite", queijo: "Queijo", iogurte: "Iogurte", manteiga: "Manteiga", requeijao: "Requeijão",
  sabonete: "Sabonete", shampoo: "Shampoo", papel_higienico: "Papel higiênico", fralda: "Fralda",
  desodorante: "Desodorante", pasta_dental: "Pasta de dente", absorvente: "Absorvente",
  sabao_po: "Sabão em pó", sabao_liquido: "Sabão líquido", detergente: "Detergente",
  amaciante: "Amaciante", agua_sanitaria: "Água sanitária", desinfetante: "Desinfetante",
  arroz: "Arroz", feijao: "Feijão", oleo: "Óleo", cafe: "Café", acucar: "Açúcar",
  macarrao: "Macarrão", farinha: "Farinha", molho: "Molho", azeite: "Azeite", enlatados: "Enlatados",
  recheado: "Recheado", wafer: "Wafer", cracker: "Cream cracker", cookie: "Cookie",
  refrigerante: "Refrigerante", suco: "Suco", agua_mineral: "Água mineral",
  cerveja: "Cerveja", energetico: "Energético",
  achocolatado: "Achocolatado", cafe_soluvel: "Café solúvel", leite_po: "Leite em pó",
  chocolate: "Chocolate", bala: "Bala/goma", sobremesa: "Sobremesa",
  bovina: "Bovina", suina: "Suína", aves: "Aves", embutidos: "Embutidos", peixe: "Peixe",
  pao: "Pão", bolo: "Bolo", torrada: "Torrada",
  nuggets: "Nuggets", pizza_congelada: "Pizza congelada", batata_frita: "Batata frita", acai: "Açaí",
  outros: "Outros",
};

/** Normaliza (remove acentos, lowercase). */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Retorna o tipo de produto a partir do nome, ou `"outros"` quando não
 * há padrão identificado. NÃO substitui `category` — os dois filtros
 * são aplicados em conjunto (AND).
 */
export function classifyProductType(name: string): ProductType {
  const n = norm(name);

  // laticínios
  if (/\bleite em po\b|\bleite po\b/.test(n)) return "leite_po";
  if (/\bleite\b/.test(n)) return "leite";
  if (/\bqueijo|mussarela|muçarela|prato|parmes/.test(n)) return "queijo";
  if (/\biogurte|danone|activia\b/.test(n)) return "iogurte";
  if (/\bmanteiga|margarina|qualy\b/.test(n)) return "manteiga";
  if (/\brequeij|nata|coalh/.test(n)) return "requeijao";

  // higiene
  if (/\bpapel higien|higiê|higien\b/.test(n)) return "papel_higienico";
  if (/\bfralda\b/.test(n)) return "fralda";
  if (/\bdesodorante|antitrans/.test(n)) return "desodorante";
  if (/\bcreme dental|pasta de dente|pasta dental|colgate|sorriso\b/.test(n)) return "pasta_dental";
  if (/\babsorvente\b/.test(n)) return "absorvente";
  if (/\bshampoo|xampu|condicionador\b/.test(n)) return "shampoo";
  if (/\bsabonete\b/.test(n)) return "sabonete";

  // limpeza
  if (/\bsabao em po|omo|ariel|tixan|ype po|ypê po\b/.test(n)) return "sabao_po";
  if (/\bsabao liquido|sabão líquido|sabão liquido|lava roup|omo liquido\b/.test(n)) return "sabao_liquido";
  if (/\bdetergente|ype|ypê\b/.test(n)) return "detergente";
  if (/\bamaciante|comfort|downy\b/.test(n)) return "amaciante";
  if (/\bagua sanit|candida|qboa\b/.test(n)) return "agua_sanitaria";
  if (/\bdesinfetante|multiuso|veja\b/.test(n)) return "desinfetante";

  // mercearia
  if (/\barroz\b/.test(n)) return "arroz";
  if (/\bfeijao|feijão\b/.test(n)) return "feijao";
  if (/\bazeite\b/.test(n)) return "azeite";
  if (/\boleo|óleo\b/.test(n)) return "oleo";
  if (/\bcafe|café\b/.test(n)) return n.includes("solu") ? "cafe_soluvel" : "cafe";
  if (/\bacucar|açúcar\b/.test(n)) return "acucar";
  if (/\bmacarr|espagu|talhar|penne|nissin|lamen\b/.test(n)) return "macarrao";
  if (/\bfarinha\b/.test(n)) return "farinha";
  if (/\bmolho|extrato|ketchup|mostarda|maionese\b/.test(n)) return "molho";
  if (/\bmilho|ervilha|sardinha|atum|seleta\b/.test(n)) return "enlatados";

  // biscoitos
  if (/\brecheado|passatempo|negresco|trakinas\b/.test(n)) return "recheado";
  if (/\bwafer\b/.test(n)) return "wafer";
  if (/\bcream cracker|cracker|agua e sal|cream\b/.test(n)) return "cracker";
  if (/\bcookie|cooky\b/.test(n)) return "cookie";

  // bebidas
  if (/\brefri|coca|guarana|pepsi|fanta|sprite\b/.test(n)) return "refrigerante";
  if (/\bsuco\b/.test(n)) return "suco";
  if (/\bagua mineral|água mineral|crystal|indaia\b/.test(n)) return "agua_mineral";
  if (/\bcerveja|amstel|brahma|skol|heineken|itaipava\b/.test(n)) return "cerveja";
  if (/\benerget|red bull|monster|tnt\b/.test(n)) return "energetico";

  // bebidas em pó
  if (/\bnescau|toddy|achocolat\b/.test(n)) return "achocolatado";

  // doces
  if (/\bchocolate|bombom|nescau barra\b/.test(n)) return "chocolate";
  if (/\bbala|goma|pirulito\b/.test(n)) return "bala";
  if (/\bgelatina|pudim|leite condens|creme de leite|geleia\b/.test(n)) return "sobremesa";

  // carnes
  if (/\blinguic|linguiç|salsich|bacon|hamburguer|hambúrguer|mortadela|presunto\b/.test(n)) return "embutidos";
  if (/\bfrango|peito|coxa|sassami|coxinha da asa\b/.test(n)) return "aves";
  if (/\bpicanha|patinho|acem|acém|contra file|contra filé|coxao|coxão|alcatra|bovina|carne bovina\b/.test(n)) return "bovina";
  if (/\bsuina|suína|lombo|pernil|costela suina\b/.test(n)) return "suina";
  if (/\bpeixe|tilapia|tilápia|filé de peixe|salmao|salmão\b/.test(n)) return "peixe";

  // padaria
  if (/\bpao|pão\b/.test(n)) return "pao";
  if (/\bbolo|panetone|rosca\b/.test(n)) return "bolo";
  if (/\btorrada\b/.test(n)) return "torrada";

  // congelados
  if (/\bnugget\b/.test(n)) return "nuggets";
  if (/\bpizza\b/.test(n)) return "pizza_congelada";
  if (/\bbatata palha|batata frita|batata pre\b/.test(n)) return "batata_frita";
  if (/\bacai|açaí\b/.test(n)) return "acai";

  return "outros";
}
