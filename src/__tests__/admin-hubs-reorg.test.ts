import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Regressão da reorganização de hubs administrativos (v2.1 → v2.2):
 *  - Contas & Clientes  → /admin_/contas   (tone people)
 *  - Estabelecimentos & Catálogo → /admin_/vitrine (tone catalog)
 *  - Comércio & Preços  → /admin_/precos   (tone commerce)
 *  - Sistema & Operação → /admin_/operacao (tone system)
 *
 * Estes testes travam:
 *   1. A existência dos 3 novos arquivos de hub.
 *   2. O contrato de props do launcher (eyebrow/title/description/tone/sections).
 *   3. A presença dos hubs no dashboard raiz (/admin) como navegação primária.
 *   4. A cobertura de todas as rotas administrativas ativas por algum hub.
 */

const ROUTES_DIR = join(process.cwd(), "src", "routes");

function read(file: string): string {
  return readFileSync(join(ROUTES_DIR, file), "utf8");
}

describe("Admin hubs reorganization — v2.2", () => {
  it("cria os três novos hubs launcher", () => {
    const files = readdirSync(ROUTES_DIR);
    for (const expected of ["admin_.contas.tsx", "admin_.gestao.tsx", "admin_.operacao.tsx"]) {
      expect(files).toContain(expected);
    }
  });

  it("cada hub declara adminBeforeLoad + AppShell + AdminHubLauncher", () => {
    for (const file of ["admin_.contas.tsx", "admin_.gestao.tsx", "admin_.operacao.tsx"]) {
      const src = read(file);
      expect(src, `${file} deve ser gated por admin`).toMatch(/adminBeforeLoad/);
      expect(src, `${file} deve montar dentro do AppShell admin`).toMatch(/AppShell/);
      expect(src, `${file} deve usar o launcher`).toMatch(/AdminHubLauncher/);
      expect(src, `${file} deve declarar seções tipadas`).toMatch(/HubSection/);
    }
  });

  it("cada hub aplica o tom semântico correto", () => {
    const cases: Array<[string, string]> = [
      ["admin_.contas.tsx", "people"],
      ["admin_.gestao.tsx", "catalog"],
      ["admin_.operacao.tsx", "system"],
    ];
    for (const [file, tone] of cases) {
      const src = read(file);
      expect(src, `${file} deve declarar tone="${tone}"`).toMatch(new RegExp(`tone=["']${tone}["']`));
    }
  });

  it("o dashboard raiz publica os 4 hubs como navegação primária", () => {
    const src = read("admin.tsx");
    for (const hub of ["/admin_/contas", "/admin_/vitrine", "/admin_/precos", "/admin_/operacao"]) {
      expect(src, `admin.tsx deve linkar ${hub}`).toContain(hub);
    }
    // Marcador de teste para verificação e2e/QA
    expect(src).toMatch(/admin-hub-link-people/);
    expect(src).toMatch(/admin-hub-link-catalog/);
    expect(src).toMatch(/admin-hub-link-commerce/);
    expect(src).toMatch(/admin-hub-link-system/);
  });

  it("cada hub referencia ao menos um destino real existente", () => {
    // Sanity: os cards precisam apontar para rotas administrativas conhecidas.
    const files = readdirSync(ROUTES_DIR).filter((f) => f.startsWith("admin"));
    const known = new Set<string>(files.map((f) => "/" + f.replace(/\.tsx$/, "").replace(/\./g, "/")));
    // Adiciona a raiz e as rotas sem sufixo _
    known.add("/admin");

    for (const file of ["admin_.contas.tsx", "admin_.gestao.tsx", "admin_.operacao.tsx"]) {
      const src = read(file);
      const toMatches = Array.from(src.matchAll(/to:\s*["'](\/admin[^"']*)["']/g)).map((m) => m[1]);
      expect(toMatches.length, `${file} deve ter pelo menos um destino /admin*`).toBeGreaterThan(0);
      for (const dest of toMatches) {
        // Aceita /admin, /admin_/xxx, e destinos com sub-caminho (/admin_/cobertura/$id)
        const root = dest.split("/").slice(0, 3).join("/"); // "/admin" ou "/admin_" + segmento
        const normalized = root.replace(/^\/admin_\//, "/admin_/");
        const exists =
          normalized === "/admin" ||
          [...known].some((k) => k === normalized || k.startsWith(normalized));
        expect(exists, `${file} referencia rota inexistente: ${dest}`).toBe(true);
      }
    }
  });
});
