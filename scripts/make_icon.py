#!/usr/bin/env python3
"""生成市场卡片用的 180x180 图标：深色底 + 暖橙信封 + 蓝色「鲸」封蜡。

用法：python scripts/make_icon.py
产物：assets/icon-180.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "icon-180.png")
SIZE = 180
FONT_PATH = os.path.join(ROOT, "lib", "assets", "MaShanZheng-Regular.ttf")

BG = (22, 24, 27)
BG2 = (34, 30, 26)
ORANGE = (200, 129, 60)
ORANGE_SOFT = (150, 98, 48)
BLUE = (108, 168, 214)
PAPER = (222, 208, 178)


def radial_bg(size):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    # 左上暖橙夕照
    for i in range(int(size * 0.85), 0, -1):
        t = i / (size * 0.85)
        c = tuple(int(BG[j] + (BG2[j] - BG[j]) * (1 - t) ** 2) for j in range(3))
        d.ellipse([size * 0.12 - i, size * 0.06 - i, size * 0.12 + i, size * 0.06 + i], fill=c)
    return img


def main():
    img = radial_bg(SIZE).convert("RGBA")
    d = ImageDraw.Draw(img)

    # 信封轮廓
    ex0, ey0, ex1, ey1 = 22, 48, 158, 134
    d.rounded_rectangle([ex0, ey0, ex1, ey1], radius=7, outline=ORANGE, width=3)
    # 封盖折线
    d.line([ex0 + 4, ey0 + 4, (ex0 + ex1) // 2, ey0 + 44, ex1 - 4, ey0 + 4], fill=ORANGE, width=3, joint="curve")
    # 下缘浅色纸边
    d.line([ex0 + 3, ey1 - 3, (ex0 + ex1) // 2, ey0 + 52, ex1 - 3, ey1 - 3], fill=ORANGE_SOFT, width=2, joint="curve")

    # 蓝色封蜡 + 「鲸」字
    cx, cy, r = 90, 96, 25
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(38, 62, 92), outline=BLUE, width=2)
    font = ImageFont.truetype(FONT_PATH, 30) if os.path.exists(FONT_PATH) else ImageFont.load_default()
    txt = "鲸"
    box = d.textbbox((0, 0), txt, font=font)
    d.text((cx - (box[2] - box[0]) / 2 - box[0], cy - (box[3] - box[1]) / 2 - box[1]),
           txt, font=font, fill=BLUE)

    # 底部细线
    d.line([40, 150, 140, 150], fill=(70, 66, 60), width=1)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS).save(OUT, "PNG")
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
