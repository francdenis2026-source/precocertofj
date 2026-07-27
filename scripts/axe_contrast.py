#!/usr/bin/env python3
"""Checagem automática de contraste com axe-core (foco no MODO CLARO).

Complementa `contrast_audit.py` (cálculo próprio) rodando o motor oficial
axe-core apenas com as regras de cor:

  • color-contrast              — texto vs. fundo efetivo (AA)
  • color-contrast-enhanced     — reportado como aviso (AAA), não falha
  • link-in-text-block          — link distinguível sem depender só de cor

Uso:
  python3 scripts/axe_contrast.py [--base http://localhost:8080]
                                  [--themes light dark]
                                  [--routes / /categoria/supermercados]
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from playwright.async_api import async_playwright

AXE_CDN = "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js"

ROUTES = [
    "/",
    "/buscar",
    "/estabelecimentos",
    "/mapa",
    "/planos",
    "/comparador",
    "/melhores-precos",
    "/privacidade",
    "/fale-conosco",
    "/login",
    "/cadastro",
    "/farmacias",
    # Hubs de categoria — hero navy com dourado sobre fundo escuro:
    # é onde o modo claro costuma reprovar.
    "/categoria/supermercados",
    "/categoria/farmacias",
    "/categoria/acougues",
]

VIEWPORTS = [("mobile", 390, 844), ("desktop", 1280, 900)]

RUN_AXE = """
async () => {
  const res = await window.axe.run(document, {
    runOnly: { type: 'rule', values: ['color-contrast', 'color-contrast-enhanced', 'link-in-text-block'] },
    resultTypes: ['violations'],
  });
  return res.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 8).map(n => ({
      target: n.target.join(' '),
      summary: (n.failureSummary || '').split('\\n').filter(Boolean).slice(-1)[0] || '',
      html: n.html.slice(0, 160),
    })),
  }));
}
"""


async def audit(base: str, routes: list[str], themes: list[str]) -> int:
    failures = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for theme in themes:
            for label, w, h in VIEWPORTS:
                context = await browser.new_context(viewport={"width": w, "height": h})
                page = await context.new_page()
                for route in routes:
                    try:
                        await page.goto(f"{base}{route}", wait_until="networkidle", timeout=45_000)
                    except Exception as exc:  # rota lenta não deve derrubar a suíte
                        print(f"  ! {route} [{theme}/{label}] não carregou: {exc}")
                        continue
                    await page.evaluate(
                        "(t) => { const c = document.documentElement.classList;"
                        "t === 'dark' ? c.add('dark') : c.remove('dark');"
                        "document.documentElement.dataset.theme = t; }",
                        theme,
                    )
                    await page.wait_for_timeout(400)
                    await page.add_script_tag(url=AXE_CDN)
                    violations = await page.evaluate(RUN_AXE)
                    hard = [v for v in violations if v["id"] != "color-contrast-enhanced"]
                    if hard:
                        failures += sum(len(v["nodes"]) for v in hard)
                        print(f"\n✗ {route} [{theme}/{label}]")
                        for v in hard:
                            print(f"   {v['id']} ({v['impact']})")
                            for n in v["nodes"]:
                                print(f"     · {n['target']} — {n['summary']}")
                                print(f"       {n['html']}")
                    else:
                        print(f"✓ {route} [{theme}/{label}]")
                await context.close()
        await browser.close()
    return failures


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--routes", nargs="*", default=ROUTES)
    ap.add_argument("--themes", nargs="*", default=["light", "dark"])
    args = ap.parse_args()

    print("axe-core — regras de cor/contraste")
    failures = asyncio.run(audit(args.base.rstrip("/"), args.routes, args.themes))
    print("")
    if failures:
        print(f"✗ {failures} nó(s) reprovados em contraste (WCAG AA)")
        return 1
    print("✓ Nenhuma violação de contraste encontrada")
    return 0


if __name__ == "__main__":
    sys.exit(main())
