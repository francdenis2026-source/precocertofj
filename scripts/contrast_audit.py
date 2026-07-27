#!/usr/bin/env python3
"""
Auditoria automática de contraste (WCAG AA) — todas as páginas públicas.

Percorre cada rota nos dois temas (claro/escuro) e em dois viewports
(mobile 390x844 e desktop 1280x900), calcula a razão de contraste de cada
nó de texto visível contra o fundo efetivo (compondo camadas translúcidas)
e reporta:
  • FAIL de contraste (< 4.5:1 para texto normal, < 3:1 para texto grande)
  • clipping horizontal (scrollWidth > clientWidth em elementos de texto)

Uso:  python3 scripts/contrast_audit.py [--base http://localhost:8080]
"""
import argparse
import asyncio
import json
import sys

ROUTES = [
    "/", "/buscar", "/estabelecimentos", "/mapa", "/planos", "/comparador",
    "/melhores-precos", "/colaborar", "/privacidade", "/fale-conosco",
    "/login", "/cadastro", "/resgatar", "/farmacias",
]

VIEWPORTS = [("mobile", 390, 844), ("desktop", 1280, 900)]
THEMES = ["light", "dark"]

PROBE = r"""
() => {
  const oklabToRgb = (L, a, b, alpha) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    const enc = (v) => {
      const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
      return Math.min(255, Math.max(0, c * 255));
    };
    return { r: enc(lr), g: enc(lg), b: enc(lb), a: alpha };
  };

  const parse = (c) => {
    if (!c) return null;
    if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    let m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    const num = (t, ref) => (t.endsWith('%') ? (parseFloat(t) / 100) * ref : parseFloat(t));
    m = c.match(/^oklch\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean);
      const L = num(p[0], 1), C = num(p[1], 0.4), H = parseFloat(p[2]) || 0;
      const alpha = p.length > 3 ? num(p[3], 1) : 1;
      const h = (H * Math.PI) / 180;
      return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h), alpha);
    }
    m = c.match(/^oklab\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean);
      const alpha = p.length > 3 ? num(p[3], 1) : 1;
      return oklabToRgb(num(p[0], 1), num(p[1], 0.4), num(p[2], 0.4), alpha);
    }
    return null;
  };

  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const bgOf = (el) => {
    let acc = null, node = el;
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // imagem/gradiente: pular
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) acc = acc ? over(acc, c) : c;
      if (acc && acc.a >= 0.999) return acc;
      node = node.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor)
      || { r: 255, g: 255, b: 255, a: 1 };
    const base = root.a >= 0.999 ? root : { r: 255, g: 255, b: 255, a: 1 };
    if (!acc) return base;
    return over(acc, base);

  };

  const out = [];
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const direct = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1
    );
    if (!direct) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.1) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.bottom < 0 || rect.top > 6000) continue;

    // Rótulos sobrepostos a mídia (position absolute/fixed sem fundo próprio ou
    // com text-shadow) não podem ser medidos contra o fundo do documento.
    let overlay = cs.textShadow !== 'none';
    let n = el, depth = 0;
    while (n && depth < 4 && !overlay) {
      const ncs = getComputedStyle(n);
      if (ncs.position === 'absolute' || ncs.position === 'fixed') {
        const own = parse(ncs.backgroundColor);
        if (!own || own.a < 0.9) overlay = true;
      }
      n = n.parentElement;
      depth += 1;
    }

    // Clipping real: overflow escondido cortando o texto (ignora truncate com
    // reticências, que é intencional).
    const clipped = el.scrollWidth > el.clientWidth + 2
      && cs.overflow !== 'visible'
      && cs.textOverflow !== 'ellipsis'
      && !/auto|scroll/.test(cs.overflowX);


    const fgRaw = parse(cs.color);
    const bg = bgOf(el);
    let cr = null;
    if (fgRaw && bg) {
      const fg = over(fgRaw, bg);
      cr = Math.round(ratio(fg, bg) * 100) / 100;
    }
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if ((cr !== null && !overlay && cr < need) || clipped) {
      el.setAttribute('data-ca-probe', String(out.length));
      out.push({
        probe: out.length,
        text: el.textContent.trim().slice(0, 40),
        cr, need, clipped,
        size: Math.round(size * 10) / 10,
        color: cs.color,
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 70),
      });
    }
  }
  return out;
}
"""


def _srgb_lum(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def pixel_contrast(png_bytes):
    """Contraste REAL medido nos pixels renderizados do elemento.

    Elimina falsos positivos da composição CSS (gradientes, camadas,
    backdrop-filter) medindo o texto contra o fundo efetivamente pintado.
    """
    import io
    from collections import Counter
    from PIL import Image

    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    if img.width < 2 or img.height < 2:
        return None
    if img.width * img.height > 200_000:
        img = img.resize((min(img.width, 400), min(img.height, 200)))
    px = list(img.convert("RGB").tobytes())
    px = [tuple(px[i:i + 3]) for i in range(0, len(px), 3)]
    quant = [(p[0] // 8 * 8, p[1] // 8 * 8, p[2] // 8 * 8) for p in px]
    counts = Counter(quant)
    bg = counts.most_common(1)[0][0]
    bg_l = _srgb_lum(bg)
    # texto = pixel com maior distância de luminância em relação ao fundo,
    # ignorando 2% de outliers (anti-aliasing / bordas)
    lums = sorted(_srgb_lum(p) for p in quant)
    lo = lums[int(len(lums) * 0.02)]
    hi = lums[int(len(lums) * 0.98)]
    fg_l = lo if abs(lo - bg_l) > abs(hi - bg_l) else hi
    a, b = max(fg_l, bg_l), min(fg_l, bg_l)
    return round((a + 0.05) / (b + 0.05), 2)



async def main() -> int:
    from playwright.async_api import async_playwright

    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8080")
    ap.add_argument("--routes", nargs="*", default=ROUTES)
    ap.add_argument("--json", default=None)
    ap.add_argument("--only-mobile", action="store_true")
    args = ap.parse_args()

    failures = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        viewports = [v for v in VIEWPORTS if v[0] == "mobile"] if args.only_mobile else VIEWPORTS
        for vp_name, w, h in viewports:
            ctx = await browser.new_context(viewport={"width": w, "height": h})
            page = await ctx.new_page()
            await page.goto(args.base, wait_until="domcontentloaded")
            for theme in THEMES:
                await page.evaluate(f"localStorage.setItem('pc-theme', {json.dumps(theme)})")
                for route in args.routes:
                    try:
                        await page.goto(args.base + route, wait_until="networkidle", timeout=45000)
                    except Exception as exc:  # noqa: BLE001
                        print(f"[skip] {route} ({vp_name}/{theme}): {exc}")
                        continue
                    await page.wait_for_timeout(900)
                    issues = await page.evaluate(PROBE)
                    confirmed = []
                    for it in issues:
                        it.update(route=route, viewport=vp_name, theme=theme)
                        if it["clipped"]:
                            confirmed.append(it)
                            continue
                        # verificação por pixel: descarta falsos positivos da
                        # composição CSS (gradientes/backdrop-filter/camadas)
                        try:
                            shot = await page.locator(
                                f'[data-ca-probe="{it["probe"]}"]'
                            ).screenshot(timeout=4000)
                            real = pixel_contrast(shot)
                        except Exception:  # noqa: BLE001
                            real = None
                        it["pixel_cr"] = real
                        if real is None or real < it["need"]:
                            confirmed.append(it)
                    failures.extend(confirmed)
            await ctx.close()
        await browser.close()

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(failures, fh, ensure_ascii=False, indent=2)

    print(f"\n{len(failures)} ocorrência(s) confirmada(s) por pixel")
    for f in failures:
        kind = "CLIP" if f["clipped"] else "CONTRAST"
        print(
            f"  [{kind}] {f['route']} {f['viewport']}/{f['theme']} "
            f"cr={f['cr']} pixel={f.get('pixel_cr')} need={f['need']} size={f['size']} "
            f"color={f['color']} :: {f['text']!r} :: {f['cls']}"
        )
    return 1 if failures else 0



if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
