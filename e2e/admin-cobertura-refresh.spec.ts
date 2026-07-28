import { test, expect } from "@playwright/test";

/**
 * E2E: valida o fluxo do botão "Atualizar" em /admin_/cobertura.
 *
 * Pré-requisito: variáveis TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD apontando
 * para uma conta com role='admin'. O teste é resiliente à ausência de dados
 * (verifica UI, não payload).
 */

const EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

test.describe("admin_/cobertura — RefreshBar", () => {
  test.skip(!EMAIL || !PASSWORD, "TEST_ADMIN_EMAIL/PASSWORD não configurados");

  test("mostra spinner, atualiza timestamp e grava histórico local", async ({ page }) => {
    // 1) Login admin
    await page.goto("/auth");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(dashboard|admin|\/)/, { timeout: 15_000 });

    // 2) Cobertura
    await page.goto("/admin_/cobertura");
    const refreshBtn = page.getByTestId("refresh-button-coverage");
    await expect(refreshBtn).toBeVisible({ timeout: 10_000 });

    // 3) Clique
    await refreshBtn.click();

    // 4) Spinner aparece durante a consulta
    const spinner = page.getByTestId("refresh-spinner");
    await expect(spinner).toBeVisible({ timeout: 5_000 });

    // 5) Spinner some e status volta a "Atualizado às …"
    await expect(spinner).toBeHidden({ timeout: 20_000 });
    const status = page.getByTestId("refresh-status-coverage");
    await expect(status).toContainText(/Atualizado às \d{2}:\d{2}:\d{2}|Falha/);

    // 6) Persistência local: última entrada em pc:refresh:coverage
    const historyRaw = await page.evaluate(() => window.localStorage.getItem("pc:refresh:coverage"));
    expect(historyRaw).toBeTruthy();
    const history = JSON.parse(historyRaw!);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(typeof history[0].ts).toBe("number");
    expect(["success", "error", "timeout"]).toContain(history[0].status);
    expect(typeof history[0].durationMs).toBe("number");
  });
});
