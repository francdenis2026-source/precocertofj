"""Gera versões SVG coloridas (tema claro e escuro) das logomarcas.

Reutiliza o traçado vetorial já validado em `<slug>-mono.svg` e o pinta com a
cor dominante real da marca (extraída do master em alta definição):

- `<slug>-color.svg`      → cor da marca, para fundos claros
- `<slug>-color-dark.svg` → mesma cor com brilho ajustado para fundos navy

Assim o vetor continua nítido em qualquer tamanho e o contraste fica correto
nos dois temas.
"""

from __future__ import annotations

import colorsys
import pathlib
import re

import numpy as np
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

# contraste mínimo alvo (WCAG AA para elementos gráficos) contra cada fundo
LIGHT_BG = (255, 255, 255)
DARK_BG = (15, 27, 61)  # --pc-navy


def rel_lum(rgb: tuple[int, int, int]) -> float:
    def ch(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def shift_lightness(rgb: tuple[int, int, int], target_l: float) -> tuple[int, int, int]:
    h, _, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    r, g, b = colorsys.hls_to_rgb(h, max(0.0, min(1.0, target_l)), s)
    return (round(r * 255), round(g * 255), round(b * 255))


def fit_contrast(
    rgb: tuple[int, int, int], bg: tuple[int, int, int], minimum: float, direction: int
) -> tuple[int, int, int]:
    """Ajusta a luminosidade da cor até atingir o contraste mínimo com o fundo."""
    if contrast(rgb, bg) >= minimum:
        return rgb
    _, l, _ = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    best = rgb
    for step in range(1, 41):
        cand = shift_lightness(rgb, l + direction * step * 0.02)
        best = cand
        if contrast(cand, bg) >= minimum:
            return cand
    return best


def brand_color(slug: str) -> tuple[int, int, int]:
    """Cor dominante da tinta da marca, ignorando o papel branco."""
    img = Image.open(LOGOS / f"{slug}-v6.webp").convert("RGBA")
    img.thumbnail((256, 256), Image.LANCZOS)
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

    ink = (alpha > 128) & (lum < 240)
    colorful = ink & (sat > 0.25) & (lum > 20)
    pool = rgb[colorful] if colorful.sum() > 200 else rgb[ink]
    if pool.size == 0:
        return (15, 27, 61)

    # cor modal via quantização grosseira, mais estável que a média
    q = (pool // 24).astype(np.int32)
    keys, counts = np.unique(q, axis=0, return_counts=True)
    dominant = keys[counts.argmax()]
    members = pool[np.all(q == dominant, axis=1)]
    mean = members.mean(axis=0)
    return (int(round(mean[0])), int(round(mean[1])), int(round(mean[2])))


def hexc(rgb: tuple[int, int, int]) -> str:
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


def build(slug: str) -> None:
    mono = (LOGOS / f"{slug}-mono.svg").read_text(encoding="utf-8")
    base = brand_color(slug)

    light = fit_contrast(base, LIGHT_BG, 3.5, -1)
    dark = fit_contrast(base, DARK_BG, 4.0, +1)

    for name, color in ((f"{slug}-color.svg", light), (f"{slug}-color-dark.svg", dark)):
        svg = re.sub(r'\sfill="currentColor"', f' fill="{hexc(color)}"', mono, count=1)
        if 'fill="' not in svg.split(">", 1)[0]:
            svg = svg.replace("<svg ", f'<svg fill="{hexc(color)}" ', 1)
        (LOGOS / name).write_text(svg, encoding="utf-8")

    print(
        f"{slug}: base {hexc(base)} → claro {hexc(light)} "
        f"({contrast(light, LIGHT_BG):.1f}:1) | escuro {hexc(dark)} "
        f"({contrast(dark, DARK_BG):.1f}:1)"
    )


if __name__ == "__main__":
    for s in SLUGS:
        build(s)
