#!/usr/bin/env python3
"""Regressão visual de estados interativos (hover / focus-visible / active).

Para cada rota, tema e breakpoint, coleta uma amostra de cards e CTAs e
compara os estilos computados nos três estados. Falha quando:

  • hover não produz nenhuma mudança visual (transform/sombra/cor/borda);
  • focus-visible não produz anel/elevação (paridade com hover);
  • o estado muda o layout (largura/altura do elemento variam > 1px);
  • o comportamento é inconsistente entre breakpoints (um breakpoint reage,
    outro não, para o mesmo seletor).

Uso:  python3 scripts/interaction_states_visual.py [--base http://localhost:8080]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from playwright.async_api import async_playwright

ROUTES = ["/", "/planos", "/buscar", "/estabelecimentos"]
THEMES = ("light", "dark")
BREAKPOINTS = [("mobile", 390, 844), ("tablet", 768, 1024), ("desktop", 1440, 900)]

SAMPLE = """
(max) => {
  const sel = 'a[href], button, [role="button"], .pc-tile, [data-testid]';
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 24 || r.height < 16) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') continue;
    const key = (el.tagName + '|' + (el.getAttribute('data-testid') || '') + '|' +
      String(el.className).split(/\\s+/).slice(0, 4).join('.'));
    if (seen.has(key)) continue;
    seen.add(key);
    el.setAttribute('data-istate-probe', String(out.length));
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}
"""

READ = """
(idx) => {
  const el = document.querySelector(`[data-istate-probe="${idx}"]`);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    transform: cs.transform,
    boxShadow: cs.boxShadow,
    background: cs.backgroundColor + '|' + cs.backgroundImage,
    color: cs.color,
    borderColor: cs.borderColor,
    outline: cs.outlineWidth + ' ' + cs.outlineColor + ' ' + cs.outlineStyle,
    opacity: cs.opacity,
    filter: cs.filter,
    w: Math.round(r.width * 100) / 100,
    h: Math.round(r.height * 100) / 100,
  };
}
"""

VISUAL_KEYS = (
    "transform", "boxShadow", "background", "color", "borderColor",
    "outline", "opacity", "filter",
)


def changed(a: dict, b: dict) -> list[str]:
    return [k for k in VISUAL_KEYS if a.get(k) != b.get(k)]


async def audit_page(page, base, route, theme, bp_name, results, max_nodes):
    await page.goto(f"{base}{route}", wait_until="domcontentloaded")
    await page.evaluate(f"localStorage.setItem('pc-theme', {json.dumps(theme)})")
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_timeout(700)

    keys = await page.evaluate(SAMPLE, max_nodes)
    for idx, key in enumerate(keys):
        loc = page.locator(f'[data-istate-probe="{idx}"]')
        try:
            idle = await page.evaluate(READ, idx)
            await loc.hover(timeout=1500)
            await page.wait_for_timeout(240)
            hover = await page.evaluate(READ, idx)
            await page.mouse.move(0, 0)
            await page.wait_for_timeout(200)
            await page.evaluate(
                "(i)=>{const e=document.querySelector(`[data-istate-probe=\"${i}\"]`);"
                "e.setAttribute('tabindex', e.tabIndex);e.focus({preventScroll:true});}",
                idx,
            )
            await page.keyboard.press("Shift+Tab")
            await page.keyboard.press("Tab")
            await page.wait_for_timeout(220)
            focus = await page.evaluate(READ, idx)
        except Exception as exc:  # elemento saiu do DOM / coberto
            results.append({
                "route": route, "theme": theme, "bp": bp_name, "el": key,
                "skipped": str(exc)[:80], "failures": [],
            })
            continue

        if not (idle and hover and focus):
            continue

        failures = []
        hover_delta = changed(idle, hover)
        focus_delta = changed(idle, focus)
        if not hover_delta:
            failures.append("hover sem retorno visual")
        if not focus_delta:
            failures.append("focus-visible sem retorno visual")
        for st, snap in (("hover", hover), ("focus", focus)):
            if abs(snap["w"] - idle["w"]) > 1 or abs(snap["h"] - idle["h"]) > 1:
                failures.append(
                    f"{st} altera layout ({idle['w']}x{idle['h']} -> {snap['w']}x{snap['h']})"
                )

        results.append({
            "route": route, "theme": theme, "bp": bp_name, "el": key,
            "hover_delta": hover_delta, "focus_delta": focus_delta,
            "failures": failures,
        })


def cross_breakpoint_check(results):
    """Mesmo seletor deve reagir em todos os breakpoints onde aparece."""
    issues = []
    by_key: dict[tuple[str, str], dict[str, bool]] = {}
    for r in results:
        if r.get("skipped"):
            continue
        k = (r["route"], r["el"])
        by_key.setdefault(k, {})[r["bp"]] = bool(r["hover_delta"]) and bool(r["focus_delta"])
    for (route, el), per_bp in by_key.items():
        if len(set(per_bp.values())) > 1:
            issues.append(f"{route} · {el}: inconsistente entre breakpoints {per_bp}")
    return issues


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--routes", nargs="*", default=ROUTES)
    ap.add_argument("--max-nodes", type=int, default=10)
    ap.add_argument("--json", default="")
    args = ap.parse_args()

    results: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for bp_name, w, h in BREAKPOINTS:
                ctx = await browser.new_context(
                    viewport={"width": w, "height": h}, has_touch=w <= 900
                )
                page = await ctx.new_page()
                for route in args.routes:
                    for theme in THEMES:
                        await audit_page(page, args.base, route, theme, bp_name,
                                         results, args.max_nodes)
                await ctx.close()
        finally:
            await browser.close()

    failed = [r for r in results if r["failures"]]
    for r in failed:
        print(f"[FAIL] {r['route']} {r['bp']}/{r['theme']} · {r['el']}")
        for f in r["failures"]:
            print(f"        - {f}")
    cross = cross_breakpoint_check(results)
    for c in cross:
        print(f"[FAIL] breakpoint drift · {c}")

    if args.json:
        with open(args.json, "w") as fh:
            json.dump(results, fh, indent=2)

    checked = len([r for r in results if not r.get("skipped")])
    print(f"\n{checked - len(failed)}/{checked} elementos com estados consistentes.")
    return 1 if (failed or cross) else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
