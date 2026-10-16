"""Build reproducible WinUI .ico/.png assets from the approved connect+ visual language.
Run: python -m pip install Pillow && python apps/rs-screen-manager/winui/tools/generate_icon.py
Source design (editable): ../assets/icon-source.svg
"""
from pathlib import Path
from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
v = lambda n: int(n * 2)
draw.rounded_rectangle((v(20), v(20), v(492), v(492)), radius=v(112), fill="#007BFF", outline="#60BCFF", width=v(4))
# Open corners wrapping a diagonal link; designed for visual clarity at 16–256px.
def line(points, color, width):
    pts = [(v(x), v(y)) for x, y in points]
    w = v(width)
    draw.line(pts, fill=color, width=w, joint="curve")
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x-w//2, y-w//2, x+w//2, y+w//2), fill=color)

line([(132, 222), (132, 155), (134, 143), (143, 132), (161, 127),
      (338, 127), (358, 134), (370, 148), (371, 161), (371, 226)], "#FFFFFF", 35)
line([(379, 294), (379, 360), (370, 382), (348, 389),
      (168, 389), (146, 382), (140, 360), (140, 293)], "#FFFFFF", 35)
line([(206, 302), (306, 210)], "#C7ECFF", 37)

image = img.resize((512, 512), Image.Resampling.LANCZOS)
image.save(ASSETS / "rs-screen-manager.png", optimize=True)
image.save(ASSETS / "rs-screen-manager.ico", format="ICO",
           sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (96,96), (128,128), (256,256)])
print("Icon resources generated:", ASSETS)
