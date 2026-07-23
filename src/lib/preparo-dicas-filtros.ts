import type { Dica, ProteinaId, Variacao } from "./preparo-dicas-data";

// ============================================================
// Faixas de tempo
// ============================================================
export type TempoFaixaId = "rapido" | "medio" | "longo" | "muitoLongo";

export const TEMPO_FAIXAS: {
  id: TempoFaixaId;
  label: string;
  min: number; // minutos inclusivos
  max: number; // minutos inclusivos (Infinity = sem limite)
}[] = [
  { id: "rapido", label: "Até 30 min", min: 0, max: 30 },
  { id: "medio", label: "30 min – 1h30", min: 30, max: 90 },
  { id: "longo", label: "1h30 – 3h", min: 90, max: 180 },
  { id: "muitoLongo", label: "3h+", min: 180, max: Infinity },
];

/**
 * Extrai todos os intervalos (em minutos) mencionados em uma string livre
 * como "2h – 3h30 (panela comum) · 40–60 min (pressão)".
 * Retorna array de [minMin, minMax].
 */
export function parseTempoRanges(tempo: string): [number, number][] {
  const ranges: [number, number][] = [];
  const separator = /\s*[–\-a]\s*/; // – - a

  // Padrão 1: "NhMM" ou "Nh" com opcional intervalo "NhMM – NhMM"
  const hourRe = /(\d+)h(\d{0,2})/gi;
  const hours: { start: number; end: number; value: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = hourRe.exec(tempo)) !== null) {
    const val = parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
    hours.push({ start: m.index, end: m.index + m[0].length, value: val });
  }

  // Padrão 2: "NN min" (pode ser intervalo "NN–MM min")
  const minRe = /(\d+)(?:\s*[–\-]\s*(\d+))?\s*min/gi;
  const mins: { start: number; end: number; from: number; to: number }[] = [];
  while ((m = minRe.exec(tempo)) !== null) {
    const from = parseInt(m[1], 10);
    const to = m[2] ? parseInt(m[2], 10) : from;
    mins.push({ start: m.index, end: m.index + m[0].length, from, to });
  }

  // Agrupa horas consecutivas em intervalos ("2h – 3h30")
  const usedHours = new Set<number>();
  for (let i = 0; i < hours.length; i++) {
    if (usedHours.has(i)) continue;
    const a = hours[i];
    const next = hours[i + 1];
    if (next) {
      const between = tempo.slice(a.end, next.start);
      if (separator.test(between) && between.length <= 5) {
        ranges.push([a.value, next.value]);
        usedHours.add(i);
        usedHours.add(i + 1);
        continue;
      }
    }
    ranges.push([a.value, a.value]);
    usedHours.add(i);
  }

  for (const mm of mins) {
    ranges.push([mm.from, mm.to]);
  }

  return ranges;
}

export function matchesTempoFaixa(tempo: string, faixaId: TempoFaixaId): boolean {
  const faixa = TEMPO_FAIXAS.find((f) => f.id === faixaId);
  if (!faixa) return false;
  const ranges = parseTempoRanges(tempo);
  if (ranges.length === 0) return false;
  // Casa se qualquer intervalo mencionado sobrepõe a faixa
  return ranges.some(([lo, hi]) => hi >= faixa.min && lo <= faixa.max);
}

// ============================================================
// Modos de cozimento
// ============================================================
export type ModoId =
  | "brasa"
  | "grelhaChapa"
  | "pressao"
  | "fogoBaixo"
  | "indiretoForno"
  | "fogoAlto";

export const MODOS: { id: ModoId; label: string; patterns: RegExp[] }[] = [
  { id: "brasa", label: "Brasa", patterns: [/\bbrasa\b/i, /\bespeto\b/i, /churrasq/i] },
  {
    id: "grelhaChapa",
    label: "Grelha / Chapa",
    patterns: [/\bgrelh/i, /\bchapa\b/i, /frigideira/i],
  },
  { id: "pressao", label: "Pressão", patterns: [/press[ãa]o/i] },
  {
    id: "fogoBaixo",
    label: "Fogo baixo",
    patterns: [/fogo baixo/i, /tampad/i, /cozinh(?:ar|e|ando) (?:tampad|em fogo baixo)/i],
  },
  {
    id: "indiretoForno",
    label: "Indireto / Forno",
    patterns: [/indiret/i, /forno/i, /afastad/i],
  },
  {
    id: "fogoAlto",
    label: "Fogo alto / Selar",
    patterns: [/fogo alto/i, /muito quente/i, /\bselar\b/i, /médio-alto/i, /media-alta/i, /média-alta/i],
  },
];

export function matchesModo(texto: string, modoId: ModoId): boolean {
  const modo = MODOS.find((m) => m.id === modoId);
  if (!modo) return false;
  return modo.patterns.some((p) => p.test(texto));
}

// ============================================================
// Aplicação combinada aos itens
// ============================================================
export type FiltrosPreparo = {
  tempos: Set<TempoFaixaId>;
  modos: Set<ModoId>;
  proteinas: Set<ProteinaId>;
};

function itemProteinas(item: { proteinas?: ProteinaId[] }): ProteinaId[] {
  return item.proteinas && item.proteinas.length > 0 ? item.proteinas : ["boi"];
}

export function matchesProteina(
  item: { proteinas?: ProteinaId[] },
  selecionadas: Set<ProteinaId>,
): boolean {
  if (selecionadas.size === 0) return true;
  return itemProteinas(item).some((p) => selecionadas.has(p));
}

export function itemMatchesFiltros(
  item: { tempo: string; modo: string; proteinas?: ProteinaId[] },
  filtros: FiltrosPreparo,
): boolean {
  const okTempo =
    filtros.tempos.size === 0 ||
    [...filtros.tempos].some((f) => matchesTempoFaixa(item.tempo, f));
  const okModo =
    filtros.modos.size === 0 ||
    [...filtros.modos].some((m) => matchesModo(item.modo, m));
  const okProt = matchesProteina(item, filtros.proteinas);
  return okTempo && okModo && okProt;
}

export type DicaFiltrada = Dica & {
  matchesSelf: boolean;
  variacoesFiltradas: Variacao[];
};

export function aplicarFiltros(dicas: Dica[], filtros: FiltrosPreparo): DicaFiltrada[] {
  const ativo =
    filtros.tempos.size > 0 || filtros.modos.size > 0 || filtros.proteinas.size > 0;
  return dicas
    .map<DicaFiltrada>((d) => {
      const matchesSelf = itemMatchesFiltros(d, filtros);
      const variacoesFiltradas = ativo
        ? (d.variacoes ?? []).filter((v) => itemMatchesFiltros(v, filtros))
        : (d.variacoes ?? []);
      return { ...d, matchesSelf, variacoesFiltradas };
    })
    .filter((d) => {
      if (!ativo) return true;
      return d.matchesSelf || d.variacoesFiltradas.length > 0;
    });
}
