// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { imagetools } from "vite-imagetools";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      imagetools(),
      VitePWA({
        // O manifesto oficial vive em public/site.webmanifest — o plugin não deve gerar outro.
        manifest: false,
        filename: "sw.js",
        registerType: "autoUpdate",
        // Nunca emitir/registrar SW em dev (evita cache velho no preview do Lovable).
        devOptions: { enabled: false },
        // A única registradora é src/lib/pwa.ts (com guardas de preview).
        injectRegister: null,
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Navegações sempre tentam a rede primeiro → interface nunca fica velha.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "pc-html",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Ícones e imagens da marca: cache com revalidação em background.
              urlPattern: ({ request, url, sameOrigin }) =>
                sameOrigin && (request.destination === "image" || /\.(?:png|svg|ico|jpg|jpeg|webp)$/.test(url.pathname)),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "pc-images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\//.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "pc-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
