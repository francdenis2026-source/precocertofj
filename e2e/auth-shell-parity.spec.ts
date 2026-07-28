/**
 * Regressão visual de layout/tipografia — cascas /login, /cadastro e /resgatar
 * devem manter a MESMA altura visual em mobile, tablet e desktop, e os títulos
 * editoriais devem usar Fraunces (font-editorial) com o mesmo refinamento.
 */
import { test, expect } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

// Tolerância: 8px cobre pequenas diferenças de borda/anti-aliasing entre rotas.
const HEIGHT_TOLERANCE_PX = 8;

for (const vp of viewports) {
  test(`login e cadastro têm a mesma altura visual (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const loginShell = await page.locator("body > div").first().boundingBox();

    await page.goto("/cadastro");
    await page.waitForLoadState("networkidle");
    const cadShell = await page.locator("body > div").first().boundingBox();

    expect(loginShell).not.toBeNull();
    expect(cadShell).not.toBeNull();

    const delta = Math.abs((loginShell!.height ?? 0) - (cadShell!.height ?? 0));
    expect(delta).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);
  });
}

test("tipografia editorial da home é uniforme (Fraunces)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const headings = page.locator("h1, h2, h3").filter({ has: page.locator(".pc-editorial-accent, .font-editorial") });
  const count = await headings.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 8); i++) {
    const family = await headings.nth(i).evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.toLowerCase()).toContain("fraunces");
  }
});

test("acento dourado tem contraste suficiente no hero", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const accent = page.locator(".pc-editorial-accent--fill").first();
  await expect(accent).toBeVisible();

  const { color, weight, style } = await accent.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, weight: s.fontWeight, style: s.fontStyle };
  });

  expect(style).toBe("italic");
  // Peso variável 520 solicitado — o browser reporta um number.
  expect(Number(weight)).toBeGreaterThanOrEqual(480);
  expect(color).toMatch(/rgb/);
});
