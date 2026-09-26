#!/usr/bin/env python3
"""NG Academy asset builder: logo.png + ng-tiles.png (tileset).

Palette derived from the school logo: light azure + black + white,
on warm classroom / marble / wood world materials.
Run from repo root or from this folder:  python3 maps/school/tools/build_assets.py
"""
import math
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))
os.makedirs(ASSETS, exist_ok=True)

# ---------- palette ----------
NG_BLUE = (95, 180, 232)
NG_BLUE_D = (52, 132, 190)
NG_NAVY = (30, 70, 100)
INK = (15, 19, 24)
WHITE = (255, 255, 255)
CREAM = (252, 250, 245)
FLOOR_C = (239, 231, 217)
FLOOR_M = (240, 238, 233)
PARQUET = (169, 116, 79)
CARPET = (142, 59, 52)
WOOD = (139, 94, 60)
WOOD_D = (101, 66, 40)
LOBBY = (232, 224, 208)
GRASS = (127, 176, 105)
GRASS_D = (108, 156, 88)
PATH = (199, 193, 181)
COURT = (214, 210, 200)
ASPH = (85, 89, 95)
SIDE = (201, 203, 198)
RUBBER_G = (94, 158, 90)
RUBBER_B = (79, 168, 224)
STAGE = (101, 66, 40)
MOSAIC = (214, 228, 240)
WALL_CAP = (62, 70, 80)
WALL_FACE = (237, 233, 227)
BASE = (169, 165, 160)
GLASS = (205, 232, 246)
GLASS_D = (150, 195, 225)
BRASS = (200, 155, 60)
CHALK = (52, 110, 82)
CORK = (176, 132, 86)
# Club room palette (bright & modern, not too childish)
AMBER = (228, 165, 74); AMBER_D = (185, 128, 44)
TEAL = (63, 163, 156); TEAL_D = (40, 118, 112)
LILAC = (142, 124, 195); LILAC_D = (102, 86, 158)
CORAL = (224, 112, 92); CORAL_D = (176, 76, 58)

# ============================================================
# 1) LOGO — owl with graduation cap in a blue ring (SVG-ish PIL)
# ============================================================
def build_logo():
    S = 2048          # supersample
    s = S / 512.0     # design coords are 512-based
    img = Image.new("RGB", (S, S), WHITE)
    d = ImageDraw.Draw(img)

    def P(*pts):      # scale points
        return [(x * s, y * s) for x, y in pts]

    def line(pts, w, fill):
        d.line(P(*pts), fill=fill, width=int(w * s), joint="curve")
        # round caps
        r = w * s / 2
        for x, y in pts:
            d.ellipse([x * s - r, y * s - r, x * s + r, y * s + r], fill=fill)

    def circ(cx, cy, r, outline=None, fill=None, w=1):
        if outline:
            d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s],
                      outline=outline, width=int(w * s))
        if fill:
            d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=fill)

    # --- ring ---
    circ(256, 256, 232, outline=NG_BLUE, w=15)

    # --- graduation cap (black): diamond + scalloped cake base ---
    d.polygon(P((256, 58), (438, 128), (256, 198), (74, 128)), fill=INK)
    # base: trapezoid with scalloped (3-bump) bottom edge
    base = [(140, 166), (372, 166), (372, 232)]
    for t in range(0, 61):
        u = t / 60
        x = 372 + (140 - 372) * u
        y = 232 + 16 * math.sin(math.pi * ((u * 3) % 1.0))
        base.append((x, y))
    base += [(140, 232)]
    d.polygon(P(*base), fill=INK)

    # --- owl face (azure strokes) ---
    bw = 15  # stroke

    # heart face: two lobe arcs meeting at the dip, then straight sides + chin V
    L = (144, 238, 268, 362)   # left lobe circle box (center 206,300 r62)
    R = (256, 238, 380, 362)   # right lobe circle box (center 318? -> 306,300 r62)
    R = (244, 238, 368, 362)   # center (306,300) r62
    # top arcs: left from 180deg (leftmost) over top to dip angle 324deg
    d.arc([v * s for v in L], 180, 324, fill=NG_BLUE, width=int(bw * s))
    d.arc([v * s for v in R], 216, 360, fill=NG_BLUE, width=int(bw * s))
    # sides + chin
    line([(144, 300), (126, 416)], bw, NG_BLUE)
    line([(368, 300), (386, 416)], bw, NG_BLUE)
    line([(126, 416), (256, 472)], bw, NG_BLUE)
    line([(386, 416), (256, 472)], bw, NG_BLUE)

    # eyes: solid azure circles
    circ(206, 314, 28, fill=NG_BLUE)
    circ(306, 314, 28, fill=NG_BLUE)

    # beak: short vertical stroke
    line([(256, 334), (256, 368)], 11, NG_BLUE)

    # smile patch: rounded rect (white fill, blue border) with smile arc
    d.rounded_rectangle([214 * s, 384 * s, 298 * s, 440 * s], radius=20 * s,
                        fill=WHITE, outline=NG_BLUE, width=int(11 * s))
    arc_pts = [(232, 408), (244, 420), (256, 423), (268, 420), (280, 408)]
    line(arc_pts, 8, NG_BLUE)

    out = img.resize((512, 512), Image.LANCZOS)
    out.save(os.path.join(ASSETS, "logo.png"))
    out.resize((128, 128), Image.LANCZOS).save(os.path.join(ASSETS, "logo-128.png"))
    print("logo.png + logo-128.png written")
    return out


# ============================================================
# 2) TILESET — 128px tiles (SS=4) downscaled to 32px, 16 cols
# ============================================================
T, SS = 32, 4
TW = T * SS  # 128
COLS = 16
ORDER = []            # (name, drawer)
def tile(name):
    def deco(fn):
        ORDER.append((name, fn))
        return fn
    return deco

def speckle(d, box, color, n, r=2):
    import random
    rng = random.Random(hash(box) & 0xffff)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x = rng.randint(x0, x1); y = rng.randint(y0, y1)
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)

def floor_plain(fill, grid=None):
    def fn(d):
        d.rectangle([0, 0, TW, TW], fill=fill)
        if grid:
            for x in range(0, TW, TW // 4):
                d.line([(x, 0), (x, TW)], fill=grid, width=1)
            for y in range(0, TW, TW // 4):
                d.line([(0, y), (TW, y)], fill=grid, width=1)
        speckle(d, (2, 2, TW - 2, TW - 2), tuple(min(255, c + 8) for c in fill), 26, 2)
    return fn

@tile("floor_class")
def _(d): floor_plain(FLOOR_C, (228, 218, 200))(d)

@tile("floor_corr")
def _(d):
    floor_plain(FLOOR_M)(d)
    for i in range(3):
        d.arc([10 + i * 30, 20 + i * 18, 60 + i * 30, 60 + i * 18], 200, 340, fill=(225, 222, 215), width=2)

@tile("floor_parquet")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=PARQUET)
    for row in range(4):
        y = row * TW // 4
        d.line([(0, y), (TW, y)], fill=WOOD_D, width=2)
        off = (row % 2) * TW // 6
        for x in range(off, TW, TW // 3):
            d.line([(x, y), (x, y + TW // 4)], fill=WOOD_D, width=2)

@tile("floor_carpet")
def _(d):
    floor_plain(CARPET)(d)
    d.rectangle([6, 6, TW - 6, TW - 6], outline=(120, 46, 42), width=2)

@tile("floor_wood")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=WOOD)
    for row in range(2):
        y = row * TW // 2
        d.line([(0, y), (TW, y)], fill=WOOD_D, width=2)
    d.line([(TW // 2, 0), (TW // 2, TW)], fill=WOOD_D, width=2)

@tile("floor_lobby")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=LOBBY)
    d.polygon([(TW // 2, 4), (TW - 4, TW // 2), (TW // 2, TW - 4), (4, TW // 2)], outline=BRASS, width=2)
    speckle(d, (2, 2, TW - 2, TW - 2), (245, 240, 230), 18, 2)

@tile("floor_grass")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=GRASS)
    speckle(d, (2, 2, TW - 2, TW - 2), GRASS_D, 30, 2)
    speckle(d, (2, 2, TW - 2, TW - 2), (150, 195, 130), 12, 1)

@tile("floor_path")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=PATH)
    d.line([(0, TW // 2), (TW, TW // 2)], fill=(180, 174, 162), width=2)
    d.rectangle([0, 0, TW - 1, TW - 1], outline=(178, 172, 160), width=1)

@tile("floor_court")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=COURT)
    d.rectangle([0, 0, TW // 2 - 1, TW // 2 - 1], outline=(190, 186, 176), width=1)
    d.rectangle([TW // 2, TW // 2, TW - 1, TW - 1], outline=(190, 186, 176), width=1)

@tile("floor_asphalt")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=ASPH)
    speckle(d, (2, 2, TW - 2, TW - 2), (95, 99, 105), 24, 2)

@tile("floor_rubber_g")
def _(d): floor_plain(RUBBER_G)(d)
@tile("floor_rubber_b")
def _(d): floor_plain(RUBBER_B)(d)

@tile("floor_stage")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=STAGE)
    for x in range(0, TW, TW // 3):
        d.line([(x, 0), (x, TW)], fill=(80, 50, 30), width=2)
    d.rectangle([0, 0, TW - 1, 4], fill=(220, 170, 90))

@tile("floor_mosaic")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=MOSAIC)
    for cx, cy in [(TW // 4, TW // 4), (3 * TW // 4, 3 * TW // 4)]:
        d.polygon([(cx, cy - 8), (cx + 8, cy), (cx, cy + 8), (cx - 8, cy)], fill=NG_BLUE_D)
    d.rectangle([0, 0, TW - 1, TW - 1], outline=(180, 205, 225), width=1)

@tile("floor_service")
def _(d): floor_plain((184, 186, 181), (170, 172, 167))(d)

# ---- street extras (asphalt markings) ----
@tile("street_dash")
def _(d):
    floor_plain(ASPH)(d)
    d.rectangle([8, TW // 2 - 3, TW - 8, TW // 2 + 3], fill=(235, 235, 230))

@tile("street_cross")
def _(d):
    floor_plain(ASPH)(d)
    d.rectangle([10, 0, 22, TW], fill=(235, 235, 230))

@tile("sidewalk")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=SIDE)
    d.rectangle([0, 0, TW - 1, TW - 1], outline=(185, 187, 182), width=1)
    d.line([(0, TW // 2), (TW, TW // 2)], fill=(185, 187, 182), width=1)

@tile("park_bay")
def _(d):
    floor_plain(ASPH)(d)
    d.line([(0, 0), (0, TW)], fill=(235, 235, 230), width=3)

# ---- walls: one-tile convention = dark cap top + face + baseboard ----
def wall_base(face=WALL_FACE, cap=WALL_CAP, base=BASE, shadow=True):
    def fn(d):
        d.rectangle([0, 0, TW, TW], fill=face)
        d.rectangle([0, 0, TW, 42], fill=cap)             # roof/cap
        d.rectangle([0, 42, TW, 48], fill=tuple(c - 25 for c in cap))  # rim shadow
        d.rectangle([0, TW - 22, TW, TW], fill=base)      # baseboard
        d.rectangle([0, TW - 26, TW, TW - 22], fill=tuple(c - 18 for c in face))
        if shadow:
            d.rectangle([0, 0, 4, TW], fill=tuple(max(0, c - 14) for c in face))
            d.rectangle([TW - 4, 0, TW, TW], fill=tuple(max(0, c - 14) for c in face))
    return fn

@tile("wall")
def _(d): wall_base()(d)

@tile("wall_win")
def _(d):
    wall_base()(d)
    d.rectangle([30, 52, TW - 30, TW - 30], fill=GLASS, outline=NG_NAVY, width=3)
    d.line([(36, 58), (TW - 36, 58)], fill=WHITE, width=3)
    d.line([(TW // 2, 52), (TW // 2, TW - 30)], fill=NG_NAVY, width=2)

@tile("wall_win_pan")
def _(d):
    """Director panorama window — wider glass."""
    wall_base(face=(232, 240, 246))(d)
    d.rectangle([8, 50, TW - 8, TW - 26], fill=GLASS, outline=NG_NAVY, width=3)
    d.line([(14, 56), (TW - 14, 56)], fill=WHITE, width=4)
    d.line([(TW // 2, 50), (TW // 2, TW - 26)], fill=NG_NAVY, width=2)

@tile("wall_door")
def _(d):
    wall_base()(d)
    d.rectangle([10, 44, TW - 10, TW - 20], fill=WOOD, outline=WOOD_D, width=3)
    d.line([(TW // 2, 44), (TW // 2, TW - 20)], fill=WOOD_D, width=3)
    d.ellipse([TW // 2 + 8, TW // 2 + 4, TW // 2 + 16, TW // 2 + 12], fill=BRASS)

@tile("wall_door_glass")
def _(d):
    wall_base()(d)
    d.rectangle([6, 44, TW - 6, TW - 20], fill=GLASS, outline=NG_NAVY, width=3)
    d.line([(TW // 2, 44), (TW // 2, TW - 20)], fill=NG_NAVY, width=3)
    d.rectangle([10, 50, TW // 2 - 4, 84], outline=WHITE, width=2)
    d.rectangle([TW // 2 + 4, 50, TW - 10, 84], outline=WHITE, width=2)

@tile("wall_board")
def _(d):
    wall_base()(d)
    d.rectangle([8, 50, TW - 8, TW - 24], fill=CHALK, outline=WOOD_D, width=3)
    d.line([(12, 60), (TW - 20, 60)], fill=(210, 230, 215), width=2)
    d.line([(12, 72), (TW - 30, 72)], fill=(210, 230, 215), width=2)

@tile("wall_white")
def _(d):
    wall_base()(d)
    d.rectangle([8, 50, TW - 8, TW - 24], fill=(252, 252, 250), outline=(150, 150, 150), width=3)
    d.line([(12, 62), (TW - 18, 62)], fill=(120, 160, 190), width=2)

@tile("wall_cork")
def _(d):
    wall_base()(d)
    d.rectangle([6, 50, TW - 6, TW - 24], fill=CORK, outline=WOOD_D, width=3)
    for x, y in [(14, 58), (22, 74), (34, 62), (20, 90), (40, 86)]:
        d.rectangle([x, y, x + 10, y + 12], fill=WHITE)
        d.ellipse([x + 3, y - 2, x + 7, y + 2], fill=NG_BLUE_D)

@tile("wall_cal")
def _(d):
    wall_base()(d)
    d.rectangle([8, 50, TW - 8, TW - 24], fill=WHITE, outline=NG_BLUE_D, width=3)
    d.rectangle([8, 50, TW - 8, 62], fill=NG_BLUE)
    for r in range(3):
        for c in range(4):
            d.rectangle([12 + c * 10, 66 + r * 10, 19 + c * 10, 73 + r * 10], fill=GLASS)

@tile("wall_sched")
def _(d):
    wall_base()(d)
    d.rectangle([6, 50, TW - 6, TW - 24], fill=(40, 60, 78), outline=NG_NAVY, width=3)
    for r in range(3):
        for c in range(3):
            d.rectangle([12 + c * 16, 58 + r * 12, 24 + c * 16, 66 + r * 12],
                        fill=(255, 255, 255) if (r + c) % 2 else (255, 220, 120))

@tile("wall_plate")
def _(d):
    wall_base()(d)
    d.rectangle([14, 62, TW - 14, 78], fill=BRASS, outline=WOOD_D, width=2)
    d.line([(18, 70), (TW - 18, 70)], fill=(120, 90, 30), width=2)

@tile("wall_glass")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(224, 240, 250))
    d.rectangle([0, 0, TW, 40], fill=GLASS_D)
    d.rectangle([0, TW - 14, TW, TW], fill=GLASS_D)
    d.line([(0, 24), (TW, 24)], fill=WHITE, width=3)
    d.rectangle([0, 0, TW - 1, TW - 1], outline=(130, 170, 200), width=2)

@tile("wall_frost")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(232, 242, 248))
    d.rectangle([0, 0, TW, 34], fill=(170, 205, 228))
    speckle(d, (0, 40, TW, TW - 14), (250, 252, 254), 20, 3)
    d.rectangle([0, TW - 12, TW, TW], fill=(170, 205, 228))

@tile("wall_brick")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(150, 105, 85))
    for row in range(6):
        y = row * 22
        d.line([(0, y), (TW, y)], fill=(120, 82, 66), width=2)
        off = 0 if row % 2 == 0 else 22
        for x in range(off, TW, 44):
            d.line([(x, y), (x, y + 22)], fill=(120, 82, 66), width=2)

@tile("wall_fence")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=GRASS)
    for x in range(4, TW, 10):
        d.line([(x, 6), (x, TW - 4)], fill=(70, 74, 80), width=3)
    d.line([(0, 10), (TW, 10)], fill=(70, 74, 80), width=3)
    d.line([(0, TW - 10), (TW, TW - 10)], fill=(70, 74, 80), width=3)

@tile("wall_tv")
def _(d):
    wall_base()(d)
    d.rectangle([8, 52, TW - 8, TW - 26], fill=INK, outline=(40, 44, 50), width=3)
    d.rectangle([12, 56, TW - 12, TW - 30], fill=(70, 130, 180))
    d.rectangle([16, 60, 30, 66], fill=WHITE)

@tile("wall_gate_l")
def _(d):
    """Gate leaf (left) — metal bars + blue band."""
    d.rectangle([0, 0, TW, TW], fill=(206, 210, 214))
    for x in range(6, TW, 10):
        d.line([(x, 2), (x, TW - 2)], fill=(90, 95, 100), width=4)
    d.rectangle([0, 30, TW, 46], fill=NG_BLUE_D)

@tile("wall_gate_r")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(206, 210, 214))
    for x in range(8, TW, 10):
        d.line([(x, 2), (x, TW - 2)], fill=(90, 95, 100), width=4)
    d.rectangle([0, 30, TW, 46], fill=NG_BLUE_D)

# ---- furniture ----
@tile("desk_teach")
def _(d):
    d.rectangle([2, 6, TW - 2, TW - 6], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([6, 10, 24, 22], fill=WHITE)          # papers
    d.rectangle([30, 12, 52, 28], fill=(60, 64, 70))  # laptop
    d.rectangle([33, 14, 49, 24], fill=(120, 180, 220))

@tile("desk_stu")
def _(d):
    d.rectangle([2, 4, TW - 2, TW - 14], fill=(210, 180, 140), outline=WOOD_D, width=3)
    d.rectangle([10, 10, 30, 22], fill=WHITE)
    d.rectangle([34, 10, 50, 24], fill=(200, 80, 70))  # book

@tile("desk_stu2")
def _(d):
    d.rectangle([2, 4, TW - 2, TW - 14], fill=(210, 180, 140), outline=WOOD_D, width=3)
    d.rectangle([12, 8, 46, 20], fill=(80, 140, 190))
    d.rectangle([14, 22, 34, 30], fill=WHITE)

@tile("chair_blue")
def _(d):
    d.rounded_rectangle([18, 14, 46, 42], radius=6, fill=NG_BLUE_D, outline=NG_NAVY, width=2)
    d.rounded_rectangle([14, 2, 50, 14], radius=4, fill=NG_BLUE, outline=NG_NAVY, width=2)

@tile("chair_wood")
def _(d):
    d.rounded_rectangle([18, 14, 46, 42], radius=6, fill=WOOD, outline=WOOD_D, width=2)
    d.rounded_rectangle([14, 2, 50, 14], radius=4, fill=(169, 116, 79), outline=WOOD_D, width=2)

@tile("shelf_books")
def _(d):
    d.rectangle([0, 2, TW, TW - 2], fill=WOOD_D, outline=(70, 45, 28), width=3)
    cols = [NG_BLUE, (200, 80, 70), (230, 190, 90), (90, 150, 110), (120, 100, 160), (220, 220, 215)]
    for r, y in enumerate([8, 36, 64, 92]):
        x = 6
        for i in range(6):
            w = 8 + (i * 3 + r * 5) % 6
            d.rectangle([x, y, x + w, y + 22], fill=cols[(i + r) % len(cols)])
            x += w + 2
            if x > TW - 12:
                break

@tile("shelf_books2")
def _(d):
    d.rectangle([0, 2, TW, TW - 2], fill=WOOD, outline=WOOD_D, width=3)
    for y in [10, 40, 70]:
        d.rectangle([4, y, TW - 4, y + 20], fill=(255, 252, 245))
        for i in range(5):
            d.rectangle([8 + i * 11, y + 3, 15 + i * 11, y + 17], fill=[NG_BLUE, (200, 80, 70), (230, 190, 90), (90, 150, 110), (150, 130, 180)][i])

@tile("desk_comp")
def _(d):
    d.rectangle([2, 4, TW - 2, TW - 4], fill=(200, 195, 188), outline=(120, 115, 108), width=3)
    d.rectangle([12, 10, 52, 34], fill=INK, outline=(40, 44, 50), width=2)  # monitor
    d.rectangle([15, 13, 49, 29], fill=(90, 160, 210))
    d.rectangle([20, 38, 44, 50], fill=(180, 175, 168))  # keyboard

@tile("cab_files")
def _(d):
    d.rectangle([4, 2, TW - 4, TW - 2], fill=(150, 154, 160), outline=(90, 94, 100), width=3)
    for y in [8, 36, 64, 92]:
        d.rectangle([8, y, TW - 8, y + 22], fill=(175, 179, 185), outline=(90, 94, 100), width=2)
        d.rectangle([26, y + 8, 38, y + 14], fill=(80, 84, 90))

@tile("cab_wood")
def _(d):
    d.rectangle([4, 2, TW - 4, TW - 2], fill=WOOD, outline=WOOD_D, width=3)
    for y in [8, 36, 64, 92]:
        d.rectangle([8, y, TW - 8, y + 22], fill=(160, 110, 70), outline=WOOD_D, width=2)
        d.ellipse([26, y + 8, 38, y + 14], fill=BRASS)

@tile("counter_l")
def _(d):
    d.rectangle([0, 8, TW, TW - 4], fill=(235, 232, 226), outline=(150, 148, 142), width=3)
    d.rectangle([0, 8, TW, 18], fill=WOOD)
    d.rectangle([4, 24, 28, 44], fill=GLASS, outline=NG_NAVY, width=2)  # monitor?

@tile("counter_m")
def _(d):
    d.rectangle([0, 8, TW, TW - 4], fill=(235, 232, 226), outline=(150, 148, 142), width=3)
    d.rectangle([0, 8, TW, 18], fill=WOOD)
    d.rectangle([10, 22, 40, 34], fill=WHITE)
    d.rectangle([44, 20, 58, 32], fill=INK)

@tile("counter_r")
def _(d):
    d.rectangle([0, 8, TW - 6, TW - 4], fill=(235, 232, 226), outline=(150, 148, 142), width=3)
    d.rectangle([0, 8, TW - 6, 18], fill=WOOD)
    d.rounded_rectangle([10, 22, 52, 36], radius=4, fill=BRASS, outline=WOOD_D, width=2)  # nameplate

@tile("sofa")
def _(d):
    d.rounded_rectangle([2, 10, TW - 2, TW - 4], radius=8, fill=NG_BLUE, outline=NG_NAVY, width=3)
    d.rectangle([6, 22, TW - 6, TW - 8], fill=NG_BLUE_D)
    d.line([(TW // 2, 22), (TW // 2, TW - 8)], fill=NG_NAVY, width=2)

@tile("bench_wait")
def _(d):
    d.rectangle([2, 12, TW - 2, 40], fill=(150, 120, 90), outline=WOOD_D, width=3)
    d.rectangle([6, 42, TW - 6, TW - 10], fill=(170, 140, 105), outline=WOOD_D, width=2)

@tile("table_round")
def _(d):
    d.ellipse([2, 4, TW - 2, TW - 4], fill=(235, 230, 220), outline=WOOD_D, width=3)
    d.ellipse([12, 14, TW - 12, TW - 14], outline=(210, 205, 195), width=2)
    d.ellipse([24, 26, 40, 42], fill=WHITE)  # small cloth center

@tile("pdesk_l")
def _(d):
    d.rectangle([0, 6, TW, TW - 2], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([0, 6, TW, 14], fill=(160, 110, 70))

@tile("pdesk_m")
def _(d):
    d.rectangle([0, 6, TW, TW - 2], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([0, 6, TW, 14], fill=(160, 110, 70))
    d.rectangle([8, 18, 44, 44], fill=INK, outline=(40, 44, 50), width=2)   # monitor
    d.rectangle([11, 21, 41, 39], fill=(70, 130, 180))
    d.rectangle([50, 18, 84, 34], fill=(50, 80, 60), outline=(30, 50, 35), width=2)  # ledger (green)
    d.line([(54, 26), (80, 26)], fill=(230, 230, 220), width=2)
    d.rounded_rectangle([88, 20, 116, 36], radius=4, fill=(40, 44, 50), outline=(20, 22, 26), width=2)  # phone
    d.line([(92, 28), (112, 28)], fill=(120, 200, 230), width=2)
    d.rectangle([20, 52, 60, 62], fill=WHITE)  # papers

@tile("pdesk_r")
def _(d):
    d.rectangle([0, 6, TW, TW - 2], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([0, 6, TW, 14], fill=(160, 110, 70))
    d.rounded_rectangle([8, 20, 40, 34], radius=3, fill=WHITE, outline=(180, 180, 180), width=1)

@tile("water")
def _(d):
    d.rectangle([18, 8, 46, 30], fill=(120, 200, 240), outline=NG_NAVY, width=2)  # bottle
    d.rectangle([12, 30, 52, TW - 4], fill=(235, 235, 232), outline=(150, 150, 150), width=2)
    d.rectangle([18, 38, 30, 48], fill=NG_BLUE)

@tile("plant_s")
def _(d):
    d.rectangle([22, 40, 42, 58], fill=(180, 100, 70), outline=WOOD_D, width=2)
    d.ellipse([10, 6, 54, 46], fill=GRASS_D)
    d.ellipse([18, 12, 46, 40], fill=GRASS)

@tile("plant_l")
def _(d):
    d.rectangle([24, 88, 44, 112], fill=(150, 90, 60), outline=WOOD_D, width=2)
    d.ellipse([4, 20, 60, 92], fill=GRASS_D)
    d.ellipse([14, 28, 50, 84], fill=GRASS)
    d.ellipse([22, 36, 44, 70], fill=(120, 175, 100))

@tile("bin")
def _(d):
    d.rectangle([18, 20, 46, TW - 4], fill=(90, 120, 140), outline=(60, 85, 100), width=2)
    d.rectangle([16, 14, 48, 22], fill=(60, 85, 100))

@tile("lamp")
def _(d):
    d.rectangle([28, 30, 36, TW - 6], fill=(70, 74, 80))
    d.ellipse([12, 8, 52, 34], fill=(255, 244, 200), outline=(70, 74, 80), width=2)
    d.ellipse([8, TW - 12, 56, TW - 2], fill=(70, 74, 80))

@tile("bench_park")
def _(d):
    d.rectangle([2, 14, TW - 2, 34], fill=(120, 85, 55), outline=WOOD_D, width=2)
    d.rectangle([2, 40, TW - 2, 54], fill=(140, 100, 65), outline=WOOD_D, width=2)
    d.rectangle([4, 54, 10, 66], fill=(70, 74, 80))
    d.rectangle([54, 54, 60, 66], fill=(70, 74, 80))

@tile("flowerbed")
def _(d):
    d.rectangle([0, 8, TW, TW - 4], fill=(110, 75, 55), outline=(85, 58, 42), width=3)
    for x, y in [(12, 30), (30, 44), (48, 32), (22, 70), (44, 74)]:
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=GRASS_D)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=[NG_BLUE, (230, 120, 140), (255, 210, 90)][x % 3])

@tile("bush")
def _(d):
    d.ellipse([2, 10, TW - 2, TW - 4], fill=GRASS_D)
    d.ellipse([10, 18, TW - 10, TW - 12], fill=GRASS)

@tile("coffee")
def _(d):
    d.rectangle([8, 6, TW - 8, TW - 6], fill=(200, 195, 188), outline=(120, 115, 108), width=3)
    d.rectangle([14, 12, 38, 34], fill=(40, 44, 50))
    d.ellipse([42, 14, 58, 30], fill=WHITE)
    d.rectangle([16, 44, 48, 56], fill=(120, 60, 30))

@tile("lockers")
def _(d):
    d.rectangle([2, 2, TW - 2, TW - 2], fill=(90, 130, 170), outline=NG_NAVY, width=3)
    for i in range(3):
        x = 6 + i * 20
        d.rectangle([x, 8, x + 16, TW - 8], fill=(110, 155, 195), outline=NG_NAVY, width=2)
        d.rectangle([x + 6, 34, x + 10, 44], fill=NG_NAVY)

@tile("trophy")
def _(d):
    d.rectangle([2, 4, TW - 2, TW - 4], fill=(225, 235, 242), outline=BRASS, width=3)
    d.rectangle([6, 8, TW - 6, TW - 8], fill=GLASS, outline=(170, 205, 228), width=2)
    for x in [12, 40]:
        d.polygon([(x, 40), (x + 12, 40), (x + 10, 54), (x + 2, 54)], fill=BRASS)
        d.rectangle([x + 4, 54, x + 8, 58], fill=BRASS)

@tile("podium")
def _(d):
    d.polygon([(8, 20), (TW - 8, 20), (TW - 14, TW - 6), (14, TW - 6)], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([22, 4, 42, 22], fill=(40, 44, 50))  # mic base
    d.line([(32, 4), (32, -2)], fill=(40, 44, 50), width=3)
    d.ellipse([26, -4, 38, 8], fill=(40, 44, 50))

@tile("trunk")
def _(d):
    d.rectangle([24, 24, 42, TW], fill=(110, 75, 50))
    d.rectangle([28, 24, 38, TW], fill=(140, 100, 65))
    d.ellipse([8, TW - 10, 56, TW], fill=(100, 70, 45))

def canopy_shade(dx, dy):
    def fn(d):
        # rounded organic blob piece of a 3x3 canopy, tile at offset (dx,dy)
        d.rectangle([0, 0, TW, TW], fill=(0, 0, 0, 0))
        blobs = [(64 + dx * TW, 64 + dy * TW, 78)]
        for cx, cy, r in blobs:
            pass
    return fn

@tile("can_ul")
def _(d):
    d.ellipse([-40 + 0, -40 + 0, 96, 96], fill=GRASS_D)
    d.ellipse([-20, -20, 80, 80], fill=(108, 156, 88))
@tile("can_ur")
def _(d):
    d.ellipse([32, -40, 168, 96], fill=GRASS_D)
    d.ellipse([48, -20, 148, 80], fill=(108, 156, 88))
@tile("can_ll")
def _(d):
    d.ellipse([-40, 32, 96, 168], fill=GRASS_D)
    d.ellipse([-20, 48, 80, 148], fill=(100, 148, 80))
@tile("can_lr")
def _(d):
    d.ellipse([32, 32, 168, 168], fill=GRASS_D)
    d.ellipse([48, 48, 148, 148], fill=(100, 148, 80))
    speckle(d, (10, 10, TW - 4, TW - 4), (88, 134, 70), 14, 3)

@tile("flag_pole")
def _(d):
    d.rectangle([28, 30, 36, TW], fill=(90, 94, 100))
    d.ellipse([18, TW - 10, 46, TW - 2], fill=(120, 124, 130))

@tile("flag_up")
def _(d):
    """Waving NG flag (above player)."""
    d.rectangle([28, 8, 36, TW], fill=(90, 94, 100))
    d.polygon([(36, 10), (86, 16), (86, 44), (36, 50)], fill=NG_BLUE)
    d.polygon([(40, 18), (78, 22), (78, 38), (40, 42)], fill=WHITE)
    d.ellipse([50, 24, 68, 36], outline=INK, width=2)

@tile("hopscotch")
def _(d):
    floor_plain(RUBBER_B)(d)
    cells = [(24, 8, 44, 28), (24, 30, 44, 50), (24, 52, 44, 72), (4, 74, 24, 94), (44, 74, 64, 94), (24, 96, 44, 116)]
    for x0, y0, x1, y1 in cells:
        d.rectangle([x0, y0, x1, y1], outline=WHITE, width=3)

@tile("hoop")
def _(d):
    floor_plain(RUBBER_G)(d)
    d.ellipse([10, 8, 54, 52], outline=WHITE, width=3)
    d.rectangle([26, 0, 38, 10], fill=(80, 84, 90))
    d.ellipse([22, -6, 42, 8], fill=(220, 90, 60))

@tile("sandbox")
def _(d):
    d.rectangle([0, 8, TW, TW - 8], fill=(232, 214, 160), outline=WOOD, width=4)
    speckle(d, (6, 14, TW - 6, TW - 14), (214, 194, 140), 18, 2)

@tile("picnic")
def _(d):
    d.rectangle([4, 12, TW - 4, 34], fill=(160, 110, 70), outline=WOOD_D, width=2)
    d.rectangle([8, 36, 24, 48], fill=(140, 95, 60))
    d.rectangle([40, 36, 56, 48], fill=(140, 95, 60))
    d.rectangle([2, 50, TW - 2, 60], fill=(140, 95, 60), outline=WOOD_D, width=2)

@tile("umbrella")
def _(d):
    d.ellipse([2, 2, TW - 2, TW - 2], fill=NG_BLUE, outline=NG_NAVY, width=3)
    d.ellipse([14, 14, TW - 14, TW - 14], fill=NG_BLUE_D)
    d.ellipse([26, 26, 38, 38], fill=WHITE)

def bus_piece(ox, oy):
    def fn(d):
        body = (240, 200, 60)
        d.rectangle([0, 0, TW, TW], fill=body)
        d.rectangle([8 + ox, 8 + oy, 56 + ox, 56 + oy], fill=(255, 220, 100))
        d.rounded_rectangle([4, 4, TW - 4, TW - 4], radius=8, outline=(180, 140, 30), width=3)
    return fn

@tile("bus_ul")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(240, 200, 60))
    d.rounded_rectangle([4, 10, TW + 30, TW + 30], radius=12, outline=(180, 140, 30), width=3)
    d.rectangle([14, 20, 52, 52], fill=(180, 215, 235))
@tile("bus_ur")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(240, 200, 60))
    d.rounded_rectangle([-30, 10, TW - 4, TW + 30], radius=12, outline=(180, 140, 30), width=3)
    d.rectangle([8, 20, 50, 52], fill=(180, 215, 235))
@tile("bus_ll")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(240, 200, 60))
    d.rounded_rectangle([4, -30, TW + 30, TW - 6], radius=12, outline=(180, 140, 30), width=3)
    d.ellipse([6, 40, 26, 58], fill=(40, 44, 50))
@tile("bus_lr")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(240, 200, 60))
    d.rounded_rectangle([-30, -30, TW - 4, TW - 6], radius=12, outline=(180, 140, 30), width=3)
    d.ellipse([36, 40, 56, 58], fill=(40, 44, 50))

@tile("sign_board")
def _(d):
    d.rectangle([24, 44, 40, TW], fill=(110, 75, 50))
    d.rounded_rectangle([4, 2, TW - 4, 48], radius=4, fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([8, 6, TW - 8, 44], fill=CREAM)

@tile("gsign_l")
def _(d):
    d.rectangle([0, 8, TW, 44], fill=INK)
    d.rectangle([0, 12, TW, 40], fill=NG_NAVY)

@tile("gsign_r")
def _(d):
    d.rectangle([0, 8, TW, 44], fill=INK)
    d.rectangle([0, 12, TW, 40], fill=NG_NAVY)

@tile("stage_f")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=STAGE)
    for x in range(0, TW, TW // 3):
        d.line([(x, 0), (x, TW)], fill=(80, 50, 30), width=2)
    d.rectangle([0, 0, TW, 8], fill=(220, 170, 90))

@tile("easel")
def _(d):
    d.line([(10, TW - 4), (24, 10)], fill=WOOD_D, width=4)
    d.line([(TW - 10, TW - 4), (TW - 24, 10)], fill=WOOD_D, width=4)
    d.rectangle([12, 14, TW - 12, 52], fill=WHITE, outline=(150, 150, 150), width=2)
    d.ellipse([20, 22, 40, 40], fill=NG_BLUE)

@tile("mat_logo")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=NG_BLUE_D)
    d.rectangle([3, 3, TW - 3, TW - 3], fill=NG_BLUE)
    d.ellipse([10, 10, TW - 10, TW - 10], outline=WHITE, width=3)

@tile("doormat")
def _(d):
    d.rectangle([2, 6, TW - 2, TW - 6], fill=(120, 70, 50), outline=(90, 50, 35), width=2)
    for x in range(6, TW - 4, 6):
        d.line([(x, 10), (x, TW - 10)], fill=(100, 60, 42), width=1)

@tile("column")
def _(d):
    d.ellipse([6, 6, TW - 6, TW - 6], fill=(235, 232, 226), outline=(160, 158, 152), width=3)
    d.ellipse([14, 14, TW - 14, TW - 14], fill=(245, 243, 238))

@tile("clock")
def _(d):
    d.ellipse([4, 4, TW - 4, TW - 4], fill=WHITE, outline=NG_NAVY, width=4)
    d.line([(TW // 2, TW // 2), (TW // 2, 14)], fill=INK, width=3)
    d.line([(TW // 2, TW // 2), (TW - 14, TW // 2 + 6)], fill=INK, width=3)

@tile("stair")
def _(d):
    d.rectangle([0, 0, TW, TW], fill=(220, 215, 205))
    for i in range(4):
        y = i * TW // 4
        d.line([(0, y), (TW, y)], fill=(170, 165, 155), width=3)
        d.rectangle([0, y, TW, y + 6], fill=(195, 190, 180))

@tile("mark_collide")
def _(d):
    pass  # fully transparent

@tile("mark_start")
def _(d):
    pass

@tile("mark_zone")
def _(d):
    pass

# ==================== قاعة النجوم (Celebration & Shows Hall) ====================
@tile("floor_hall")
def _(d):
    """Elegant neutral terrazzo house floor."""
    d.rectangle([0, 0, TW, TW], fill=(226, 222, 214))
    speckle(d, (2, 2, TW - 2, TW - 2), (240, 236, 228), 18, 2)
    speckle(d, (2, 2, TW - 2, TW - 2), (200, 195, 186), 14, 1)

@tile("floor_aisle")
def _(d):
    """NG navy carpet runner with azure edge lines."""
    d.rectangle([0, 0, TW, TW], fill=(30, 70, 100))
    d.line([(0, 4), (TW, 4)], fill=NG_BLUE, width=2)
    d.line([(0, TW - 4), (TW, TW - 4)], fill=NG_BLUE, width=2)
    speckle(d, (2, 8, TW - 2, TW - 8), (40, 84, 116), 10, 2)

@tile("floor_stage_deck")
def _(d):
    """Dark elegant stage deck (subtle boards + edge highlight)."""
    d.rectangle([0, 0, TW, TW], fill=(72, 56, 48))
    for x in range(0, TW, TW // 4):
        d.line([(x, 0), (x, TW)], fill=(56, 42, 36), width=2)
    d.rectangle([0, 0, TW - 1, 3], fill=(120, 95, 70))

@tile("stage_front")
def _(d):
    """Stage front skirt with pleats (viewed from house)."""
    d.rectangle([0, 0, TW, TW], fill=(46, 40, 44))
    d.rectangle([0, 0, TW, 10], fill=(90, 72, 60))
    for x in range(2, TW, 8):
        d.line([(x, 12), (x, TW - 4)], fill=(58, 50, 56), width=2)

@tile("stage_step")
def _(d):
    """Three-step access block up to the stage."""
    d.rectangle([0, 0, TW, TW], fill=(200, 196, 188))
    for i, y in enumerate((2, 12, 22)):
        d.rectangle([0, y, TW, y + 8], fill=(220 - i * 10, 216 - i * 10, 206 - i * 12))
        d.line([(0, y), (TW, y)], fill=(150, 145, 138), width=2)

@tile("wall_acoustic")
def _(d):
    """Elegant acoustic wall panel: cream perforated panel + azure accent."""
    d.rectangle([0, 0, TW, TW], fill=(222, 216, 206))
    d.rectangle([0, 0, TW, 40], fill=(58, 64, 72))          # cap
    d.rectangle([0, 40, TW, 46], fill=(196, 190, 180))
    d.rectangle([0, TW - 18, TW, TW], fill=(200, 194, 184))
    for yy in (54, 66, 78, 90):
        for xx in range(6, TW - 4, 10):
            d.ellipse([xx, yy, xx + 3, yy + 3], fill=(170, 164, 154))
    d.rectangle([0, TW - 22, TW, TW - 18], fill=NG_BLUE_D)   # accent strip

@tile("wall_decor")
def _(d):
    """Neutral decor panel with NG star motif (decoratable)."""
    wall_base(face=(228, 224, 216))(d)
    d.polygon([(TW // 2, 52), (TW // 2 + 8, 68), (TW // 2 + 24, 68), (TW // 2 + 12, 78),
               (TW // 2 + 16, 94), (TW // 2, 84), (TW // 2 - 16, 94), (TW // 2 - 12, 78),
               (TW // 2 - 24, 68), (TW // 2 - 8, 68)], fill=BRASS)

@tile("backdrop_led")
def _(d):
    """Big LED panel segment (tiles seamlessly into one video wall)."""
    d.rectangle([0, 0, TW, TW], fill=(18, 22, 30))
    d.rectangle([2, 2, TW - 2, TW - 2], fill=(36, 88, 150))
    speckle(d, (4, 4, TW - 4, TW - 4), (56, 110, 175), 10, 2)
    d.line([(0, TW // 3), (TW, TW // 3)], fill=(48, 102, 168), width=1)
    d.line([(0, 2 * TW // 3), (TW, 2 * TW // 3)], fill=(48, 102, 168), width=1)
    d.line([(TW // 2, 0), (TW // 2, TW)], fill=(48, 102, 168), width=1)
    d.rectangle([2, 2, TW - 2, 6], fill=(70, 140, 210))

@tile("backdrop_drape")
def _(d):
    """Changeable neutral stage backdrop with soft folds."""
    d.rectangle([0, 0, TW, TW], fill=(210, 204, 194))
    d.rectangle([0, 0, TW, 30], fill=(58, 64, 72))
    for x in range(4, TW, 7):
        d.line([(x, 34), (x, TW - 2)], fill=(188, 182, 172), width=2)
    d.line([(0, TW - 6), (TW, TW - 6)], fill=(160, 154, 144), width=3)

@tile("curtain_n")
def _(d):
    """Stage side curtain (north wing) — navy velvet + gold rope."""
    d.rectangle([0, 0, TW, TW], fill=(30, 46, 84))
    for x in range(3, TW, 6):
        d.line([(x, 0), (x, TW)], fill=(40, 60, 104), width=2)
    d.ellipse([10, TW // 2 - 4, 22, TW // 2 + 8], fill=BRASS)

@tile("curtain_s")
def _(d):
    """Stage side curtain (south wing) — navy velvet + gold rope."""
    d.rectangle([0, 0, TW, TW], fill=(30, 46, 84))
    for x in range(4, TW, 6):
        d.line([(x, 0), (x, TW)], fill=(40, 60, 104), width=2)
    d.ellipse([TW - 22, TW // 2 - 4, TW - 10, TW // 2 + 8], fill=BRASS)

@tile("truss")
def _(d):
    """Lighting truss bar with spot lamps (renders above player)."""
    d.rectangle([0, 12, TW, 18], fill=(36, 38, 42))
    for x in (8, 24, 40, 56):
        d.rectangle([x, 18, x + 10, 26], fill=(20, 22, 26))
        d.ellipse([x + 2, 26, x + 8, 34], fill=(255, 236, 170))

@tile("light_pool")
def _(d):
    """Warm stage light pool painted on the deck."""
    d.ellipse([2, 6, TW - 2, TW - 6], fill=(255, 232, 170, 70))
    d.ellipse([8, 12, TW - 8, TW - 12], fill=(255, 240, 190, 80))

@tile("speaker_stack")
def _(d):
    """PA speaker cabinet with woofer circles."""
    d.rectangle([4, 4, TW - 4, TW - 4], fill=(28, 30, 34), outline=(12, 14, 16), width=3)
    d.ellipse([10, 10, 34, 34], outline=(70, 74, 80), width=3)
    d.ellipse([34, 32, 54, 52], outline=(70, 74, 80), width=3)

@tile("mic_stand")
def _(d):
    """Microphone stand on stage."""
    d.ellipse([12, TW - 14, 52, TW - 4], fill=(40, 44, 50))
    d.rectangle([29, 12, 35, TW - 10], fill=(60, 64, 70))
    d.rounded_rectangle([24, 2, 40, 14], radius=4, fill=(30, 32, 36))

@tile("seat_hall")
def _(d):
    """Elegant auditorium seat facing EAST (back at west side of tile)."""
    d.rounded_rectangle([2, 16, 14, 48], radius=4, fill=NG_BLUE_D, outline=NG_NAVY, width=2)  # back
    d.rounded_rectangle([12, 12, 52, 52], radius=8, fill=(95, 125, 155), outline=NG_NAVY, width=2)  # seat
    d.rounded_rectangle([16, 18, 46, 46], radius=6, fill=NG_BLUE)

@tile("seat_hall_fold")
def _(d):
    """Folded/removed seat — open flexible floor with fold marks."""
    d.rectangle([0, 0, TW, TW], fill=(214, 210, 202))
    d.line([(8, 8), (TW - 8, TW - 8)], fill=(190, 186, 178), width=2)
    d.line([(TW - 8, 8), (8, TW - 8)], fill=(190, 186, 178), width=2)

@tile("chair_stack")
def _(d):
    """Stack of folded chairs (removable seating)."""
    d.rectangle([8, 20, TW - 8, TW - 8], fill=(120, 124, 130), outline=(70, 74, 80), width=2)
    d.rectangle([12, 12, TW - 12, 22], fill=(150, 154, 160), outline=(70, 74, 80), width=2)
    d.rectangle([16, 4, TW - 16, 14], fill=(180, 184, 190), outline=(70, 74, 80), width=2)

@tile("prizes_table")
def _(d):
    """Honoring table with trophies and gold cloth."""
    d.rectangle([0, 8, TW, TW - 4], fill=(212, 178, 96), outline=(150, 116, 50), width=3)
    d.rectangle([0, 8, TW, 16], fill=(232, 204, 130))
    d.polygon([(14, 28), (24, 28), (22, 40), (16, 40)], fill=BRASS)
    d.polygon([(38, 26), (48, 26), (46, 40), (40, 40)], fill=BRASS)
    d.ellipse([28, 40, 38, 48], fill=(255, 244, 200))

@tile("guestbook_table")
def _(d):
    """Foyer guestbook table with open book + pen."""
    d.rectangle([2, 10, TW - 2, TW - 6], fill=(235, 232, 226), outline=(150, 148, 142), width=3)
    d.rectangle([10, 18, 44, 36], fill=WHITE, outline=(180, 180, 180), width=1)
    d.line([(27, 18), (27, 36)], fill=(180, 180, 180), width=1)
    d.line([(46, 22), (58, 32)], fill=INK, width=3)

@tile("mirror_wall")
def _(d):
    """Backstage makeup mirror with bulb strip."""
    wall_base(face=(230, 236, 240))(d)
    d.rectangle([8, 50, TW - 8, TW - 26], fill=GLASS, outline=BRASS, width=3)
    for x in range(12, TW - 8, 12):
        d.ellipse([x, 42, x + 6, 48], fill=(255, 240, 180))

@tile("costume_rack")
def _(d):
    """Costume rack backstage."""
    d.rectangle([4, 6, TW - 4, 10], fill=(70, 74, 80))
    for x, c in [(8, (90, 60, 120)), (20, NG_BLUE_D), (32, (160, 70, 70)), (44, (70, 120, 90))]:
        d.polygon([(x, 10), (x + 12, 10), (x + 10, 48), (x + 2, 48)], fill=c)
    d.rectangle([6, 48, 10, TW - 4], fill=(70, 74, 80))
    d.rectangle([50, 48, 54, TW - 4], fill=(70, 74, 80))

@tile("exit_sign")
def _(d):
    d.rectangle([8, 24, TW - 8, 44], fill=(30, 120, 70), outline=(20, 80, 50), width=2)
    d.rectangle([12, 28, TW - 12, 40], fill=(220, 255, 235))

@tile("wall_sconce")
def _(d):
    wall_base(face=(226, 220, 210))(d)
    d.ellipse([22, 58, 42, 82], fill=(255, 240, 180), outline=BRASS, width=2)

@tile("projector")
def _(d):
    d.rectangle([8, 14, TW - 8, 50], fill=(235, 235, 232), outline=(140, 140, 140), width=2)
    d.ellipse([38, 20, 58, 40], fill=INK)
    d.ellipse([42, 24, 54, 36], fill=(120, 180, 220))
    d.rectangle([20, 50, 44, 56], fill=(160, 160, 160))

# ============================================================
# RECEPTION — غرفة الاستقبال (warm, professional, welcoming)
# ============================================================
RECV_WOOD = (222, 192, 150)
RECV_WOOD_D = (192, 158, 116)
RECV_FACE = (247, 244, 239)      # warm white wall face
RECV_CAP = (104, 126, 148)       # soft azure-gray cap
RECV_CAP_D = (88, 110, 132)
RECV_BASE = (196, 186, 170)      # warm baseboard
RECV_GLOW = (252, 245, 224)      # soft backlight glow
GOLD_TXT = (255, 215, 106)


def recv_wall_base(d, face=RECV_FACE):
    d.rectangle([0, 0, TW, TW], fill=face)
    d.rectangle([0, 0, TW, 42], fill=RECV_CAP)
    d.rectangle([0, 42, TW, 47], fill=RECV_CAP_D)
    d.rectangle([0, 47, TW, 51], fill=AMBER)            # thin gold trim
    d.rectangle([0, TW - 23, TW, TW - 20], fill=tuple(min(255, c + 8) for c in face))
    d.rectangle([0, TW - 20, TW, TW], fill=RECV_BASE)
    d.rectangle([0, 0, 4, TW], fill=tuple(max(0, c - 10) for c in face))


def _font(size, bold=False):
    try:
        from PIL import ImageFont
        p = os.path.join(HERE, "fonts",
                         "NotoNaskhArabic-700.ttf" if bold else "NotoNaskhArabic-400.ttf")
        return ImageFont.truetype(p, size)
    except Exception:
        return None


def ar_text(d, cx, cy, s, size, fill, bold=False):
    """Centered Arabic text (reshaped + bidi). Silent no-op if deps missing."""
    f = _font(size, bold)
    if f is None:
        return
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        txt = get_display(arabic_reshaper.reshape(s))
    except Exception:
        txt = s
    d.text((cx, cy), txt, font=f, fill=fill, anchor="mm")


def latin_text(d, cx, cy, s, size, fill, bold=True):
    try:
        from PIL import ImageFont
        f = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/"
            + ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"), size)
        d.text((cx, cy), s, font=f, fill=fill, anchor="mm")
    except Exception:
        pass


@tile("recv_wall")
def _(d):
    """Calm warm-white wall, soft azure cap, thin gold trim."""
    recv_wall_base(d)


@tile("recv_floor")
def _(d):
    """Light oak planks — warm wood underfoot."""
    d.rectangle([0, 0, TW, TW], fill=(226, 202, 166))
    for i in range(4):
        y = i * (TW // 4)
        d.rectangle([0, y, TW, y + 2], fill=(204, 176, 138))
        seam = (i % 2) * (TW // 2) + TW // 4
        d.line([(seam, y + 2), (seam, y + TW // 4 - 2)], fill=(208, 180, 142), width=2)
        for k in range(3):
            xx = (i * 37 + k * 41) % TW
            d.line([(xx, y + 8 + k * 6), (xx + 16, y + 8 + k * 6)],
                   fill=(214, 188, 150), width=1)
    speckle(d, (0, 0, TW, TW), (236, 218, 186), 8, 1)


@tile("recv_rug")
def _(d):
    """Soft cream rug with quiet azure diamonds + gold dots."""
    d.rectangle([0, 0, TW, TW], fill=(240, 235, 222))
    d.rectangle([2, 2, TW - 3, TW - 3], outline=(150, 176, 198), width=2)
    d.polygon([(TW // 2, 10), (TW - 10, TW // 2), (TW // 2, TW - 10), (10, TW // 2)],
              outline=(182, 198, 212), width=2)
    for xx, yy in ((20, 20), (TW - 20, 20), (20, TW - 20), (TW - 20, TW - 20)):
        d.ellipse([xx - 3, yy - 3, xx + 3, yy + 3], fill=(212, 175, 55))
    speckle(d, (8, 8, TW - 8, TW - 8), (230, 224, 208), 12, 1)


@tile("recv_logo")
def _(d):
    """Main wall: NG medallion on a softly backlit white lightbox."""
    recv_wall_base(d)
    for r, c in ((52, (250, 244, 228)), (44, (253, 248, 235)), (36, (255, 252, 244))):
        d.ellipse([TW // 2 - r, 84 - r, TW // 2 + r, 84 + r], fill=c)
    d.rounded_rectangle([16, 34, 112, 130 - 4], radius=12, fill=WHITE,
                        outline=AMBER, width=3)
    d.ellipse([TW // 2 - 26, 84 - 26, TW // 2 + 26, 84 + 26], outline=(240, 226, 190), width=2)


@tile("recv_wordmark")
def _(d):
    """Identity badge: logo + 'NG Academy' + الجيل الجديد on a navy panel."""
    recv_wall_base(d)
    d.rounded_rectangle([12, 14, 116, 118], radius=10, fill=NG_NAVY,
                        outline=(12, 30, 48), width=3)
    d.rounded_rectangle([17, 19, 111, 113], radius=8, outline=AMBER, width=2)
    latin_text(d, 64, 80, "NG Academy", 19, WHITE)
    d.rectangle([38, 91, 90, 94], fill=AMBER)
    ar_text(d, 64, 105, "الجيل الجديد", 17, GOLD_TXT, bold=True)


@tile("recv_quote")
def _(d):
    """The academy promise, on a white card: بيئة تُنصت للطفل، وتمنحه مساحة ليبدع."""
    recv_wall_base(d)
    d.rounded_rectangle([10, 20, 118, 116], radius=8, fill=WHITE,
                        outline=(120, 128, 140), width=2)
    d.rectangle([10, 20, 118, 27], fill=NG_NAVY)
    d.rectangle([10, 20, 14, 27], fill=AMBER)
    # quote marks
    for mx in (22, 106):
        d.rectangle([mx, 36, mx + 4, 44], fill=AMBER)
        d.rectangle([mx, 44, mx + 4, 48], fill=AMBER)
    ar_text(d, 64, 66, "بيئة تُنصت للطفل،", 16, NG_NAVY, bold=True)
    ar_text(d, 64, 92, "وتمنحه مساحة ليبدع", 16, NG_NAVY, bold=True)
    d.rectangle([44, 106, 84, 108], fill=AMBER)


@tile("recv_art")
def _(d):
    """Simple framed art: pencil + paper plane + small sun (refined, not childish)."""
    recv_wall_base(d)
    d.rectangle([16, 26, 112, 106], fill=WHITE, outline=(150, 152, 160), width=3)
    d.rectangle([20, 30, 108, 102], fill=(250, 246, 238))
    d.ellipse([80, 36, 98, 54], fill=AMBER)                      # sun
    d.line([(30, 94), (72, 52)], fill=NG_BLUE, width=7)          # pencil
    d.polygon([(72, 52), (81, 43), (76, 56)], fill=(240, 200, 120))
    d.polygon([(34, 54), (60, 40), (50, 64)], fill=(120, 168, 200))  # plane
    d.polygon([(34, 54), (50, 64), (38, 68)], fill=(88, 138, 178))
    d.line([(30, 94), (40, 96)], fill=(240, 200, 120), width=3)


@tile("recv_gallery")
def _(d):
    """Student-work wall: three small framed pieces (house / star / rocket)."""
    recv_wall_base(d)
    d.rectangle([16, 24, 60, 56], fill=WHITE, outline=(150, 152, 160), width=2)
    d.rectangle([20, 28, 56, 52], fill=(232, 242, 250))
    d.polygon([(38, 32), (52, 44), (24, 44)], fill=CORAL)
    d.rectangle([28, 44, 48, 52], fill=(214, 178, 138))
    d.rectangle([35, 46, 41, 52], fill=INK)
    d.rectangle([68, 24, 112, 56], fill=WHITE, outline=(150, 152, 160), width=2)
    d.rectangle([72, 28, 108, 52], fill=(240, 246, 252))
    for a in range(0, 360, 72):
        import math as _m
        sx = 90 + int(_m.cos(_m.radians(a)) * 10)
        sy = 40 + int(_m.sin(_m.radians(a)) * 10)
        d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=AMBER)
    d.ellipse([86, 36, 94, 44], fill=AMBER)
    d.rectangle([40, 64, 88, 104], fill=WHITE, outline=(150, 152, 160), width=2)
    d.rectangle([44, 68, 84, 100], fill=(226, 238, 248))
    d.polygon([(64, 72), (74, 88), (64, 96), (54, 88)], fill=TEAL)      # rocket
    d.ellipse([59, 74, 69, 82], fill=WHITE)
    d.polygon([(60, 96), (64, 104), (68, 96)], fill=CORAL)


def _screen_body(d):
    recv_wall_base(d)
    d.rectangle([6, 54, TW - 6, 118], fill=(10, 24, 40), outline=(24, 44, 64), width=3)
    d.rectangle([6, 54, TW - 6, 58], fill=(30, 70, 100))


@tile("recv_screen_l")
def _(d):
    """Digital display (left): programs list — برامجنا."""
    _screen_body(d)
    ar_text(d, 64, 70, "برامجنا", 13, GOLD_TXT, bold=True)
    d.rectangle([16, 80, 112, 82], fill=(24, 44, 64))
    for i, c in enumerate((NG_BLUE, AMBER, TEAL)):
        y = 88 + i * 11
        d.rectangle([20, y, 28, y + 7], fill=c)
        d.rectangle([34, y + 1, 108, y + 6], fill=(40, 72, 100))


@tile("recv_screen_r")
def _(d):
    """Digital display (right): achievements + photo strip — إنجازاتنا."""
    _screen_body(d)
    ar_text(d, 64, 70, "إنجازاتنا", 13, GOLD_TXT, bold=True)
    for i, (h, c) in enumerate(((34, NG_BLUE), (46, AMBER), (26, TEAL))):
        x = 20 + i * 20
        d.rectangle([x, 108 - h, x + 12, 108], fill=c)
    d.rectangle([16, 112, 112, 114], fill=(24, 44, 64))
    d.rectangle([20, 88, 58, 106], fill=(36, 84, 116), outline=NG_BLUE, width=2)
    d.rectangle([64, 88, 102, 106], fill=(84, 66, 40), outline=AMBER, width=2)


def _desk(d, pc=False, top=False, bot=False):
    d.rectangle([14, 110, 114, 122], fill=(206, 192, 164))        # floor shadow
    d.rounded_rectangle([14, 42, 114, 112], radius=14, fill=(250, 250, 252),
                        outline=(184, 190, 200), width=2)          # white curved front
    d.rectangle([14, 92, 114, 108], fill=(216, 232, 244))          # soft azure band
    d.rectangle([14, 88, 114, 91], fill=(240, 214, 150))           # gold accent
    if pc:
        d.rectangle([44, 6, 84, 26], fill=(36, 48, 64), outline=(22, 32, 46), width=2)
        d.rectangle([58, 24, 70, 32], fill=(52, 66, 84))           # monitor (back to guest)
        d.rectangle([88, 12, 112, 28], fill=(240, 244, 250), outline=(150, 160, 176), width=2)
        d.rectangle([18, 10, 40, 28], fill=WHITE, outline=(172, 180, 192), width=2)
        d.line([(22, 19), (36, 19)], fill=NG_BLUE, width=2)        # tablet + tray
    r = 8 if not top else 8
    top_y, bot_y = (24, 42)
    d.rounded_rectangle([8, 26, 120, 44], radius=8, fill=RECV_WOOD,
                        outline=RECV_WOOD_D, width=2)              # light-wood counter
    if top:
        d.ellipse([8, 22, 40, 40], fill=RECV_WOOD, outline=RECV_WOOD_D, width=2)
    if bot:
        d.ellipse([88, 26, 120, 44], fill=RECV_WOOD, outline=RECV_WOOD_D, width=2)


@tile("recv_desk_t")
def _(d):
    """Reception desk — top (curved end)."""
    _desk(d, top=True)


@tile("recv_desk_pc")
def _(d):
    """Reception desk — middle with computer, tablet, organized tray."""
    _desk(d, pc=True)


@tile("recv_desk_b")
def _(d):
    """Reception desk — bottom (curved end)."""
    _desk(d, bot=True)


def _sofa(d, arm_top=False, arm_bot=False):
    d.rectangle([14, 110, 114, 122], fill=(206, 192, 164))
    if arm_top:
        d.rounded_rectangle([10, 14, 118, 42], radius=16, fill=(228, 224, 214),
                            outline=(192, 184, 168), width=2)       # top armrest
    d.rounded_rectangle([12, 42, 116, 76], radius=10, fill=(248, 246, 240),
                        outline=(206, 198, 184), width=2)           # seat
    d.ellipse([28, 48, 56, 72], fill=NG_BLUE)                        # azure pillow
    d.ellipse([72, 48, 100, 72], fill=(240, 200, 120))               # gold pillow
    d.rounded_rectangle([14, 76, 114, 104], radius=8, fill=(230, 226, 216),
                        outline=(196, 188, 174), width=2)
    d.rectangle([18, 104, 30, 116], fill=RECV_WOOD_D)               # wood legs
    d.rectangle([98, 104, 110, 116], fill=RECV_WOOD_D)
    if arm_bot:
        d.rounded_rectangle([10, 96, 118, 122], radius=14, fill=(228, 224, 214),
                            outline=(192, 184, 168), width=2)


@tile("recv_sofa_t")
def _(d):
    """Guest sofa — top half (armrest up)."""
    _sofa(d, arm_top=True)


@tile("recv_sofa_b")
def _(d):
    """Guest sofa — bottom half (armrest down)."""
    _sofa(d, arm_bot=True)


@tile("recv_chair")
def _(d):
    """Compliment armchair — light frame, azure back cushion."""
    d.rectangle([20, 108, 108, 120], fill=(206, 192, 164))
    d.rounded_rectangle([22, 12, 106, 54], radius=18, fill=(224, 228, 236),
                        outline=(172, 182, 198), width=3)
    d.rounded_rectangle([36, 24, 92, 50], radius=12, fill=NG_BLUE)
    d.rounded_rectangle([16, 54, 112, 94], radius=12, fill=(242, 244, 248),
                        outline=(190, 196, 208), width=2)
    d.rectangle([20, 94, 108, 106], fill=(216, 220, 228))
    d.rectangle([26, 106, 38, 118], fill=RECV_WOOD_D)
    d.rectangle([90, 106, 102, 118], fill=RECV_WOOD_D)


@tile("recv_coffee")
def _(d):
    """Small round table with brochures/magazines on top."""
    d.rectangle([30, 112, 98, 122], fill=(206, 192, 164))
    d.ellipse([46, 100, 82, 120], fill=(190, 182, 168))
    d.rectangle([58, 60, 70, 106], fill=(208, 200, 186))
    d.ellipse([18, 26, 110, 94], fill=RECV_WOOD, outline=RECV_WOOD_D, width=3)
    d.ellipse([26, 34, 102, 86], outline=(204, 176, 138), width=2)
    d.rectangle([40, 44, 76, 62], fill=NG_BLUE, outline=NG_NAVY, width=2)
    d.rectangle([44, 48, 72, 52], fill=WHITE)
    d.rectangle([54, 58, 90, 76], fill=AMBER, outline=AMBER_D, width=2)
    d.rectangle([58, 62, 86, 66], fill=WHITE)


@tile("recv_mags")
def _(d):
    """Brochure A-frame rack: programs & academy booklets."""
    d.rectangle([30, 112, 98, 122], fill=(206, 192, 164))
    d.polygon([(38, 18), (90, 18), (104, 112), (24, 112)],
              fill=(234, 230, 222), outline=(196, 188, 174), width=3)
    for i, (y, c) in enumerate(((36, NG_BLUE), (64, AMBER), (92, TEAL))):
        d.rectangle([28, y, 100, y + 4], fill=RECV_WOOD_D)
        d.rectangle([34, y - 16, 62, y], fill=c, outline=WHITE, width=2)
        d.rectangle([38, y - 12, 58, y - 8], fill=WHITE)
        d.rectangle([68, y - 14, 96, y], fill=(250, 250, 252), outline=c, width=2)


@tile("recv_owl")
def _(d):
    """Elegant NG owl medallion on a white plinth — quiet visual anchor."""
    d.rectangle([34, 114, 94, 124], fill=(176, 168, 156))
    d.polygon([(48, 82), (80, 82), (86, 114), (42, 114)],
              fill=(242, 240, 234), outline=(206, 198, 186), width=2)
    d.rounded_rectangle([42, 72, 86, 84], radius=4, fill=(224, 220, 210),
                        outline=(196, 188, 174), width=2)
    for r, c in ((34, (250, 244, 228)), (27, (253, 248, 236))):
        d.ellipse([64 - r, 44 - r, 64 + r, 44 + r], fill=c)
    d.ellipse([64 - 24, 44 - 24, 64 + 24, 44 + 24], outline=AMBER, width=2)


# ============================================================
# MENTAL MATH — فصل الحساب الذهني (bright, fast, energetic)
# ============================================================
def seg7(d, x, y, s, digit, on, off):
    """7-segment digit, s = width (SS px)."""
    t = max(2, int(s * 0.2))
    h = int(s * 1.7)
    a = digit in "02356789"; f = digit in "045689"; b = digit in "012345679"
    g = digit in "23456789"; e = digit in "0268"; c = digit in "013456789"
    db = digit in "0235689"
    def bar(x1, y1, x2, y2, active):
        d.rectangle([min(x1, x2), min(y1, y2), max(x1, x2) + t, max(y1, y2) + t],
                    fill=(on if active else off))
    mid = y + (h - t) // 2
    bar(x + t, y, x + s - t, y, a)
    bar(x, y + t, x, mid, f); bar(x + s - t, y + t, x + s - t, mid, b)
    bar(x + t, mid, x + s - t, mid, g)
    bar(x, mid, x, y + h - t, e); bar(x + s - t, mid, x + s - t, y + h - t, c)
    bar(x + t, y + h - t, x + s - t, y + h - t, db)

def abacus(d, x, y, w, h, seed=1):
    """Abacus/soroban frame with rods and beads."""
    d.rectangle([x, y, x + w, y + h], fill=(168, 126, 86), outline=(116, 82, 50), width=3)
    d.rectangle([x + 3, y + 3, x + w - 3, y + h // 2], fill=(224, 202, 168))
    d.rectangle([x + 3, y + h // 2, x + w - 3, y + h - 3], fill=(208, 180, 142))
    d.line([(x + 3, y + h // 2), (x + w - 3, y + h // 2)], fill=(116, 82, 50), width=2)
    rng = __import__("random").Random(seed)
    for i in range(5):
        rx = x + 7 + i * (w - 14) // 4
        d.line([(rx, y + 4), (rx, y + h - 4)], fill=(92, 66, 42), width=2)
        for j in range(3):
            d.ellipse([rx - 4, y + 5 + j * 6, rx + 4, y + 11 + j * 6], fill=(240, 236, 228))
        for j in range(2):
            d.ellipse([rx - 4, y + h - 18 + j * 6, rx + 4, y + h - 12 + j * 6], fill=AMBER)

@tile("math_wall")
def _(d):
    """Bright white wall — azure + amber bands, subtle geometry."""
    wall_base(face=(247, 248, 250))(d)
    d.rectangle([0, TW - 24, TW, TW - 19], fill=NG_BLUE)
    d.rectangle([0, TW - 19, TW, TW - 14], fill=AMBER)
    d.ellipse([20, 58, 28, 66], fill=(212, 228, 242))
    d.polygon([(84, 56), (94, 70), (74, 70)], fill=(216, 230, 242))
    d.rectangle([52, 92, 64, 104], fill=(222, 232, 244))

@tile("math_title")
def _(d):
    """Identity panel: 🧠 تحدي العقل — navy + amber gear + lightning."""
    wall_base()(d)
    d.rectangle([4, 42, TW - 4, TW - 16], fill=NG_NAVY, outline=(16, 40, 60), width=3)
    d.rectangle([4, 42, TW - 4, 48], fill=NG_BLUE)
    d.rectangle([4, TW - 22, TW - 4, TW - 16], fill=AMBER)
    gx, gy, gr = 42, 78, 18
    for a in range(0, 360, 45):
        import math as _m
        tx = gx + int(_m.cos(_m.radians(a)) * (gr + 5))
        ty = gy + int(_m.sin(_m.radians(a)) * (gr + 5))
        d.rectangle([tx - 4, ty - 4, tx + 4, ty + 4], fill=AMBER)
    d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=AMBER)
    d.ellipse([gx - 7, gy - 7, gx + 7, gy + 7], fill=NG_NAVY)
    d.polygon([(86, 52), (104, 52), (94, 72), (106, 72), (82, 102), (90, 80), (78, 80)],
              fill=(255, 224, 120))
    d.ellipse([70, 100, 78, 108], fill=NG_BLUE)

@tile("math_quote")
def _(d):
    """Bright card with geometric shapes + text lines."""
    wall_base()(d)
    d.rounded_rectangle([10, 48, 106, 96], radius=12, fill=WHITE, outline=NG_BLUE_D, width=3)
    d.ellipse([20, 62, 34, 76], fill=NG_BLUE)
    d.polygon([(48, 76), (60, 60), (60, 76)], fill=AMBER)
    d.rectangle([70, 62, 84, 76], fill=NG_NAVY)
    for y in (82, ):
        d.line([(22, y), (94, y)], fill=(150, 170, 190), width=3)

@tile("math_board")
def _(d):
    """Strategy whiteboard: number blocks + regrouping + make-10 circle."""
    wall_base()(d)
    d.rectangle([6, 44, TW - 6, TW - 16], fill=(250, 252, 250), outline=(70, 78, 88), width=3)
    for i in range(3):
        d.rectangle([12 + i * 18, 52, 28 + i * 18, 76], fill=NG_BLUE, outline=NG_BLUE_D, width=2)
    d.line([(68, 60), (68, 72)], fill=INK, width=3)
    d.line([(62, 66), (74, 66)], fill=INK, width=3)
    for i in range(2):
        d.rectangle([78 + i * 18, 52, 94 + i * 18, 76], fill=AMBER, outline=AMBER_D, width=2)
    d.line([(104, 64), (112, 64)], fill=BRASS, width=4)
    d.polygon([(112, 58), (118, 64), (112, 70)], fill=BRASS)
    d.ellipse([16, 84, 44, 108], outline=NG_BLUE_D, width=3)
    for i in range(10):
        import math as _m
        a = _m.radians(-90 + i * 36)
        d.ellipse([24 + int(_m.cos(a) * 11) - 3, 96 + int(_m.sin(a) * 9) - 3,
                   24 + int(_m.cos(a) * 11) + 3, 96 + int(_m.sin(a) * 9) + 3],
                  fill=AMBER if i < 8 else NG_BLUE_D)
    for y in (86, 96, 106):
        d.line([(56, y), (114, y)], fill=(150, 170, 190), width=3)
    for x in range(12, 40, 8):
        d.line([(x, 116), (x + 4, 112)], fill=NG_BLUE_D, width=2)

@tile("timer_wall")
def _(d):
    """Big digital timer: 7-seg 05:00 in amber + start/reset buttons."""
    wall_base()(d)
    d.rectangle([6, 40, TW - 6, TW - 16], fill=(18, 22, 30), outline=(8, 10, 14), width=3)
    ON, OFF = (255, 200, 80), (40, 46, 56)
    seg7(d, 14, 52, 20, "0", ON, OFF)
    seg7(d, 44, 52, 20, "5", ON, OFF)
    d.rectangle([72, 58, 78, 66], fill=ON)
    d.rectangle([72, 74, 78, 82], fill=ON)
    seg7(d, 86, 52, 20, "0", ON, OFF)
    d.ellipse([20, 96, 36, 112], fill=(220, 70, 60), outline=(140, 40, 34), width=2)
    d.ellipse([44, 96, 60, 112], fill=(80, 190, 110), outline=(40, 120, 66), width=2)
    d.rectangle([80, 98, 114, 110], fill=(60, 68, 80))

@tile("challenge_board")
def _(d):
    """Challenge board: number chips + plus + question + lightning (seamless)."""
    wall_base()(d)
    d.rectangle([6, 42, TW - 6, TW - 16], fill=(26, 34, 46), outline=(12, 16, 24), width=3)
    for i, c in enumerate([NG_BLUE, AMBER, (224, 112, 92)]):
        d.rounded_rectangle([12 + i * 22, 52, 30 + i * 22, 78], radius=5,
                            fill=WHITE, outline=c, width=3)
        d.line([(17 + i * 22, 60), (25 + i * 22, 60)], fill=c, width=3)
        d.line([(17 + i * 22, 68), (23 + i * 22, 68)], fill=(180, 188, 198), width=2)
    d.line([(84, 58), (84, 72)], fill=WHITE, width=4)
    d.line([(77, 65), (91, 65)], fill=WHITE, width=4)
    d.rounded_rectangle([98, 52, 118, 78], radius=5, fill=(255, 224, 120), outline=(200, 160, 60), width=2)
    d.arc([103, 55, 113, 68], 210, 110, fill=(120, 90, 30), width=3)
    d.line([(108, 65), (108, 70)], fill=(120, 90, 30), width=3)
    d.ellipse([106, 72, 110, 76], fill=(120, 90, 30))
    d.polygon([(18, 88), (30, 88), (24, 100), (32, 100), (16, 116), (21, 102), (14, 102)],
              fill=(255, 224, 120))
    d.rectangle([44, 96, 114, 106], fill=(60, 70, 84))
    d.rectangle([44, 96, 84, 106], fill=AMBER)

@tile("level_board")
def _(d):
    """Level board: stars + badges, motivating (no pressure)."""
    wall_base()(d)
    d.rectangle([6, 42, TW - 6, TW - 16], fill=(246, 248, 250), outline=(120, 132, 146), width=3)
    d.rectangle([6, 42, TW - 6, 52], fill=NG_BLUE)
    for i, (y, n) in enumerate([(62, 1), (80, 2), (98, 3)]):
        for k in range(n):
            sx = 16 + k * 16
            d.polygon([(sx, y), (sx + 4, y + 7), (sx + 12, y + 7), (sx + 6, y + 12),
                       (sx + 8, y + 20), (sx, y + 15), (sx - 8, y + 20), (sx - 6, y + 12),
                       (sx - 12, y + 7), (sx - 4, y + 7)], fill=AMBER if i < 2 else (200, 155, 60))
        for k in range(4):
            d.ellipse([56 + k * 16, y + 6, 64 + k * 16, y + 14],
                      fill=[NG_BLUE, (63, 163, 156), (142, 124, 195), (224, 112, 92)][k])
        d.rectangle([112, y + 4, 120, y + 12], fill=(222, 228, 236))

@tile("math_floor")
def _(d):
    """Bright light-blue floor, very subtle geometry (seamless-ish)."""
    d.rectangle([0, 0, TW, TW], fill=(235, 242, 248))
    d.ellipse([14, 14, 22, 22], fill=(222, 232, 242))
    d.polygon([(96, 20), (106, 34), (86, 34)], fill=(224, 234, 244))
    d.rectangle([60, 96, 72, 108], fill=(224, 234, 244))
    d.line([(30, 100), (38, 100)], fill=(222, 232, 242), width=3)
    d.line([(34, 96), (34, 104)], fill=(222, 232, 242), width=3)
    d.rectangle([0, 0, TW - 1, TW - 1], outline=(226, 234, 244), width=1)

@tile("math_rug")
def _(d):
    """Bright azure rug with amber/white diamond weave (seamless)."""
    d.rectangle([0, 0, TW, TW], fill=(202, 226, 242))
    for x in range(-TW, TW + TW, TW // 2):
        d.line([(x, 0), (x + TW, TW)], fill=(184, 212, 232), width=3)
        d.line([(x + TW, 0), (x, TW)], fill=(184, 212, 232), width=3)
    speckle(d, (4, 4, TW - 4, TW - 4), (240, 190, 110), 6, 2)
    speckle(d, (4, 4, TW - 4, TW - 4), (255, 255, 255), 10, 2)

@tile("math_table")
def _(d):
    """Small bright table for 2 kids — two abaci + paper + card."""
    d.rectangle([0, 0, TW, TW], fill=(233, 229, 221), outline=(172, 166, 156), width=3)
    abacus(d, 8, 14, 52, 40, seed=7)
    abacus(d, 68, 14, 52, 40, seed=13)
    d.rectangle([26, 72, 52, 110], fill=WHITE, outline=(200, 202, 206), width=1)
    for y in (80, 90, 100):
        d.line([(30, y), (48, y)], fill=(170, 178, 188), width=2)
    d.rounded_rectangle([78, 74, 104, 108], radius=4, fill=AMBER, outline=AMBER_D, width=2)
    d.line([(84, 84), (98, 84)], fill=(150, 100, 30), width=3)
    d.line([(84, 94), (94, 94)], fill=(150, 100, 30), width=2)

@tile("math_table4")
def _(d):
    """Wide bright table for 4 kids — four abaci (2x2)."""
    d.rectangle([0, 0, TW, TW], fill=(233, 229, 221), outline=(172, 166, 156), width=3)
    abacus(d, 6, 10, 54, 46, seed=21)
    abacus(d, 68, 10, 54, 46, seed=33)
    abacus(d, 6, 72, 54, 46, seed=45)
    abacus(d, 68, 72, 54, 46, seed=57)

@tile("math_chair")
def _(d):
    """Light chair — white seat, azure frame (easy to move)."""
    d.rounded_rectangle([18, 14, 46, 42], radius=6, fill=(250, 252, 254), outline=NG_BLUE_D, width=2)
    d.rounded_rectangle([14, 2, 50, 14], radius=4, fill=NG_BLUE, outline=NG_BLUE_D, width=2)

@tile("math_cabinet")
def _(d):
    """Low bright cabinet: number cards + operation cards + mini abacus."""
    d.rectangle([2, 8, TW - 2, TW - 8], fill=(240, 244, 248), outline=NG_NAVY, width=3)
    for i, c in enumerate([AMBER, NG_BLUE, (224, 112, 92), (63, 163, 156)]):
        d.rectangle([10 + i * 26, 14, 32 + i * 26, 42], fill=WHITE, outline=c, width=2)
        d.line([(16 + i * 26, 22), (26 + i * 26, 22)], fill=c, width=3)
        d.line([(16 + i * 26, 30), (22 + i * 26, 30)], fill=(190, 196, 204), width=2)
    d.rectangle([10, 52, 70, 104], fill=(164, 124, 84), outline=(116, 82, 50), width=2)
    for i in range(4):
        rx = 18 + i * 14
        d.line([(rx, 56), (rx, 100)], fill=(92, 66, 42), width=2)
        d.ellipse([rx - 3, 82, rx + 3, 90], fill=AMBER)
        d.ellipse([rx - 3, 64, rx + 3, 72], fill=(240, 236, 228))
    for i, c in enumerate([(224, 112, 92), NG_BLUE, AMBER]):
        d.rectangle([78 + i * 16, 60 + i * 14, 94 + i * 16, 76 + i * 14], fill=c)

@tile("block_box")
def _(d):
    """Crate of counting blocks (visual counting tools)."""
    d.rectangle([6, 26, TW - 6, TW - 10], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([10, 30, TW - 10, TW - 14], fill=(96, 64, 40))
    for i, c in enumerate([AMBER, NG_BLUE, (224, 112, 92), (63, 163, 156), (142, 124, 195)]):
        d.rectangle([14 + (i % 3) * 30, 44 + (i // 3) * 26, 40 + (i % 3) * 30, 70 + (i // 3) * 26],
                    fill=c, outline=(60, 40, 24), width=2)
        d.line([(18 + (i % 3) * 30, 52 + (i // 3) * 26), (36 + (i % 3) * 30, 52 + (i // 3) * 26)],
               fill=(255, 255, 255), width=2)

# ============================================================
# CHESS — فصل الشطرنج (premium, calm, strategic)
# ============================================================
def knight(d, cx, cy, h, fill, eye=(30, 32, 36)):
    """Knight silhouette ~h SS-px tall, centred on (cx, cy)."""
    u = h / 40.0
    d.polygon([(cx - 10 * u, cy + 18 * u), (cx - 11 * u, cy + 2 * u), (cx - 7 * u, cy - 8 * u),
               (cx - 2 * u, cy - 16 * u), (cx + 8 * u, cy - 18 * u), (cx + 12 * u, cy - 12 * u),
               (cx + 8 * u, cy - 6 * u), (cx + 4 * u, cy - 2 * u), (cx + 3 * u, cy + 8 * u),
               (cx + 2 * u, cy + 18 * u)], fill=fill)
    d.ellipse([cx + 5 * u, cy - 12 * u, cx + 8 * u, cy - 9 * u], fill=eye)

def piece(d, x, y, kind, white=True, sq=32):
    """Chess piece centred in a square (x, y) of size sq (SS px)."""
    u = sq / 32.0
    c = (250, 249, 244) if white else (28, 30, 34)
    o = (70, 74, 80) if white else (205, 210, 218)
    cx, cy = x + sq / 2, y + sq / 2
    if kind == "P":
        d.ellipse([cx - 5 * u, cy - 9 * u, cx + 5 * u, cy + 1 * u], fill=c, outline=o, width=max(1, int(2 * u)))
        d.rectangle([cx - 7 * u, cy + 1 * u, cx + 7 * u, cy + 8 * u], fill=c, outline=o, width=max(1, int(u)))
    elif kind == "R":
        d.rectangle([cx - 6 * u, cy - 4 * u, cx + 6 * u, cy + 6 * u], fill=c, outline=o, width=max(1, int(2 * u)))
        for dx in (-6, -1, 4):
            d.rectangle([cx + dx * u, cy - 9 * u, cx + (dx + 3) * u, cy - 4 * u], fill=c, outline=o, width=max(1, int(u)))
        d.rectangle([cx - 8 * u, cy + 6 * u, cx + 8 * u, cy + 10 * u], fill=c, outline=o, width=max(1, int(u)))
    elif kind == "B":
        d.ellipse([cx - 6 * u, cy - 9 * u, cx + 6 * u, cy + 5 * u], fill=c, outline=o, width=max(1, int(2 * u)))
        d.line([(cx, cy - 9 * u), (cx, cy - 13 * u)], fill=o, width=max(1, int(2 * u)))
        d.rectangle([cx - 8 * u, cy + 5 * u, cx + 8 * u, cy + 10 * u], fill=c, outline=o, width=max(1, int(u)))
    elif kind == "N":
        d.polygon([(cx - 7 * u, cy + 8 * u), (cx - 6 * u, cy - 3 * u), (cx - 2 * u, cy - 9 * u),
                   (cx + 6 * u, cy - 8 * u), (cx + 7 * u, cy - 2 * u), (cx + 2 * u, cy + 1 * u),
                   (cx + 1 * u, cy + 4 * u), (cx + 2 * u, cy + 8 * u)], fill=c, outline=o)
        d.rectangle([cx - 8 * u, cy + 8 * u, cx + 3 * u, cy + 12 * u], fill=c, outline=o, width=max(1, int(u)))
    elif kind == "Q":
        d.ellipse([cx - 6 * u, cy - 5 * u, cx + 6 * u, cy + 8 * u], fill=c, outline=o, width=max(1, int(2 * u)))
        for dx in (-6, 0, 6):
            d.ellipse([cx + (dx - 2) * u, cy - 12 * u, cx + (dx + 2) * u, cy - 8 * u], fill=c, outline=o, width=max(1, int(u)))
        d.rectangle([cx - 8 * u, cy + 8 * u, cx + 8 * u, cy + 12 * u], fill=c, outline=o, width=max(1, int(u)))
    elif kind == "K":
        d.ellipse([cx - 6 * u, cy - 5 * u, cx + 6 * u, cy + 8 * u], fill=c, outline=o, width=max(1, int(2 * u)))
        d.line([(cx, cy - 14 * u), (cx, cy - 6 * u)], fill=c, width=max(1, int(3 * u)))
        d.line([(cx - 4 * u, cy - 10 * u), (cx + 4 * u, cy - 10 * u)], fill=c, width=max(1, int(3 * u)))
        d.rectangle([cx - 8 * u, cy + 8 * u, cx + 8 * u, cy + 12 * u], fill=c, outline=o, width=max(1, int(u)))

@tile("wall_chess")
def _(d):
    """Bright premium wall — navy + brass strip, faint knight watermark."""
    wall_base(face=(247, 247, 245))(d)
    d.rectangle([0, TW - 24, TW, TW - 18], fill=NG_NAVY)
    d.rectangle([0, TW - 18, TW, TW - 14], fill=BRASS)
    knight(d, 64, 74, 30, (226, 228, 231))

@tile("chess_title")
def _(d):
    """Identity panel: navy + gold trim + gold knight (♟ عالم الشطرنج)."""
    wall_base()(d)
    d.rectangle([4, 44, TW - 4, TW - 16], fill=NG_NAVY, outline=(16, 40, 60), width=3)
    d.rectangle([4, 44, TW - 4, 50], fill=BRASS)
    d.rectangle([4, TW - 22, TW - 4, TW - 16], fill=BRASS)
    knight(d, 48, 80, 34, (255, 224, 120))
    d.ellipse([82, 70, 90, 78], fill=NG_BLUE)
    d.ellipse([94, 82, 102, 90], fill=NG_BLUE)
    d.rectangle([80, 96, 104, 100], fill=(120, 150, 180))

@tile("chess_movements")
def _(d):
    """Whiteboard: knight L-move, bishop diagonal, rook line."""
    wall_base()(d)
    d.rectangle([6, 44, TW - 6, TW - 16], fill=(250, 252, 250), outline=(70, 78, 88), width=3)
    for x in range(6, 122, 18):
        d.line([(x, 48), (x, TW - 20)], fill=(232, 238, 244), width=1)
    for y in range(48, TW - 20, 18):
        d.line([(10, y), (TW - 10, y)], fill=(232, 238, 244), width=1)
    d.line([(20, 96), (20, 72), (46, 72)], fill=BRASS, width=4)
    d.ellipse([15, 91, 25, 101], fill=BRASS)
    d.ellipse([41, 67, 51, 77], fill=BRASS)
    d.line([(66, 102), (102, 66)], fill=NG_BLUE_D, width=4)
    d.ellipse([61, 97, 71, 107], fill=NG_BLUE_D)
    d.ellipse([97, 61, 107, 71], fill=NG_BLUE_D)
    d.line([(72, 84), (110, 84)], fill=(150, 90, 60), width=4)
    d.ellipse([67, 79, 77, 89], fill=(150, 90, 60))
    d.ellipse([105, 79, 115, 89], fill=(150, 90, 60))

@tile("chess_puzzle")
def _(d):
    """Puzzle board: mini chessboard with pieces + question mark."""
    wall_base()(d)
    d.rectangle([8, 42, TW - 8, TW - 14], fill=(56, 40, 30), outline=WOOD_D, width=3)
    for r in range(8):
        for c in range(8):
            d.rectangle([12 + c * 13, 46 + r * 13, 12 + (c + 1) * 13, 46 + (r + 1) * 13],
                        fill=(233, 228, 214) if (r + c) % 2 else (64, 46, 34))
    piece(d, 12 + 1 * 13, 46 + 3 * 13, "R", True, sq=13)
    piece(d, 12 + 4 * 13, 46 + 1 * 13, "Q", False, sq=13)
    piece(d, 12 + 5 * 13, 46 + 4 * 13, "K", True, sq=13)
    d.arc([96, 50, 118, 74], 210, 110, fill=(255, 224, 120), width=5)
    d.line([(107, 70), (107, 80)], fill=(255, 224, 120), width=5)
    d.ellipse([103, 84, 111, 92], fill=(255, 224, 120))

@tile("tournament")
def _(d):
    """Tournament scoreboard: three ranked rows (gold/silver/bronze)."""
    wall_base()(d)
    d.rectangle([6, 42, TW - 6, TW - 16], fill=(24, 30, 38), outline=(12, 16, 22), width=3)
    d.rectangle([6, 42, TW - 6, 53], fill=NG_BLUE_D)
    for i, (c, y) in enumerate([(BRASS, 62), ((205, 210, 216), 80), ((166, 116, 84), 98)]):
        d.ellipse([14, y, 27, y + 13], fill=c, outline=(20, 24, 30), width=2)
        d.rectangle([34, y + 2, 94, y + 11], fill=(96, 108, 122))
        d.rectangle([100, y + 2, 114, y + 11], fill=(150, 162, 176))

@tile("quote_chess")
def _(d):
    """Wall quote card with a navy knight and text lines."""
    wall_base()(d)
    d.rounded_rectangle([10, 48, 106, 96], radius=12, fill=WHITE, outline=NG_NAVY, width=3)
    knight(d, 34, 72, 24, NG_NAVY)
    for y in (60, 72, 84):
        d.line([(54, y), (96, y)], fill=(150, 170, 190), width=3)

@tile("chess_deck")
def _(d):
    """Raised dark-wood training platform (lit top rim)."""
    d.rectangle([0, 0, TW, TW], fill=(92, 62, 40))
    for row in range(4):
        y = row * TW // 4
        d.line([(0, y), (TW, y)], fill=(66, 44, 28), width=2)
        off = (row % 2) * TW // 4
        for x in range(off, TW, TW // 2):
            d.line([(x, y), (x, y + TW // 4)], fill=(66, 44, 28), width=2)
    d.rectangle([0, 0, TW, 5], fill=(150, 108, 68))

@tile("chess_table")
def _(d):
    """Chess table — clear board with pieces (variant A)."""
    d.rectangle([0, 0, TW, TW], fill=WOOD_D)
    d.rectangle([5, 5, TW - 5, TW - 5], fill=(122, 86, 54))
    for r in range(8):
        for c in range(8):
            d.rectangle([10 + c * 14, 10 + r * 14, 10 + (c + 1) * 14, 10 + (r + 1) * 14],
                        fill=(235, 230, 216) if (r + c) % 2 else (60, 44, 32))
    for c, r, kind, w in [(2, 4, "P", True), (1, 6, "R", True), (4, 7, "K", True),
                          (5, 3, "P", False), (4, 2, "N", False), (6, 1, "Q", False)]:
        piece(d, 10 + c * 14, 10 + r * 14, kind, w, sq=14)

@tile("chess_table2")
def _(d):
    """Chess table — clear board with pieces (variant B)."""
    d.rectangle([0, 0, TW, TW], fill=WOOD_D)
    d.rectangle([5, 5, TW - 5, TW - 5], fill=(122, 86, 54))
    for r in range(8):
        for c in range(8):
            d.rectangle([10 + c * 14, 10 + r * 14, 10 + (c + 1) * 14, 10 + (r + 1) * 14],
                        fill=(235, 230, 216) if (r + c) % 2 else (60, 44, 32))
    for c, r, kind, w in [(3, 5, "Q", True), (4, 3, "P", True), (1, 4, "B", True),
                          (6, 5, "R", False), (3, 2, "N", False), (5, 4, "P", False)]:
        piece(d, 10 + c * 14, 10 + r * 14, kind, w, sq=14)

@tile("chess_chair")
def _(d):
    """Simple charcoal player chair (light, movable)."""
    d.rounded_rectangle([18, 14, 46, 42], radius=6, fill=(58, 64, 72), outline=(28, 32, 38), width=2)
    d.rounded_rectangle([14, 2, 50, 14], radius=4, fill=(74, 82, 92), outline=(28, 32, 38), width=2)

@tile("chess_cabinet")
def _(d):
    """Low cabinet with a chess-set drawer (mini board motif)."""
    d.rectangle([2, 8, TW - 2, TW - 8], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([8, 14, TW - 8, 62], fill=(184, 144, 100), outline=WOOD_D, width=2)
    for r in range(4):
        for c in range(6):
            d.rectangle([14 + c * 16, 20 + r * 11, 14 + (c + 1) * 16, 20 + (r + 1) * 11],
                        fill=(235, 230, 216) if (r + c) % 2 else (70, 50, 38))
    d.rectangle([8, 68, TW - 8, 112], fill=(164, 122, 82), outline=WOOD_D, width=2)
    d.rectangle([40, 86, 84, 94], fill=(110, 80, 50))
    d.rectangle([10, TW - 14, 22, TW - 6], fill=WOOD_D)
    d.rectangle([TW - 22, TW - 14, TW - 10, TW - 6], fill=WOOD_D)

def _board_corner(d, r0, c0):
    for r in range(4):
        for c in range(4):
            rr, cc = r0 + r, c0 + c
            d.rectangle([c * 32, r * 32, (c + 1) * 32, (r + 1) * 32],
                        fill=(233, 228, 214) if (rr + cc) % 2 else (64, 46, 34))

@tile("board_ul")
def _(d):
    _board_corner(d, 0, 0)
    piece(d, 0 * 32, 0 * 32, "R", False)
    piece(d, 2 * 32, 2 * 32, "N", False)
    piece(d, 1 * 32, 3 * 32, "B", True)

@tile("board_ur")
def _(d):
    _board_corner(d, 0, 4)
    piece(d, 4 * 32, 0 * 32, "K", False)
    piece(d, 4 * 32, 3 * 32, "P", False)

@tile("board_dl")
def _(d):
    _board_corner(d, 4, 0)
    piece(d, 0 * 32, 6 * 32, "P", True)
    piece(d, 2 * 32, 4 * 32, "B", True)
    piece(d, 0 * 32, 7 * 32, "R", True)
    piece(d, 3 * 32, 7 * 32, "Q", True)

@tile("board_dr")
def _(d):
    _board_corner(d, 4, 4)
    piece(d, 4 * 32, 4 * 32, "P", True)
    piece(d, 4 * 32, 7 * 32, "K", True)

@tile("trainer_desk")
def _(d):
    """Small trainer desk: laptop + chess clock + score papers."""
    d.rectangle([2, 6, TW - 2, TW - 10], fill=WOOD_D, outline=(70, 45, 28), width=3)
    d.rectangle([8, 12, 62, 44], fill=(60, 64, 70))
    d.rectangle([12, 16, 58, 40], fill=(120, 180, 220))
    d.rectangle([70, 12, 118, 46], fill=(28, 30, 34), outline=(12, 14, 16), width=2)
    d.rectangle([76, 18, 92, 34], fill=(235, 90, 78))
    d.rectangle([96, 18, 112, 34], fill=(255, 236, 170))
    d.rectangle([16, 54, 56, 96], fill=WHITE)
    d.line([(22, 64), (50, 64)], fill=(170, 178, 188), width=3)
    d.line([(22, 76), (46, 76)], fill=(170, 178, 188), width=3)
    d.line([(22, 88), (50, 88)], fill=(170, 178, 188), width=3)
    d.rectangle([70, 56, 112, 92], fill=(255, 244, 200), outline=(210, 180, 80), width=2)
    d.arc([78, 62, 98, 80], 210, 110, fill=(140, 100, 40), width=4)
    d.line([(88, 76), (88, 86)], fill=(140, 100, 40), width=4)

@tile("chess_rug")
def _(d):
    """Calm light blue-grey carpet, subtle diamond weave (seamless)."""
    d.rectangle([0, 0, TW, TW], fill=(213, 221, 228))
    for x in range(-TW, TW + TW, TW // 2):
        d.line([(x, 0), (x + TW, TW)], fill=(197, 207, 215), width=3)
        d.line([(x + TW, 0), (x, TW)], fill=(197, 207, 215), width=3)
    speckle(d, (4, 4, TW - 4, TW - 4), (172, 190, 205), 8, 2)
@tile("wall_club")
def _(d):
    """Bright modern wall with a 4-colour accent stripe at the base."""
    wall_base(face=(247, 246, 243))(d)
    d.rectangle([0, TW - 26, TW, TW - 20], fill=NG_BLUE)
    d.rectangle([0, TW - 20, TW, TW - 15], fill=TEAL)
    d.rectangle([0, TW - 15, TW, TW - 10], fill=AMBER)
    d.rectangle([0, TW - 10, TW, TW - 6], fill=LILAC)

@tile("chair_amber")
def _(d):
    """Round modern shell armchair — amber (with armring)."""
    d.ellipse([14, 14, 114, 114], fill=AMBER_D)
    d.ellipse([20, 20, 108, 108], fill=AMBER)
    d.ellipse([38, 38, 90, 90], fill=(243, 200, 128))
    d.ellipse([55, 55, 73, 73], fill=AMBER_D)
    d.ellipse([14, 14, 114, 114], outline=(140, 96, 28), width=3)

@tile("chair_teal")
def _(d):
    """Round armless lounge chair — teal."""
    d.ellipse([18, 18, 110, 110], fill=TEAL, outline=TEAL_D, width=4)
    d.ellipse([34, 34, 94, 94], fill=(150, 210, 204))
    d.ellipse([52, 52, 76, 76], fill=TEAL_D)

@tile("chair_lilac")
def _(d):
    """Round high-back shell chair — lilac."""
    d.ellipse([10, 10, 118, 118], fill=LILAC_D)
    d.ellipse([16, 16, 112, 112], fill=LILAC)
    d.ellipse([36, 36, 92, 92], fill=(192, 178, 226))
    d.ellipse([54, 54, 74, 74], fill=LILAC_D)

@tile("chair_coral")
def _(d):
    """Round low-back chair — coral."""
    d.ellipse([22, 22, 106, 106], fill=CORAL, outline=CORAL_D, width=4)
    d.ellipse([38, 38, 90, 90], fill=(245, 182, 162))
    d.ellipse([56, 56, 72, 72], fill=CORAL_D)

@tile("table_low")
def _(d):
    """Low round wooden table — the dialogue centre."""
    d.ellipse([16, 30, 112, 116], fill=(90, 62, 38))
    d.ellipse([10, 14, 118, 104], fill=WOOD_D)
    d.ellipse([16, 18, 112, 98], fill=(198, 154, 110))
    d.ellipse([40, 32, 88, 82], fill=(224, 186, 142))
    d.ellipse([56, 44, 76, 66], fill=(250, 238, 205))  # tea cup

@tile("club_rug")
def _(d):
    """Warm woven rug (seamless diamond weave + soft dots)."""
    d.rectangle([0, 0, TW, TW], fill=(244, 236, 220))
    for x in range(-TW, TW + TW, TW // 2):
        d.line([(x, 0), (x + TW, TW)], fill=(224, 210, 186), width=3)
        d.line([(x + TW, 0), (x, TW)], fill=(224, 210, 186), width=3)
    speckle(d, (4, 4, TW - 4, TW - 4), (150, 190, 215), 8, 2)
    speckle(d, (4, 4, TW - 4, TW - 4), (226, 170, 92), 5, 2)

@tile("cushion_a")
def _(d):
    """Round floor pouf — azure."""
    d.ellipse([16, 24, 112, 114], fill=NG_NAVY)
    d.ellipse([10, 12, 106, 102], fill=NG_BLUE)
    d.ellipse([30, 28, 86, 84], outline=NG_NAVY, width=3)
    d.ellipse([50, 46, 66, 62], fill=NG_NAVY)

@tile("cushion_b")
def _(d):
    """Round floor pouf — amber."""
    d.ellipse([16, 24, 112, 114], fill=AMBER_D)
    d.ellipse([10, 12, 106, 102], fill=AMBER)
    d.ellipse([30, 28, 86, 84], outline=AMBER_D, width=3)
    d.ellipse([50, 46, 66, 62], fill=AMBER_D)

@tile("club_sign")
def _(d):
    """Club identity band — navy panel, gold trim, spark + blue ring (seamless)."""
    d.rectangle([0, 6, TW, TW - 6], fill=NG_NAVY, outline=(16, 40, 60), width=3)
    d.rectangle([0, 6, TW, 13], fill=BRASS)
    d.rectangle([0, TW - 13, TW, TW - 6], fill=BRASS)
    cx, cy = TW // 2, TW // 2
    d.polygon([(cx, cy - 24), (cx + 7, cy - 7), (cx + 24, cy), (cx + 7, cy + 7),
               (cx, cy + 24), (cx - 7, cy + 7), (cx - 24, cy), (cx - 7, cy - 7)],
              fill=(255, 236, 170))
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=NG_BLUE, width=3)
    d.ellipse([14, cy - 4, 22, cy + 4], fill=NG_BLUE)
    d.ellipse([TW - 22, cy - 4, TW - 14, cy + 4], fill=NG_BLUE)

@tile("idea_board")
def _(d):
    """Big whiteboard (موضوع اليوم) — notes + question mark (seamless repeat)."""
    wall_base()(d)
    d.rectangle([4, 46, TW - 4, TW - 20], fill=(250, 252, 250), outline=(70, 78, 88), width=3)
    for x in range(20, TW, 28):
        d.line([(x, 50), (x, TW - 24)], fill=(232, 238, 244), width=1)
    d.rectangle([12, 54, 40, 82], fill=(255, 224, 120), outline=(210, 180, 80), width=1)
    d.ellipse([23, 52, 29, 58], fill=CORAL)
    for y in (62, 70, 78):
        d.line([(16, y), (36, y)], fill=(190, 160, 70), width=2)
    d.arc([52, 54, 84, 84], 210, 110, fill=INK, width=5)
    d.line([(68, 74), (68, 86)], fill=INK, width=5)
    d.ellipse([64, 90, 72, 98], fill=INK)
    for y in (96, 104):
        d.line([(92, y), (TW - 12, y)], fill=(160, 180, 200), width=2)

@tile("question_board")
def _(d):
    """Cork board with pinned question cards (seamless vertical)."""
    wall_base()(d)
    d.rectangle([10, 40, TW - 10, TW - 14], fill=CORK, outline=WOOD_D, width=3)
    d.rectangle([16, 50, 54, 92], fill=WHITE, outline=(205, 205, 200), width=1)
    d.ellipse([18, 48, 24, 54], fill=CORAL)
    d.arc([24, 56, 46, 78], 210, 110, fill=INK, width=4)
    d.line([(35, 74), (35, 82)], fill=INK, width=4)
    d.ellipse([32, 86, 38, 92], fill=INK)
    d.rectangle([60, 58, 96, 94], fill=(255, 244, 200), outline=(205, 205, 200), width=1)
    d.ellipse([62, 56, 68, 62], fill=TEAL)
    d.arc([68, 64, 88, 82], 210, 110, fill=(120, 90, 40), width=3)
    d.line([(78, 78), (78, 86)], fill=(120, 90, 40), width=3)
    d.ellipse([75, 90, 81, 96], fill=(120, 90, 40))

@tile("idea_wall")
def _(d):
    """Wall of small opinion cards (2x2 per tile, seamless)."""
    wall_base(face=(246, 244, 240))(d)
    for i, (x, y, c) in enumerate([(10, 46, AMBER), (58, 46, TEAL), (10, 86, LILAC), (58, 86, CORAL)]):
        d.rectangle([x, y, x + 38, y + 32], fill=WHITE, outline=c, width=2)
        d.line([(x + 6, y + 10), (x + 32, y + 10)], fill=c, width=3)
        d.line([(x + 6, y + 20), (x + 26, y + 20)], fill=(185, 185, 185), width=2)
        d.ellipse([x + 16, y - 3, x + 22, y + 3], fill=INK)

@tile("quote_wall")
def _(d):
    """Wall quote: speech bubble with three dots («هنا صوتك مهم»)."""
    wall_base()(d)
    d.rounded_rectangle([14, 50, 102, 92], radius=14, fill=WHITE, outline=NG_BLUE_D, width=3)
    d.polygon([(34, 90), (52, 90), (34, 106)], fill=WHITE, outline=NG_BLUE_D, width=3)
    for i, c in enumerate([AMBER, TEAL, LILAC]):
        d.ellipse([30 + i * 18, 66, 40 + i * 18, 76], fill=c)

@tile("mic_small")
def _(d):
    """Small symbolic desktop microphone (دور المتحدث)."""
    d.ellipse([28, 88, 100, 114], fill=(40, 44, 50))
    d.rectangle([56, 44, 68, 90], fill=(60, 64, 70))
    d.rounded_rectangle([42, 8, 86, 52], radius=16, fill=(30, 32, 36), outline=(10, 12, 14), width=2)
    for y in range(18, 48, 8):
        d.line([(50, y), (78, y)], fill=(90, 96, 104), width=2)
    d.rectangle([42, 26, 86, 34], fill=AMBER)

@tile("puzzle_box")
def _(d):
    """Open box of thinking games: pieces, gear, dice."""
    d.rectangle([10, 40, 118, 110], fill=WOOD, outline=WOOD_D, width=3)
    d.rectangle([16, 46, 112, 104], fill=(92, 60, 36))
    for (x, y, c) in [(22, 54, AMBER), (52, 60, TEAL), (84, 52, LILAC), (58, 84, CORAL)]:
        d.rectangle([x, y, x + 22, y + 22], fill=c)
        d.ellipse([x + 5, y - 7, x + 17, y + 5], fill=c)
        d.ellipse([x + 17, y + 5, x + 29, y + 17], fill=c)
    d.ellipse([88, 82, 108, 102], fill=BRASS, outline=(140, 105, 30), width=2)
    d.rectangle([22, 84, 44, 106], fill=WHITE, outline=(150, 150, 150), width=2)
    d.ellipse([28, 90, 33, 95], fill=INK); d.ellipse([36, 98, 41, 103], fill=INK)

@tile("card_rack")
def _(d):
    """Small stand with a fan of phrase cards."""
    d.rectangle([16, 96, 112, 108], fill=WOOD_D)
    d.rectangle([58, 72, 70, 98], fill=WOOD)
    for i, c in enumerate([AMBER, TEAL, LILAC, CORAL]):
        x = 26 + i * 18
        d.rectangle([x, 28, x + 26, 80], fill=WHITE, outline=c, width=3)
        d.rectangle([x, 28, x + 26, 40], fill=c)
        d.ellipse([x + 8, 52, x + 18, 62], fill=(185, 185, 185))
        d.line([(x + 6, 68), (x + 20, 68)], fill=(205, 205, 205), width=2)

# name -> (size, x, y) for logo pasting
LOGO_PASTE = {
    "gsign_l": (36, TW // 2 - 18, 2),
    "gsign_r": (36, TW // 2 - 18, 2),
    "sign_board": (36, TW // 2 - 18, 2),
    "mat_logo": (24, 4, 4),
    "recv_logo": (72, TW // 2 - 36, 48),
    "recv_wordmark": (40, TW // 2 - 20, 24),
    "recv_owl": (52, TW // 2 - 26, 18),
}


def build_tileset(logo):
    rows = (len(ORDER) + COLS - 1) // COLS
    sheet_ss = Image.new("RGBA", (COLS * TW, rows * TW), (0, 0, 0, 0))
    for i, (name, fn) in enumerate(ORDER):
        tile_img = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile_img)
        fn(td)
        # paste mini-logo onto sign tiles
        if name in LOGO_PASTE:
            size, px, py = LOGO_PASTE[name]
            mini = logo.resize((size, size), Image.LANCZOS)
            tile_img.paste(mini, (px, py))
        x = (i % COLS) * TW
        y = (i // COLS) * TW
        sheet_ss.paste(tile_img, (x, y))
    sheet = sheet_ss.resize((COLS * T, rows * T), Image.NEAREST)
    sheet.save(os.path.join(ASSETS, "ng-tiles.png"))
    print(f"ng-tiles.png written: {len(ORDER)} tiles, {COLS}x{rows}, firstgid mapping = index+1")
    return {name: i + 1 for i, (name, _) in enumerate(ORDER)}  # gid = index+1 (firstgid=1)

if __name__ == "__main__":
    logo = build_logo()
    gids = build_tileset(logo)
    import json
    with open(os.path.join(HERE, "tile_gids.json"), "w") as f:
        json.dump(gids, f, indent=0)
    print("tile_gids.json written (name -> gid)")
