#!/usr/bin/env python3
"""E2E: /planos com o teclado virtual aberto no mobile.

O teclado virtual reduz a área visível (visualViewport). Simulamos isso
encolhendo a altura da viewport enquanto um campo recebe foco, e validamos:

  1. nenhuma rolagem vertical/horizontal da página surge;
  2. a barra de ação (CTA) continua visível e não é coberta;
  3. nenhum conteúdo essencial fica oculto atrás do teclado;
  4. ao fechar o teclado, o layout volta exatamente ao estado inicial.

Uso: python3 scripts/planos_keyboard_e2e.py [--base http://localhost:8080]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from playwright.async_api import async_playwright

TOL = 2

# (nome, largura, altura, altura do teclado virtual)
DEVICES = [
    ("iphone-se", 375, 667, 260),
    ("iphone-14", 390, 844, 336),
    ("pixel-7", 412, 915, 320),
    ("galaxy-s8", 360, 740, 300),
]
THEMES = ("light", "dark")

MEASURE = """
() => {
  const de = document.documentElement;
  const cta = document.querySelector('[data-testid="planos-cta-bar"]');
  const ctaRect = cta ? cta.getBoundingClientRect() : null;
  const hidden = [];
  const important = document.querySelectorAll(
    '[data-testid="planos-cta-bar"] a, [data-testid="planos-cta-bar"] button, [data-plan-card]'
  );
  for (const el of important) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.top >= innerHeight - 1 || r.bottom <= 1) {
      hidden.push((el.getAttribute('data-testid') || el.tagName) + '@' + Math.round(r.top));
    }
  }
  return {
    scrollHeight: de.scrollHeight,
    scrollWidth: de.scrollWidth,
    innerHeight: innerHeight,
    innerWidth: innerWidth,
    scrollTop: Math.round(window.scrollY),
    ctaVisible: !!ctaRect && ctaRect.bottom <= innerHeight + 4 && ctaRect.top >= -1,
    ctaTop: ctaRect ? Math.round(ctaRect.top) : null,
    hidden,
  };
}
"""


def evaluate(label, m, results, extra=()):
    failures = list(extra)
    if m["scrollHeight"] > m["innerHeight"] + TOL:
        failures.append(f"rolagem vertical {m['scrollHeight']} > {m['innerHeight']}")
    if m["scrollWidth"] > m["innerWidth"] + TOL:
        failures.append(f"rolagem horizontal {m['scrollWidth']} > {m['innerWidth']}")
    if not m["ctaVisible"]:
        failures.append("CTA fora da área visível com teclado aberto")
    if m["hidden"]:
        failures.append("conteúdo oculto: " + ", ".join(m["hidden"][:4]))
    results.append({"case": label, "metrics": m, "failures": failures})
    print(f"[{'OK ' if not failures else 'FAIL'}] {label} · {m['innerWidth']}x{m['innerHeight']}")
    for f in failures:
        print(f"        - {f}")


async def run_device(browser, base, name, w, h, kb, theme, results):
    ctx = await browser.new_context(
        viewport={"width": w, "height": h}, device_scale_factor=2,
        is_mobile=True, has_touch=True,
    )
    page = await ctx.new_page()
    await page.goto(f"{base}/planos", wait_until="domcontentloaded")
    await page.evaluate(f"localStorage.setItem('pc-theme', {json.dumps(theme)})")
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_timeout(700)

    before = await page.evaluate(MEASURE)
    evaluate(f"{name}/{theme} · teclado fechado", before, results)

    # foca o primeiro campo de texto disponível (busca global / cupom)
    field = page.locator('input:visible, textarea:visible').first
    focused = await field.count() > 0
    if focused:
        try:
            await field.focus(timeout=1500)
        except Exception:
            focused = False

    # teclado virtual: a viewport encolhe
    await page.set_viewport_size({"width": w, "height": max(240, h - kb)})
    await page.wait_for_timeout(500)
    during = await page.evaluate(MEASURE)
    evaluate(f"{name}/{theme} · teclado aberto ({kb}px)", during, results)

    # teclado fecha → layout deve retornar ao estado inicial
    if focused:
        await page.keyboard.press("Escape")
    await page.set_viewport_size({"width": w, "height": h})
    await page.wait_for_timeout(500)
    after = await page.evaluate(MEASURE)
    extra = []
    if abs(after["scrollHeight"] - before["scrollHeight"]) > TOL:
        extra.append(
            f"layout não restaurado ({before['scrollHeight']} -> {after['scrollHeight']})"
        )
    evaluate(f"{name}/{theme} · teclado fechado (retorno)", after, results, extra)

    await ctx.close()


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--json", default="")
    args = ap.parse_args()

    results: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for name, w, h, kb in DEVICES:
                for theme in THEMES:
                    await run_device(browser, args.base, name, w, h, kb, theme, results)
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
