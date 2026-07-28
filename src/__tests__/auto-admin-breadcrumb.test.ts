/**
 * Testes de unidade para o registry central de rotas administrativas.
 * Garante que a categorização (Cesta Básica, Auditoria, Veredito, Ranking)
 * é estável e que o prefix-longest-match resolve rotas específicas antes
 * de genéricas — evitando colisão entre `admin/cesta` e `admin/cesta-auditoria`.
 */

import { describe, it, expect } from "vitest";
import { lookupAdminRoute } from "@/components/admin/AutoAdminBreadcrumb";

describe("lookupAdminRoute", () => {
  it("mapeia Cesta Básica corretamente sem colidir com auditoria", () => {
    expect(lookupAdminRoute("/admin/cesta")?.category).toBe("Cesta Básica");
    expect(lookupAdminRoute("/admin/cesta-auditoria")?.category).toBe("Auditoria");
    expect(lookupAdminRoute("/admin/cesta-auditoria/123")?.category).toBe("Auditoria");
  });

  it("classifica ranking e cobertura como Ranking", () => {
    expect(lookupAdminRoute("/admin/rank-check")?.category).toBe("Ranking");
    expect(lookupAdminRoute("/admin/cobertura")?.category).toBe("Ranking");
    expect(lookupAdminRoute("/admin/cobertura/uuid-abc")?.category).toBe("Ranking");
  });

  it("cross-scope: /cesta-basica pertence à categoria Veredito", () => {
    expect(lookupAdminRoute("/cesta-basica")?.category).toBe("Veredito");
    expect(lookupAdminRoute("/cesta-basica")?.hub).toBe("operacao");
  });

  it("retorna null para /admin raiz e caminhos desconhecidos", () => {
    // A raiz não tem migalha própria — decisão explícita no AutoAdminBreadcrumb.
    expect(lookupAdminRoute("/admin/rota-inexistente-42")).toBeNull();
    expect(lookupAdminRoute("/perfil")).toBeNull();
  });

  it("normaliza barras finais duplicadas", () => {
    expect(lookupAdminRoute("/admin/cesta/")?.page).toBe("Itens & versões");
    expect(lookupAdminRoute("/admin/rank-check///")?.category).toBe("Ranking");
  });

  it("propaga o hub semântico correto (para paleta AA)", () => {
    expect(lookupAdminRoute("/admin/clientes")?.hub).toBe("contas");
    expect(lookupAdminRoute("/admin/precos")?.hub).toBe("precos");
    expect(lookupAdminRoute("/admin/catalogo")?.hub).toBe("vitrine");
  });
});
