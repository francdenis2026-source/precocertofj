/**
 * Testes estáticos garantindo que:
 *  1. Todos os hubs admin usam `validateTabSearch` com fallback central.
 *  2. Todos passam `title` para <AdminTabs> (usado no breadcrumb).
 *  3. AdminTabs continua usando <Link search={{ tab }}> — preservando
 *     histórico do navegador (voltar/avançar) sem `replace`.
 *  4. AdminTabs expõe o botão "Copiar link" (data-testid).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const HUBS = [
  "src/routes/admin_.precos.tsx",
  "src/routes/admin_.metricas.tsx",
  "src/routes/admin_.promocoes.tsx",
  "src/routes/admin_.auditoria.tsx",
];

describe("Hubs admin — contratos do ?tab=", () => {
  for (const path of HUBS) {
    describe(path, () => {
      const src = read(path);

      it("usa validateTabSearch (fallback consistente)", () => {
        expect(src).toMatch(/validateTabSearch\s*\(/);
      });

      it("passa title= ao AdminTabs (breadcrumb)", () => {
        expect(src).toMatch(/<AdminTabs[^>]*\btitle=/);
      });

      it("não usa Link `replace` nas abas (preserva histórico)", () => {
        // O componente AdminTabs é a única fonte de navegação por aba;
        // aqui só validamos que o hub não redefine Link com replace={true}.
        expect(src).not.toMatch(/AdminTabs[^>]*replace/);
      });
    });
  }
});

describe("AdminTabs — copiar link e navegação preservando histórico", () => {
  const src = read("src/components/admin/AdminTabs.tsx");

  it("renderiza botão de copiar link", () => {
    expect(src).toMatch(/admin-tabs-copy-link/);
    expect(src).toMatch(/navigator\.clipboard/);
  });

  it("usa <Link> com search={{ tab }} (sem replace)", () => {
    expect(src).toMatch(/<Link[\s\S]*search=\{\{\s*tab:\s*item\.key/);
    expect(src).not.toMatch(/<Link[^>]*replace/);
  });

  it("renderiza breadcrumb com título do hub e aba ativa", () => {
    expect(src).toMatch(/Trilha de navegação/);
    expect(src).toMatch(/activeLabel/);
  });
});
