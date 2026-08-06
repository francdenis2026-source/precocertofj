import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Check, Loader2, SlidersHorizontal, Store, Tag, Wallet } from "lucide-react";
import { getMyPreferences, updateMyPreferences } from "@/lib/preferences.functions";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_CATEGORIES,
  type ContactChannel,
  type UserPreferences,
} from "@/lib/preferences.shared";
import { listPublicStores } from "@/lib/stores-public.functions";

const CHANNEL_LABEL: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  push: "Notificação no app",
};

/**
 * Painel de preferências editáveis do cliente: categorias de interesse,
 * mercados preferidos, raio de busca, meta de gasto e canais de aviso.
 */
export function PreferencesPanel() {
  const fetchPrefs = useServerFn(getMyPreferences);
  const savePrefs = useServerFn(updateMyPreferences);

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const prefsQuery = useQuery({
    queryKey: ["my-preferences"],
    queryFn: () => fetchPrefs(),
    staleTime: 60_000,
    retry: false,
  });

  const storesQuery = useQuery({
    queryKey: ["public-stores", "prefs"],
    queryFn: () => listPublicStores(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (prefsQuery.data && !loaded) {
      setPrefs(prefsQuery.data);
      setLoaded(true);
    }
  }, [prefsQuery.data, loaded]);

  function patch(next: Partial<UserPreferences>) {
    setPrefs((p) => ({ ...p, ...next }));
    setDirty(true);
  }

  function toggleCategory(cat: string) {
    patch({
      favoriteCategories: prefs.favoriteCategories.includes(cat)
        ? prefs.favoriteCategories.filter((c) => c !== cat)
        : [...prefs.favoriteCategories, cat],
    });
  }

  function toggleStore(id: string) {
    patch({
      preferredStoreIds: prefs.preferredStoreIds.includes(id)
        ? prefs.preferredStoreIds.filter((s) => s !== id)
        : [...prefs.preferredStoreIds, id],
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await savePrefs({ data: prefs });
      setDirty(false);
      toast.success("Preferências salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar preferências");
    } finally {
      setSaving(false);
    }
  }

  if (prefsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando preferências…
      </div>
    );
  }

  const stores = storesQuery.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-6">
      <div className="flex items-start gap-3">
        <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-lg text-foreground">Preferências</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Personalize o que você acompanha e como quer ser avisado sobre os preços.
          </p>
        </div>
      </div>

      {/* Categorias */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Tag className="h-3.5 w-3.5" /> Categorias de interesse
        </p>
        <div className="flex flex-wrap gap-2">
          {PREFERENCE_CATEGORIES.map((cat) => {
            const active = prefs.favoriteCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(cat)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mercados preferidos */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Store className="h-3.5 w-3.5" /> Mercados preferidos
        </p>
        {stores.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum mercado disponível no momento.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stores.map((store: { id: string; name: string }) => {
              const active = prefs.preferredStoreIds.includes(store.id);
              return (
                <button
                  key={store.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleStore(store.id)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                    (active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {store.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Raio + orçamento */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-foreground">
            Raio de busca: <span className="font-bold text-primary">{prefs.searchRadiusKm} km</span>
          </span>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={prefs.searchRadiusKm}
            onChange={(e) => patch({ searchRadiusKm: Number(e.target.value) })}
            className="w-full accent-[var(--brand-primary)]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Wallet className="h-3.5 w-3.5" /> Meta de gasto mensal (R$)
          </span>
          <input
            value={prefs.monthlyBudget ?? ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
              patch({ monthlyBudget: raw === "" ? null : Number(raw) });
            }}
            inputMode="decimal"
            placeholder="Ex.: 850"
            className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />
        </label>
      </div>

      {/* Notificações */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Bell className="h-3.5 w-3.5" /> Avisos
        </p>
        <div className="space-y-2">
          <ToggleRow
            label="Queda de preço nos meus favoritos"
            checked={prefs.notifyPriceDrop}
            onChange={(v) => patch({ notifyPriceDrop: v })}
          />
          <ToggleRow
            label="Resumo semanal de economia"
            checked={prefs.notifyWeeklyDigest}
            onChange={(v) => patch({ notifyWeeklyDigest: v })}
          />
          <ToggleRow
            label="Novidades e promoções da plataforma"
            checked={prefs.notifyNews}
            onChange={(v) => patch({ notifyNews: v })}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(CHANNEL_LABEL) as ContactChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              aria-pressed={prefs.contactChannel === ch}
              onClick={() => patch({ contactChannel: ch })}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (prefs.contactChannel === ch
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
              }
            >
              {CHANNEL_LABEL[ch]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !dirty}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Salvar preferências</>)}
      </button>
    </section>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/40"
    >
      <span>{label}</span>
      <span
        className={
          "relative h-5 w-9 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-primary" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all " +
            (checked ? "left-[1.125rem]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}
