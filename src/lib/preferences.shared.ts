export type ContactChannel = "whatsapp" | "email" | "push";

export type UserPreferences = {
  favoriteCategories: string[];
  preferredStoreIds: string[];
  searchRadiusKm: number;
  monthlyBudget: number | null;
  notifyPriceDrop: boolean;
  notifyWeeklyDigest: boolean;
  notifyNews: boolean;
  contactChannel: ContactChannel;
};

export type PreferencesInput = Partial<UserPreferences>;

export const PREFERENCE_CATEGORIES = [
  "Mercearia",
  "Carnes",
  "Hortifruti",
  "Bebidas",
  "Limpeza",
  "Higiene",
  "Padaria",
  "Laticínios",
  "Farmácia",
] as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCategories: [],
  preferredStoreIds: [],
  searchRadiusKm: 5,
  monthlyBudget: null,
  notifyPriceDrop: true,
  notifyWeeklyDigest: true,
  notifyNews: false,
  contactChannel: "whatsapp",
};

const CHANNELS: ContactChannel[] = ["whatsapp", "email", "push"];

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 30);
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/** Aceita tanto o formato do banco (snake_case) quanto o do cliente (camelCase). */
export function normalizePreferences(raw: Record<string, unknown> | null | undefined): UserPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  const pick = (camel: string, snake: string) => raw[camel] ?? raw[snake];

  const radiusRaw = Number(pick("searchRadiusKm", "search_radius_km"));
  const radius = Number.isFinite(radiusRaw) ? Math.min(50, Math.max(1, Math.round(radiusRaw))) : 5;

  const budgetRaw = pick("monthlyBudget", "monthly_budget");
  const budgetNum = budgetRaw === null || budgetRaw === undefined || budgetRaw === "" ? null : Number(budgetRaw);
  const budget = budgetNum !== null && Number.isFinite(budgetNum) && budgetNum > 0
    ? Math.min(999999, Math.round(budgetNum * 100) / 100)
    : null;

  const channelRaw = pick("contactChannel", "contact_channel");
  const channel = CHANNELS.includes(channelRaw as ContactChannel)
    ? (channelRaw as ContactChannel)
    : "whatsapp";

  return {
    favoriteCategories: toStringArray(pick("favoriteCategories", "favorite_categories")),
    preferredStoreIds: toStringArray(pick("preferredStoreIds", "preferred_store_ids")),
    searchRadiusKm: radius,
    monthlyBudget: budget,
    notifyPriceDrop: bool(pick("notifyPriceDrop", "notify_price_drop"), true),
    notifyWeeklyDigest: bool(pick("notifyWeeklyDigest", "notify_weekly_digest"), true),
    notifyNews: bool(pick("notifyNews", "notify_news"), false),
    contactChannel: channel,
  };
}
