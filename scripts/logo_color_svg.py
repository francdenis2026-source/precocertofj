"""Gera versões SVG coloridas (tema claro e escuro) das logomarcas.

Cada master `public/logos/<slug>-v6.webp` é quantizado em poucas cores, e cada
camada de cor é traçada com potrace, resultando num SVG vetorial fiel à marca.
A variante `-dark` clareia tintas escuras para manter contraste sobre navy.
"""

from __future__ import annotations

import colorsys
import pathlib

import numpy as np
import potrace
from PIL import Image

LOGOS = pathlib.Path("public/logos")
SLUGS = [
    "central-super",
    "doce-dia",
    "facem",
    "feijoense",
    "parceirao",
    "reboucas",
    "recanto",
    "ultra",
    "vanderley",
]
MAX_COLORS = 6
MIN_LAYER_PIXELS = 40


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = (c / 255 for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def lighten_for_dark(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
    """Garante que a tinta tenha luminância suficiente sobre fundo navy."""
    lum = luminance(rgb)
    if lum >= 0.55:
        return rgb
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.12:  # cinza/preto -> quase branco
        target = 0.94
    else:
        target = max(0.66, min(0.82, l + 0.42))
    r2, g2, b2 = colorsys.hls_to_rgb(h, target, min(1.0, s * 1.05))
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255))


def trace(mask: np.ndarray) -> str:
    bmp = potrace.Bitmap(mask.astype(bool))
    path = bmp.trace(turdsize=2, alphamax=1.0, opticurve=1, opttolerance=0.2)
    out: list[str] = []
    for curve in path:
        sx, sy = curve.start_point
        d = [f"M{sx:.2f} {sy:.2f}"]
        for seg in curve:
            if seg.is_corner:
                cx, cy = seg.c
                ex, ey = seg.end_point
                d.append(f"L{cx:.2f} {cy:.2f}L{ex:.2f} {ey:.2f}")
            else:
                c1x, c1y = seg.c1
                c2x, c2y = seg.c2
                ex, ey = seg.end_point
                d.append(f"C{c1x:.2f} {c1y:.2f} {c2x:.2f} {c2y:.2f} {ex:.2f} {ey:.2f}")
        d.append("Z")
        out.append("".join(d))
    return " ".join(out)


def build(slug: str) -> None:
    src = LOGOS / f"{slug}-v6.webp"
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    scale = 512 / max(w, h)
    if scale < 1:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        w, h = img.size

    arr = np.array(img)
    alpha = arr[:, :, 3]
    rgb = arr[:, :, :3]

    opaque = alpha > 128
    # fundo branco também é tratado como vazio (marcas vêm com fundo claro)
    lum = rgb.astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    ink = opaque & (lum < 244)
    if ink.sum() < MIN_LAYER_PIXELS:
        ink = opaque

    flat = Image.fromarray(np.where(ink[:, :, None], rgb, 255).astype(np.uint8), "RGB")
    quant = flat.quantize(colors=MAX_COLORS, method=Image.MEDIANCUT, dither=Image.NONE)
    idx = np.array(quant)
    palette = np.array(quant.getpalette()[: MAX_COLORS * 3]).reshape(-1, 3)

    layers: list[tuple[tuple[int, int, int], str]] = []
    for i, color in enumerate(palette):
        mask = (idx == i) & ink
        if mask.sum() < MIN_LAYER_PIXELS:
            continue
        c = (int(color[0]), int(color[1]), int(color[2]))
        if luminance(c) > 0.95:
            continue
        d = trace(mask)
        if d:
            layers.append((c, d))

    # camadas escuras por último (traços/contornos ficam por cima)
    layers.sort(key=lambda item: -luminance(item[0]))

    for variant in ("light", "dark"):
        paths = []
        for c, d in layers:
            col = lighten_for_dark(c) if variant == "dark" else c
            paths.append(f'<path fill="#{col[0]:02x}{col[1]:02x}{col[2]:02x}" d="{d}"/>')
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img" shape-rendering="geometricPrecision">'
            + "".join(paths)
            + "</svg>"
        )
        name = f"{slug}-color.svg" if variant == "light" else f"{slug}-color-dark.svg"
        (LOGOS / name).write_text(svg, encoding="utf-8")
        print(f"{name}: {len(layers)} camadas, {len(svg) // 1024} KB")


if __name__ == "__main__":
    for s in SLUGS:
        build(s)
