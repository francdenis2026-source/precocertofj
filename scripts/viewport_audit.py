#!/usr/bin/env python3
"""Auditoria visual de overflow por viewport (PrecoCerto).

Para cada rota publica e cada viewport verifica:
  - overflow horizontal (scrollWidth > innerWidth);
  - altura total vs. meta de "cabe em uma tela" (ratio de scroll);
  - textos renderizados abaixo do piso de legibilidade do TypeClear.

Uso:  python3 scripts/viewport_audit.py [--url http://localhost:8080] [--routes /,/buscar]
Saida: tabela no stdout + screenshots em /tmp/browser/viewport-audit/
Codigo de saida 1 quando ha overflow horizontal ou letras abaixo do piso.
"""
import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path("/tmp/browser/viewport-audit")

VIEWPORTS = [
    ("mobile-sm", 320, 640),
    ("mobile", 390, 844),
    ("tablet", 768, 1024),
    ("desktop", 1440, 900),
]

ROUTES = [
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
]

# Espelha MIN_ANY_PX em src/lib/typeclear.ts
MIN_FONT_PX = 11
# Meta "uma tela": ate 1.15x a altura da viewport
MAX_HEIGHT_RATIO = 1.15

PROBE = """() => {
  const doc = document.documentElement;
  const tiny = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const text = (el.textContent || '').trim();
    if (!text || el.children.length > 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const size = parseFloat(cs.fontSize);
    if (size < %s) {
      const key = size + '|' + text.slice(0, 40);
      if (!seen.has(key)) { seen.add(key); tiny.push({ size, text: text.slice(0, 40) }); }
    }
  }
  return {
    scrollWidth: doc.scrollWidth,
    scrollHeight: doc.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tiny: tiny.slice(0, 8),
  };
}""" % MIN_FONT_PX


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8080")
    ap.add_argument("--routes", default="")
    args = ap.parse_args()
    routes = [r for r in args.routes.split(",") if r] or ROUTES

    OUT.mkdir(parents=True, exist_ok=True)
    rows = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for name, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            for route in routes:
                try:
                    await page.goto(f"{args.url}{route}", wait_until="networkidle", timeout=30000)
                except Exception:
                    pass
                await page.wait_for_timeout(600)
                r = await page.evaluate(PROBE)
                ratio = round(r["scrollHeight"] / max(r["innerHeight"], 1), 2)
                overflow_x = r["scrollWidth"] > r["innerWidth"] + 1
                tiny = r["tiny"]
                rows.append((name, route, ratio, overflow_x, len(tiny),
                             tiny[0]["text"] if tiny else ""))
                if overflow_x or tiny:
                    slug = route.replace("/", "_") or "_home"
                    await page.screenshot(path=str(OUT / f"{name}{slug}.png"))
            await ctx.close()
        await browser.close()

    print(f"{'viewport':<10} {'rota':<20} {'altura':>7} {'overflowX':>10} {'letras<pisos':>13}  amostra")
    for name, route, ratio, ox, ntiny, sample in rows:
        print(f"{name:<10} {route:<20} {str(ratio) + 'x':>7} {str(ox):>10} {ntiny:>13}  {sample}")

    problems = [r for r in rows if r[3] or r[4]]
    over = [r for r in rows if r[2] > MAX_HEIGHT_RATIO]
    if over:
        print(f"\nAcima da meta de uma tela (> {MAX_HEIGHT_RATIO}x):")
        for name, route, ratio, *_ in over:
            print(f"  {name} {route} -> {ratio}x")
    print(
        f"\n{len(problems)} problema(s) de overflow/legibilidade. Screenshots em {OUT}"
        if problems
        else "\nSem overflow horizontal e sem letras abaixo do piso."
    )
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
