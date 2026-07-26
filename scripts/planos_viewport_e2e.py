#!/usr/bin/env python3
"""E2E: /planos deve caber em UMA tela (sem rolagem vertical) em dispositivos
reais e em ambas as orientações, sem quebrar o layout.

Uso:
    python3 scripts/planos_viewport_e2e.py [--base http://localhost:8080] [--json out.json]

Checks por viewport/orientação/tema:
  1. sem rolagem vertical na página (scrollHeight <= innerHeight + tolerância)
  2. sem rolagem horizontal (scrollWidth <= innerWidth + tolerância)
  3. a barra de ação (CTA) está visível dentro da viewport
  4. nenhum texto/cartão principal ultrapassa a borda inferior visível
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from playwright.async_api import async_playwright

TOL = 2  # px

# Dispositivos reais (portrait). A rotação é derivada invertendo w/h.
DEVICES = [
    ("iphone-se", 375, 667, 2),
    ("iphone-14", 390, 844, 3),
    ("iphone-14-pro-max", 430, 932, 3),
    ("pixel-7", 412, 915, 2.6),
    ("galaxy-s8", 360, 740, 3),
    ("ipad-mini", 768, 1024, 2),
    ("ipad-pro-11", 834, 1194, 2),
    ("laptop", 1440, 820, 1),
    ("desktop-hd", 1920, 1080, 1),
]

THEMES = ("light", "dark")

MEASURE = """
() => {
  const de = document.documentElement;
  const cta = document.querySelector('[data-testid="planos-cta-bar"]')
    || Array.from(document.querySelectorAll('a,button')).reverse()
        .find(el => /assinar|come(ç|c)ar/i.test(el.textContent || ''));
  const ctaRect = cta ? cta.getBoundingClientRect() : null;
  const overflowing = Array.from(document.body.querySelectorAll('*'))
    .filter(el => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) return false;
      // ignora conteúdo dentro de contêineres com rolagem interna (permitido)
      let p = el.parentElement;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if (/(auto|scroll)/.test(pcs.overflowY + pcs.overflowX)) return false;
        p = p.parentElement;
      }
      return r.bottom > innerHeight + 2 || r.right > innerWidth + 2;
    })
    .slice(0, 5)
    .map(el => el.tagName + '.' + String(el.className).slice(0, 60));
  return {
    scrollHeight: de.scrollHeight,
    scrollWidth: de.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    ctaVisible: !!ctaRect && ctaRect.top >= 0 && ctaRect.bottom <= window.innerHeight + 4,
    overflowing,
  };
}
"""


async def check(page, base, theme, label, results):
    await page.goto(base + "/planos", wait_until="domcontentloaded")
    await page.evaluate(f"localStorage.setItem('pc-theme', {json.dumps(theme)})")
    await page.reload(wait_until="networkidle")
    await page.wait_for_timeout(600)
    m = await page.evaluate(MEASURE)

    failures = []
    if m["scrollHeight"] > m["innerHeight"] + TOL:
        failures.append(f"rolagem vertical: {m['scrollHeight']} > {m['innerHeight']}")
    if m["scrollWidth"] > m["innerWidth"] + TOL:
        failures.append(f"rolagem horizontal: {m['scrollWidth']} > {m['innerWidth']}")
    if not m["ctaVisible"]:
        failures.append("barra de ação (CTA) fora da viewport")
    if m["overflowing"]:
        failures.append("elementos fora da tela: " + ", ".join(m["overflowing"]))

    results.append({"case": label, "theme": theme, "metrics": m, "failures": failures})
    status = "OK " if not failures else "FAIL"
    print(f"[{status}] {label} · {theme} · {m['innerWidth']}x{m['innerHeight']}")
    for f in failures:
        print(f"        - {f}")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--json", default="")
    ap.add_argument("--only-mobile", action="store_true")
    args = ap.parse_args()

    devices = [d for d in DEVICES if not args.only_mobile or d[1] <= 500]
    results: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for name, w, h, dpr in devices:
                for orientation, (vw, vh) in (
                    ("portrait", (w, h)),
                    ("landscape", (h, w)),
                ):
                    ctx = await browser.new_context(
                        viewport={"width": vw, "height": vh},
                        device_scale_factor=dpr,
                        is_mobile=w <= 500,
                        has_touch=w <= 900,
                    )
                    page = await ctx.new_page()
                    for theme in THEMES:
                        await check(page, args.base, theme, f"{name}/{orientation}", results)
                    await ctx.close()
        finally:
            await browser.close()

    if args.json:
        with open(args.json, "w") as fh:
            json.dump(results, fh, indent=2)

    failed = [r for r in results if r["failures"]]
    print(f"\n{len(results) - len(failed)}/{len(results)} casos passaram.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
