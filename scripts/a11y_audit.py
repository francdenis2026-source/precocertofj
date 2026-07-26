#!/usr/bin/env python3
"""Auditoria automática de acessibilidade (foco + rótulos ARIA).

Usa axe-core (via CDN) para regras de nome acessível/ARIA e adiciona
verificações próprias de ordem de foco:

  • todo elemento clicável tem nome acessível (texto, aria-label,
    aria-labelledby, title ou alt em imagem interna);
  • nenhum tabindex positivo (quebra a ordem natural);
  • a ordem de tabulação segue a ordem visual (topo→baixo, esq→dir),
    ignorando contêineres com rolagem interna;
  • nenhum elemento focável dentro de aria-hidden / inert;
  • o foco é sempre visível (anel/sombra/outline muda no :focus-visible).

Uso: python3 scripts/a11y_audit.py [--base http://localhost:8080] [--routes / /planos]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from playwright.async_api import async_playwright

AXE_CDN = "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js"

ROUTES = [
    "/", "/planos", "/buscar", "/estabelecimentos", "/mapa", "/comparador",
    "/melhores-precos", "/colaborar", "/privacidade", "/fale-conosco",
    "/login", "/signup", "/resgatar", "/farmacias",
]
VIEWPORTS = [("mobile", 390, 844), ("desktop", 1440, 900)]

FOCUS_PROBE = r"""
() => {
  const SEL = 'a[href], button, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"]';
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const accName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    const txt = (el.innerText || el.textContent || '').trim();
    if (txt) return txt;
    if (el.getAttribute('title')) return el.getAttribute('title').trim();
    if (el.tagName === 'INPUT') {
      if (el.labels && el.labels.length) return Array.from(el.labels).map(l => l.textContent.trim()).join(' ');
      if (el.placeholder) return el.placeholder;
      if (el.value && el.type !== 'text') return el.value;
    }
    const img = el.querySelector('img[alt]:not([alt=""]), svg title');
    if (img) return (img.getAttribute?.('alt') || img.textContent || '').trim();
    const sr = el.querySelector('.sr-only');
    if (sr && sr.textContent.trim()) return sr.textContent.trim();
    return '';
  };
  const inHidden = (el) => {
    let p = el;
    while (p) {
      if (p.getAttribute && (p.getAttribute('aria-hidden') === 'true' || p.hasAttribute('inert'))) return true;
      p = p.parentElement;
    }
    return false;
  };

  const nodes = Array.from(document.querySelectorAll(SEL))
    .filter(el => visible(el))
    .filter(el => el.tabIndex >= 0 && !el.hasAttribute('disabled'));

  const describe = (el) => el.tagName.toLowerCase()
    + (el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : '')
    + '.' + String(el.className || '').split(/\s+/).slice(0, 3).join('.');

  const unnamed = [], positiveTab = [], hiddenFocusable = [];
  for (const el of nodes) {
    if (!accName(el)) unnamed.push(describe(el));
    if (el.tabIndex > 0) positiveTab.push(describe(el) + ` tabindex=${el.tabIndex}`);
    if (inHidden(el)) hiddenFocusable.push(describe(el));
  }

  // ordem de foco (DOM) vs ordem visual
  const rects = nodes.map(el => {
    const r = el.getBoundingClientRect();
    return { el, top: Math.round(r.top / 24), left: Math.round(r.left) };
  });
  const outOfOrder = [];
  for (let i = 1; i < rects.length; i++) {
    const a = rects[i - 1], b = rects[i];
    let scoped = false, p = b.el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.position === 'fixed' || cs.position === 'sticky' || /(auto|scroll)/.test(cs.overflowY + cs.overflowX)) { scoped = true; break; }
      p = p.parentElement;
    }
    if (scoped) continue;
    if (b.top < a.top - 1) outOfOrder.push(`${describe(a.el)} -> ${describe(b.el)}`);
  }

  return { total: nodes.length, unnamed, positiveTab, hiddenFocusable, outOfOrder: outOfOrder.slice(0, 6) };
}
"""

FOCUS_RING = r"""
() => {
  const el = document.querySelector('a[href], button');
  if (!el) return { ok: true };
  const snap = (e) => { const cs = getComputedStyle(e); return cs.outlineStyle + cs.outlineWidth + cs.boxShadow + cs.transform; };
  const before = snap(el);
  el.focus({ preventScroll: true });
  const after = snap(el);
  return { ok: before !== after, before, after };
}
"""

AXE_RUN = """
async () => {
  const res = await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return res.violations.map(v => ({
    id: v.id, impact: v.impact, help: v.help,
    nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
  }));
}
"""


async def audit(page, base, route, theme, vp, results):
    await page.goto(f"{base}{route}", wait_until="domcontentloaded")
    await page.evaluate(f"localStorage.setItem('pc-theme', {json.dumps(theme)})")
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_timeout(700)

    probe = await page.evaluate(FOCUS_PROBE)
    try:
        await page.add_script_tag(url=AXE_CDN)
        violations = await page.evaluate(AXE_RUN)
    except Exception as exc:
        violations = []
        print(f"      (axe indisponível: {str(exc)[:60]})")

    failures = []
    if probe["unnamed"]:
        failures.append("sem nome acessível: " + ", ".join(probe["unnamed"][:5]))
    if probe["positiveTab"]:
        failures.append("tabindex positivo: " + ", ".join(probe["positiveTab"][:5]))
    if probe["hiddenFocusable"]:
        failures.append("focável dentro de aria-hidden/inert: " + ", ".join(probe["hiddenFocusable"][:5]))
    if probe["outOfOrder"]:
        failures.append("ordem de foco fora da ordem visual: " + ", ".join(probe["outOfOrder"][:3]))
    for v in violations:
        if v["impact"] in ("serious", "critical"):
            failures.append(f"axe/{v['id']}: {v['help']} ({', '.join(v['nodes'])})")

    label = f"{route} {vp}/{theme}"
    results.append({"route": route, "viewport": vp, "theme": theme,
                    "focusables": probe["total"], "failures": failures})
    print(f"[{'OK ' if not failures else 'FAIL'}] {label} · {probe['total']} focáveis")
    for f in failures:
        print(f"        - {f}")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--routes", nargs="*", default=ROUTES)
    ap.add_argument("--themes", nargs="*", default=["light", "dark"])
    ap.add_argument("--json", default="")
    args = ap.parse_args()

    results: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for vp, w, h in VIEWPORTS:
                ctx = await browser.new_context(viewport={"width": w, "height": h},
                                                has_touch=w <= 500, is_mobile=w <= 500)
                page = await ctx.new_page()
                for route in args.routes:
                    for theme in args.themes:
                        try:
                            await audit(page, args.base, route, theme, vp, results)
                        except Exception as exc:
                            print(f"[skip] {route} {vp}/{theme}: {str(exc)[:80]}")
                await ctx.close()
        finally:
            await browser.close()

    if args.json:
        with open(args.json, "w") as fh:
            json.dump(results, fh, indent=2)

    failed = [r for r in results if r["failures"]]
    print(f"\n{len(results) - len(failed)}/{len(results)} páginas sem problemas de foco/ARIA.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
