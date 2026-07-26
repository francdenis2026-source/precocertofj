import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { getRegionOptions, type RegionCity } from "@/lib/region-options.functions";

export type SelectedRegion = { city: string; neighborhood: string | null };

const STORAGE_KEY = "preco_certo_region";

export function readStoredRegion(): SelectedRegion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedRegion;
    if (!parsed?.city) return null;
    return { city: parsed.city, neighborhood: parsed.neighborhood ?? null };
  } catch {
    return null;
  }
}

function writeStoredRegion(v: SelectedRegion | null) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  else window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Dark-panel-styled city picker for the login editorial panel.
 * Shows skeleton while loading and a retry action on error.
 */
export function RegionSelector({
  value,
  onChange,
}: {
  value: SelectedRegion | null;
  onChange: (v: SelectedRegion | null) => void;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["region-options"],
    queryFn: () => getRegionOptions(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const options: RegionCity[] = data ?? [];
  const [city, setCity] = useState<string>(value?.city ?? "Feijó");

  // Hydrate from storage on first mount when parent didn't pass a value.
  useEffect(() => {
    if (value) return;
    const stored = readStoredRegion();
    if (stored) {
      setCity(stored.city);
      onChange(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(nextCity: string) {
    setCity(nextCity);
    const next: SelectedRegion = { city: nextCity, neighborhood: null };
    writeStoredRegion(next);
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.22em] text-white/85">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          Sua cidade
        </span>
        {isFetching && !isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-white/75" />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy>
          <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-white/10" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
        </div>
      ) : isError ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Não foi possível carregar as cidades.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 font-semibold text-amber-100 underline underline-offset-2 hover:text-white"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/75">
              Cidade
            </span>
            <select
              value={city}
              onChange={(e) => commit(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-xs text-white outline-none transition focus:border-emerald-400/50"
            >
              {options.length === 0 && <option value={city}>{city}</option>}
              {options.map((o) => (
                <option key={o.city} value={o.city} className="bg-neutral-900 text-white">
                  {o.city}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-white/75">
            Personaliza o Barômetro com leituras da sua cidade.
          </p>
        </>
      )}
    </div>
  );
}
