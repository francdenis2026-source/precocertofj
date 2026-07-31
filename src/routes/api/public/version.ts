import { createFileRoute } from "@tanstack/react-router";

import { APP_BUILD_ID } from "@/lib/app-version";

/**
 * Endpoint público de versão.
 *
 * Sempre respondido pelo servidor com `no-store`, então nem o CDN nem o
 * navegador conseguem servir um valor antigo. O cliente usa isso para detectar
 * que um novo Publish substituiu a versão anterior e recarregar sozinho.
 */
export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ buildId: APP_BUILD_ID }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
            pragma: "no-cache",
          },
        }),
    },
  },
});
