import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listNearbyMarkets, type MarketAggregate } from "@/lib/scans-history.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { ArrowLeft, Map as MapIcon, Loader2 } from "lucide-react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de mercados — PreçoCerto" },
      { name: "description", content: "Veja no mapa os mercados mais baratos perto de você." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <MapaPage />
    </ProtectedGate>
  ),
});

// The Google Maps browser key exposed by the Lovable connector, if connected.
const GMAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const GMAPS_CHANNEL = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

type MinimalMap = {
  setCenter: (p: { lat: number; lng: number }) => void;
};
type MinimalMarker = {
  setMap: (m: MinimalMap | null) => void;
};
type MinimalGoogle = {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: { center: { lat: number; lng: number }; zoom: number; disableDefaultUI?: boolean },
    ) => MinimalMap;
    Marker: new (opts: {
      position: { lat: number; lng: number };
      map: MinimalMap;
      title?: string;
      label?: { text: string; color: string; fontSize: string };
    }) => MinimalMarker;
    InfoWindow: new (opts: { content: string }) => {
      open: (opts: { anchor: MinimalMarker; map: MinimalMap }) => void;
    };
  };
};
declare global {
  interface Window {
    google?: MinimalGoogle;
    __precocertoMapInit?: () => void;
  }
}

function MapaPage() {
  const fetchMarkets = useServerFn(listNearbyMarkets);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [markets, setMarkets] = useState<MarketAggregate[] | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch markets
  useEffect(() => {
    fetchMarkets({})
      .then(setMarkets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [fetchMarkets]);

  // Geolocation
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => void 0,
      { timeout: 5000 },
    );
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!GMAPS_KEY) return;
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    window.__precocertoMapInit = () => setReady(true);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&loading=async&callback=__precocertoMapInit${
      GMAPS_CHANNEL ? `&channel=${GMAPS_CHANNEL}` : ""
    }`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);

  // Render map
  useEffect(() => {
    if (!ready || !mapEl.current || !window.google?.maps) return;
    const center = me ?? (markets && markets[0]
      ? { lat: markets[0].latitude, lng: markets[0].longitude }
      : { lat: -7.531, lng: -46.681 }); // Feijão-ish default (BR)
    const map = new window.google.maps.Map(mapEl.current, {
      center,
      zoom: 13,
      disableDefaultUI: false,
    });
    if (me) {
      new window.google.maps.Marker({
        position: me,
        map,
        title: "Você",
        label: { text: "•", color: "#0d1b2a", fontSize: "20px" },
      });
    }
    if (markets) {
      for (const m of markets) {
        const marker = new window.google.maps.Marker({
          position: { lat: m.latitude, lng: m.longitude },
          map,
          title: m.marketName,
        });
        const info = new window.google.maps.InfoWindow({
          content: `<div style="font-family:monospace;padding:4px 6px">
            <strong>${escapeHtml(m.marketName)}</strong><br/>
            Média: R$ ${m.avgPrice.toFixed(2).replace(".", ",")}<br/>
            ${m.samples} scans
          </div>`,
        });
        (marker as unknown as { addListener: (e: string, cb: () => void) => void }).addListener?.(
          "click",
          () => info.open({ anchor: marker, map }),
        );
      }
    }
  }, [ready, markets, me]);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-md px-3 py-4 sm:px-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="rounded-full border border-primary/20 p-1.5 text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Mercados próximos
            </span>
          </div>
        </header>

        {!GMAPS_KEY && (
          <div className="rounded-2xl border border-primary/30 bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Mapa indisponível
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Conecte o Google Maps na aba de conectores do Lovable para ver o mapa dos
              mercados. Enquanto isso, veja a lista abaixo com médias por mercado:
            </p>
          </div>
        )}

        {GMAPS_KEY && (
          <div className="relative aspect-[3/4] max-h-[58dvh] w-full overflow-hidden rounded-2xl border border-primary/20 bg-surface sm:rounded-3xl">
            <div ref={mapEl} className="h-full w-full" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs">Carregando mapa…</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
            {error}
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            {markets ? `${markets.length} mercados com dados` : "Carregando mercados…"}
          </p>
          {markets && markets.length > 0 && (
            <ul className="space-y-2">
              {markets
                .slice()
                .sort((a, b) => a.avgPrice - b.avgPrice)
                .map((m) => (
                  <li
                    key={m.marketName}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/10 bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{m.marketName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {m.samples} scans
                        {me
                          ? ` · ${haversine(me, { lat: m.latitude, lng: m.longitude }).toFixed(1)} km`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-neon">
                      R$ {m.avgPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
