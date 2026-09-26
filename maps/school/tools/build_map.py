#!/usr/bin/env python3
"""NG Academy map builder — maps/school/map.json + preview.png.

World coordinates (tiles, 136x72 @32px). All section geometry follows the
approved DESIGN.md (single-storey U-shape around the central courtyard).
Run: python3 maps/school/tools/build_map.py   (needs build_assets.py first)
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
ASSETS = os.path.join(ROOT, "assets")
W, H, T = 136, 72, 32

GIDS = json.load(open(os.path.join(HERE, "tile_gids.json")))
def g(name):
    return GIDS[name]

# ---------------------------------------------------------------- grids
layers_def = [
    "start", "collisions", "zones_silent", "zones_jitsi_meeting",
    "zones_jitsi_director", "zones_jitsi_hall", "zones_jitsi_club", "zones_jitsi_chess",
    "zones_jitsi_math", "zones_speaker", "zones_listener",
    "floor", "walls", "furniture", "abovePlayer1", "abovePlayer2",
]
GRID = {n: [[0] * W for _ in range(H)] for n in layers_def}

def stamp(layer, name, x, y, w=1, h=1):
    gid = g(name)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if 0 <= xx < W and 0 <= yy < H:
                GRID[layer][yy][xx] = gid

def solid(name, x, y, w=1, h=1, layer="furniture"):
    """Stamp + mark collisions."""
    stamp(layer, name, x, y, w, h)
    stamp("collisions", "mark_collide", x, y, w, h)

def wall(name, x, y, w=1, h=1, door=False):
    layer = "walls"
    stamp(layer, name, x, y, w, h)
    if not door:
        stamp("collisions", "mark_collide", x, y, w, h)

def fill(layer, name, x, y, w=1, h=1):
    stamp(layer, name, x, y, w, h)

# ================================================================ FLOORS
fill("floor", "floor_grass", 4, 23, 64, 40)                    # courtyard base
fill("floor", "floor_grass", 0, 0, 88, 3)                      # north strip
fill("floor", "floor_grass", 0, 3, 4, 60)                      # west margin
fill("floor", "floor_grass", 84, 3, 4, 60)                     # east margin
fill("floor", "floor_class", 5, 4, 9, 11)                      # عروض x5-13
fill("floor", "floor_class", 15, 4, 7, 11)                     # ف٦
fill("floor", "floor_parquet", 23, 4, 7, 11)                   # ف٥
fill("floor", "floor_class", 31, 4, 7, 11)                     # ف٤
fill("floor", "floor_class", 49, 4, 7, 11)                     # ف٣
fill("floor", "floor_class", 57, 4, 7, 11)                     # ف٢
fill("floor", "floor_parquet", 65, 4, 7, 11)                   # ف١
fill("floor", "floor_class", 73, 4, 10, 11)                    # فنون x73-82
fill("floor", "floor_lobby", 39, 4, 10, 18)                    # ردهة x39-48 y4-21
fill("floor", "floor_corr", 4, 16, 35, 6)                      # corridor west part
fill("floor", "floor_corr", 49, 16, 34, 6)                     # corridor east part
fill("floor", "floor_court", 42, 23, 4, 39)                    # main axis
fill("floor", "floor_court", 20, 39, 22, 2)                    # west path
fill("floor", "floor_court", 46, 39, 21, 2)                    # east path
fill("floor", "floor_court", 40, 37, 8, 7)                     # flag plaza
fill("floor", "floor_path", 13, 23, 5, 40)                     # west corridor
fill("floor", "floor_class", 5, 24, 8, 7)                      # أنشطة x5-12 y24-30
fill("floor", "floor_service", 5, 32, 8, 7)                    # حاسوب
fill("floor", "floor_service", 5, 40, 8, 7)                    # علوم
fill("floor", "floor_parquet", 5, 48, 8, 8)                    # مكتبة y48-55
fill("floor", "floor_lobby", 5, 57, 8, 5)                      # مقصف y58-61 (wall 56/57?)
fill("floor", "floor_service", 5, 57, 8, 5)                    # مقصف flooring service-ish
fill("floor", "floor_wood", 71, 24, 12, 9)                     # مكتب المدير x71-82 y24-32
fill("floor", "floor_carpet", 76, 34, 3, 18)                   # ممر الإدارة x76-78 y34-51
fill("floor", "floor_parquet", 71, 36, 4, 14)                  # غرفة المعلمين x71-74? wait see walls
fill("floor", "floor_parquet", 71, 37, 4, 13)                  # معلمين interior y37-49
fill("floor", "floor_service", 80, 35, 3, 6)                   # أرشيف x80-82 y35-40
fill("floor", "floor_service", 80, 43, 3, 8)                   # شؤون x80-82 y43-50
fill("floor", "floor_lobby", 70, 53, 13, 9)                    # استقبال x70-82 y53-61
fill("floor", "recv_floor", 70, 53, 13, 9)                     # reception — light oak
fill("floor", "recv_rug", 71, 54, 4, 6)                        # waiting-area rug
fill("floor", "floor_corr", 76, 51, 3, 2)                      # corridor→reception link
fill("floor", "floor_corr", 68, 52, 2, 10)                     # glass walk x68-69 y52-61
fill("floor", "floor_corr", 68, 23, 2, 29)                     # glass walk upper
fill("floor", "floor_rubber_g", 54, 48, 12, 12)                # ساحة أنشطة SE
fill("floor", "floor_court", 21, 23, 7, 6)                     # موقف الحافلة NW
fill("floor", "floor_rubber_b", 55, 50, 3, 5)                  # hopscotch base
fill("floor", "floor_service", 22, 56, 4, 3)                   # sandbox base
fill("floor", "floor_stage", 32, 24, 9, 3)                     # منصة y24-26
fill("floor", "floor_sidewalkx", 0, 0, 0, 0) if False else None
fill("floor", "floor_asphalt", 2, 66, 84, 6)                   # الشارع y66-71
fill("floor", "floor_path", 4, 63, 80, 3)                      # رصيف — use sidewalk tile below
for yy in (63, 64, 65):
    fill("floor", "sidewalk", 4, yy, 80, 1)
for yy in (67, 68, 69):
    for xx in range(5, 23, 5):
        fill("floor", "park_bay", xx, yy, 1, 1)
for xx in (5, 10, 15, 20):
    fill("floor", "park_bay", xx, 67, 1, 3)
fill("floor", "street_dash", 26, 68, 2, 1); fill("floor", "street_dash", 30, 68, 2, 1)
fill("floor", "street_dash", 34, 68, 2, 1); fill("floor", "street_dash", 38, 68, 2, 1)
fill("floor", "street_dash", 48, 68, 2, 1); fill("floor", "street_dash", 52, 68, 2, 1)
fill("floor", "street_dash", 56, 68, 2, 1); fill("floor", "street_dash", 60, 68, 2, 1)
fill("floor", "street_dash", 64, 68, 2, 1); fill("floor", "street_dash", 68, 68, 2, 1)
fill("floor", "street_dash", 72, 68, 2, 1); fill("floor", "street_dash", 76, 68, 2, 1)
fill("floor", "street_cross", 42, 66, 4, 6)                    # ممر المشاة للمدرسة
fill("floor", "floor_mosaic", 40, 59, 8, 3)                    # سجادة الاستقبال أمام البوابة

# ================================================================ WALLS
wall("wall", 4, 3, 80, 1)                                      # north wall y3
wall("wall_win", 9, 3); wall("wall_tv", 10, 3)                 # عروض screen north
wall("wall_board", 18, 3); wall("wall_board", 19, 3)           # ف٦
wall("wall_win", 26, 3); wall("wall_win", 27, 3)               # ف٥
wall("wall_board", 34, 3); wall("wall_board", 35, 3)           # ف٤
wall("wall_board", 52, 3); wall("wall_board", 53, 3)           # ف٣
wall("wall_white", 60, 3); wall("wall_white", 61, 3)           # ف٢
wall("wall_board", 68, 3); wall("wall_board", 69, 3)           # ف١
wall("wall_white", 77, 3); wall("wall_white", 78, 3)           # فنون
wall("wall_win", 43, 3); wall("wall_win", 44, 3)               # ردهة north windows
wall("wall_cal", 72, 3); wall("wall_plate", 80, 3)
wall("wall", 3, 3, 1, 60)                                      # west perimeter x3
wall("wall", 84, 3, 1, 60)                                     # east perimeter x84
wall("wall", 14, 3, 1, 13); wall("wall", 22, 3, 1, 13)
wall("wall", 30, 3, 1, 13); wall("wall", 38, 3, 1, 13)
wall("wall", 49, 3, 1, 13); wall("wall", 56, 3, 1, 13)
wall("wall", 64, 3, 1, 13); wall("wall", 72, 3, 1, 13)
wall("wall", 4, 15, 35, 1)                                     # south wall of rooms west
wall("wall", 49, 15, 34, 1)                                    # south wall of rooms east
wall("wall_door", 9, 15, 2, 1, door=True)                      # doors to corridor
wall("wall_door", 18, 15, 2, 1, door=True)
wall("wall_door", 26, 15, 2, 1, door=True)
wall("wall_door", 34, 15, 2, 1, door=True)
wall("wall_door", 52, 15, 2, 1, door=True)
wall("wall_door", 60, 15, 2, 1, door=True)
wall("wall_door", 68, 15, 2, 1, door=True)
wall("wall_door", 77, 15, 2, 1, door=True)
# colonnade y22: columns + glazing, gaps at x13-17 and x42-45 and x61-64
for xx in range(4, 84):
    if 13 <= xx <= 17 or 42 <= xx <= 45 or 61 <= xx <= 64:
        continue
    wall("column" if xx % 3 == 0 else "wall_win", xx, 22)
# west wing x4-19 y23-62
wall("wall", 4, 23, 1, 40)
wall("wall", 5, 23, 8, 1); wall("wall", 5, 31, 8, 1)           # أنشطة box
wall("wall", 5, 32, 8, 1); wall("wall", 5, 39, 8, 1)           # حاسوب box
wall("wall", 5, 40, 8, 1); wall("wall", 5, 47, 8, 1)           # علوم box
wall("wall", 5, 47, 8, 1); wall("wall", 5, 56, 8, 1)           # مكتبة box (y48-55)
wall("wall", 5, 57, 8, 1); wall("wall", 5, 62, 8, 1)           # مقصف box (y58-61)
wall("wall", 12, 23, 1, 40)                                    # rooms|corridor partition
wall("wall_door", 12, 26, 1, 2, door=True)                     # أنشطة door y26-27
wall("wall_door", 12, 34, 1, 2, door=True)                     # حاسوب
wall("wall_door", 12, 42, 1, 2, door=True)                     # علوم
wall("wall_door", 12, 50, 1, 2, door=True)                     # مكتبة
wall("wall_door", 12, 58, 1, 2, door=True)                     # مقصف
for yy in range(23, 63):                                       # west colonnade x18
    if yy in (25, 26, 50, 51, 58, 59):
        continue
    wall("column" if yy % 3 == 0 else "wall_glass", 18, yy)
# east wing
for yy in range(23, 63):                                       # glass facade x68-69
    if yy in (43, 44) or yy in (56, 57, 58):
        continue
    wall("wall_glass", 68, yy); wall("wall_frost", 69, yy)
wall("wall_door_glass", 68, 43); wall("wall_door_glass", 69, 43)
wall("wall_door_glass", 68, 44); wall("wall_door_glass", 69, 44)
# director office box x70-83 y23-33
wall("wall", 70, 23, 1, 11)                                    # west wall x70
wall("wall_win_pan", 70, 25); wall("wall_win_pan", 70, 26)
wall("wall_win_pan", 70, 28); wall("wall_win_pan", 70, 29)
wall("wall_cork", 70, 31); wall("wall_cork", 70, 32)
wall("wall", 71, 23, 13, 1)                                    # north wall y23
wall("wall_cal", 72, 23); wall("wall_tv", 78, 23); wall("wall_tv", 79, 23)
wall("wall_plate", 81, 23)
wall("wall", 83, 23, 1, 11)                                    # east wall
wall("wall", 71, 33, 13, 1)                                    # south wall y33
wall("wall_door_glass", 76, 33, 2, 1, door=True)               # double door
# admin corridor walls: teachers box x70-75 y35-51, corridor x76-78
wall("wall", 70, 35, 1, 17)                                    # teachers west x70
wall("wall_door", 70, 43, 1, 2, door=True)                     # teachers→glass door
wall("wall", 71, 35, 5, 1)                                     # teachers north y35 x71-75
wall("wall", 71, 50, 5, 1)                                     # teachers south y50
wall("wall", 75, 36, 1, 14)                                    # teachers east x75
wall("wall_door", 75, 41, 1, 2, door=True)                     # corridor door
wall("wall", 79, 34, 1, 18)                                    # corridor east wall x79
wall("wall_door", 79, 37, 1, 2, door=True)                     # archive door
wall("wall_door", 79, 45, 1, 2, door=True)                     # affairs door
wall("wall", 80, 34, 3, 1)                                     # archive north y34
wall("wall", 80, 41, 3, 1)                                     # archive south y41
wall("wall", 80, 42, 3, 1)                                     # affairs north y42
wall("wall", 80, 51, 3, 1)                                     # affairs south y51
wall("wall", 71, 51, 5, 1)                                     # under teachers y51
# reception x68-83 y52-62
wall("wall", 70, 52, 13, 1)                                    # reception north y52
wall("wall_door_glass", 76, 52, 2, 1, door=True)               # from admin corridor
# north wall: warm-white + identity pieces
for _xx in (70, 73, 75, 81, 82):
    GRID["walls"][52][_xx] = g("recv_wall")
for _xx, _tt in ((71, "recv_wordmark"), (72, "recv_quote"), (74, "recv_art"),
                 (78, "recv_gallery"), (79, "recv_screen_l"), (80, "recv_screen_r")):
    GRID["walls"][52][_xx] = g(_tt)
wall("wall", 83, 52, 1, 11)                                    # reception east
# east wall: calm warm wall with backlit logo medallion behind the desk
for _yy in range(53, 62):
    GRID["walls"][_yy][83] = g("recv_wall")
GRID["walls"][56][83] = g("recv_logo")
wall("wall", 70, 62, 13, 1)                                    # reception south y62
wall("wall_door", 72, 62, 1, 1, door=True)                     # service door? keep solid-ish
GRID["walls"][62][72] = g("wall")  # cancel service door — keep south solid
GRID["collisions"][62][72] = g("mark_collide")
wall("wall", 76, 51, 3, 1)                                     # y51 corridor mouth walls
GRID["walls"][51][76] = 0; GRID["walls"][51][77] = 0; GRID["walls"][51][78] = 0
GRID["collisions"][51][76] = 0; GRID["collisions"][51][77] = 0; GRID["collisions"][51][78] = 0
fill("floor", "floor_corr", 76, 51, 3, 1)
# campus south wall y62 + gate x40-47
wall("wall", 4, 62, 36, 1)
for xx in range(40, 44):
    wall("wall_gate_l", xx, 62, door=True)
for xx in range(44, 48):
    wall("wall_gate_r", xx, 62, door=True)
wall("wall", 48, 62, 35, 1) if False else None
wall("wall", 48, 62, 22, 1)                                    # x48-69
# gate pillars + gatehouse (security cabin x34-38 y63-65)
solid("column", 39, 62); solid("column", 48, 62)
wall("wall_brick", 34, 63, 5, 1)
wall("wall_brick", 34, 64, 1, 2); wall("wall_brick", 38, 64, 1, 2)
wall("wall_brick", 34, 65, 5, 1, door=True)
GRID["walls"][65][36] = 0; GRID["walls"][65][37] = 0
fill("floor", "floor_service", 35, 64, 3, 1)
solid("counter_l", 35, 64); solid("counter_m", 36, 64); solid("counter_r", 37, 64)

# ================================================================ FURNITURE
# ---- classrooms (rows of desks + teacher desks) ----
def classroom(x0, y0, w=7, variant=0):
    board_row = [("desk_stu", "desk_stu2")[variant], ("chair_blue", "chair_wood")[variant]]
    for r, yy in enumerate((y0 + 3, y0 + 5, y0 + 7)):
        for xx in range(x0 + 1, x0 + w - 1, 2):
            solid(board_row[0], xx, yy)
            solid(board_row[1], xx, yy + 1)
    solid("desk_teach", x0 + w // 2 - 1, y0 + 1, 2, 1)
    solid("chair_wood", x0 + w // 2 - 1, y0)

classroom(15, 4, 7, 0)     # ف٦
classroom(23, 4, 7, 1)     # ف٥
classroom(31, 4, 7, 0)     # ف٤
classroom(49, 4, 7, 0)     # ف٣
classroom(57, 4, 7, 0)     # ف٢
classroom(65, 4, 7, 1)     # ف١
# reading corners + student-work shelves in every classroom (تحسينات الأقسام)
for cx in (6, 16, 24, 32, 50, 58, 66):
    solid("shelf_books2", cx, 13, 1, 2)
# قاعة البروفات (سابقًا عروض) x5-13 y4-14: مرايا + رفوف ملابس + سجاد بروفات + ميكروفون
for xx in range(5, 14):
    stamp("walls", "mirror_wall", xx, 3)
fill("floor", "floor_rubber_b", 7, 8, 5, 5)
solid("costume_rack", 5, 5); solid("costume_rack", 5, 6)
solid("mic_stand", 11, 6); solid("mic_stand", 11, 8)
solid("shelf_books2", 5, 12, 1, 2); solid("chair_stack", 12, 13); solid("chair_stack", 12, 14)
GRID["furniture"][13][12] = 0; GRID["collisions"][13][12] = 0   # keep stack row tidy
# فنون: easels + free tables
solid("easel", 75, 6); solid("easel", 78, 6); solid("easel", 81, 6)
solid("desk_stu2", 75, 9, 2, 1); solid("desk_stu2", 79, 9, 2, 1)
solid("chair_wood", 76, 10); solid("chair_wood", 80, 10)
solid("shelf_books2", 82, 8, 1, 3)
solid("plant_s", 73, 5)
# ردهة (lobby): stair stage, trophy, mats, benches, clock
fill("floor", "stage_f", 46, 5, 3, 1)
for yy in (6, 7, 8):
    fill("floor", "stair", 46, yy, 3, 1)
solid("podium", 47, 4)
solid("trophy", 39, 5); solid("trophy", 39, 6); solid("trophy", 39, 7)
solid("shelf_books", 48, 12, 1, 3)
solid("bench_wait", 40, 12, 2, 1); solid("bench_wait", 40, 14, 2, 1)
solid("plant_l", 48, 5); solid("plant_l", 48, 20); solid("plant_l", 39, 20)
fill("floor", "mat_logo", 43, 17, 2, 2)
fill("floor", "doormat", 43, 20, 2, 1)
solid("clock", 42, 4) if False else stamp("walls", "clock", 42, 3)
# ---- أنشطة x5-12 y24-30 ----
solid("sofa", 5, 24, 2, 1); solid("table_round", 8, 25)
solid("chair_blue", 7, 25); solid("chair_blue", 9, 25)
solid("shelf_books2", 5, 29, 1, 2); solid("plant_s", 11, 30)
solid("desk_stu2", 9, 28, 2, 1)
# ---- حاسوب x5-12 y32-38 ----
for yy in (33, 35, 37):
    for xx in (5, 7, 9, 11):
        solid("desk_comp", xx, yy)
solid("cab_files", 11, 32)
stamp("walls", "projector", 8, 32)                             # جهاز عرض الحاسوب
# ---- علوم x5-12 y40-46 ----
for yy in (41, 43, 45):
    solid("desk_stu2", 6, yy, 2, 1); solid("desk_stu2", 9, yy, 2, 1)
solid("cab_wood", 5, 40, 1, 2); solid("water", 11, 40); solid("plant_s", 5, 46)
# ---- مكتبة x5-12 y48-55 ----
solid("shelf_books", 5, 49, 1, 3); solid("shelf_books", 7, 49, 1, 3)
solid("shelf_books", 9, 49, 1, 3); solid("shelf_books2", 11, 49, 1, 3)
solid("shelf_books", 5, 53, 1, 3); solid("shelf_books", 7, 53, 1, 3)
solid("shelf_books2", 9, 53, 1, 3); solid("shelf_books", 11, 53, 1, 3)
solid("table_round", 6, 52); solid("chair_wood", 5, 52); solid("chair_wood", 7, 52)
solid("bench_wait", 10, 48, 2, 1)
# ---- مقصف x5-12 y58-61 ----
solid("counter_l", 5, 58); solid("counter_m", 5, 59); solid("counter_r", 5, 60)
solid("coffee", 5, 57) if False else solid("coffee", 6, 57)
GRID["furniture"][57][6] = 0; GRID["collisions"][57][6] = 0
solid("coffee", 11, 58)
for xx in (7, 10):
    solid("table_round", xx, 59); solid("chair_blue", xx, 58)
solid("water", 12, 61); solid("bin", 6, 61)
# ---- مكتب المدير x71-82 y24-32 ----
solid("pdesk_l", 75, 25); solid("pdesk_m", 76, 25); solid("pdesk_m", 77, 25)
solid("pdesk_m", 78, 25); solid("pdesk_r", 79, 25)
solid("chair_blue", 77, 24)
solid("cab_files", 82, 25); solid("cab_files", 82, 26); solid("cab_files", 82, 27)
solid("cab_files", 82, 28); solid("cab_files", 82, 29)
solid("trophy", 82, 30); solid("trophy", 82, 31)               # كشك الفضوليات (east-low)
solid("desk_stu2", 75, 28, 2, 2)                               # جداول الحصص المتقاطعة
solid("table_round", 72, 30)                                   # طاولة الاجتماعات
solid("chair_wood", 71, 30); solid("chair_wood", 73, 30); solid("chair_wood", 72, 31)
solid("podium", 81, 31)                                        # منبر الترحيب
solid("plant_l", 71, 24); solid("plant_s", 81, 24)
solid("sofa", 71, 27, 1, 1)
solid("bin", 80, 32)
# ---- غرفة المعلمين x71-74 y37-49 ----
solid("desk_stu", 71, 38); solid("desk_stu", 73, 38)
solid("desk_stu", 71, 40); solid("desk_stu", 73, 40)
solid("chair_wood", 71, 39); solid("chair_wood", 73, 39)
solid("coffee", 74, 37)
solid("table_round", 72, 45); solid("chair_wood", 71, 45); solid("chair_wood", 73, 45)
solid("chair_wood", 72, 46)
solid("lockers", 71, 48, 3, 1); solid("sofa", 74, 48)
solid("plant_s", 74, 43)
# ---- أرشيف x80-82 y35-40 ----
solid("cab_files", 80, 35, 3, 1); solid("cab_files", 80, 37, 3, 1); solid("cab_files", 80, 39, 3, 1)
# ---- شؤون x80-82 y43-50 ----
solid("counter_l", 80, 46); solid("counter_m", 81, 46); solid("counter_r", 82, 46)
solid("bench_wait", 81, 48, 2, 1); solid("cab_wood", 80, 43, 1, 2)
solid("plant_s", 82, 50)
# ---- استقبال x70-82 y53-61 ( redesigned: warm, welcoming, child-friendly ) ----
# modern curved desk, light-wood top, not too tall — faces the west entrance
solid("recv_desk_t", 77, 55); solid("recv_desk_pc", 77, 56); solid("recv_desk_b", 77, 57)
# waiting area on the rug (west side): sofa + 2 armchairs + coffee table
solid("recv_sofa_t", 71, 55); solid("recv_sofa_b", 71, 56)
solid("recv_chair", 73, 53); solid("recv_chair", 73, 60)
solid("recv_coffee", 72, 59)
# child touches: owl medallion by the entrance + brochure rack + plants
solid("recv_owl", 75, 53); solid("recv_mags", 72, 61)
solid("plant_l", 82, 53); solid("plant_s", 70, 61)
fill("floor", "doormat", 68, 57, 2, 2)                          # wide entrance mat
# ---- courtyard ----
solid("trunk", 28, 42, 2, 1)                                   # شجرة المعرفة
solid("bench_park", 26, 44); solid("bench_park", 29, 44)
solid("bench_park", 26, 41); solid("bench_park", 29, 41)
solid("sign_board", 31, 42)                                    # لافتة الشعار عند الشجرة
solid("flag_pole", 44, 40)                                     # السارية
for xx, yy in [(39, 36), (48, 36), (39, 43), (48, 43)]:
    solid("flowerbed", xx, yy)
for xx, yy in [(40, 28), (47, 28), (40, 52), (47, 52), (33, 40), (54, 40)]:
    solid("lamp", xx, yy)
solid("bin", 41, 44); solid("bin", 46, 44); solid("bin", 32, 52); solid("bin", 56, 46)
# منصة الطابور + مكبرات
solid("podium", 36, 25); solid("water", 39, 25)
for xx in (33, 39):
    solid("plant_s", xx, 24)
fill("floor", "stair", 35, 27, 3, 1)
# outdoor boards
solid("sign_board", 48, 28); solid("sign_board", 49, 28)
solid("sign_board", 48, 52)
# activity SE
for xx, yy in [(56, 50), (56, 51), (56, 52), (55, 53), (57, 53), (56, 54)]:
    fill("floor", "hopscotch", xx, yy)
fill("floor", "hoop", 63, 52)
solid("picnic", 58, 56); solid("picnic", 61, 56)
solid("bench_park", 55, 58); solid("bench_park", 64, 58)
solid("plant_s", 55, 48); solid("plant_s", 64, 48); solid("bin", 57, 48)
# sandbox SW + umbrella
fill("floor", "sandbox", 22, 56, 4, 3)
solid("umbrella", 23, 54) if False else stamp("abovePlayer1", "umbrella", 23, 54)
solid("bench_park", 27, 57); solid("bench_park", 27, 59)
solid("plant_s", 21, 54); solid("bin", 28, 55)
# cafeteria outdoor seating x21-27 y54-60
solid("picnic", 24, 54); solid("picnic", 24, 57); solid("table_round", 26, 55)
solid("bench_park", 21, 55); solid("bench_park", 21, 58)
# bus NW + parking
solid("bus_ul", 23, 24); solid("bus_ur", 25, 24)
solid("bus_ll", 23, 25); solid("bus_lr", 25, 25)
solid("plant_s", 28, 23); solid("bin", 21, 28)
# north margin trees outside
for xx in (6, 14, 22, 30, 52, 60, 68, 76):
    solid("bush", xx, 1)
solid("plant_l", 2, 10); solid("plant_l", 2, 30); solid("plant_l", 2, 50)
solid("plant_l", 85, 10); solid("plant_l", 85, 30); solid("plant_l", 85, 50)
# flowerbeds along south interior
for xx in range(20, 40, 3):
    fill("floor", "floor_grass", xx, 61, 1, 1)
solid("flowerbed", 20, 61, 2, 1); solid("flowerbed", 26, 61, 2, 1)
solid("flowerbed", 50, 61, 2, 1); solid("flowerbed", 56, 61, 2, 1)
solid("flowerbed", 32, 61, 2, 1); solid("flowerbed", 62, 61, 2, 1)
solid("lamp", 38, 63); solid("lamp", 50, 63)
solid("bin", 39, 64); solid("bin", 50, 64)
solid("bench_park", 30, 63); solid("bench_park", 56, 63)

# ================================================================ قاعة النجوم (قاعة الاحتفالات والعروض)
fill("floor", "floor_grass", 85, 3, 33, 60)                    # exterior east block base
# --- porte-cochère + portal من الحرم (فتحة في الجدار الشرقي x84) ---
GRID["walls"][34][84] = 0; GRID["walls"][35][84] = 0; GRID["walls"][36][84] = 0; GRID["walls"][37][84] = 0
GRID["collisions"][34][84] = 0; GRID["collisions"][35][84] = 0; GRID["collisions"][36][84] = 0; GRID["collisions"][37][84] = 0
wall("wall_door_glass", 84, 34, 1, 4, door=True)
fill("floor", "floor_mosaic", 85, 30, 1, 12)
fill("floor", "floor_court", 85, 26, 1, 4); fill("floor", "floor_court", 85, 42, 1, 6)
solid("sign_board", 85, 28); solid("sign_board", 85, 45)
solid("plant_l", 85, 48)
# --- القاعة x86-115 y14-58 ---
wall("wall_acoustic", 86, 14, 1, 45)                           # west wall (back of house)
wall("wall_door_glass", 86, 34, 1, 4, door=True)               # main entrance (lobby side)
wall("exit_sign", 86, 32) if False else stamp("walls", "wall_acoustic", 86, 32)
wall("wall_acoustic", 87, 14, 29, 1)                           # north wall y14
wall("wall_acoustic", 87, 58, 29, 1)                           # south wall y58
wall("wall_decor", 92, 14); wall("wall_decor", 93, 14)
wall("wall_sconce", 89, 14); wall("wall_sconce", 100, 14)
wall("wall_decor", 92, 58); wall("wall_decor", 93, 58)
wall("wall_sconce", 89, 58); wall("wall_sconce", 100, 58)
wall("mirror_wall", 108, 14); wall("mirror_wall", 109, 14); wall("mirror_wall", 110, 14); wall("mirror_wall", 111, 14)
wall("wall_acoustic", 115, 14, 1, 45)                          # east wall = backdrop wall
for yy in range(15, 31):
    stamp("walls", "backdrop_drape", 115, yy)
for yy in range(31, 43):
    stamp("walls", "backdrop_led", 115, yy)                     # الشاشة الكبيرة LED
for yy in range(43, 58):
    stamp("walls", "backdrop_drape", 115, yy)
fill("floor", "floor_hall", 87, 15, 28, 43)                     # house + foyer floor
# ممرات: جانبية + مركزية (سجاد NG)
fill("floor", "floor_aisle", 87, 15, 20, 2)                     # north side aisle x87-106
fill("floor", "floor_aisle", 87, 56, 20, 2)                     # south side aisle
fill("floor", "floor_aisle", 87, 35, 20, 3)                     # central aisle y35-37
fill("floor", "floor_aisle", 85, 34, 3, 4)                      # portal runner
# المسرح: منصة بعرض القاعة + ستائر جانبية + درجات
fill("floor", "floor_stage_deck", 107, 19, 8, 35)               # deck x107-114 y19-53
wall("stage_front", 106, 19, 1, 35, door=True)                  # front skirt (walkable? collide except steps)
stamp("collisions", "mark_collide", 106, 19, 1, 35)             # skirt is solid
for yy in list(range(22, 25)) + list(range(34, 38)) + list(range(50, 53)):
    fill("floor", "stage_step", 106, yy)
    GRID["collisions"][yy][106] = 0                             # step openings
fill("floor", "curtain_n", 106, 17, 9, 2)                       # ستارة جانبية شمال
fill("floor", "curtain_s", 106, 54, 9, 2)                       # ستارة جانبية جنوب
fill("floor", "floor_service", 106, 15, 9, 2)                   # كواليس خلف الستارة (شمال)
fill("floor", "floor_service", 106, 56, 9, 2)                   # تخزين الكراسي (جنوب)
solid("costume_rack", 107, 15); solid("costume_rack", 113, 15)
solid("chair_wood", 109, 16); solid("chair_wood", 110, 16)
solid("chair_stack", 107, 56); solid("chair_stack", 108, 56); solid("chair_stack", 110, 56)
solid("chair_stack", 111, 56); solid("chair_stack", 113, 56)
# منصة العرض: ميكروفونات + منبر + طاولة الجوائز
solid("mic_stand", 109, 35); solid("mic_stand", 110, 38)
solid("podium", 111, 30)
solid("prizes_table", 110, 44); solid("prizes_table", 111, 44)
fill("floor", "light_pool", 108, 33, 6, 6)                      # بقعة الإضاءة المسرحية
fill("floor", "light_pool", 108, 22, 6, 3); fill("floor", "light_pool", 108, 48, 6, 3)
solid("speaker_stack", 105, 18); solid("speaker_stack", 105, 19)
solid("speaker_stack", 105, 54); solid("speaker_stack", 105, 55)
# المقاعد: 4 صفوف ثابتة (108 مقعد) + مرونة أمام المسرح (كراسي مطوية/تُزال)
for xx in (92, 93, 94, 95):
    for yy in range(17, 35):
        solid("seat_hall", xx, yy)
    for yy in range(38, 56):
        solid("seat_hall", xx, yy)
for yy in (17, 55):
    solid("chair_stack", 96, yy); solid("chair_stack", 98, yy)
solid("chair_stack", 100, 18); solid("chair_stack", 100, 19)
solid("chair_stack", 100, 53); solid("chair_stack", 100, 54)
fill("floor", "floor_hall", 96, 18, 10, 36)                     # مرونة مرئية (أرض فارغة قابلة للترتيب)
# إعادة الممرات فوق منطقة المرونة (استمرارية السجاد)
fill("floor", "floor_aisle", 96, 15, 11, 2)
fill("floor", "floor_aisle", 96, 56, 11, 2)
fill("floor", "floor_aisle", 96, 35, 11, 3)
for yy in (18, 19, 53, 54):
    fill("floor", "seat_hall_fold", 96, yy, 2, 1)               # علامات صفوف قابلة للإزالة
# الردهة الأمامية x87-91: سجل الزوار + أعمدة + لوح الشرف
solid("guestbook_table", 89, 35); solid("guestbook_table", 89, 36)
solid("plant_l", 88, 17); solid("plant_l", 88, 55); solid("plant_l", 90, 25); solid("plant_l", 90, 47)
solid("column", 91, 16); solid("column", 91, 55)
solid("bench_wait", 87, 20, 2, 1); solid("bench_wait", 87, 52, 2, 1)
for xx in range(92, 100):
    stamp("walls", "wall_decor" if xx % 3 == 0 else "wall_acoustic", xx, 58) if False else None
# طاولة الإخراج (صوت/إضاءة) أسفل القاعة
solid("desk_comp", 88, 35); solid("desk_comp", 88, 37)
solid("cab_files", 87, 36)

# ================================================================ نادي المبدعين الصغار (غرفة الحوار والتفاعل)
# x87-105 / y4-12 (داخلية 17×7) — ضِلع شمال-شرقي خارج المحيط الشرقي x84
fill("floor", "floor_parquet", 88, 5, 17, 7)                     # أرضية خشبية دافئة (وليست فصلًا)
fill("floor", "club_rug", 94, 7, 4, 4)                           # سجادة دافئة تحت دائرة الحوار
# --- الدخول: باب زجاجي في المحيط الشرقي + ممر خلفي + شرفة أمامية ---
GRID["walls"][18][84] = 0; GRID["collisions"][18][84] = 0
GRID["walls"][19][84] = 0; GRID["collisions"][19][84] = 0
wall("wall_door_glass", 84, 18, 1, 2, door=True)
fill("floor", "floor_court", 85, 13, 1, 13)                      # الممر الخلفي y13-25
fill("floor", "floor_court", 86, 13, 20, 1)                      # الشرفة أمام المدخل
fill("floor", "doormat", 95, 13, 2, 1)                           # سجادة المدخل
# --- الجدران: جدران بيضاء حديثة بشريط ألوان + هوية النادي ---
wall("wall_club", 87, 4, 19, 1)                                  # الجدار الشمالي (الرئيسي) y4
wall("wall_club", 87, 12, 19, 1)                                 # الجدار الجنوبي y12
wall("wall_club", 87, 5, 1, 7)                                   # الجدار الغربي x87
wall("wall_club", 105, 5, 1, 7)                                  # الجدار الشرقي x105
wall("wall_door_glass", 95, 12, 2, 1, door=True)                 # المدخل الرئيسي (من الشرفة)
stamp("walls", "clock", 88, 4)                                   # ⏱️ ساعة/مؤقت الجلسات
stamp("walls", "club_sign", 90, 4, 3, 1)                         # 🏵️ هوية: نادي المبدعين الصغار
stamp("walls", "idea_board", 94, 4, 8, 1)                        # 💡 لوح «موضوع اليوم» خلف المجموعة
stamp("walls", "quote_wall", 103, 4); stamp("walls", "quote_wall", 104, 4)
stamp("walls", "question_board", 105, 7, 1, 3)                   # 🧠 لوحة أسئلة الأطفال
stamp("walls", "idea_wall", 105, 10)                             # 💬 جدار الأفكار (بطاقات الآراء)
stamp("walls", "quote_wall", 91, 12); stamp("walls", "quote_wall", 92, 12)
stamp("walls", "quote_wall", 100, 12); stamp("walls", "quote_wall", 101, 12)
# --- دائرة الحوار: 12 كرسيًا متساويًا (محايدة الاتجاه) + طاولة منخفضة + ميكروفون + وسائد ---
for xx, yy, nm in [(96, 5, "chair_amber"), (94, 6, "chair_teal"), (98, 6, "chair_lilac"),
                   (92, 7, "chair_coral"), (100, 7, "chair_amber"), (92, 8, "chair_teal"),
                   (100, 8, "chair_lilac"), (92, 9, "chair_coral"), (100, 9, "chair_amber"),
                   (94, 10, "chair_teal"), (98, 10, "chair_lilac"), (96, 11, "chair_coral")]:
    solid(nm, xx, yy)                                            # كرسي واحد للمعلم — لا كرسي ضخم
solid("table_low", 95, 8)                                        # طاولة دائرية منخفضة في المنتصف
solid("mic_small", 96, 8)                                        # 🎤 الميكروفون الرمزي «دور المتحدث»
solid("cushion_a", 97, 9); solid("cushion_b", 94, 9)             # وسائد أرضية
# --- رف الكتب + ركن ألعاب التفكير + بطاقات + نباتات ---
solid("shelf_books", 88, 5); solid("shelf_books", 88, 6)         # 📚 رف صغير: قصص ومجلات
solid("shelf_books2", 88, 11)
solid("puzzle_box", 104, 5)                                      # 🧩 ألعاب تفكير وألغاز ومناظرات
solid("card_rack", 104, 6)                                       # 📝 بطاقات العبارات
solid("plant_s", 88, 10); solid("plant_s", 104, 11)
solid("plant_s", 86, 12)                                         # علامة خضراء عند زاوية المدخل
solid("sign_board", 99, 13)                                      # لافتة النادي على الشرفة
solid("plant_s", 103, 13)

# ================================================================ فصل الشطرنج (جناح العقول)
# x118-131 / y14-26 (داخلية 12×11) — شرق قاعة النجوم، خلف سقيفة المشي
fill("floor", "floor_grass", 118, 3, 18, 60)                     # هامش خارجي جديد شرق الجناح
fill("floor", "floor_court", 106, 13, 12, 1)                     # امتداد سقيفة المشي y13 حتى الجناح
fill("floor", "floor_court", 116, 14, 2, 12)                     # ممر جانبي x116-117 نحو الباب
fill("floor", "doormat", 117, 20, 1, 2)                          # سجادة المدخل
solid("sign_board", 112, 12)                                     # لافتة «فصل الشطرنج»
solid("plant_s", 115, 12); solid("plant_s", 116, 26)
# --- الجدران: بيضاء راقية بشريط كحلي/ذهبي + هوية تعليمية ---
wall("wall_chess", 118, 14, 14, 1)                               # north wall (door)
wall("wall_chess", 118, 26, 14, 1)                               # south main wall
wall("wall_chess", 118, 15, 1, 11)                               # west wall
wall("wall_chess", 131, 15, 1, 11)                               # east wall
wall("wall_door_glass", 121, 14, 2, 1, door=True)                # المدخل الشمالي (من السقيفة)
wall("wall_door_glass", 118, 20, 1, 2, door=True)                # المدخل الغربي (من الممر الجانبي)
# الجدار الجنوبي الرئيسي (منطقة المدرب):
stamp("walls", "chess_title", 119, 26, 2, 1)                     # ♟️ عالم الشطرنج
stamp("walls", "wall_tv", 121, 26, 2, 1)                         # 🖥️ شاشة المباريات/الألغاز
stamp("walls", "chess_movements", 123, 26, 2, 1)                 # مخطط حركة القطع
stamp("walls", "chess_puzzle", 125, 26, 2, 1)                    # الألغاز القابلة للتغيير
stamp("walls", "tournament", 127, 26, 2, 1)                      # لوحة التحديات والبطولات
stamp("walls", "quote_chess", 129, 26, 2, 1)                     # «فكّر قبل أن تتحرك»
# الجدار الشمالي: ساعة + عنوان + نوافذ
stamp("walls", "clock", 119, 14)
stamp("walls", "quote_chess", 120, 14)
stamp("walls", "chess_title", 123, 14, 2, 1)
stamp("walls", "wall_win", 126, 14); stamp("walls", "wall_win", 127, 14)
stamp("walls", "wall_win", 118, 18); stamp("walls", "wall_win", 118, 19)
stamp("walls", "wall_win", 131, 18); stamp("walls", "wall_win", 131, 19)
# --- الأرضية: سجادة هادئة + منصة المدرب الخشبية المرفوعة ---
fill("floor", "floor_parquet", 119, 15, 12, 11)                  # أرضية الخشب (ممرات حافة المنصة)
fill("floor", "chess_rug", 119, 15, 12, 8)                       # السجادة تحت الطاولات
fill("floor", "chess_deck", 121, 23, 7, 3)                       # منصّة التدريب المرفوعة
fill("floor", "stage_step", 124, 22)                             # درجة المنصة (قابلة للعبور)
# --- منطقة المدرب: مكتب + رقعة تعليمية كبيرة 2×2 على المنصة ---
solid("trainer_desk", 122, 24, 2, 1)                             # مكتب المدرب (حاسوب + ساعة شطرنج)
solid("chess_chair", 122, 25)
fill("floor", "board_ul", 125, 24); fill("floor", "board_ur", 126, 24)
fill("floor", "board_dl", 125, 25); fill("floor", "board_dr", 126, 25)  # رقعة 8×8 كاملة بقطع
# --- 6 طاولات شطرنج حقيقية (طفلان متقابلان) بممرات كافية بين كل طاولة ---
for tx, ty in [(121, 17), (124, 17), (127, 17), (121, 20), (124, 20), (127, 20)]:
    solid("chess_table" if (tx + ty) % 2 else "chess_table2", tx, ty)
    solid("chess_chair", tx, ty - 1)
    solid("chess_chair", tx, ty + 1)
# --- الخزائن والرفوف والتجهيزات ---
solid("chess_cabinet", 119, 18); solid("chess_cabinet", 130, 16)
solid("chess_cabinet", 130, 20); solid("shelf_books2", 128, 25)
solid("shelf_books", 119, 22); solid("shelf_books", 119, 23)     # كتب وألغاز لجميع المستويات
solid("trophy", 130, 15)                                         # كأس بطل الفصل
solid("plant_s", 119, 15); solid("plant_s", 130, 23)
solid("bin", 130, 25)

# ================================================================ فصل الحساب الذهني (جناح العقول ٢)
# x118-131 / y30-44 (داخلية 12×13) — أسفل فصل الشطرنج، نفس التجمع الشرقي
# --- الممرات: فناء صغير بين الغرفتين + امتداد الممر الجانبي ---
fill("floor", "floor_court", 118, 27, 14, 3)                     # فناء الشرفتين y27-29
fill("floor", "floor_court", 116, 26, 2, 18)                     # الممر الجانبي حتى y43
fill("floor", "doormat", 121, 29, 2, 1)                          # سجادة الباب الشمالي
fill("floor", "doormat", 116, 37, 1, 2)                          # سجادة الباب الغربي
solid("sign_board", 124, 28)                                     # لافتة «الحساب الذهني»
solid("plant_s", 128, 28); solid("plant_s", 116, 27); solid("plant_s", 132, 44)
# --- الجدران: بيضاء مشرقة بحزام أزرق/كهرماني ---
wall("math_wall", 118, 30, 14, 1)                                # north wall (door)
wall("math_wall", 118, 44, 14, 1)                                # south wall (trainer)
wall("math_wall", 118, 31, 1, 13)                                # west wall
wall("math_wall", 131, 31, 1, 13)                                # east wall
wall("wall_door_glass", 121, 30, 2, 1, door=True)                # المدخل الشمالي (من الفناء)
wall("wall_door_glass", 118, 37, 1, 2, door=True)                # المدخل الغربي (من الممر)
# الجدار الجنوبي: منطقة المدرب + جدار التحديات
stamp("walls", "math_title", 119, 44, 2, 1)                      # 🧠 تحدي العقل
stamp("walls", "wall_tv", 121, 44, 2, 1)                         # 🖥️ الشاشة الكبيرة
stamp("walls", "math_board", 123, 44, 2, 1)                      # لوحة الاستراتيجيات
stamp("walls", "timer_wall", 125, 44); stamp("walls", "timer_wall", 126, 44)  # مؤقتان رقميان
stamp("walls", "challenge_board", 127, 44, 2, 1)                 # جدار التحديات (يتغير)
stamp("walls", "level_board", 129, 44, 2, 1)                     # مستويات الأطفال (محفّزة)
# الجدار الشمالي: نوافذ + عبارات + ساعة
stamp("walls", "wall_win", 119, 30); stamp("walls", "wall_win", 120, 30)
stamp("walls", "math_quote", 123, 30); stamp("walls", "math_quote", 124, 30)
stamp("walls", "wall_win", 125, 30); stamp("walls", "wall_win", 126, 30)
stamp("walls", "wall_win", 127, 30)
stamp("walls", "clock", 128, 30)
stamp("walls", "wall_win", 118, 33); stamp("walls", "wall_win", 118, 34)
stamp("walls", "wall_win", 118, 40); stamp("walls", "wall_win", 118, 41)
stamp("walls", "wall_win", 131, 33); stamp("walls", "wall_win", 131, 34)
stamp("walls", "wall_win", 131, 40); stamp("walls", "wall_win", 131, 41)
# --- الأرضية: مشرقة هندسية + سجادة المنطقة الأمامية ---
fill("floor", "math_floor", 119, 31, 12, 13)
fill("floor", "math_rug", 121, 39, 7, 4)                         # مساحة المدرب الأمامية
# --- الطاولات: مجموعات 2 و4 أطفال، وعلى كل طاولة سوروبان ---
for tx, ty in [(121, 32), (125, 32), (129, 32), (125, 36)]:
    solid("math_table", tx, ty)                                  # طاولة طفلين بسوروبانين
    solid("math_chair", tx, ty - 1); solid("math_chair", tx, ty + 1)
for tx in (122, 127):
    solid("math_table4", tx, 36)                                 # طاولة 4 أطفال بأربع سوروبانات
    solid("math_chair", tx, 35); solid("math_chair", tx, 37)
    solid("math_chair", tx - 1, 36); solid("math_chair", tx + 1, 36)
# --- منطقة المدرب: سبورة قابلة + صندوق أدوات العد ---
solid("easel", 124, 40)
solid("block_box", 120, 42)
# --- الخزائن والنباتات والتكريم ---
solid("math_cabinet", 119, 34); solid("math_cabinet", 119, 38)
solid("math_cabinet", 130, 34); solid("math_cabinet", 130, 38)
solid("plant_s", 119, 31); solid("plant_s", 130, 31)
solid("trophy", 130, 42)                                         # كأس أسرع عقل في الفصل
solid("bin", 119, 42)

# ================================================================ ABOVE PLAYER
stamp("abovePlayer1", "can_ul", 27, 40); stamp("abovePlayer1", "can_ur", 28, 40)
stamp("abovePlayer1", "can_ll", 27, 41); stamp("abovePlayer1", "can_lr", 28, 41)
stamp("abovePlayer1", "flag_up", 44, 39)
for xx in range(41, 47):
    stamp("abovePlayer1", "gsign_l" if xx % 2 == 0 else "gsign_r", xx, 61)
# قاعة النجوم: مناور الإضاءة المسرحية فوق المسرح + لوحات مخارج
for xx in range(107, 114):
    stamp("abovePlayer1", "truss", xx, 24)
    stamp("abovePlayer1", "truss", xx, 50)
stamp("abovePlayer1", "exit_sign", 86, 33); stamp("abovePlayer1", "exit_sign", 86, 38)
stamp("abovePlayer1", "exit_sign", 87, 15); stamp("abovePlayer1", "exit_sign", 87, 56)

# ================================================================ ZONES
fill("zones_silent", "mark_zone", 5, 48, 8, 8)                 # مكتبة
fill("zones_silent", "mark_zone", 71, 24, 12, 9)               # مكتب المدير
fill("zones_jitsi_meeting", "mark_zone", 71, 44, 3, 3)         # اجتماعات المعلمين
fill("zones_jitsi_director", "mark_zone", 71, 29, 3, 3)        # اجتماعات المدير
fill("zones_speaker", "mark_zone", 32, 24, 9, 4)               # المنصة
fill("zones_listener", "mark_zone", 20, 28, 48, 33)            # الساحة
# قاعة النجوم: بثّ صوتي من المسرح للجمهور + اجتماع عن بُعد للأولياء
fill("zones_speaker", "mark_zone", 107, 19, 8, 35)             # منصّة القاعة (Megaphone)
fill("zones_listener", "mark_zone", 87, 15, 19, 43)            # جمهور القاعة
fill("zones_jitsi_hall", "mark_zone", 108, 33, 7, 6)           # محاضرة أولياء/حفل عن بُعد (Jitsi)
fill("zones_jitsi_club", "mark_zone", 92, 6, 9, 5)             # دائرة الحوار (بثّ الجلسة هجينًا)
fill("zones_jitsi_chess", "mark_zone", 121, 22, 7, 4)          # منصّة المدرب (بثّ الدرس/المباراة هجينًا)
fill("zones_jitsi_math", "mark_zone", 121, 38, 7, 5)           # منطقة المدرب (بثّ التحديات هجينًا)

# ================================================================ START
fill("start", "mark_start", 41, 59, 6, 3)

# ================================================================ OBJECTS
def prop(name, type_, value):
    return {"name": name, "type": type_, "value": value}

def web_props(url, extra=None, msg=None):
    ps = [
        prop("openWebsite", "string", url),
        prop("openWebsiteTrigger", "string", "onaction"),
        prop("openWebsiteAllowApi", "bool", True),
        prop("openWebsitePosition", "string", "right"),
        prop("openWebsiteWidth", "string", "55"),
        prop("openWebsiteTriggerMessage", "string", msg or "اضغط [مسافة] للفتح"),
    ]
    return ps + (extra or [])

objects = []
oid = 1
def obj(name, x, y, w, h, props):
    global oid
    objects.append({
        "class": "", "height": h * T, "id": oid, "name": name,
        "properties": props, "rotation": 0, "type": "", "visible": True,
        "width": w * T, "x": x * T, "y": y * T,
    })
    oid += 1

UI = "/maps/school/admin-ui/"
obj("computer", 76, 25, 3, 1, web_props(UI + "computer.html?loc=office&tool=computer"))
obj("ledger", 78, 25, 1, 1, web_props(UI + "attendance.html?loc=office&tool=ledger"))
obj("phone", 76, 25, 1, 1, web_props(UI + "notifications.html?loc=office&tool=phone"))
obj("files", 82, 25, 1, 5, web_props(UI + "files.html?loc=office&tool=files"))
obj("board", 70, 31, 1, 2, web_props(UI + "announcements.html?loc=office&tool=board"))
obj("calendar", 72, 23, 2, 1, web_props(UI + "calendar.html?loc=office&tool=calendar"))
obj("timetables", 75, 28, 2, 2, web_props(UI + "timetables.html?loc=office&tool=tables"))
obj("school-view", 78, 23, 2, 1, web_props(UI + "school-view.html?loc=office&tool=screen"))
obj("meetings", 71, 29, 3, 3, web_props(UI + "meetings.html?loc=office&tool=meetings"))
obj("reception-desk", 76, 55, 2, 3, web_props(UI + "reception.html?loc=reception&tool=reception"))
obj("reception-screen", 79, 52, 2, 1, web_props(UI + "reception.html?loc=reception&tool=screen"))
obj("library-shelf", 5, 49, 7, 7, web_props(UI + "library.html?loc=library&tool=library"))
obj("welcome-stand", 39, 5, 1, 3, web_props(UI + "welcome.html?loc=lobby&tool=welcome"))
obj("outdoor-board", 48, 28, 2, 1, web_props(UI + "welcome.html?loc=courtyard&tool=quote"))
obj("info-board", 48, 52, 1, 1, web_props(UI + "announcements.html?loc=courtyard&tool=notice"))
obj("gate-sign", 41, 61, 6, 1, web_props(UI + "welcome.html?loc=gate&tool=gate"))
obj("tree-sign", 31, 42, 1, 1, web_props(UI + "school-view.html?loc=courtyard&tool=tree"))
# ---- قاعة النجوم ----
obj("led-screen", 115, 31, 1, 12, web_props(UI + "ceremony.html?loc=hall&tool=led"))
obj("tech-desk", 87, 35, 2, 3, web_props(UI + "stage.html?loc=hall&tool=tech"))
obj("curtains", 106, 17, 9, 2, web_props(UI + "stage.html?loc=hall&tool=curtains"))
obj("backdrop", 115, 20, 1, 11, web_props(UI + "stage.html?loc=hall&tool=backdrop"))
obj("sound-system", 105, 18, 1, 2, web_props(UI + "stage.html?loc=hall&tool=sound"))
obj("prizes-honors", 110, 44, 2, 1, web_props(UI + "ceremony.html?loc=hall&tool=honors"))
obj("guestbook", 89, 35, 1, 2, web_props(UI + "ceremony.html?loc=hall&tool=program"))
obj("honor-roll", 92, 14, 2, 1, web_props(UI + "ceremony.html?loc=hall&tool=honors"))
obj("hall-sign", 85, 28, 1, 2, web_props(UI + "welcome.html?loc=hall&tool=hall"))
# ---- نادي المبدعين الصغار ----
obj("club-sign", 90, 4, 3, 1, web_props(UI + "club.html?loc=club&tool=about",
    msg="نادي المبدعين الصغار — نتحدث • نفكر • نختلف • نبدع"))
obj("idea-board", 94, 4, 8, 1, web_props(UI + "club.html?loc=club&tool=board",
    msg="لوحة «موضوع اليوم» — اضغط مسافة لتغيير موضوع الجلسة"))
obj("question-board", 105, 7, 1, 3, web_props(UI + "club.html?loc=club&tool=questions",
    msg="لوحة الأسئلة — أسئلة الأطفال المطروحة للمناقشة"))
obj("idea-wall", 105, 10, 1, 1, web_props(UI + "club.html?loc=club&tool=ideas",
    msg="جدار الأفكار — بطاقات آراء الأطفال"))
obj("club-mic", 96, 8, 1, 1, web_props(UI + "club.html?loc=club&tool=mic",
    msg="ميكروفون «دور المتحدث» — مرّر الميكروفون بالدائرة"))
obj("games-box", 104, 5, 1, 1, web_props(UI + "club.html?loc=club&tool=games",
    msg="ركن ألعاب التفكير والألغاز والمناظرات البسيطة"))
obj("phrase-cards", 104, 6, 1, 1, web_props(UI + "club.html?loc=club&tool=cards",
    msg="بطاقات الحوار: «أنا أعتقد…» «أختلف لأن…» «لدي سؤال…»"))
obj("club-books", 88, 5, 1, 2, web_props(UI + "library.html?loc=club&tool=library",
    msg="كتب وقصص ومجلات تفتح أبوابًا للنقاش"))
# ---- فصل الشطرنج ----
obj("chess-title", 119, 26, 2, 1, web_props(UI + "chess.html?loc=chess&tool=title",
    msg="♟️ فصل الشطرنج — عالم الشطرنج: فكّر، لاحظ، تحرك"))
obj("chess-screen", 121, 26, 2, 1, web_props(UI + "chess.html?loc=chess&tool=digital-board",
    msg="الشاشة الرقمية — رقعة تفاعلية لعرض الدروس والألغاز"))
obj("chess-movements", 123, 26, 2, 1, web_props(UI + "chess.html?loc=chess&tool=movements",
    msg="مخطط حركة القطع: كيف تتحرك كل قطعة؟"))
obj("chess-puzzles", 125, 26, 2, 1, web_props(UI + "chess.html?loc=chess&tool=puzzles",
    msg="ألغاز الشطرنج — تحدٍّ جديد في كل جلسة"))
obj("chess-tournament", 127, 26, 2, 1, web_props(UI + "chess.html?loc=chess&tool=tournament",
    msg="لوحة التحديات والبطولات الداخلية"))
obj("demo-board", 125, 24, 2, 2, web_props(UI + "chess.html?loc=chess&tool=digital-board",
    msg="الرقعة التعليمية الكبيرة — موقع شرح المدرب"))
obj("trainer-desk", 122, 24, 2, 1, web_props(UI + "chess.html?loc=chess&tool=digital-board",
    msg="مكتب المدرب — الحاسوب وساعة الشطرنج"))
obj("chess-books", 119, 22, 1, 2, web_props(UI + "chess.html?loc=chess&tool=puzzles",
    msg="كتب وألغاز شطرنج لجميع المستويات"))
# ---- فصل الحساب الذهني ----
obj("math-title", 119, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=title",
    msg="🧠 فصل الحساب الذهني — تحدي العقل: أسرع بالتفكير"))
obj("math-screen", 121, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=screen",
    msg="الشاشة الكبيرة — عدّ تنازلي وبطاقات أرقام وتحديات للمجموعة"))
obj("strategy-board", 123, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=strategy",
    msg="لوحة الاستراتيجيات: فكّك الأرقام، دائرة العشرة، ابدأ بالأكبر…"))
obj("speed-timers", 125, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=challenges",
    msg="المؤقت الرقمي — تحديات السرعة الفردية والجماعية"))
obj("challenge-wall", 127, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=challenges",
    msg="جدار التحديات — مسائل سريعة وألغاز وتسلسلات تتغير باستمرار"))
obj("level-wall", 129, 44, 2, 1, web_props(UI + "math.html?loc=math&tool=levels",
    msg="مستويات الأطفال المحفّزة — كل طفل يتحدى نفسه فقط"))
obj("trainer-easel", 124, 40, 1, 1, web_props(UI + "math.html?loc=math&tool=strategy",
    msg="سبورة المدرب — اشرح استراتيجية اليوم للمجموعة"))

# ================================================================ MAP JSON
def flatten(name):
    data = []
    for row in GRID[name]:
        data.extend(row)
    return data

def tilelayer(lid, name):
    return {
        "data": flatten(name), "height": H, "id": lid, "name": name,
        "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0,
    }

zone_props = {
    "zones_silent": [prop("silent", "bool", True)],
    "zones_jitsi_hall": [
        prop("jitsiRoom", "string", "NGAcademy-Auditorium"),
        prop("jitsiTrigger", "string", "onaction"),
        prop("jitsiTriggerMessage", "string", "قاعة النجوم — نقل مباشر للأولياء (اضغط [مسافة])"),
    ],
    "zones_jitsi_club": [
        prop("jitsiRoom", "string", "NGAcademy-Club"),
        prop("jitsiTrigger", "string", "onaction"),
        prop("jitsiTriggerMessage", "string", "نادي المبدعين الصغار — بثّ الجلسة للأولياء عن بُعد (اضغط [مسافة])"),
    ],
    "zones_jitsi_chess": [
        prop("jitsiRoom", "string", "NGAcademy-Chess"),
        prop("jitsiTrigger", "string", "onaction"),
        prop("jitsiTriggerMessage", "string", "فصل الشطرنج — بثّ الدرس أو المباراة للأولياء عن بُعد (اضغط [مسافة])"),
    ],
    "zones_jitsi_math": [
        prop("jitsiRoom", "string", "NGAcademy-Math"),
        prop("jitsiTrigger", "string", "onaction"),
        prop("jitsiTriggerMessage", "string", "فصل الحساب الذهني — بثّ التحدي للأولياء عن بُعد (اضغط [مسافة])"),
    ],
    "zones_jitsi_meeting": [
        prop("jitsiRoom", "string", "NGAcademy-Teachers"),
        prop("jitsiTrigger", "string", "onenter"),
        prop("jitsiTriggerMessage", "string", "غرفة اجتماعات المعلمين — تفضل بالدخول"),
    ],
    "zones_jitsi_director": [
        prop("jitsiRoom", "string", "NGAcademy-DirectorMeeting"),
        prop("jitsiTrigger", "string", "onaction"),
        prop("jitsiTriggerMessage", "string", "اجتماع الإدارة — اضغط [مسافة] للمشاركة"),
    ],
    "zones_speaker": [prop("speakerMegaphone", "string", "NGAcademy-MorningAssembly")],
    "zones_listener": [prop("listenerMegaphone", "string", "NGAcademy-MorningAssembly")],
}

layers = []
lid = 1
for name in ["start", "collisions"]:
    layers.append(tilelayer(lid, name)); lid += 1
for name in ["zones_silent", "zones_jitsi_meeting", "zones_jitsi_director", "zones_jitsi_hall", "zones_jitsi_club", "zones_jitsi_chess", "zones_jitsi_math", "zones_speaker", "zones_listener"]:
    tl = tilelayer(lid, name)
    tl["properties"] = zone_props[name]
    layers.append(tl); lid += 1
for name in ["floor", "walls", "furniture", "abovePlayer1", "abovePlayer2"]:
    layers.append(tilelayer(lid, name)); lid += 1
layers.append({
    "draworder": "topdown", "id": lid, "name": "objects",
    "objects": objects, "opacity": 1, "type": "objectgroup",
    "visible": True, "x": 0, "y": 0,
})

TS_W, TS_H = 16, ((len(GIDS) + 15) // 16)
ts_img = Image.open(os.path.join(ASSETS, "ng-tiles.png"))
tileset = {
    "columns": 16,
    "firstgid": 1,
    "image": "assets/ng-tiles.png",
    "imageheight": ts_img.height,
    "imagewidth": ts_img.width,
    "margin": 0,
    "name": "ng-tiles",
    "spacing": 0,
    "tilecount": len(GIDS),
    "tileheight": 32,
    "tilewidth": 32,
    "tiles": [
        {"id": GIDS["mark_collide"] - 1,
         "properties": [prop("collides", "bool", True)]},
    ],
    "type": "tileset",
    "version": "1.10",
    "tiledversion": "1.10.2",
}

tmap = {
    "compressionlevel": -1,
    "height": H,
    "infinite": False,
    "layers": layers,
    "nextlayerid": lid + 1,
    "nextobjectid": oid,
    "orientation": "orthogonal",
    "properties": [
        prop("script", "string", "./script.js"),
        prop("name", "string", "NG Academy"),
    ],
    "renderorder": "right-down",
    "tiledversion": "1.10.2",
    "tileheight": T,
    "tilesets": [tileset],
    "tilewidth": T,
    "type": "map",
    "version": "1.10",
    "width": W,
}

with open(os.path.join(ROOT, "map.json"), "w") as f:
    json.dump(tmap, f)
print("map.json written:", W, "x", H, "| layers:", len(layers), "| objects:", len(objects))

# ================================================================ PREVIEW
sheet = ts_img
def gid_xy(gid):
    i = gid - 1
    return (i % 16) * 32, (i // 16) * 32

prev = Image.new("RGBA", (W * T, H * T), (250, 250, 250, 255))
order = ["floor", "walls", "furniture", "abovePlayer1", "abovePlayer2"]
for name in order:
    gd = GRID[name]
    for yy in range(H):
        for xx in range(W):
            gid = gd[yy][xx]
            if gid:
                sx, sy = gid_xy(gid)
                tile_img = sheet.crop((sx, sy, sx + 32, sy + 32))
                prev.alpha_composite(tile_img, (xx * T, yy * T))
prev.convert("RGB").save(os.path.join(ROOT, "preview.png"))
print("preview.png written")
