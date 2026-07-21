/**
 * Cálculo de preço unitário normalizado (R$/kg, R$/L, R$/un).
 *
 * Regras:
 * - Peso: g → kg (÷1000). Preço unitário em R$/kg.
 * - Volume: ml → L (÷1000). Preço unitário em R$/L.
 * - Contagem: `un` → R$/un.
 * - Multipack ("6x350ml", "cx 12x1L", "pack 4 x 90g"): guarda `packCount` e
 *   `unitSize` (tamanho de cada unidade) e calcula:
 *     · totalSize = packCount × unitSize
 *     · perBase   = price / totalBase  (R$/kg ou R$/L)
 *     · perPack   = price / packCount  (R$/un do embalagem completo)
 * - Sem tamanho detectável → devolve null (não estima).
 */
export type SizeUnit = "g" | "ml" | "un";
export type BaseUnit = "kg" | "L" | "un";

export type ParsedSize = {
  packCount: number; // quantas unidades no pack (1 quando não é multipack)
  unitSize: number; // tamanho de cada unidade, na SizeUnit
  unitSizeUnit: SizeUnit;
  totalSize: number; // packCount × unitSize (na SizeUnit)
  baseUnit: BaseUnit; // kg (g), L (ml), un
  /** Unidade crua do rótulo original ("kg", "g", "l", "ml", "un"). */
  rawUnit: string;
};

export type UnitPrice = {
  /** R$/kg, R$/L ou R$/un (unidade final normalizada). */
  perBase: number;
  base: BaseUnit;
  /** Rótulo curto para render: "R$ 3,45/kg". */
  label: string;
  /** Presente somente quando é multipack: preço por unidade da embalagem. */
  perPack?: number;
  /** Ex.: "R$ 2,10/un (350ml)". */
  perPackLabel?: string;
  /** Multipack? */
  isPack: boolean;
  /**
   * Verdadeiro quando o valor foi normalizado a partir de uma unidade
   * diferente da base (g→kg, ml→L) ou de um multipack. Permite ao UI
   * sinalizar "convertido" para comparações entre unidades distintas.
   */
  converted: boolean;
  /** Rótulo do tamanho original ("900ml", "6x350ml", "500g"). */
  sourceLabel: string;
};

// Aceita variantes por extenso e abreviações comuns em rótulos brasileiros:
//   kg, quilo(s)      → peso em kg
//   g, gr, gramas     → peso em g
//   l, lt, litro(s)   → volume em L
//   ml, mililitro(s)  → volume em ml
//   un/und/unid...    → unidades
//   dz/duzia/dúzia    → tratado como 12 unidades (via SPECIAL_UNITS abaixo)
const UNIT_TOKEN =
  "kg|quilos?|g|gr|gramas?|ml|mililitros?|l|lt|litros?|un|und|unid|unidades?|dz|duzias?|d[uú]zias?";

const MULTIPACK_RE = new RegExp(
  `(?:\\b|^)(\\d{1,3})\\s*(?:x|×)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_TOKEN})\\b`,
  "i",
);

const SINGLE_RE = new RegExp(
  `(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_TOKEN})\\b`,
  "gi",
);

/** Normaliza a unidade escrita em muitas formas para uma família curta. */
function normUnit(raw: string): SizeUnit | null {
  const u = raw.toLowerCase();
  if (u === "kg" || u.startsWith("quilo")) return "g"; // convertido em g depois
  if (u === "g" || u === "gr" || u.startsWith("grama")) return "g";
  if (u === "l" || u === "lt" || u.startsWith("litro")) return "ml"; // convertido em ml depois
  if (u === "ml" || u.startsWith("mililitro")) return "ml";
  if (["un", "und", "unid", "unidade", "unidades", "dz", "duzia", "duzias", "dúzia", "dúzias"].includes(u))
    return "un";
  return null;
}

function toBaseSize(val: number, rawUnit: string): { value: number; unit: SizeUnit } | null {
  const u = rawUnit.toLowerCase();
  if (u === "kg" || u.startsWith("quilo")) return { value: val * 1000, unit: "g" };
  if (u === "g" || u === "gr" || u.startsWith("grama")) return { value: val, unit: "g" };
  if (u === "l" || u === "lt" || u.startsWith("litro")) return { value: val * 1000, unit: "ml" };
  if (u === "ml" || u.startsWith("mililitro")) return { value: val, unit: "ml" };
  // Dúzia = 12 unidades — multiplica na conversão para "un".
  if (u === "dz" || u.startsWith("duzia") || u.startsWith("dúzia")) {
    return { value: val * 12, unit: "un" };
  }
  const nu = normUnit(u);
  if (nu === "un") return { value: val, unit: "un" };
  return null;
}


function baseFor(unit: SizeUnit): BaseUnit {
  if (unit === "g") return "kg";
  if (unit === "ml") return "L";
  return "un";
}

/**
 * Extrai tamanho e possível multipack a partir do nome do produto.
 * Fallback: usa `sizeValue`/`sizeUnit` já persistidos quando o nome não
 * contém tamanho detectável (mas pode ter multipack).
 */
export function parseProductSize(
  name: string | null | undefined,
  fallback?: { sizeValue?: number | null; sizeUnit?: string | null },
): ParsedSize | null {
  const raw = (name ?? "").toLowerCase();
  let packCount = 1;
  let unitVal: number | null = null;
  let unitUnit: SizeUnit | null = null;
  let rawUnit: string | null = null;

  // 1) multipack: Nx<val><unit>
  const mp = MULTIPACK_RE.exec(raw);
  if (mp) {
    packCount = Math.max(1, parseInt(mp[1], 10) || 1);
    const parsed = toBaseSize(parseFloat(mp[2].replace(",", ".")), mp[3]);
    if (parsed) {
      unitVal = parsed.value;
      unitUnit = parsed.unit;
      rawUnit = mp[3].toLowerCase();
    }
  }

  // 2) tamanho único (usa o ÚLTIMO match, geralmente o real: "arroz 1kg tipo 1")
  if (unitVal == null) {
    let last: RegExpExecArray | null = null;
    SINGLE_RE.lastIndex = 0;
    for (let m: RegExpExecArray | null; (m = SINGLE_RE.exec(raw)); ) last = m;
    if (last) {
      const parsed = toBaseSize(parseFloat(last[1].replace(",", ".")), last[2]);
      if (parsed) {
        unitVal = parsed.value;
        unitUnit = parsed.unit;
        rawUnit = last[2].toLowerCase();
      }
    }
  }

  // 3) fallback ao tamanho persistido em scans/cache
  if (unitVal == null && fallback?.sizeValue != null) {
    const u = (fallback.sizeUnit ?? "un").toLowerCase();
    if (u === "g" || u === "ml" || u === "un") {
      unitVal = Number(fallback.sizeValue);
      unitUnit = u;
      rawUnit = u;
    }
  }

  if (unitVal == null || !unitUnit || unitVal <= 0) return null;

  const totalSize = unitVal * packCount;
  return {
    packCount,
    unitSize: unitVal,
    unitSizeUnit: unitUnit,
    totalSize,
    baseUnit: baseFor(unitUnit),
    rawUnit: rawUnit ?? unitUnit,
  };
}


function formatBRL(n: number, digits = 2): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatUnitAmount(size: number, unit: SizeUnit): string {
  if (unit === "g" && size >= 1000) return `${(size / 1000).toLocaleString("pt-BR")}kg`;
  if (unit === "ml" && size >= 1000) return `${(size / 1000).toLocaleString("pt-BR")}L`;
  return `${size.toLocaleString("pt-BR")}${unit}`;
}

/**
 * Calcula o preço unitário normalizado a partir de preço + nome do produto.
 * Retorna null quando não há tamanho detectável (política do produto:
 * "ignorar preço unitário" quando não há kg/L no nome).
 */
export function computeUnitPrice(
  price: number | null | undefined,
  productName: string | null | undefined,
  fallback?: { sizeValue?: number | null; sizeUnit?: string | null },
): UnitPrice | null {
  if (price == null || !isFinite(Number(price)) || Number(price) <= 0) return null;
  const parsed = parseProductSize(productName, fallback);
  if (!parsed) return null;

  const p = Number(price);
  // base final: total em kg/L/un
  let totalBase: number;
  if (parsed.unitSizeUnit === "g") totalBase = parsed.totalSize / 1000;
  else if (parsed.unitSizeUnit === "ml") totalBase = parsed.totalSize / 1000;
  else totalBase = parsed.totalSize;

  if (!isFinite(totalBase) || totalBase <= 0) return null;

  // Não extrapolar para R$/kg ou R$/L quando o produto é vendido em
  // porção fracionária (rótulo em g/ml e total < 1 kg / 1 L). Mostrar
  // "R$ 12,50/kg" para um item de 300g é enganoso — esse preço por quilo
  // não corresponde ao mercado real. Para produtos já rotulados em kg/L
  // (rawUnit = kg, l, lt, litro), mantemos o cálculo mesmo abaixo de 1
  // (ex.: "meio litro", "0,5kg"). Contagem (un) não é afetada.
  const rawUnitLower = parsed.rawUnit.toLowerCase();
  const isNativeBase =
    rawUnitLower === "kg" ||
    rawUnitLower.startsWith("quilo") ||
    rawUnitLower === "l" ||
    rawUnitLower === "lt" ||
    rawUnitLower.startsWith("litro");
  const MIN_BASE_FOR_EXTRAPOLATION = 1.0; // 1 kg ou 1 L
  if (
    (parsed.baseUnit === "kg" || parsed.baseUnit === "L") &&
    !isNativeBase &&
    totalBase < MIN_BASE_FOR_EXTRAPOLATION
  ) {
    return null;
  }


  const perBase = p / totalBase;
  // Escolha de precisão: R$/kg e R$/L costumam ter 2 decimais suficientes;
  // R$/un pode ser < R$ 1 (ex.: sachês) → 2 decimais também são adequados.
  const digits = perBase < 1 ? (perBase < 0.1 ? 3 : 2) : 2;
  const label = `${formatBRL(perBase, digits)}/${parsed.baseUnit}`;

  const isPack = parsed.packCount > 1;
  let perPack: number | undefined;
  let perPackLabel: string | undefined;
  if (isPack) {
    perPack = p / parsed.packCount;
    const unitAmount = formatUnitAmount(parsed.unitSize, parsed.unitSizeUnit);
    perPackLabel = `${formatBRL(perPack, 2)}/un (${unitAmount})`;
  }

  const sourceLabel = isPack
    ? `${parsed.packCount}x${formatUnitAmount(parsed.unitSize, parsed.unitSizeUnit)}`
    : formatUnitAmount(parsed.unitSize, parsed.unitSizeUnit);
  // "convertido" quando a unidade de origem no rótulo difere da base
  // (g→kg, ml→L, litros→L) ou quando é multipack. "1kg" ou "2L" NÃO
  // são convertidos; "900ml", "500g" e "6x350ml" são.
  const ru = parsed.rawUnit.toLowerCase();
  const nativeToBase =
    (parsed.baseUnit === "kg" && ru === "kg") ||
    (parsed.baseUnit === "L" && (ru === "l" || ru.startsWith("litro"))) ||
    parsed.baseUnit === "un";
  const converted = isPack || !nativeToBase;

  return { perBase, base: parsed.baseUnit, label, perPack, perPackLabel, isPack, converted, sourceLabel };
}

/** Helper de conveniência: format-only. */
export function formatUnitPrice(u: UnitPrice | null): string | null {
  return u ? u.label : null;
}
