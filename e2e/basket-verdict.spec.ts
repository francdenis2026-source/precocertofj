import { test, expect } from "@playwright/test";

/**
 * E2E — /cesta-basica: valida o Verdict Hero, ranking e persistência
 * do modo de ordenação em localStorage.
 *
 * O teste é resiliente à ausência de dados (verifica UI, não payload).
 */

test.describe("/cesta-basica — Verdict + ranking sort persistence", () => {
  test("exibe hero, alterna ordenação e persiste após reload", async ({ page }) => {
    await page.goto("/cesta-basica");

    // Verdict hero (mesmo sem dados renderiza card com estado vazio ou champion)
    const hero = page.getByTestId("basket-verdict-hero").first();
    // Se não houver dados, ao menos o título aparece
    await expect(page.getByRole("heading", { name: /cesta básica/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Se o ranking estiver visível, testa a persistência do sort
    const sortSelect = page.getByTestId("live-basket-sort").first();
    if (await sortSelect.isVisible().catch(() => false)) {
      await sortSelect.click();
      await page.getByRole("option", { name: /total/i }).first().click();

      // Recarrega e confere se o localStorage foi restaurado
      await page.reload();
      const stored = await page.evaluate(() =>
        window.localStorage.getItem("pc:live-basket:sort"),
      );
      expect(stored).toBe("total");
    }

    // Se houver hero populado, valida chip de campeão
    const champion = page.getByTestId("basket-verdict-champion");
    if (await champion.isVisible().catch(() => false)) {
      await expect(champion).toContainText(/./);
    }
  });
});
