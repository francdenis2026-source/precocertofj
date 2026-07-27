#!/usr/bin/env python3
"""
E2E — o header global só existe na homepage.

Percorre todas as rotas críticas em 3 breakpoints (mobile, tablet, desktop) e
valida:
  • "/"  → existe exatamente 1 [data-site-header="global"]
  • demais rotas → 0 headers globais, mas existe caminho de volta para a home
    (link para "/" visível acima da dobra)
  • nenhuma rota interna empilha duas barras fixas no topo

Uso: python3 scripts/header_scope_e2e.py [--base http://localhost:8080]
"""
import argparse
import asyncio
import sys

from playwright.async_api import async_playwright

ROUTES = [
    "/", "/buscar", "/estabelecimentos", "/mapa", "/planos", "/comparador",
    "/melhores-precos", "/colaborar", "/privacidade", "/fale-conosco",
    "/login", "/signup", "/resgatar", "/farmacias", "/favoritos",
]

VIEWPORTS = [("mobile", 390, 844), ("tablet", 768, 1024), ("desktop", 1440, 900)]

PROBE = r"""
() => {
  const globals = document.querySelectorAll('[data-site-header="global"]').length;
  const homeLinks = Array.from(document.querySelectorAll('a[href="/"]')).filter((a) => {
    const r = a.getBoundingClientRect();
    const st = getComputedStyle(a);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && r.top < 400;
  }).length;
  const stickyTop = Array.from(document.querySelectorAll('header, [data-sticky-bar]')).filter((el) => {
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return (st.position === 'sticky' || st.position === 'fixed') && r.top <= 8 && r.height > 24;
  }).length;
  return { globals, homeLinks, stickyTop };
}
"""


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    args = ap.parse_args()

    failures: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for name, w, h in VIEWPORTS:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            for route in ROUTES:
                await page.goto(f"{args.base}{route}", wait_until="networkidle")
                await page.wait_for_timeout(250)
                r = await page.evaluate(PROBE)
                tag = f"[{name}] {route}"
                if route == "/":
                    if r["globals"] != 1:
                        failures.append(f"{tag}: esperava 1 header global, achou {r['globals']}")
                else:
                    if r["globals"] != 0:
                        failures.append(f"{tag}: header global não deveria aparecer ({r['globals']})")
                    if r["homeLinks"] < 1:
                        failures.append(f"{tag}: sem link visível para a homepage no topo")
                    if r["stickyTop"] > 1:
                        failures.append(f"{tag}: {r['stickyTop']} barras fixas empilhadas no topo")
                print(f"{tag}: {r}")
            await ctx.close()
        await browser.close()

    if failures:
        print("\nFALHAS:")
        for f in failures:
            print(" •", f)
        return 1
    print("\nOK — header global apenas na homepage em todos os breakpoints.")
    return 0


sys.exit(asyncio.run(main()))
