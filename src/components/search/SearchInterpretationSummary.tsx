import { useMemo, useState } from "react";
import { Pencil, Scale, X, Check } from "lucide-react";
import { parseProductSize } from "@/lib/unit-price";

/**
 * Resumo do que a busca "entendeu" — quais tokens foram reconhecidos e a
 * quantidade/tamanho interpretados (ex.: "Buscando 1kg"). Permite ao
 * usuário validar rapidamente e corrigir a query quando algo saiu errado.
 *
 * Interações:
 *  - Clicar em qualquer token remove aquele termo da query (o consumidor
 *    aplica via `onQueryChange`).
 *  - O badge de tamanho ("Buscando 1kg") tem um botão de editar que
 *    abre um mini editor de quantidade+unidade sem precisar redigitar.
 *  - Botão "Corrigir" chama `onEdit` (default: foca o input principal).
 */
type UnitChoice = "kg" | "g" | "L" | "ml" | "un";

const UNIT_OPTIONS: UnitChoice[] = ["kg", "g", "L", "ml", "un"];

/** Constrói o label humano do tamanho parseado. */
function sizeToLabel(size: ReturnType<typeof parseProductSize>): string | null {
  if (!size) return null;
  const fmt = (n: number, u: string) =>
    `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}${u}`;
  const u = size.unitSizeUnit;
  let unitLabel: string;
  let unitValue: number;
  if (u === "g") {
    unitValue = size.unitSize >= 1000 ? size.unitSize / 1000 : size.unitSize;
    unitLabel = size.unitSize >= 1000 ? "kg" : "g";
  } else if (u === "ml") {
    unitValue = size.unitSize >= 1000 ? size.unitSize / 1000 : size.unitSize;
    unitLabel = size.unitSize >= 1000 ? "L" : "ml";
  } else {
    unitValue = size.unitSize;
    unitLabel = "un";
  }
  return size.packCount > 1
    ? `${size.packCount} × ${fmt(unitValue, unitLabel)}`
    : fmt(unitValue, unitLabel);
}

/**
 * Regex que casa QUALQUER expressão de tamanho reconhecível dentro da
 * query — usada para substituir o tamanho antigo pelo novo sem que o
 * usuário precise redigitar o resto da busca.
 */
const SIZE_ANYWHERE_RE =
  /(\b\d{1,3}\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:kg|quilos?|g|gr|gramas?|ml|mililitros?|l|lt|litros?|un|und|unid|unidades?|dz|d[uú]zias?)\b)|(\b\d+(?:[.,]\d+)?\s*(?:kg|quilos?|g|gr|gramas?|ml|mililitros?|l|lt|litros?|un|und|unid|unidades?|dz|d[uú]zias?)\b)/i;

/** Remove todas ocorrências de um token da query (case/acento-insensível). */
function stripToken(query: string, token: string): string {
  const t = token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const parts = query
    .split(/\s+/)
    .filter((w) => {
      const nw = w
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return nw !== t;
    });
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function SearchInterpretationSummary({
  query,
  tokens,
  onEdit,
  onQueryChange,
  className,
}: {
  query: string;
  tokens: string[];
  onEdit?: () => void;
  /** Aplica uma nova query (remove chip / edita tamanho). */
  onQueryChange?: (next: string) => void;
  className?: string;
}) {
  const size = useMemo(() => parseProductSize(query), [query]);
  const sizeLabel = useMemo(() => sizeToLabel(size), [size]);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>("1");
  const [editUnit, setEditUnit] = useState<UnitChoice>("kg");

  if (!query.trim() && tokens.length === 0) return null;

  const openEditor = () => {
    if (size) {
      // pré-preenche com a interpretação atual, na sua unidade "humana"
      const u = size.unitSizeUnit;
      if (u === "g") {
        if (size.unitSize >= 1000) {
          setEditValue(String(size.unitSize / 1000));
          setEditUnit("kg");
        } else {
          setEditValue(String(size.unitSize));
          setEditUnit("g");
        }
      } else if (u === "ml") {
        if (size.unitSize >= 1000) {
          setEditValue(String(size.unitSize / 1000));
          setEditUnit("L");
        } else {
          setEditValue(String(size.unitSize));
          setEditUnit("ml");
        }
      } else {
        setEditValue(String(size.unitSize));
        setEditUnit("un");
      }
    } else {
      setEditValue("1");
      setEditUnit("kg");
    }
    setEditing(true);
  };

  const applyEdit = () => {
    const num = editValue.replace(",", ".").trim();
    if (!num || !Number.isFinite(Number(num))) {
      setEditing(false);
      return;
    }
    const formatted = `${num.replace(".", ",")}${editUnit}`;
    // Substitui a expressão de tamanho existente OU adiciona ao fim.
    const next = SIZE_ANYWHERE_RE.test(query)
      ? query.replace(SIZE_ANYWHERE_RE, formatted).replace(/\s{2,}/g, " ").trim()
      : `${query.trim()} ${formatted}`.trim();
    setEditing(false);
    onQueryChange?.(next);
  };

  const removeToken = (t: string) => {
    if (!onQueryChange) return;
    const next = stripToken(query, t);
    onQueryChange(next);
  };

  return (
    <div
      className={
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.03] px-2.5 py-1.5 " +
        (className ?? "")
      }
      role="status"
      aria-label="How your search was interpreted"
    >
      <span className="font-mono text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">
        Understood
      </span>

      {sizeLabel && !editing ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-strong/40 bg-accent/10 px-2 py-0.5 font-mono text-[12.5px] font-semibold uppercase tracking-wide text-accent-strong">
          <Scale className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Searching {sizeLabel}
          {onQueryChange ? (
            <button
              type="button"
              onClick={openEditor}
              className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-accent-strong/80 hover:bg-accent-strong/10 hover:text-accent-strong"
              aria-label="Edit quantity and unit"
            >
              <Pencil className="h-2.5 w-2.5" strokeWidth={2.25} />
            </button>
          ) : null}
        </span>
      ) : null}

      {editing ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-accent-strong/50 bg-background px-1.5 py-0.5"
          role="group"
          aria-label="Quantity editor"
        >
          <input
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyEdit(); }
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            aria-label="Quantity"
            className="w-14 border-0 bg-transparent p-0 text-center font-mono text-[12.5px] font-semibold text-foreground focus:outline-none"
          />
          <select
            aria-label="Unit"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value as UnitChoice)}
            className="border-0 bg-transparent font-mono text-[12.5px] font-semibold uppercase text-foreground focus:outline-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyEdit}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary hover:bg-primary/10"
            aria-label="Apply"
          >
            <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40"
            aria-label="Cancel"
          >
            <X className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
        </span>
      ) : null}

      {tokens.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => removeToken(t)}
          disabled={!onQueryChange}
          className="group inline-flex h-[18px] items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 font-mono text-[12.5px] font-semibold uppercase tracking-wide text-primary transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-default disabled:hover:border-primary/30 disabled:hover:bg-primary/10 disabled:hover:text-primary"
          aria-label={onQueryChange ? `Remove "${t}" from search` : `Recognized term: ${t}`}
        >
          <span>{t}</span>
          {onQueryChange ? (
            <X
              className="h-2 w-2 opacity-80 transition group-hover:opacity-100"
              strokeWidth={3}
              aria-hidden="true"
            />
          ) : null}
        </button>
      ))}

      {tokens.length === 0 && !sizeLabel ? (
        <span className="font-mono text-[12.5px] text-muted-foreground">
          nothing specific — refine your search
        </span>
      ) : null}

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          aria-label="Fix search"
        >
          <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
          Fix
        </button>
      ) : null}
    </div>
  );
}
