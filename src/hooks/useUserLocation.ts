import { useCallback, useEffect, useState } from "react";
import { NEIGHBORHOOD_LABELS_BY_KEY, normalizeNeighborhood } from "@/lib/geo-labels";
import type { LatLng } from "@/lib/geo";

export type LocationStatus =
  | "idle"          // never asked in this session
  | "prompting"     // geolocation call in flight
  | "granted"       // real coords available
  | "denied"        // user refused permission
  | "unavailable"   // no navigator/geolocation API
  | "manual";       // user chose a neighborhood manually

export type UserLocation = {
  status: LocationStatus;
  coords: LatLng | null;
  /** Neighborhood key (lowercase, no accents) chosen manually when geolocation is denied. */
  neighborhoodKey: string | null;
  errorMessage: string | null;
};

const STORAGE_KEY = "pc:user-location:v1";
const TTL_MS = 1000 * 60 * 60 * 6; // 6h — coords are approximate anyway

type Persisted = {
  status: LocationStatus;
  coords: LatLng | null;
  neighborhoodKey: string | null;
  savedAt: number;
};

function readPersisted(): UserLocation {
  if (typeof window === "undefined") {
    return { status: "idle", coords: null, neighborhoodKey: null, errorMessage: null };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "idle", coords: null, neighborhoodKey: null, errorMessage: null };
    const parsed = JSON.parse(raw) as Persisted;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      return { status: "idle", coords: null, neighborhoodKey: null, errorMessage: null };
    }
    return {
      status: parsed.status,
      coords: parsed.coords,
      neighborhoodKey: parsed.neighborhoodKey,
      errorMessage: null,
    };
  } catch {
    return { status: "idle", coords: null, neighborhoodKey: null, errorMessage: null };
  }
}

function writePersisted(loc: UserLocation) {
  if (typeof window === "undefined") return;
  try {
    const body: Persisted = {
      status: loc.status,
      coords: loc.coords,
      neighborhoodKey: loc.neighborhoodKey,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  } catch {
    /* storage cheio ou bloqueado */
  }
}

export function useUserLocation() {
  const [state, setState] = useState<UserLocation>(() => ({
    status: "idle",
    coords: null,
    neighborhoodKey: null,
    errorMessage: null,
  }));

  // Hydrate after mount to avoid SSR mismatch
  useEffect(() => {
    setState(readPersisted());
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const next: UserLocation = {
        status: "unavailable",
        coords: null,
        neighborhoodKey: state.neighborhoodKey,
        errorMessage: "Seu navegador não suporta geolocalização.",
      };
      setState(next);
      writePersisted(next);
      return;
    }
    setState((prev) => ({ ...prev, status: "prompting", errorMessage: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: UserLocation = {
          status: "granted",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          neighborhoodKey: null,
          errorMessage: null,
        };
        setState(next);
        writePersisted(next);
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        const next: UserLocation = {
          status: denied ? "denied" : "unavailable",
          coords: null,
          neighborhoodKey: state.neighborhoodKey,
          errorMessage: denied
            ? "Permissão de localização negada. Escolha seu bairro para continuar."
            : "Não conseguimos ler sua localização agora. Escolha seu bairro para continuar.",
        };
        setState(next);
        writePersisted(next);
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 5, timeout: 8000 },
    );
  }, [state.neighborhoodKey]);

  const setManualNeighborhood = useCallback((label: string) => {
    const key = normalizeNeighborhood(label);
    if (!key) return;
    const next: UserLocation = {
      status: "manual",
      coords: null,
      neighborhoodKey: key,
      errorMessage: null,
    };
    setState(next);
    writePersisted(next);
  }, []);

  const clear = useCallback(() => {
    const next: UserLocation = {
      status: "idle",
      coords: null,
      neighborhoodKey: null,
      errorMessage: null,
    };
    setState(next);
    writePersisted(next);
  }, []);

  const manualLabel = state.neighborhoodKey
    ? NEIGHBORHOOD_LABELS_BY_KEY[state.neighborhoodKey] ?? null
    : null;

  return {
    ...state,
    manualLabel,
    requestGeolocation,
    setManualNeighborhood,
    clear,
    hasReference: state.status === "granted" || state.status === "manual",
  } as const;
}
