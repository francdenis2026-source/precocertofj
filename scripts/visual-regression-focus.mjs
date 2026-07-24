#!/usr/bin/env node
/**
 * Visual regression: guarantees the PriceSearchBar (and other search-like
 * cards) do not leak halos, shadows, or focus rings outside their bounding
 * box when the user focuses the input.
 *
 * How it works:
 *  1. Renders the homepage in a headless browser.
 *  2. Captures a baseline screenshot of the search card idle.
 *  3. Focuses the input and captures a second screenshot at the same crop.
 *  4. Reads the pixels JUST BELOW / above / beside the card bounding box.
 *     If ANY pixel in that strip changes color between idle and focus,
 *     something escaped the card — the test fails.
 *
 * Baselines live in scripts/__screenshots__/. Run with:
 *   node scripts/visual-regression-focus.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "__screenshots__");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const URL = process.env.PREVIEW_URL ?? "http://localhost:8080";
const STRIP_PX = 6; // pixels of padding around the card to inspect for leaks
const TOLERANCE = 4; // per-channel diff tolerance (anti-aliasing noise)

/** Read a rectangular strip of pixels from a PNG buffer. */
function readStrip(buf, x, y, w, h) {
  const png = PNG.sync.read(buf);
  const out = [];
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const i = (png.width * py + px) << 2;
      out.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
    }
  }
  return out;
}

function diffStrips(a, b) {
  let leaked = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(a[i][c] - b[i][c]) > TOLERANCE) {
        leaked++;
        break;
      }
    }
  }
  return leaked;
}

const TARGETS = [
  {
    name: "home-price-search",
    url: `${URL}/`,
    selector: 'input[aria-label="Nome do produto"]',
    cardSelector: "section:has(> form input[aria-label='Nome do produto'])",
  },
];

let failures = 0;
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  for (const t of TARGETS) {
    await page.goto(t.url, { waitUntil: "networkidle" });
    const card = page.locator(t.cardSelector).first();
    await card.waitFor({ state: "visible" });
    const box = await card.boundingBox();
    if (!box) throw new Error(`no bounding box for ${t.name}`);

    // Screenshot a region padded around the card so we can inspect leak strips.
    const clip = {
      x: Math.max(0, box.x - STRIP_PX),
      y: Math.max(0, box.y - STRIP_PX),
      width: box.width + STRIP_PX * 2,
      height: box.height + STRIP_PX * 2,
    };

    // idle
    const idle = await page.screenshot({ clip });
    // focused
    await page.locator(t.selector).focus();
    await page.waitForTimeout(400); // let focus transitions settle
    const focused = await page.screenshot({ clip });
    // hover
    await page.locator(t.selector).hover();
    await page.waitForTimeout(200);
    const hovered = await page.screenshot({ clip });
    // disabled
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute("disabled", "true");
    }, t.selector);
    await page.waitForTimeout(200);
    const disabled = await page.screenshot({ clip });

    // Persist all frames for manual review.
    const write = (name, buf) => {
      const p = resolve(OUT_DIR, `${t.name}-${name}.png`);
      require("node:fs").writeFileSync(p, buf);
    };
    // ESM: use import at top for fs.writeFileSync
    (await import("node:fs")).writeFileSync(resolve(OUT_DIR, `${t.name}-idle.png`), idle);
    (await import("node:fs")).writeFileSync(resolve(OUT_DIR, `${t.name}-focus.png`), focused);
    (await import("node:fs")).writeFileSync(resolve(OUT_DIR, `${t.name}-hover.png`), hovered);
    (await import("node:fs")).writeFileSync(resolve(OUT_DIR, `${t.name}-disabled.png`), disabled);

    // Inspect the outer strip (padding area) — must be identical across states.
    const stripsIdle = [
      readStrip(idle, 0, 0, clip.width, STRIP_PX),                                  // top
      readStrip(idle, 0, clip.height - STRIP_PX, clip.width, STRIP_PX),            // bottom
      readStrip(idle, 0, 0, STRIP_PX, clip.height),                                 // left
      readStrip(idle, clip.width - STRIP_PX, 0, STRIP_PX, clip.height),            // right
    ].flat();

    for (const [label, buf] of [
      ["focus", focused],
      ["hover", hovered],
      ["disabled", disabled],
    ]) {
      const strips = [
        readStrip(buf, 0, 0, clip.width, STRIP_PX),
        readStrip(buf, 0, clip.height - STRIP_PX, clip.width, STRIP_PX),
        readStrip(buf, 0, 0, STRIP_PX, clip.height),
        readStrip(buf, clip.width - STRIP_PX, 0, STRIP_PX, clip.height),
      ].flat();
      const leaked = diffStrips(stripsIdle, strips);
      if (leaked > 0) {
        console.error(`✗ ${t.name} [${label}]: ${leaked} pixel(s) leaked outside card`);
        failures++;
      } else {
        console.log(`✓ ${t.name} [${label}]: contained`);
      }
    }
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} regression(s) detected. See ${OUT_DIR} for artefacts.`);
  process.exit(1);
}
console.log(`\nAll search cards contained. Baselines: ${OUT_DIR}`);
