import { useEffect, useMemo, useState } from "react";
import { signLogoUrls } from "@/lib/signed-images";

/**
 * Recebe URLs (possivelmente públicas) do bucket `logos` e devolve um mapa
 * URL_original → URL_assinada. URLs que não precisam de assinatura passam
 * direto (retornadas como identidade quando resolvidas).
 */
export function useSignedLogoUrls(urls: Array<string | null | undefined>): Record<string, string> {
  const key = useMemo(() => urls.filter(Boolean).sort().join("|"), [urls]);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    signLogoUrls(urls).then((next) => {
      if (!cancelled) setMap((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}

export function useSignedLogoUrl(url: string | null | undefined): string | null | undefined {
  const map = useSignedLogoUrls(useMemo(() => [url], [url]));
  if (!url) return url;
  return map[url] ?? url;
}
