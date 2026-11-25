"""生成应用图标 build/icon.ico（多尺寸）与 build/icon.png。

只依赖 Pillow。图标风格与应用内一致：青色渐变圆角方块 + 白色 C。
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)

S = 512
R = 118

# 垂直渐变：#00c6f0 -> #0084a8
top = (0x00, 0xC6, 0xF0)
bottom = (0x00, 0x84, 0xA8)
grad = Image.new("RGB", (S, S))
d = ImageDraw.Draw(grad)
for y in range(S):
    t = y / (S - 1)
    d.line([(0, y), (S, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))

mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=R, fill=255)

icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
icon.paste(grad, (0, 0), mask)

# 顶部高光
gloss = Image.new("L", (S, S), 0)
gd = ImageDraw.Draw(gloss)
gd.rounded_rectangle([0, 0, S - 1, int(S * 0.46)], radius=R, fill=36)
gloss = gloss.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(28))
icon.paste(Image.new("RGBA", (S, S), (255, 255, 255, 255)), (0, 0), Image.composite(gloss, Image.new("L", (S, S), 0), mask))

# 白色 C
font = None
for name in ("segoeuib.ttf", "arialbd.ttf", "msyhbd.ttc"):
    p = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "Fonts", name)
    if os.path.exists(p):
        font = ImageFont.truetype(p, 320)
        break
if font is None:
    raise SystemExit("找不到可用字体")

draw = ImageDraw.Draw(icon)
box = draw.textbbox((0, 0), "C", font=font)
w, h = box[2] - box[0], box[3] - box[1]
draw.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1]), "C", font=font, fill=(255, 255, 255, 255))

icon.save(os.path.join(OUT, "icon.png"))
icon.save(os.path.join(OUT, "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icon written to", OUT)
