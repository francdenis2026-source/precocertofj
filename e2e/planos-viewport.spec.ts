import { test, expect } from "@playwright/test";

/**
 * E2E — /planos: valida que a página cabe em uma única viewport
 * em desktop (1366x768) e mobile (360x640), sem scroll de body,
 * mantendo cabeçalho, cards e CTA visíveis (sem clipping).
 */

const routes: Array<{ path: string; label: string }> = [
  { path: "/planos", label: "planos" },
  { path: "/mapa", label: "mapa" },
  { path: "/estabelecimentos", label: "estabelecimentos" },
];

const viewports: Array<{ w: number; h: number; tag: "desktop" | "mobile" }> = [
  { w: 1366, h: 768, tag: "desktop" },
  { w: 360, h: 640, tag: "mobile" },
];

for (const { path, label } of routes) {
  test.describe(`${path} — single-viewport layout`, () => {
    for (const { w, h, tag } of viewports) {
      test(`${label} @ ${tag} (${w}x${h}) não gera scroll de body`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(path, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);

        const metrics = await page.evaluate(() => ({
          docH: document.documentElement.scrollHeight,
          winH: window.innerHeight,
        }));

        // Tolerância de 4px para arredondamento subpixel
        expect(metrics.docH).toBeLessThanOrEqual(metrics.winH + 4);
      });
    }
  });
}

test.describe("/planos — cards, cabeçalho e CTA visíveis", () => {
  test("cabeçalho e barra de ação são visíveis em mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/planos", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Cards renderizados
    const cards = page.locator("[data-planos-card]");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // CTA bar sempre no rodapé
    const cta = page.getByTestId("planos-cta-bar");
    await expect(cta).toBeVisible();

    // Cabeçalho no topo
    const heading = page.getByRole("heading", { name: /planos e preços/i }).first();
    await expect(heading).toBeVisible();
  });

  test("cards preenchem altura disponível em desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/planos", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const cardHeights = await page
      .locator("[data-planos-card]")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));

    // Todos os cards com altura mínima consistente (grid preenche)
    for (const h of cardHeights) {
      expect(h).toBeGreaterThanOrEqual(168);
    }
  });
});
