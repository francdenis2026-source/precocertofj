import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Lojista store — local, sem backend.
 * Persistência via localStorage; será substituído pelo Lovable Cloud
 * quando os créditos estiverem disponíveis.
 */

const STORAGE_KEY = "precocerto:lojista:v1";

export const productSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, "Nome muito curto").max(120, "Máx. 120 caracteres"),
  ean: z
    .string()
    .trim()
    .regex(/^[0-9]{8,14}$/u, "EAN deve ter 8 a 14 dígitos"),
  category: z.string().trim().min(2, "Selecione uma categoria").max(60),
  unit: z.string().trim().min(1, "Informe a unidade").max(20),
  currentPrice: z.number().positive("Preço deve ser positivo").max(99999),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const attachmentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().nonnegative(),
  dataUrl: z.string().min(1),
});

export const priceEntrySchema = z.object({
  id: z.string(),
  productId: z.string(),
  price: z.number().positive("Preço deve ser positivo").max(99999),
  previousPrice: z.number().nullable(),
  reason: z
    .enum(["ajuste", "promocao", "correcao", "reajuste_fornecedor", "outro"])
    .default("ajuste"),
  note: z.string().trim().max(240, "Máx. 240 caracteres").optional(),
  author: z.string().trim().min(1).max(60).default("Gerente"),
  createdAt: z.string(),
  attachment: attachmentSchema.optional(),
});

export const alertRuleSchema = z.object({
  productId: z.string(),
  percentThreshold: z.number().min(0).max(500).nullable(),
  minPrice: z.number().positive().max(99999).nullable(),
  maxPrice: z.number().positive().max(99999).nullable(),
});

export type Product = z.infer<typeof productSchema>;
export type PriceEntry = z.infer<typeof priceEntrySchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type AlertRule = z.infer<typeof alertRuleSchema>;

export interface AlertEvent {
  id: string;
  productId: string;
  priceEntryId: string;
  kind: "variation" | "min" | "max";
  message: string;
  createdAt: string;
  read: boolean;
}

export const REASON_LABELS: Record<PriceEntry["reason"], string> = {
  ajuste: "Ajuste de tabela",
  promocao: "Promoção",
  correcao: "Correção",
  reajuste_fornecedor: "Reajuste do fornecedor",
  outro: "Outro",
};


type State = {
  products: Product[];
  prices: PriceEntry[];
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
};

const seed: State = {
  products: [
    {
      id: "p1", name: "Arroz Tio João 5kg", ean: "7896006711124",
      category: "Arroz e feijão", unit: "un", currentPrice: 27.9,
      createdAt: "2025-06-01T10:00:00.000Z", updatedAt: "2025-07-10T09:00:00.000Z",
    },
    {
      id: "p2", name: "Café Pilão 500g", ean: "7891018010012",
      category: "Bebidas", unit: "un", currentPrice: 17.29,
      createdAt: "2025-06-01T10:00:00.000Z", updatedAt: "2025-07-11T14:00:00.000Z",
    },
    {
      id: "p3", name: "Leite Piracanjuba 1L", ean: "7898215151548",
      category: "Laticínios", unit: "un", currentPrice: 5.49,
      createdAt: "2025-06-01T10:00:00.000Z", updatedAt: "2025-07-09T18:30:00.000Z",
    },
  ],
  prices: [
    { id: "h1", productId: "p1", price: 27.9, previousPrice: 29.4, reason: "promocao", note: "Encarte semanal", author: "Gerente", createdAt: "2025-07-10T09:00:00.000Z" },
    { id: "h2", productId: "p1", price: 29.4, previousPrice: 28.5, reason: "reajuste_fornecedor", author: "Gerente", createdAt: "2025-06-20T15:12:00.000Z" },
    { id: "h3", productId: "p2", price: 17.29, previousPrice: 18.9, reason: "promocao", note: "Ação relâmpago", author: "Gerente", createdAt: "2025-07-11T14:00:00.000Z" },
    { id: "h4", productId: "p3", price: 5.49, previousPrice: 5.29, reason: "ajuste", author: "Gerente", createdAt: "2025-07-09T18:30:00.000Z" },
  ],
  alertRules: [
    { productId: "p1", percentThreshold: 5, minPrice: null, maxPrice: null },
  ],
  alertEvents: [],
};

// ---- store internals ------------------------------------------------------

const listeners = new Set<() => void>();
let state: State = seed;
let hydrated = false;

function read(): State {
  if (typeof window === "undefined") return state;
  if (!hydrated) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        state = {
          products: parsed.products ?? seed.products,
          prices: parsed.prices ?? seed.prices,
          alertRules: parsed.alertRules ?? [],
          alertEvents: parsed.alertEvents ?? [],
        };
      }
    } catch {
      /* ignore */
    }
    hydrated = true;
  }
  return state;
}

function commit(next: State) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- SSR-safe hook --------------------------------------------------------

export function useLojistaStore(): State {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const snap = useSyncExternalStore(subscribe, read, () => seed);
  return mounted ? snap : seed;
}


// ---- mutations ------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export function createProduct(input: ProductInput): Product {
  const now = new Date().toISOString();
  const product: Product = { ...input, id: uid(), createdAt: now, updatedAt: now };
  productSchema.parse(product);
  const s = read();
  const firstPrice: PriceEntry = {
    id: uid(),
    productId: product.id,
    price: product.currentPrice,
    previousPrice: null,
    reason: "ajuste",
    note: "Cadastro inicial",
    author: "Gerente",
    createdAt: now,
  };
  commit({
    ...s,
    products: [product, ...s.products],
    prices: [firstPrice, ...s.prices],
  });
  return product;
}

export function updateProduct(id: string, patch: Partial<ProductInput>): Product {
  const s = read();
  const existing = s.products.find((p) => p.id === id);
  if (!existing) throw new Error("Produto não encontrado");
  const next: Product = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  productSchema.parse(next);
  commit({
    ...s,
    products: s.products.map((p) => (p.id === id ? next : p)),
  });
  return next;
}

export function deleteProduct(id: string) {
  const s = read();
  commit({
    ...s,
    products: s.products.filter((p) => p.id !== id),
    prices: s.prices.filter((h) => h.productId !== id),
    alertRules: s.alertRules.filter((r) => r.productId !== id),
    alertEvents: s.alertEvents.filter((a) => a.productId !== id),
  });
}

export type PriceInput = {
  productId: string;
  price: number;
  reason: PriceEntry["reason"];
  note?: string;
  author?: string;
  attachment?: Attachment;
};

export function registerPrice(input: PriceInput): PriceEntry {
  const s = read();
  const product = s.products.find((p) => p.id === input.productId);
  if (!product) throw new Error("Produto não encontrado");

  const entry: PriceEntry = {
    id: uid(),
    productId: input.productId,
    price: input.price,
    previousPrice: product.currentPrice,
    reason: input.reason,
    note: input.note,
    author: input.author ?? "Gerente",
    createdAt: new Date().toISOString(),
    attachment: input.attachment,
  };
  priceEntrySchema.parse(entry);

  // Evaluate alert rules
  const rule = s.alertRules.find((r) => r.productId === product.id);
  const newEvents: AlertEvent[] = [];
  if (rule) {
    const prev = entry.previousPrice ?? product.currentPrice;
    if (rule.percentThreshold != null && prev > 0) {
      const deltaPct = Math.abs(((entry.price - prev) / prev) * 100);
      if (deltaPct >= rule.percentThreshold) {
        newEvents.push({
          id: uid(),
          productId: product.id,
          priceEntryId: entry.id,
          kind: "variation",
          message: `${product.name}: variação de ${deltaPct.toFixed(1)}% (limite ${rule.percentThreshold}%)`,
          createdAt: entry.createdAt,
          read: false,
        });
      }
    }
    if (rule.minPrice != null && entry.price <= rule.minPrice) {
      newEvents.push({
        id: uid(),
        productId: product.id,
        priceEntryId: entry.id,
        kind: "min",
        message: `${product.name} caiu para R$ ${entry.price.toFixed(2)} (limite mínimo R$ ${rule.minPrice.toFixed(2)})`,
        createdAt: entry.createdAt,
        read: false,
      });
    }
    if (rule.maxPrice != null && entry.price >= rule.maxPrice) {
      newEvents.push({
        id: uid(),
        productId: product.id,
        priceEntryId: entry.id,
        kind: "max",
        message: `${product.name} subiu para R$ ${entry.price.toFixed(2)} (limite máximo R$ ${rule.maxPrice.toFixed(2)})`,
        createdAt: entry.createdAt,
        read: false,
      });
    }
  }

  commit({
    ...s,
    products: s.products.map((p) =>
      p.id === product.id
        ? { ...p, currentPrice: input.price, updatedAt: entry.createdAt }
        : p,
    ),
    prices: [entry, ...s.prices],
    alertEvents: [...newEvents, ...s.alertEvents],
  });
  return entry;
}

export function getHistory(
  productId: string,
  opts?: { from?: string; to?: string },
): PriceEntry[] {
  const from = opts?.from ? new Date(opts.from).getTime() : null;
  const to = opts?.to ? new Date(opts.to).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
  return read()
    .prices.filter((p) => {
      if (p.productId !== productId) return false;
      const t = new Date(p.createdAt).getTime();
      if (from != null && t < from) return false;
      if (to != null && t > to) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAlertRule(productId: string): AlertRule | undefined {
  return read().alertRules.find((r) => r.productId === productId);
}

export function saveAlertRule(rule: AlertRule) {
  alertRuleSchema.parse(rule);
  const s = read();
  const others = s.alertRules.filter((r) => r.productId !== rule.productId);
  const hasAny =
    rule.percentThreshold != null || rule.minPrice != null || rule.maxPrice != null;
  commit({
    ...s,
    alertRules: hasAny ? [...others, rule] : others,
  });
}

export function markAlertsRead() {
  const s = read();
  commit({
    ...s,
    alertEvents: s.alertEvents.map((a) => ({ ...a, read: true })),
  });
}

export function clearAlerts() {
  const s = read();
  commit({ ...s, alertEvents: [] });
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Arquivo excede 2MB");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
  return { name: file.name, type: file.type, size: file.size, dataUrl };
}

