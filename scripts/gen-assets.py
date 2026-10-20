#!/usr/bin/env python3
"""
Gera os **artefatos de imagem** do app a partir das fontes em `docs/`:

- `build/icon.png`  ← `docs/icone.png`   (ícone do app, 512×512)
- `public/splash.png` ← `docs/splash.png` (splash de abertura)

Por que um script: as fontes em `docs/` são o arquivo **mestre** (o usuário
troca a arte lá); os arquivos do app são derivados e não devem ser editados à
mão. O mesmo padrão das tabelas geradas (`scripts/gen-*-tables.mjs`).

Requer Python 3 + Pillow:

    python3 -m pip install --user Pillow
    python3 scripts/gen-assets.py

Regras:

- **Ícone**: recorta o centro em quadrado e reduz para 512×512 (o que o
  `electron-builder` usa para gerar os ícones de cada plataforma).
- **Splash**: a janela do splash tem **a proporção da imagem** (ver
  `SPLASH` em `src/main/index.ts`); a arte é gerada em 4/3 desse tamanho
  (fator HiDPI) para ficar nítida sem pesar o boot.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# Ícone do app: 512×512 (mesmo formato que o `electron-builder` espera).
ICON_SIZE = 512

# Splash: a largura da janela e o fator de escala da arte (HiDPI).
SPLASH_WIDTH = 738
SPLASH_SCALE = 4 / 3


def center_square(image: Image.Image) -> Image.Image:
    """Recorta o **centro** em quadrado (sem distorcer a arte)."""
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side))


def gen_icon() -> None:
    source = Image.open(ROOT / "docs" / "icone.png").convert("RGBA")
    icon = center_square(source).resize(
        (ICON_SIZE, ICON_SIZE), Image.LANCZOS
    )
    out = ROOT / "build" / "icon.png"
    icon.save(out, "PNG", optimize=True)
    print(f"{out.relative_to(ROOT)} — {ICON_SIZE}×{ICON_SIZE}")


def gen_splash() -> Image.Image:
    source = Image.open(ROOT / "docs" / "splash.png").convert("RGB")
    width = round(SPLASH_WIDTH * SPLASH_SCALE)
    height = round(source.height * (width / source.width))
    splash = source.resize((width, height), Image.LANCZOS)
    out = ROOT / "public" / "splash.png"
    splash.save(out, "PNG", optimize=True)
    print(
        f"{out.relative_to(ROOT)} — {width}×{height} "
        f"(janela {SPLASH_WIDTH}×{round(height / SPLASH_SCALE)})"
    )
    return splash


if __name__ == "__main__":
    gen_icon()
    gen_splash()
