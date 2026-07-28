import { test, expect } from "@playwright/test";

/**
 * E2E — viewport único e CLS.
 *
 * • Garante que /planos, /comparador, /melhores-precos e /mapa cabem
 *   na viewport sem gerar scroll de body em desktop e mobile.
 * • Mede o Cumulative Layout Shift após skeleton → conteúdo em rotas
 *   com listagens (deve ficar bem abaixo de 0.1 = "Good" no CWV).
 */

const singleViewportRoutes = [
  "/planos",
  "/comparador",
  "/melhores-precos",
  "/mapa",
  "/estabelecimentos",
];

const viewports = [
  { w: 1366, h: 768, tag: "desktop" as const },
  { w: 360, h: 640, tag: "mobile" as const },
];

for (const path of singleViewportRoutes) {
  for (const { w, h, tag } of viewports) {
    test(`${path} @ ${tag} (${w}x${h}) não gera scroll de body`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => ({
        docH: document.documentElement.scrollHeight,
        winH: window.innerHeight,
      }));
      // Tolerância pequena para subpixels
      expect(metrics.docH).toBeLessThanOrEqual(metrics.winH + 4);
    });
  }
}

/**
 * CLS: injetamos um PerformanceObserver antes da navegação e coletamos
 * o total após o skeleton dar lugar ao conteúdo. Meta: < 0.1
 * (limiar oficial de "Good" nos Core Web Vitals).
 */
const clsRoutes = ["/planos", "/comparador", "/melhores-precos"];

for (const path of clsRoutes) {
  test(`${path} — CLS abaixo de 0.1 após skeleton → conteúdo`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const e = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!e.hadRecentInput && typeof e.value === "number") {
            (window as unknown as { __cls: number }).__cls += e.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(path, { waitUntil: "networkidle" });
    // Espera skeleton → conteúdo hidratar completamente
    await page.waitForTimeout(1500);

    const cls = await page.evaluate(
      () => (window as unknown as { __cls: number }).__cls,
    );
    expect(cls).toBeLessThan(0.1);
  });
}
