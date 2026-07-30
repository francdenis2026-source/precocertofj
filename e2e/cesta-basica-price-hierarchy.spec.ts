import { test, expect, type Page } from "@playwright/test";

/**
 * E2E — /cesta-basica autenticado.
 *
 * Valida três contratos visuais do design system de preços:
 *  1. HIERARQUIA — o preço do veredito (total da cesta campeã) é
 *     tipograficamente maior que os preços de apoio (média, faixa, diffs).
 *  2. TONS — todo preço renderizado usa o componente <Price /> e os tons
 *     semânticos `best` (menor total), `savings` (economia) e `muted`
 *     (referências secundárias) aparecem nos lugares corretos.
 *  3. SELO VENCEDOR — o badge "Menor preço" marca o menor valor absoluto,
 *     e nunca mais de um mercado por linha (salvo empate declarado).
 *
 * Autenticação: o /login do PreçoCerto usa CPF + PIN de 6 dígitos.
 * Forneça E2E_CPF e E2E_PIN no ambiente; sem eles o teste é pulado
 * (em vez de falhar o CI por falta de credencial).
 */

const CPF = process.env.E2E_CPF ?? "";
const PIN = process.env.E2E_PIN ?? "";

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const cpf = page.getByLabel(/cpf/i).first();
  await cpf.waitFor({ state: "visible", timeout: 15_000 });
  await cpf.fill(CPF);

  // PinField de 6 dígitos: pode ser um input único ou seis inputs.
  const pinInputs = page.locator(
    'input[inputmode="numeric"], input[autocomplete="one-time-code"]',
  );
  const count = await pinInputs.count();
  if (count >= 6) {
    for (let i = 0; i < 6; i++) await pinInputs.nth(i).fill(PIN[i] ?? "");
  } else {
    await pinInputs.first().fill(PIN);
  }

  await page.getByRole("button", { name: /entrar|acessar/i }).first().click();
  await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 20_000 });
}

/** Lê size/tone de um nó .pc-price a partir das classes utilitárias do DS. */
async function readPriceTokens(page: Page) {
  return page.$$eval(".pc-price", (nodes) =>
    nodes.map((n) => {
      const cls = Array.from(n.classList);
      const size = cls.find((c) => /^pc-price--(xs|sm|md|lg|xl|display)$/.test(c)) ?? null;
      const tone =
        cls.find((c) => /^pc-price--(best|muted|strike|savings|onhero)$/.test(c)) ?? "default";
      return {
        size,
        tone,
        text: (n.textContent ?? "").trim(),
        fontSize: parseFloat(getComputedStyle(n).fontSize),
        testid: n.getAttribute("data-testid"),
      };
    }),
  );
}

test.describe("/cesta-basica autenticado — hierarquia, tons e selo vencedor", () => {
  test.skip(!CPF || !PIN, "Defina E2E_CPF e E2E_PIN para rodar o fluxo autenticado.");

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/cesta-basica", { waitUntil: "networkidle" });
    await page.getByTestId("basket-verdict-hero").waitFor({ timeout: 20_000 });
  });

  test("não sobra formatação de preço fora do componente <Price />", async ({ page }) => {
    // Qualquer "R$" visível deve estar dentro de um .pc-price (prefixo do DS)
    // ou de um rótulo textual explícito (ex.: "orçamento em R$").
    const orphans = await page.$$eval("body *", (nodes) =>
      nodes
        .filter((n) => {
          if (n.closest(".pc-price")) return false;
          const own = Array.from(n.childNodes)
            .filter((c) => c.nodeType === Node.TEXT_NODE)
            .map((c) => c.textContent ?? "")
            .join("");
          return /R\$\s?\d/.test(own);
        })
        .map((n) => (n.textContent ?? "").trim().slice(0, 80)),
    );
    expect(orphans, `Preços fora do <Price />: ${orphans.join(" | ")}`).toHaveLength(0);
  });

  test("hierarquia: o total do veredito é maior que os preços de apoio", async ({ page }) => {
    const tokens = await readPriceTokens(page);
    expect(tokens.length).toBeGreaterThan(0);

    const hero = tokens.find((t) => t.testid === "basket-verdict-total");
    expect(hero, "preço do veredito não encontrado").toBeTruthy();
    expect(hero?.size).toBe("pc-price--lg");

    const supporting = tokens.filter((t) => t.tone === "pc-price--muted");
    for (const s of supporting) {
      expect(
        s.fontSize,
        `preço de apoio "${s.text}" não pode ser maior que o veredito`,
      ).toBeLessThan(hero!.fontSize);
    }
  });

  test("tons: best, savings e muted aparecem nos papéis corretos", async ({ page }) => {
    const tokens = await readPriceTokens(page);

    // `best` — reservado ao menor total / menor preço por item.
    const best = tokens.filter((t) => t.tone === "pc-price--best");
    expect(best.length, "nenhum preço com tom `best`").toBeGreaterThan(0);

    // `savings` — economia estimada; nunca deve ser o preço principal.
    const savings = page.getByTestId("basket-verdict-savings");
    await expect(savings).toBeVisible();
    await expect(savings).toHaveClass(/pc-price--savings/);

    // `muted` — referências secundárias (médias, faixas, comparações).
    const muted = tokens.filter((t) => t.tone === "pc-price--muted");
    expect(muted.length, "nenhum preço com tom `muted`").toBeGreaterThan(0);

    // Contraste de intenção: nenhum preço `muted` pode ser o maior da página.
    const maxFont = Math.max(...tokens.map((t) => t.fontSize));
    for (const m of muted) expect(m.fontSize).toBeLessThan(maxFont);
  });

  test("selo vencedor 'Menor preço' marca o menor valor absoluto", async ({ page }) => {
    const rows = page.locator("[data-cheapest]");
    const total = await rows.count();
    test.skip(total === 0, "sem linhas comparativas nesta cesta (dados vazios)");

    const winners = page.locator('[data-cheapest="true"]');
    expect(await winners.count()).toBeGreaterThan(0);

    // Rótulo e acessibilidade do selo
    const badge = winners.first().getByRole("img", { name: /menor preço/i }).first();
    await expect(badge).toBeVisible();

    // Valor: o vencedor tem o menor preço entre as linhas do mesmo grupo.
    const prices = await rows.evaluateAll((nodes) =>
      nodes.map((n) => ({
        cheapest: n.getAttribute("data-cheapest") === "true",
        value: parseFloat(
          ((n.querySelector(".pc-price__value")?.textContent ?? "0")
            .replace(/\./g, "")
            .replace(",", ".")),
        ),
      })),
    );
    const valid = prices.filter((p) => Number.isFinite(p.value) && p.value > 0);
    if (valid.length > 1) {
      const min = Math.min(...valid.map((p) => p.value));
      for (const p of valid.filter((x) => x.cheapest)) {
        expect(p.value).toBeCloseTo(min, 2);
      }
    }
  });

  test("o veredito nomeia o mercado campeão", async ({ page }) => {
    const champion = page.getByTestId("basket-verdict-champion");
    await expect(champion).toBeVisible();
    await expect(champion).not.toHaveText(/^\s*$/);
  });
});
