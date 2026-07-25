import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";

const BASE_URL = "https://precocerto-feijo.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_PATHS: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/buscar", changefreq: "daily", priority: "0.9" },
  { path: "/melhores-precos", changefreq: "daily", priority: "0.9" },
  { path: "/estabelecimentos", changefreq: "weekly", priority: "0.8" },
  { path: "/mapa", changefreq: "weekly", priority: "0.7" },
  { path: "/cesta-basica", changefreq: "weekly", priority: "0.7" },
  { path: "/comparador", changefreq: "weekly", priority: "0.6" },
  { path: "/planos", changefreq: "monthly", priority: "0.7" },
  { path: "/colaborar", changefreq: "monthly", priority: "0.6" },
  { path: "/fale-conosco", changefreq: "yearly", priority: "0.4" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/cadastro", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_PATHS];

        try {
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            { auth: { persistSession: false } },
          );
          const { data } = await supabase
            .from("establishments")
            .select("name")
            .eq("active", true);
          for (const row of data ?? []) {
            const slug = row.name ? slugifyEstablishment(row.name) : "";
            if (slug) entries.push({ path: `/estabelecimento/${slug}`, changefreq: "daily", priority: "0.7" });
          }
        } catch {
          // sitemap continua válido apenas com as rotas estáticas
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
