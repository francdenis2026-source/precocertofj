// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { imagetools } from "vite-imagetools";

// Sem vite-plugin-pwa: o app não usa mais cache offline. O arquivo público
// public/sw.js é um service worker de limpeza que desregistra versões antigas
// (elas prendiam o HTML no navegador e escondiam as atualizações do site).
// Identificador único por build: usado para cache-busting determinístico dos
// assets e para o monitor de versão do cliente (src/lib/app-version.ts).
const APP_BUILD_ID =
  process.env.APP_BUILD_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
    },
    plugins: [imagetools()],
    build: {
      // Nomes de arquivo com hash + id do build: qualquer publicação gera URLs
      // novas, então CDN e navegador nunca reaproveitam assets antigos.
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-${APP_BUILD_ID}-[hash].js`,
          chunkFileNames: `assets/[name]-${APP_BUILD_ID}-[hash].js`,
          assetFileNames: `assets/[name]-${APP_BUILD_ID}-[hash][extname]`,
        },
      },
    },
  },
});
