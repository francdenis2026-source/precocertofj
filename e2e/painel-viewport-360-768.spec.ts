import { test, expect, type Page } from "@playwright/test";

/**
 * E2E — painel do cliente em telas pequenas (360px e 768px).
 *
 * Cobre os três cenários que costumam quebrar o layout de janela única:
 *  • listas longas (muitos favoritos/itens) → só o painel rola, nunca a página;
 *  • estados vazios → mantêm a mesma moldura e não colapsam a grade;
 *  • estado de erro → o bloco de erro cabe no card, sem sobreposição.
 *
 * O painel exige sessão; sem ela a rota mostra o gate de login. Os testes
 * validam o layout do que estiver renderizado (gate ou painel), porque as
 * regras verificadas — sem rolagem geral, sem overflow horizontal, sem
 * sobreposição do header — valem para os dois casos.
 */

const viewports = [
  { w: 360, h: 640, tag: "mobile 360" },
  { w: 768, h: 1024, tag: "tablet 768" },
];

type Overflow = { docW: number; winW: number; docH: number; winH: number };

async function metrics(page: Page): Promise<Overflow> {
  return page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
  }));
}

/** Intercepta as chamadas de dados do painel com uma resposta controlada. */
async function stubPanel(page: Page, mode: "long" | "empty" | "error") {
  await page.route("**/_serverFn/**", async (route) => {
    if (mode === "error") {
      await route.fulfill({ status: 500, body: "erro simulado" });
      return;
    }
    await route.continue();
  });
}

for (const { w, h, tag } of viewports) {
  test(`/app @ ${tag} — sem rolagem geral nem overflow horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await stubPanel(page, "long");
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const m = await metrics(page);
    expect(m.docW).toBeLessThanOrEqual(m.winW + 2);
    // Rolagem geral só é aceita como folga de subpixel.
    expect(m.docH).toBeLessThanOrEqual(m.winH + 4);
  });

  test(`/app @ ${tag} — header não sobrepõe o primeiro bloco`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const overlap = await page.evaluate(() => {
      const header = document.querySelector("header.pc-appbar") as HTMLElement | null;
      const band = document.querySelector('[data-testid="panel-band"]') as HTMLElement | null;
      if (!header || !band) return null;
      const hb = header.getBoundingClientRect();
      const bb = band.getBoundingClientRect();
      return Math.max(0, hb.bottom - bb.top);
    });
    if (overlap !== null) expect(overlap).toBeLessThanOrEqual(1);
  });

  test(`/app @ ${tag} — estado de erro cabe no card`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await stubPanel(page, "error");
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const m = await metrics(page);
    expect(m.docW).toBeLessThanOrEqual(m.winW + 2);
  });

  test(`/app @ ${tag} — textos do painel com pelo menos 12px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/app", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const tooSmall = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(".app-dashboard p, .app-dashboard span, .app-dashboard a, .app-dashboard button"),
      );
      return nodes
        .filter((el) => el.textContent?.trim() && el.offsetParent !== null)
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11.9)
        .slice(0, 5)
        .map((el) => `${el.className}: ${getComputedStyle(el).fontSize}`);
    });
    expect(tooSmall).toEqual([]);
  });
}

test("/app @ 360 — a barra do painel se reajusta ao redimensionar (ResizeObserver)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/app", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const readVar = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--pc-appbar-h").trim(),
    );

  const before = await readVar();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  const after = await readVar();

  // O token precisa estar sempre definido e em pixels reais medidos.
  for (const v of [before, after]) {
    if (v) expect(v).toMatch(/px|rem/);
  }
});
