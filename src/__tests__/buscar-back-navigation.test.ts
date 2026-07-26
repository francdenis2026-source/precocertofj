/**
 * Regressão de navegação em /buscar.
 *
 * Trava as invariantes que garantem que "voltar" a partir de um resultado
 * sempre devolve o usuário à tela de busca (descoberta), nunca à homepage:
 *  - a primeira busca EMPILHA histórico (`replace: hasQuery`);
 *  - com termo ativo, o botão de voltar limpa `q` em vez de usar o BackButton;
 *  - o BackButton genérico (fallback para "/") só aparece sem termo ativo.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const route = readFileSync(resolve(process.cwd(), "src/routes/buscar.tsx"), "utf8");

describe("/buscar — regressão de navegação de volta", () => {
  it("empilha histórico na primeira busca e substitui nos refinamentos", () => {
    const matches = route.match(/replace:\s*hasQuery/g) ?? [];
    // syncQueryToUrl (submit) + pickQuery (sugestões/categorias)
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("com termo ativo, o voltar limpa a query em vez de sair da rota", () => {
    const idx = route.indexOf('aria-label="Voltar para a busca"');
    expect(idx).toBeGreaterThan(-1);
    const handler = route.slice(Math.max(0, idx - 900), idx);
    expect(handler).toContain("delete s.q");
    expect(handler).not.toContain('to: "/"');
  });

  it("o BackButton com fallback para a home só é usado sem termo ativo", () => {
    expect(route).toContain('<BackButton fallbackTo="/"');
    const backButtons = route.match(/<BackButton/g) ?? [];
    expect(backButtons.length).toBe(1);
    // Renderizado apenas no ramo "else" do ternário de hasQuery
    const idx = route.indexOf("<BackButton");
    expect(route.slice(idx - 200, idx)).toContain(") : (");
  });

  it("não redireciona programaticamente para a homepage na rota de busca", () => {
    expect(route).not.toMatch(/navigate\(\{\s*to:\s*"\/"\s*\}\)/);
  });
});
