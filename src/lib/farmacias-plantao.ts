/**
 * Calendário oficial de plantões das farmácias de Feijó/AC.
 * Fonte: Prefeitura Municipal de Feijó — Secretaria Municipal de Saúde,
 * Departamento de Vigilância Sanitária (VISA).
 * Base legal: Lei Municipal nº 592, de 11 de dezembro de 2013, Art. 48.
 */

export type Farmacia = {
  id: string;
  nome: string;
  telefones: string[];
  endereco: string;
  bairro: string;
};

export const FARMACIAS: Farmacia[] = [
  {
    id: "vitoria-centro",
    nome: "Drogaria Vitória (Centro)",
    telefones: ["(68) 3463-3772", "(68) 99908-8062"],
    endereco: "Trav. Floriano Peixoto",
    bairro: "Centro",
  },
  {
    id: "taveira",
    nome: "Drogaria Taveira",
    telefones: ["(68) 3463-2468", "(68) 99943-1397", "(68) 99991-3273"],
    endereco: "Av. Marechal Deodoro",
    bairro: "Centro",
  },
  {
    id: "farmacentro",
    nome: "Farmacentro",
    telefones: ["(68) 3463-2123", "(68) 99939-2963"],
    endereco: "Av. Marechal Deodoro",
    bairro: "Centro",
  },
  {
    id: "pague-pouco",
    nome: "Drogaria Pague Pouco",
    telefones: ["(68) 99204-8314"],
    endereco: "Av. Marechal Deodoro",
    bairro: "Centro",
  },
  {
    id: "araujo-farma",
    nome: "Araújo Farma",
    telefones: ["(68) 99963-2612"],
    endereco: "Rua 6 de Agosto, nº 564",
    bairro: "Segundo Distrito",
  },
  {
    id: "droga-moura",
    nome: "Droga Moura",
    telefones: ["(68) 99995-5489"],
    endereco: "Rua Edilermano B. Braga",
    bairro: "Cidade Nova",
  },
  {
    id: "ultra-popular",
    nome: "Drogaria Ultra Popular",
    telefones: ["(68) 99237-6838", "(68) 99259-1469"],
    endereco: "Av. Epaminondas Martins, nº 23",
    bairro: "Centro",
  },
  {
    id: "menor-preco",
    nome: "Drogaria Menor Preço",
    telefones: ["(68) 99253-2801"],
    endereco: "Rua Alfredo Barroso Cordeiro",
    bairro: "Esperança",
  },
  {
    id: "filial-2-hospital",
    nome: "Drogaria Filial 2 (em frente ao hospital)",
    telefones: ["(68) 3463-2562", "(68) 99925-4970"],
    endereco: "Av. Castelo Branco",
    bairro: "Centro",
  },
];

export const PLANTAO_MES = { ano: 2026, mes: 7, label: "Julho de 2026" };

/** Dia do mês → id da farmácia de plantão (rodízio publicado pela VISA). */
export const PLANTOES: Record<number, string> = {
  1: "taveira",
  2: "farmacentro",
  3: "vitoria-centro",
  4: "pague-pouco",
  5: "araujo-farma",
  6: "droga-moura",
  7: "ultra-popular",
  8: "menor-preco",
  9: "filial-2-hospital",
  10: "vitoria-centro",
  11: "taveira",
  12: "farmacentro",
  13: "vitoria-centro",
  14: "pague-pouco",
  15: "araujo-farma",
  16: "droga-moura",
  17: "ultra-popular",
  18: "menor-preco",
  19: "filial-2-hospital",
  20: "vitoria-centro",
  21: "taveira",
  22: "farmacentro",
  23: "vitoria-centro",
  24: "pague-pouco",
  25: "araujo-farma",
  26: "droga-moura",
  27: "ultra-popular",
  28: "menor-preco",
  29: "filial-2-hospital",
  30: "vitoria-centro",
  31: "taveira",
};

export const CONTATOS_FISCALIZACAO = [
  { orgao: "Secretaria Municipal de Saúde", telefone: "(68) 3463-3372" },
  { orgao: "Vigilância Sanitária Municipal", telefone: "(68) 99204-6623" },
];

export const AVISO_LEGAL =
  "A Lei Municipal nº 592, de 11 de dezembro de 2013, Art. 48, determina que as farmácias e drogarias atendam em plantão, pelo sistema de rodízio, para atendimento ininterrupto à comunidade, sob regulamento e fiscalização da Secretaria Municipal de Saúde por intermédio da Vigilância Sanitária Municipal. O atendimento em balcão vai até as 22 horas; após esse horário, a farmácia de plantão fica em regime de sobreaviso.";

export function farmaciaPorId(id: string): Farmacia | undefined {
  return FARMACIAS.find((f) => f.id === id);
}

export function diaDaSemana(dia: number): string {
  const d = new Date(PLANTAO_MES.ano, PLANTAO_MES.mes - 1, dia);
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

/** Dia do mês vigente quando estamos dentro do mês publicado, senão null. */
export function diaVigente(now = new Date()): number | null {
  if (now.getFullYear() !== PLANTAO_MES.ano || now.getMonth() + 1 !== PLANTAO_MES.mes) return null;
  return now.getDate();
}
