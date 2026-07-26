/**
 * Auditoria visual de overflow por viewport.
 *
 * Verifica, para cada rota pública:
 *   - overflow horizontal (scrollWidth > innerWidth);
 *   - altura total x meta de "uma tela" (ratio de scroll);
 *   - textos renderizados abaixo do piso de legibilidade do TypeClear.
 *
 * Uso:  node scripts/viewport-audit.mjs [--url http://localhost:8080]
 * Saída: tabela no stdout + screenshots em /tmp/browser/viewport-audit/
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE =
  process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : "http://localhost:8080";

const OUT = "/tmp/browser/viewport-audit";
mkdirSync(OUT, { recursive: true });

export const VIEWPORTS = [
  { name: "mobile-sm", width: 320, height: 640 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

export const ROUTES = [
  "/",
  "/buscar",
  "/estabelecimentos",
  "/privacidade",
  "/comparador",
  "/mapa",
  "/planos",
  "/colaborar",
  "/fale-conosco",
  "/farmacias",
  "/economia",
];

/** Piso de fonte aceito em px (espelha MIN_ANY_PX do TypeClear). */
const MIN_FONT_PX = 10.5;
/** Meta de "cabe em uma tela": até 1.15x a altura da viewport. */
const MAX_HEIGHT_RATIO = 1.15;

const probe = () => {
  const doc = document.documentElement;
  const tiny = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const text = (el.textContent ?? "").trim();
    if (!text || el.children.length > 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const size = parseFloat(cs.fontSize);
    if (size < 10.5) {
      const key = `${size}|${text.slice(0, 40)}`;
      if (!seen.has(key)) {
        seen.add(key);
        tiny.push({ size, text: text.slice(0, 40) });
      }
    }
  }
  return {
    scrollWidth: doc.scrollWidth,
    scrollHeight: doc.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tiny: tiny.slice(0, 8),
  };
};

const browser = await chromium.launch({ headless: true });
const rows = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
    } catch {
      /* segue com o que renderizou */
    }
    await page.waitForTimeout(600);
    const r = await page.evaluate(probe);
    const hRatio = +(r.scrollHeight / r.innerHeight).toFixed(2);
    const overflowX = r.scrollWidth > r.innerWidth + 1;
    const fits = hRatio <= MAX_HEIGHT_RATIO;
    rows.push({
      viewport: vp.name,
      route,
      hRatio,
      overflowX,
      fits,
      tiny: r.tiny.length,
      tinySample: r.tiny[0]?.text ?? "",
    });
    if (overflowX || r.tiny.length) {
      await page.screenshot({
        path: `${OUT}/${vp.name}${route.replace(/\//g, "_") || "_home"}.png`,
      });
    }
  }
  await context.close();
}

await browser.close();

console.table(rows);
const problems = rows.filter((r) => r.overflowX || r.tiny > 0);
console.log(
  problems.length
    ? `\n${problems.length} problema(s) de overflow/legibilidade. Screenshots em ${OUT}`
    : "\nSem overflow horizontal e sem letras abaixo do piso.",
);
const notFitting = rows.filter((r) => !r.fits);
if (notFitting.length) {
  console.log(
    `\nRotas acima da meta de uma tela (>${MAX_HEIGHT_RATIO}x):\n` +
      notFitting.map((r) => `  ${r.viewport} ${r.route} → ${r.hRatio}x`).join("\n"),
  );
}
process.exit(problems.length ? 1 : 0);
