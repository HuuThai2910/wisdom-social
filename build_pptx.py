# -*- coding: utf-8 -*-
"""Generate a vivid ~30-slide presentation for the Wisdom Social system."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.shapes import MSO_CONNECTOR
from pptx.oxml.ns import qn
import copy

# ----------------------------------------------------------------------------
# Theme / palette — LIGHT (white + blue) social theme
# ----------------------------------------------------------------------------
WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
INK      = RGBColor(0x0B, 0x25, 0x45)   # primary dark navy text
INK2     = RGBColor(0x23, 0x42, 0x6B)   # secondary text (body)
MUTED    = RGBColor(0x6E, 0x7F, 0x9B)   # captions / footer
BORDER   = RGBColor(0xD4, 0xE2, 0xF4)   # card border
PALE     = RGBColor(0xEA, 0xF2, 0xFD)   # panel tint
PALE2    = RGBColor(0xF2, 0xF7, 0xFE)   # page background bottom
PALE3    = RGBColor(0xDD, 0xEA, 0xFB)   # network/deco lines

# Blue-family accents — softened / desaturated for harmony with white
INDIGO   = RGBColor(0x5B, 0x63, 0xD6)
PURPLE   = RGBColor(0x51, 0x58, 0xC4)
VIOLET   = RGBColor(0x7A, 0x82, 0xE6)
BLUE     = RGBColor(0x3E, 0x78, 0xD6)
ROYAL    = RGBColor(0x2F, 0x62, 0xC9)
NAVY     = RGBColor(0x2A, 0x4A, 0x93)
SKY      = RGBColor(0x3A, 0x9B, 0xCE)
CYAN     = RGBColor(0x2E, 0x93, 0xAE)
TEAL     = RGBColor(0x2F, 0x86, 0xA4)
STEEL    = RGBColor(0x54, 0x70, 0xCE)
AQUA     = RGBColor(0x8F, 0xBD, 0xEE)

# Re-purposed legacy names → blue tones (so existing slide code stays cohesive)
GREEN    = SKY
AMBER    = ROYAL
ORANGE   = STEEL
ROSE     = NAVY
PINK     = AQUA
SLATE    = NAVY

# Surfaces (light)
DARK     = INK
DARK2    = RGBColor(0xDC, 0xEA, 0xFB)   # light-blue tint (chips / rows / strips)
CARDBG   = RGBColor(0xFF, 0xFF, 0xFF)   # white card
PANEL    = RGBColor(0xF4, 0xF8, 0xFE)   # soft panel
LIGHT    = INK2                          # legacy: body text now dark
LIGHTGRAY= MUTED                         # legacy: muted text now dark
GRAY     = MUTED                         # legacy alias

FONT = "Segoe UI"
FONT_B = "Segoe UI Semibold"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def _set_grad(shape, c1, c2, angle=45):
    """Apply a two-stop linear gradient fill to a shape."""
    sp = shape.fill._xPr
    # remove existing fill nodes
    for tag in ('a:noFill','a:solidFill','a:gradFill','a:blipFill','a:pattFill','a:grpFill'):
        for el in sp.findall(qn(tag)):
            sp.remove(el)
    grad = sp.makeelement(qn('a:gradFill'), {})
    lst = grad.makeelement(qn('a:gsLst'), {})
    for pos, col in ((0, c1), (100000, c2)):
        gs = grad.makeelement(qn('a:gs'), {'pos': str(pos)})
        clr = gs.makeelement(qn('a:srgbClr'), {'val': '%02X%02X%02X' % (col[0], col[1], col[2])})
        gs.append(clr); lst.append(gs)
    grad.append(lst)
    lin = grad.makeelement(qn('a:lin'), {'ang': str(int(angle*60000)), 'scaled': '1'})
    grad.append(lin)
    # insert before a:ln if present
    ln = sp.find(qn('a:ln'))
    if ln is not None:
        ln.addprevious(grad)
    else:
        sp.append(grad)

def bg(slide, color=DARK):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    s.fill.solid(); s.fill.fore_color.rgb = color
    s.line.fill.background()
    s.shadow.inherit = False
    return s

def bg_grad(slide, c1=DARK, c2=DARK2, angle=60):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    s.line.fill.background(); s.shadow.inherit = False
    _set_grad(s, c1, c2, angle)
    return s

def deco_circle(slide, x, y, d, color, alpha=None):
    c = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, d, d)
    c.fill.solid(); c.fill.fore_color.rgb = color
    c.line.fill.background(); c.shadow.inherit = False
    if alpha is not None:
        _set_alpha(c, alpha)
    return c

def _set_alpha(shape, alpha):
    """alpha 0..100 (percent opacity)."""
    sp = shape.fill._xPr
    sf = sp.find(qn('a:solidFill'))
    if sf is None:
        return
    clr = sf.find(qn('a:srgbClr'))
    a = clr.makeelement(qn('a:alpha'), {'val': str(int(alpha*1000))})
    clr.append(a)

def soft_shadow(shape, blur=0.09, dist=0.05, alpha=20, col=NAVY, direction=5400000):
    """Add a soft outer drop shadow (alpha = shadow opacity %)."""
    spPr = shape._element.spPr
    for el in spPr.findall(qn('a:effectLst')):
        spPr.remove(el)
    eff = spPr.makeelement(qn('a:effectLst'), {})
    sh = eff.makeelement(qn('a:outerShdw'), {
        'blurRad': str(int(Inches(blur))), 'dist': str(int(Inches(dist))),
        'dir': str(direction), 'rotWithShape': '0'})
    clr = sh.makeelement(qn('a:srgbClr'), {'val': '%02X%02X%02X' % (col[0], col[1], col[2])})
    a = clr.makeelement(qn('a:alpha'), {'val': str(int(alpha*1000))})
    clr.append(a); sh.append(clr); eff.append(sh)
    spPr.append(eff)
    return shape

def rect(slide, x, y, w, h, color, rounded=True, line=None, line_w=None, shadow=False):
    shp = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shp, x, y, w, h)
    s.fill.solid(); s.fill.fore_color.rgb = color
    is_card = (color == CARDBG and line is None)
    if line is None:
        if is_card:
            s.line.color.rgb = BORDER; s.line.width = Pt(1)
        else:
            s.line.fill.background()
    else:
        s.line.color.rgb = line; s.line.width = line_w or Pt(1.25)
    s.shadow.inherit = False
    if shadow or is_card:
        soft_shadow(s, blur=0.11, dist=0.06, alpha=15)
    return s

def grad_rect(slide, x, y, w, h, c1, c2, angle=45, rounded=True):
    shp = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shp, x, y, w, h)
    s.line.fill.background(); s.shadow.inherit = False
    _set_grad(s, c1, c2, angle)
    return s

def _set_round(shape, val):
    try:
        shape.adjustments[0] = val
    except Exception:
        pass

def txt(slide, x, y, w, h, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT,
        anchor=MSO_ANCHOR.TOP, font=FONT, italic=False, line_spacing=1.0, shrink=False):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Pt(4); tf.margin_right = Pt(4)
    tf.margin_top = Pt(2); tf.margin_bottom = Pt(2)
    lines = text.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line_spacing: p.line_spacing = line_spacing
        r = p.add_run(); r.text = ln
        r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
        r.font.name = font; r.font.color.rgb = color
    return tb

def bullets(slide, x, y, w, h, items, size=15, color=LIGHT, gap=6, bullet="▸", bcolor=None, bold_lead=False):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = Pt(2); tf.margin_right = Pt(2)
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap); p.line_spacing = 1.05
        if bullet:
            rb = p.add_run(); rb.text = bullet + "  "
            rb.font.size = Pt(size); rb.font.name = FONT
            rb.font.color.rgb = bcolor or VIOLET; rb.font.bold = True
        # support "lead: rest" bolding
        if bold_lead and ":" in it:
            lead, rest = it.split(":", 1)
            r1 = p.add_run(); r1.text = lead + ":"
            r1.font.size = Pt(size); r1.font.name = FONT_B; r1.font.bold = True; r1.font.color.rgb = WHITE
            r2 = p.add_run(); r2.text = rest
            r2.font.size = Pt(size); r2.font.name = FONT; r2.font.color.rgb = color
        else:
            r = p.add_run(); r.text = it
            r.font.size = Pt(size); r.font.name = FONT; r.font.color.rgb = color
    return tb

def arrow(slide, x1, y1, x2, y2, color=VIOLET, width=2.25):
    cn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    cn.line.color.rgb = color; cn.line.width = Pt(width)
    cn.shadow.inherit = False
    le = cn.line._get_or_add_ln()
    tail = le.makeelement(qn('a:tailEnd'), {'type': 'triangle', 'w': 'med', 'len': 'med'})
    le.append(tail)
    return cn

def page_header(slide, kicker, title, accent=BLUE):
    # accent bar (rounded gradient)
    bar = grad_rect(slide, Inches(0.55), Inches(0.55), Inches(0.16), Inches(0.95), accent, _lighten(accent), 90)
    _set_round(bar, 0.5)
    txt(slide, Inches(0.88), Inches(0.5), Inches(11), Inches(0.4), kicker.upper(),
        size=13, color=accent, bold=True, font=FONT_B)
    txt(slide, Inches(0.86), Inches(0.82), Inches(11.6), Inches(0.8), title,
        size=30, color=INK, bold=True, font=FONT_B)

def _lighten(col, f=0.45):
    return RGBColor(int(col[0]+(255-col[0])*f), int(col[1]+(255-col[1])*f), int(col[2]+(255-col[2])*f))

def footer(slide, n, accent=BLUE):
    txt(slide, Inches(0.55), Inches(7.02), Inches(6), Inches(0.35), "Wisdom Social  •  Social Networking Platform",
        size=9.5, color=MUTED)
    # page number pill
    p = grad_rect(slide, Inches(12.3), Inches(6.98), Inches(0.55), Inches(0.34), accent, _lighten(accent, 0.3), 30)
    _set_round(p, 0.5)
    txt(slide, Inches(12.3), Inches(6.96), Inches(0.55), Inches(0.34), str(n),
        size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

def chip(slide, x, y, w, text, color, h=Inches(0.42), tcolor=WHITE, size=12.5):
    c = rect(slide, x, y, w, h, color); _set_round(c, 0.5)
    txt(slide, x, y-Pt(1), w, h, text, size=size, color=tcolor, bold=True,
        align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    return c

def icon_card(slide, x, y, w, h, icon, title, body, c1, c2, tsize=15, bsize=11.5):
    card = rect(slide, x, y, w, h, CARDBG, line=BORDER, line_w=Pt(1))
    _set_round(card, 0.08)
    soft_shadow(card, blur=0.1, dist=0.055, alpha=16)
    # top accent strip
    strip = grad_rect(slide, x, y, w, Inches(0.12), c1, c2, angle=0)
    _set_round(strip, 0.5)
    # icon badge
    badge = grad_rect(slide, x+Inches(0.22), y+Inches(0.28), Inches(0.66), Inches(0.66), c1, c2, angle=45)
    _set_round(badge, 0.3)
    soft_shadow(badge, blur=0.06, dist=0.04, alpha=24, col=c1)
    txt(slide, x+Inches(0.22), y+Inches(0.26), Inches(0.66), Inches(0.66), icon,
        size=24, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    txt(slide, x+Inches(0.2), y+Inches(1.02), w-Inches(0.4), Inches(0.4), title,
        size=tsize, color=INK, bold=True, font=FONT_B)
    txt(slide, x+Inches(0.2), y+Inches(1.42), w-Inches(0.4), h-Inches(1.5), body,
        size=bsize, color=INK2, line_spacing=1.05)
    return card

def flow_box(slide, x, y, w, h, title, sub, c1, c2, icon=""):
    b = grad_rect(slide, x, y, w, h, c1, c2, angle=50)
    _set_round(b, 0.12)
    head = (icon + "  " if icon else "") + title
    txt(slide, x+Inches(0.1), y+Inches(0.12), w-Inches(0.2), Inches(0.5), head,
        size=13.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    if sub:
        txt(slide, x+Inches(0.08), y+h-Inches(0.62), w-Inches(0.16), Inches(0.55), sub,
            size=9.5, color=RGBColor(0xE6,0xE6,0xFA), align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    return b

def line(slide, x1, y1, x2, y2, color, width=1.0, alpha=None):
    cn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    cn.line.color.rgb = color; cn.line.width = Pt(width)
    cn.shadow.inherit = False
    if alpha is not None:
        ln = cn.line._get_or_add_ln()
        sf = ln.find(qn('a:solidFill'))
        if sf is not None:
            clr = sf.find(qn('a:srgbClr'))
            clr.append(clr.makeelement(qn('a:alpha'), {'val': str(int(alpha*1000))}))
    return cn

def deco_network(slide, nodes, edges, lcolor=PALE3, dcolor=AQUA, dot=0.11, lw=1.1, lalpha=70, dalpha=55):
    """Draw a subtle social 'connection graph' decoration."""
    for a, b in edges:
        line(slide, nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], lcolor, lw, alpha=lalpha)
    for (nx, ny) in nodes:
        d = Inches(dot)
        deco_circle(slide, Emu(int(nx)-int(d)//2), Emu(int(ny)-int(d)//2), d, dcolor, alpha=dalpha)

import os as _os
_AVA_DIR = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "assets", "avatars")
AVATARS = [_os.path.join(_AVA_DIR, "av%02d.png" % i) for i in range(12)]
_av_seq = [0]

def avatar(slide, cx, cy, d, idx, shadow=True):
    """Place a circular avatar photo centered at (cx, cy)."""
    p = AVATARS[idx % len(AVATARS)]
    pic = slide.shapes.add_picture(p, Emu(int(cx)-int(d)//2), Emu(int(cy)-int(d)//2), d, d)
    if shadow:
        soft_shadow(pic, blur=0.07, dist=0.045, alpha=24)
    return pic

def deco_people(slide, nodes, edges, idxs=None, d=Inches(0.55), lcolor=PALE3, lw=1.4, lalpha=70):
    """Draw a small 'social graph' of real-photo avatars connected by lines."""
    if idxs is None:
        base = _av_seq[0]
        idxs = [(base + k) % len(AVATARS) for k in range(len(nodes))]
        _av_seq[0] = (base + len(nodes)) % len(AVATARS)
    for a, b in edges:
        line(slide, nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], lcolor, lw, alpha=lalpha)
    for (nx, ny), ix in zip(nodes, idxs):
        avatar(slide, nx, ny, d, ix)

def new_slide(color=None):
    s = prs.slides.add_slide(BLANK)
    bg_grad(s, WHITE, PALE2, 90)
    return s

MOTIF_TINT = RGBColor(0x4E, 0x8B, 0xDE)   # soft blue silhouette
# topic-specific decoration per slide number (diverse, fits the content)
MOTIF_BY_N = {
    2: MSO_SHAPE.CUBE, 3: MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT, 4: MSO_SHAPE.SUN,
    5: MSO_SHAPE.CLOUD, 6: MSO_SHAPE.CLOUD, 7: MSO_SHAPE.HEXAGON, 8: MSO_SHAPE.CUBE,
    9: MSO_SHAPE.GEAR_6, 10: MSO_SHAPE.CHEVRON, 11: MSO_SHAPE.CUBE, 12: MSO_SHAPE.HEXAGON,
    13: MSO_SHAPE.CAN, 14: MSO_SHAPE.LIGHTNING_BOLT, 15: MSO_SHAPE.CUBE, 16: MSO_SHAPE.HEXAGON,
    17: MSO_SHAPE.OVAL_CALLOUT, 18: MSO_SHAPE.DONUT, 19: MSO_SHAPE.HEART, 20: MSO_SHAPE.OVAL_CALLOUT,
    21: MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT, 22: MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT,
    23: MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT, 24: MSO_SHAPE.LIGHTNING_BOLT, 25: MSO_SHAPE.OVAL_CALLOUT,
    26: MSO_SHAPE.SMILEY_FACE, 27: MSO_SHAPE.OVAL_CALLOUT, 28: MSO_SHAPE.LIGHTNING_BOLT,
    29: MSO_SHAPE.CLOUD, 30: MSO_SHAPE.HEXAGON, 31: MSO_SHAPE.HEXAGON, 32: MSO_SHAPE.GEAR_6,
    33: MSO_SHAPE.DONUT, 34: MSO_SHAPE.CHEVRON,
}
_MOTIF_SIZE = {
    MSO_SHAPE.LIGHTNING_BOLT: (1.7, 2.5), MSO_SHAPE.CHEVRON: (2.6, 1.7),
    MSO_SHAPE.ROUNDED_RECTANGULAR_CALLOUT: (2.6, 2.0), MSO_SHAPE.OVAL_CALLOUT: (2.6, 2.0),
    MSO_SHAPE.CAN: (1.9, 2.4),
}

def motif(slide, shape, color=MOTIF_TINT, alpha=9, cx=Inches(12.0), cy=Inches(1.15), rot=0):
    w, h = _MOTIF_SIZE.get(shape, (2.3, 2.3))
    w, h = Inches(w), Inches(h)
    sp = slide.shapes.add_shape(shape, Emu(int(cx)-int(w)//2), Emu(int(cy)-int(h)//2), w, h)
    sp.fill.solid(); sp.fill.fore_color.rgb = color
    sp.line.fill.background(); sp.shadow.inherit = False
    if rot:
        sp.rotation = rot
    _set_alpha(sp, alpha)
    return sp

# subtle decoration on content slides: soft blobs + topic motif (by slide number)
def deco_dots(slide):
    deco_circle(slide, Inches(11.0), Inches(-1.7), Inches(3.4), PALE, alpha=55)
    deco_circle(slide, Inches(-1.5), Inches(5.3), Inches(3.2), PALE, alpha=50)
    sh = MOTIF_BY_N.get(N)
    if sh is not None:
        motif(slide, sh)

N = 0

# ============================================================================
# SLIDE 1 — TITLE
# ============================================================================
N += 1
s = prs.slides.add_slide(BLANK)
bg_grad(s, WHITE, PALE2, 90)
# soft blue blobs
deco_circle(s, Inches(-2.0), Inches(-2.2), Inches(6.0), PALE, alpha=70)
deco_circle(s, Inches(10.4), Inches(3.9), Inches(5.6), PALE, alpha=65)
deco_circle(s, Inches(9.9), Inches(-1.8), Inches(3.6), PALE3, alpha=45)
# social graph of real people on both sides of the hero
lnodes = [(Inches(1.45), Inches(1.55)), (Inches(2.85), Inches(2.5)),
          (Inches(1.65), Inches(3.45)), (Inches(3.2), Inches(4.35))]
ledges = [(0,1),(1,2),(0,2),(2,3),(1,3)]
deco_people(s, lnodes, ledges, idxs=[0,1,2,3], d=Inches(0.92), lcolor=PALE3, lw=1.8, lalpha=70)
rnodes = [(Inches(11.95), Inches(1.6)), (Inches(10.55), Inches(2.55)),
          (Inches(12.15), Inches(3.5)), (Inches(10.5), Inches(4.4))]
redges = [(0,1),(1,2),(0,2),(2,3),(1,3)]
deco_people(s, rnodes, redges, idxs=[4,5,6,7], d=Inches(0.92), lcolor=PALE3, lw=1.8, lalpha=70)
# logo badge
lb = grad_rect(s, Inches(5.66), Inches(1.1), Inches(2.0), Inches(2.0), BLUE, SKY, 45)
_set_round(lb, 0.3)
soft_shadow(lb, blur=0.18, dist=0.1, alpha=30, col=BLUE)
txt(s, Inches(5.66), Inches(1.05), Inches(2.0), Inches(2.0), "🌐", size=80,
    align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
txt(s, Inches(1), Inches(3.42), Inches(11.33), Inches(1.1), "WISDOM SOCIAL",
    size=58, color=INK, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
# accent underline
ul = grad_rect(s, Inches(5.5), Inches(4.55), Inches(2.33), Inches(0.08), SKY, BLUE, 0); _set_round(ul, 0.5)
txt(s, Inches(1.5), Inches(4.72), Inches(10.33), Inches(0.6),
    "Hệ thống Mạng xã hội đa nền tảng — Web • Mobile • Realtime • Cloud • AI",
    size=19, color=INK2, align=PP_ALIGN.CENTER)
# tech chips row
chips = [("Spring Boot · Java 21", INDIGO), ("React · React Native", BLUE),
         ("Hybrid Database", TEAL), ("Realtime · Redis", ROSE), ("AWS · OpenRouter AI", AMBER)]
cx = Inches(1.35); cw = Inches(2.05); gap = Inches(0.18)
for label, col in chips:
    chip(s, cx, Inches(5.55), cw, label, col, size=11)
    cx = Emu(int(cx) + int(cw) + int(gap))
txt(s, Inches(1), Inches(6.5), Inches(11.33), Inches(0.4),
    "Đồ án môn Công nghệ mới trong Phát triển Ứng dụng CNTT",
    size=14, color=LIGHT, align=PP_ALIGN.CENTER, bold=True)
txt(s, Inches(1), Inches(6.92), Inches(11.33), Inches(0.4),
    "Kiến trúc phân tầng · Cơ sở dữ liệu lai · Realtime · Tối ưu hiệu năng",
    size=12, color=GRAY, align=PP_ALIGN.CENTER)

# ============================================================================
# SLIDE 2 — Mục lục / Agenda
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Tổng quan tài liệu", "Nội dung trình bày", CYAN)
agenda = [
    ("01", "Giới thiệu & Mục tiêu", "Bối cảnh đồ án, mục tiêu, phạm vi đề tài", INDIGO, CYAN),
    ("02", "Cloud Computing", "AWS · MongoDB Atlas · TiBi · Vercel · OpenRouter", BLUE, SKY),
    ("03", "Công nghệ & Kiến trúc", "Tech stack · Layered · Hybrid Database", PURPLE, VIOLET),
    ("04", "Tối ưu hiệu năng", "Sliding Window Cache · Compound Index · N+1", TEAL, GREEN),
    ("05", "Module & Luồng chính", "Feed, Chat, Pages, AI · OTP · QR · Realtime", ROSE, PINK),
    ("06", "Bảo mật & Định hướng", "Security model & roadmap tương lai", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.85); ch = Inches(1.42); gx = Inches(0.55); gy = Inches(0.28)
for i, (num, t, d, c1, c2) in enumerate(agenda):
    col = i % 2; row = i // 2
    x = Emu(int(x0) + col*(int(cw)+int(gx)))
    y = Emu(int(y0) + row*(int(ch)+int(gy)))
    card = rect(s, x, y, cw, ch, CARDBG); _set_round(card, 0.1)
    nb = grad_rect(s, x+Inches(0.2), y+Inches(0.26), Inches(0.9), Inches(0.9), c1, c2, 45)
    _set_round(nb, 0.25)
    txt(s, x+Inches(0.2), y+Inches(0.22), Inches(0.9), Inches(0.9), num, size=26, color=WHITE,
        bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    txt(s, x+Inches(1.25), y+Inches(0.26), cw-Inches(1.4), Inches(0.5), t, size=17, color=INK, bold=True, font=FONT_B)
    txt(s, x+Inches(1.25), y+Inches(0.78), cw-Inches(1.4), Inches(0.5), d, size=12, color=MUTED)
footer(s, N, CYAN)

# ============================================================================
# SLIDE 3 — Giới thiệu
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.1  Tổng quan", "Wisdom Social là gì?", INDIGO)
txt(s, Inches(0.85), Inches(1.82), Inches(11.6), Inches(1.1),
    "Hệ thống mạng xã hội đa nền tảng, vận dụng kiến trúc phần mềm phân tầng, cơ sở dữ liệu lai, lập trình "
    "realtime và tối ưu hiệu năng. Tham khảo Instagram & Zalo, chọn lọc các chức năng phù hợp người dùng Việt: "
    "Story, Reels, Newsfeed, Chat cá nhân/nhóm, Page, Notification.",
    size=14.5, color=LIGHT, line_spacing=1.18)
cards = [
    ("🖥️", "Backend", "Spring Boot 3.5 trên Java 21 — vừa là REST API Server vừa là WebSocket Server phục vụ các chức năng realtime.", INDIGO, VIOLET),
    ("🌐", "Frontend Web", "SPA bằng React 19, Vite 7, TailwindCSS 4 & Ant Design 5 — tối ưu cho trình duyệt máy tính & máy tính bảng.", BLUE, CYAN),
    ("📱", "Frontend Mobile", "Ứng dụng di động React Native 0.81 + Expo SDK 54 — hỗ trợ đồng thời Android và iOS.", TEAL, GREEN),
]
x0 = Inches(0.85); cw = Inches(3.85); ch = Inches(2.55); gx = Inches(0.33)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    x = Emu(int(x0) + i*(int(cw)+int(gx)))
    icon_card(s, x, Inches(3.1), cw, ch, ic, t, b, c1, c2, tsize=17, bsize=12.5)
# bottom strip
strip = rect(s, Inches(0.85), Inches(5.95), Inches(11.6), Inches(0.85), DARK2); _set_round(strip, 0.12)
txt(s, Inches(1.05), Inches(6.0), Inches(11.3), Inches(0.4), "💡  Ý nghĩa tên gọi", size=12.5, color=CYAN, bold=True, font=FONT_B)
txt(s, Inches(1.05), Inches(6.38), Inches(11.3), Inches(0.4),
    "“Wisdom Social” — không gian mạng xã hội tích cực để chia sẻ kiến thức, kinh nghiệm, khoảnh khắc đời sống và kết nối qua nội dung mang giá trị cộng đồng.",
    size=11.5, color=LIGHTGRAY, anchor=MSO_ANCHOR.MIDDLE)
footer(s, N, INDIGO)

# ============================================================================
# SLIDE 4 — Mục tiêu & Phạm vi
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.2  Mục tiêu đề tài", "Bốn nhóm mục tiêu nghiên cứu", TEAL)
objs = [
    ("☁️", "1.2.1  Cloud Computing", "Nghiên cứu & vận dụng các nền tảng điện toán đám mây hiện đại để xây hệ thống mở rộng, bảo mật, tối ưu tài nguyên (Cloud-Based Architecture).", INDIGO, VIOLET),
    ("🗄️", "1.2.2  Kiến trúc dữ liệu", "Triển khai Polyglot Persistence (Hybrid Database), tối ưu truy vấn (Compound Index), nhiều chiến lược cache; chung 1 backend cho Web & Mobile.", BLUE, CYAN),
    ("⚡", "1.2.3  Realtime & Thuật toán", "Giao tiếp thời gian thực độ trễ thấp cho chat, notification, cuộc gọi; tối ưu lưu trữ - truy xuất - đồng bộ dữ liệu.", ROSE, PINK),
    ("🎨", "1.2.4  Trải nghiệm người dùng", "Giao diện hiện đại, trực quan, hoàn toàn tiếng Việt; hỗ trợ Dark Mode trên cả Web và Mobile.", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.7); ch = Inches(2.2); gx = Inches(0.2); gy = Inches(0.22)
for i, (ic, t, b, c1, c2) in enumerate(objs):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=15.5, bsize=12)
footer(s, N, TEAL)

# ============================================================================
# SLIDE — Cloud Computing services map
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.2.1  Cloud Computing", "Hệ sinh thái dịch vụ đám mây", SKY)
txt(s, Inches(0.85), Inches(1.78), Inches(11.6), Inches(0.5),
    "Thiết kế Cloud-Based Architecture — tận dụng dịch vụ chuyên biệt từ nhiều nhà cung cấp để tối ưu từng thành phần.",
    size=13, color=LIGHT)
cloud = [
    ("🔐", "AWS Cognito", "Quản lý danh tính tập trung: đăng ký, OTP qua SĐT, đăng nhập, phiên & cấp JWT.", INDIGO, VIOLET),
    ("🪣", "AWS S3", "Lưu media (ảnh, video, story, reels, avatar) qua Pre-signed URL — client upload trực tiếp.", ORANGE, AMBER),
    ("🖥️", "AWS EC2", "Máy chủ ảo (IaaS) chạy backend Spring Boot — chủ động cấu hình môi trường & tài nguyên.", BLUE, SKY),
    ("📦", "AWS ECR", "Kho Docker Image tập trung — quản lý phiên bản, nền tảng cho DevOps / CI-CD.", PURPLE, VIOLET),
    ("🗄️", "TiBi Cloud DB", "MariaDB dạng DBaaS — dữ liệu quan hệ (user, bạn bè, hội thoại, page).", TEAL, GREEN),
    ("🍃", "MongoDB Atlas", "MongoDB trên cloud — bài viết, tin nhắn, bình luận, story, thông báo.", GREEN, TEAL),
    ("▲", "Vercel", "Deploy & CDN toàn cầu cho React — auto build từ GitHub, giảm độ trễ tải UI.", DARK, GRAY),
    ("🤖", "OpenRouter", "AI Gateway chuẩn OpenAPI — kết nối GPT, Claude, Gemini, DeepSeek, Mistral.", ROSE, PINK),
]
x0 = Inches(0.85); y0 = Inches(2.35); cw = Inches(2.85); ch = Inches(1.95); gx = Inches(0.13); gy = Inches(0.18)
for i, (ic, t, b, c1, c2) in enumerate(cloud):
    col = i % 4; row = i // 4
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    card = rect(s, x, y, cw, ch, CARDBG); _set_round(card, 0.08)
    bd = grad_rect(s, x+Inches(0.15), y+Inches(0.16), Inches(0.58), Inches(0.58), c1, c2, 45); _set_round(bd, 0.28)
    txt(s, x+Inches(0.15), y+Inches(0.14), Inches(0.58), Inches(0.58), ic, size=20, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    txt(s, x+Inches(0.82), y+Inches(0.18), cw-Inches(0.95), Inches(0.55), t, size=13, color=INK, bold=True, font=FONT_B)
    txt(s, x+Inches(0.18), y+Inches(0.82), cw-Inches(0.34), Inches(1.05), b, size=9.5, color=INK2, line_spacing=1.0)
footer(s, N, SKY)

# ============================================================================
# SLIDE — Cloud service models
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Cloud Service Models", "Tiếp cận đa mô hình dịch vụ Cloud", BLUE)
txt(s, Inches(0.85), Inches(1.8), Inches(11.6), Inches(0.6),
    "Việc kết hợp nhiều nền tảng giúp nhóm tiếp cận thực tế nhiều mô hình dịch vụ điện toán đám mây khác nhau:",
    size=14, color=LIGHT)
models = [
    ("IaaS", "Infrastructure as a Service", "AWS EC2 — máy chủ ảo chạy backend", INDIGO, VIOLET),
    ("PaaS", "Platform as a Service", "Vercel — build & deploy frontend tự động", BLUE, CYAN),
    ("DBaaS", "Database as a Service", "TiBi Cloud (MariaDB) · MongoDB Atlas", TEAL, GREEN),
    ("Registry", "Container Registry Service", "AWS ECR — kho Docker Image tập trung", AMBER, ORANGE),
    ("AIaaS", "AI as a Service", "OpenRouter — AI Gateway đa mô hình", ROSE, PINK),
    ("Auth", "Identity & Auth Service", "AWS Cognito — xác thực & quản lý người dùng", PURPLE, VIOLET),
]
x0 = Inches(0.85); y0 = Inches(2.55); cw = Inches(3.78); ch = Inches(1.85); gx = Inches(0.28); gy = Inches(0.22)
for i, (tag, full, desc, c1, c2) in enumerate(models):
    col = i % 3; row = i // 3
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    card = rect(s, x, y, cw, ch, CARDBG); _set_round(card, 0.08)
    badge = grad_rect(s, x+Inches(0.2), y+Inches(0.22), Inches(1.5), Inches(0.62), c1, c2, 30); _set_round(badge, 0.25)
    txt(s, x+Inches(0.2), y+Inches(0.2), Inches(1.5), Inches(0.62), tag, size=16, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    txt(s, x+Inches(0.2), y+Inches(0.98), cw-Inches(0.4), Inches(0.4), full, size=12, color=INK, bold=True, font=FONT_B)
    txt(s, x+Inches(0.2), y+Inches(1.36), cw-Inches(0.4), Inches(0.45), desc, size=10.5, color=INK2, line_spacing=1.0)
footer(s, N, BLUE)

# ============================================================================
# SLIDE 5 — Bản đồ tính năng
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Feature Map", "Bản đồ các nhóm tính năng", PURPLE)
feats = [
    ("🔐", "Xác thực & Phiên", "Cognito, JWT, cookie/token, QR login", INDIGO, VIOLET),
    ("📝", "Bảng tin", "Post, media, comment, reaction, saved, tagged", BLUE, CYAN),
    ("📸", "Stories & Hồ sơ", "Tạo story, người xem, reaction, highlights", PINK, ROSE),
    ("💬", "Nhắn tin Realtime", "1-1 & nhóm, recall, pin, typing, seen", TEAL, GREEN),
    ("📞", "Gọi Audio/Video", "Tín hiệu call, answer, ICE, reject, end", ORANGE, AMBER),
    ("👥", "Bạn bè & Chặn", "Kết bạn, chấp nhận, từ chối, block/unblock", SKY, CYAN),
    ("📄", "Trang (Pages)", "Tạo trang, thành viên, vai trò, duyệt bài", PURPLE, VIOLET),
    ("🤖", "Trợ lý AI", "Đồng ý dùng AI, tóm tắt, gợi ý trả lời", ROSE, PINK),
    ("🎵", "Nhạc/Media", "Danh sách & tìm nhạc, lưu trữ R2/S3", GREEN, TEAL),
]
x0 = Inches(0.85); y0 = Inches(1.9); cw = Inches(3.78); ch = Inches(1.55); gx = Inches(0.28); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(feats):
    col = i % 3; row = i // 3
    x = Emu(int(x0) + col*(int(cw)+int(gx)))
    y = Emu(int(y0) + row*(int(ch)+int(gy)))
    card = rect(s, x, y, cw, ch, CARDBG); _set_round(card, 0.1)
    bd = grad_rect(s, x+Inches(0.18), y+Inches(0.22), Inches(0.62), Inches(0.62), c1, c2, 45); _set_round(bd, 0.28)
    txt(s, x+Inches(0.18), y+Inches(0.2), Inches(0.62), Inches(0.62), ic, size=22, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    txt(s, x+Inches(0.95), y+Inches(0.2), cw-Inches(1.1), Inches(0.5), t, size=14, color=INK, bold=True, font=FONT_B)
    txt(s, x+Inches(0.95), y+Inches(0.68), cw-Inches(1.1), Inches(0.8), b, size=10.5, color=INK2, line_spacing=1.0)
footer(s, N, PURPLE)

# ============================================================================
# SLIDE 6 — Tech Stack tổng quan
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Technology Stack", "Công nghệ sử dụng — Tổng quan", BLUE)
layers = [
    ("Backend Core", "Java 21 · Spring Boot 3.5.6 · Spring Web · Security · WebSocket · WebFlux", INDIGO, VIOLET),
    ("Lưu trữ dữ liệu", "MariaDB + Spring Data JPA · MongoDB + Spring Data MongoDB", BLUE, SKY),
    ("Realtime", "STOMP · SockJS · Spring Simple Broker · Redis Pub/Sub", ROSE, PINK),
    ("Xác thực & Bảo mật", "AWS Cognito · JWT · secure cookies · token refresh", TEAL, GREEN),
    ("Lưu trữ Media", "AWS S3 SDK · S3 presigned URLs · Cloudflare R2", AMBER, ORANGE),
    ("AI", "OpenRouter-compatible provider · Spring WebClient", PURPLE, VIOLET),
]
y = Inches(1.95); rh = Inches(0.72); gap = Inches(0.12)
for name, tech, c1, c2 in layers:
    badge = grad_rect(s, Inches(0.85), y, Inches(3.0), rh, c1, c2, 30); _set_round(badge, 0.18)
    txt(s, Inches(0.95), y, Inches(2.85), rh, name, size=14.5, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    bar = rect(s, Inches(4.0), y, Inches(8.45), rh, CARDBG); _set_round(bar, 0.18)
    txt(s, Inches(4.25), y, Inches(8.1), rh, tech, size=13, color=LIGHT, anchor=MSO_ANCHOR.MIDDLE)
    y = Emu(int(y) + int(rh) + int(gap))
footer(s, N, BLUE)

# ============================================================================
# SLIDE 7 — Backend tech detail
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Backend", "Tầng Backend — Spring Boot", INDIGO)
cards = [
    ("⚙️", "Framework", "Java 21, Spring Boot 3.5.6\nSpring Web (REST), Spring WebFlux (WebClient reactive cho AI), Spring WebSocket (STOMP).", INDIGO, VIOLET),
    ("🗄️", "Persistence", "Spring Data JPA → MariaDB (định danh, hội thoại).\nSpring Data MongoDB → nội dung MXH (post, comment, message...).", BLUE, CYAN),
    ("🔐", "Security", "Spring Security stateless, xác thực JWT do Cognito phát hành, secure cookies & luồng refresh token.", TEAL, GREEN),
    ("📡", "Realtime & Event", "STOMP broker, tầng Event publish sự kiện hội thoại/tin nhắn/thành viên qua Redis Pub/Sub.", ROSE, PINK),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.7); ch = Inches(2.2); gx = Inches(0.2); gy = Inches(0.22)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=16, bsize=12)
footer(s, N, INDIGO)

# ============================================================================
# SLIDE 8 — Frontend web + mobile
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Frontend", "Web & Mobile Clients", CYAN)
# Web column
wb = rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(4.7), CARDBG); _set_round(wb, 0.05)
strip = grad_rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.7), BLUE, CYAN, 0); _set_round(strip, 0.1)
txt(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.7), "🌐  Web Client", size=19, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(1.1), Inches(2.95), Inches(5.25), Inches(3.5), [
    "React 19 + Vite 7 + TypeScript",
    "Tailwind CSS 4 & Ant Design cho UI",
    "Redux Toolkit + React Router",
    "STOMP/SockJS realtime qua singleton WebSocket",
    "Xác thực bằng cookie trình duyệt",
    "Vite proxy: /api & /ws → backend:8080",
], size=14, bcolor=CYAN, gap=11)
# Mobile column
mb = rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(4.7), CARDBG); _set_round(mb, 0.05)
strip2 = grad_rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.7), TEAL, GREEN, 0); _set_round(strip2, 0.1)
txt(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.7), "📱  Mobile Client", size=19, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(7.0), Inches(2.95), Inches(5.25), Inches(3.5), [
    "Expo 54 + React Native 0.81 + Expo Router",
    "Expo Secure Store lưu token an toàn",
    "Expo Camera: quét QR & chụp ảnh",
    "Đồng bộ chat realtime qua WebSocket",
    "Axios client tự refresh token",
    "Tự phát hiện backend qua LAN host (Expo)",
], size=14, bcolor=GREEN, gap=11)
footer(s, N, CYAN)

# ============================================================================
# SLIDE 9 — Kiến trúc tổng quan (diagram)
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Architecture", "Kiến trúc hệ thống tổng quan", PURPLE)
# Clients
flow_box(s, Inches(1.4), Inches(1.85), Inches(3.4), Inches(0.95), "React Web Client", "REST /api · STOMP /ws", BLUE, CYAN, "🌐")
flow_box(s, Inches(8.5), Inches(1.85), Inches(3.4), Inches(0.95), "Expo Mobile Client", "REST /api · /ws · /ws-native", TEAL, GREEN, "📱")
# Gateway
gw = grad_rect(s, Inches(3.1), Inches(3.15), Inches(7.1), Inches(0.95), INDIGO, PURPLE, 30); _set_round(gw, 0.15)
txt(s, Inches(3.1), Inches(3.15), Inches(7.1), Inches(0.95), "Spring Boot API  +  WebSocket Gateway", size=17, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
arrow(s, Inches(3.1), Inches(2.8), Inches(5.0), Inches(3.15), CYAN)
arrow(s, Inches(10.2), Inches(2.8), Inches(8.3), Inches(3.15), GREEN)
# Layers row
layers = [
    ("🛡️ Security", "JWT · Cognito\nstateless", INDIGO, VIOLET),
    ("🎛️ Controller", "REST + STOMP\nmappings", BLUE, SKY),
    ("⚙️ Service", "user/post/story\npage/chat/AI", TEAL, GREEN),
    ("📨 Event", "events +\nRedis Pub/Sub", ROSE, PINK),
]
x = Inches(1.4); cw = Inches(2.55); gap = Inches(0.18)
for t, sub, c1, c2 in layers:
    flow_box(s, x, Inches(4.45), cw, Inches(1.05), t, sub, c1, c2)
    arrow(s, Emu(int(x)+int(cw)/2), Inches(4.1), Emu(int(x)+int(cw)/2), Inches(4.45), PURPLE, 1.75)
    x = Emu(int(x)+int(cw)+int(gap))
# Data + external
db1 = grad_rect(s, Inches(1.4), Inches(5.95), Inches(3.4), Inches(0.95), AMBER, ORANGE, 30); _set_round(db1, 0.15)
txt(s, Inches(1.4), Inches(5.95), Inches(3.4), Inches(0.95), "🗄️ MariaDB  +  🍃 MongoDB", size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
db2 = grad_rect(s, Inches(5.1), Inches(5.95), Inches(3.4), Inches(0.95), ROSE, PINK, 30); _set_round(db2, 0.15)
txt(s, Inches(5.1), Inches(5.95), Inches(3.4), Inches(0.95), "⚡ Redis Pub/Sub", size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
db3 = grad_rect(s, Inches(8.8), Inches(5.95), Inches(3.4), Inches(0.95), PURPLE, VIOLET, 30); _set_round(db3, 0.15)
txt(s, Inches(8.8), Inches(5.95), Inches(3.4), Inches(0.95), "☁️ Cognito · S3 · R2 · AI", size=13, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
footer(s, N, PURPLE)

# ============================================================================
# SLIDE 10 — Layered architecture backend
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Layered Design", "Kiến trúc phân lớp Backend", INDIGO)
layers = [
    ("Security Layer", "Xác thực JWT, auth Cognito, phiên stateless", INDIGO, VIOLET),
    ("Controller Layer", "REST resources & STOMP message mappings", BLUE, SKY),
    ("Service Layer", "Nghiệp vụ theo domain: user, post, story, page, chat, AI, storage", TEAL, GREEN),
    ("Event Layer", "Sự kiện conversation/message/member & Redis pub/sub", ROSE, PINK),
    ("Persistence Layer", "MariaDB (quan hệ) + MongoDB (tài liệu nội dung MXH)", AMBER, ORANGE),
    ("External Services", "AWS Cognito · AWS S3 · Cloudflare R2 · OpenRouter AI", PURPLE, VIOLET),
]
y = Inches(1.9); rh = Inches(0.74); gap = Inches(0.11)
for i, (name, desc, c1, c2) in enumerate(layers):
    w = Inches(11.6) - Emu(i*int(Inches(0.0)))
    bar = grad_rect(s, Inches(0.85), y, Inches(11.6), rh, c1, c2, 20); _set_round(bar, 0.12)
    txt(s, Inches(1.15), y, Inches(3.4), rh, name, size=15, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    txt(s, Inches(4.6), y, Inches(7.6), rh, desc, size=12.5, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    if i < len(layers)-1:
        arrow(s, Inches(6.65), Emu(int(y)+int(rh)), Inches(6.65), Emu(int(y)+int(rh)+int(gap)), LIGHTGRAY, 1.5)
    y = Emu(int(y) + int(rh) + int(gap))
footer(s, N, INDIGO)

# ============================================================================
# SLIDE 11 — Mô hình dữ liệu split
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.2.2  Hybrid Database", "Polyglot Persistence — 3 loại CSDL", AMBER)
txt(s, Inches(0.85), Inches(1.72), Inches(11.6), Inches(0.5),
    "Kết hợp nhiều loại CSDL để khai thác tối đa ưu điểm riêng của từng công nghệ.",
    size=13, color=LIGHT)
cols = [
    ("🗄️", "MariaDB", "Relational · ACID", ["Người dùng & định danh", "Bạn bè, hội thoại, thành viên nhóm", "Trang cộng đồng (Pages)", "Dữ liệu cần toàn vẹn giao dịch"], "☁️ TiBi Cloud (DBaaS)", AMBER, ORANGE),
    ("🍃", "MongoDB", "Document · NoSQL", ["Bài viết (posts) & media", "Tin nhắn, bình luận, story", "Thông báo (notifications)", "Dữ liệu phi cấu trúc, khối lượng lớn"], "☁️ MongoDB Atlas", GREEN, TEAL),
    ("⚡", "Redis", "In-memory · Cache", ["Cache đa tầng (multi-layer)", "Pub/Sub cho realtime", "Sliding Window / User Cache", "Giảm truy vấn trực tiếp tới DB"], "🔁 Pub/Sub + Cache", ROSE, PINK),
]
x0 = Inches(0.85); cw = Inches(3.85); ch = Inches(4.55); gx = Inches(0.33)
for i, (ic, name, sub, items, badge, c1, c2) in enumerate(cols):
    x = Emu(int(x0)+i*(int(cw)+int(gx)))
    card = rect(s, x, Inches(2.35), cw, ch, CARDBG); _set_round(card, 0.05)
    strip = grad_rect(s, x, Inches(2.35), cw, Inches(0.95), c1, c2, 0); _set_round(strip, 0.08)
    txt(s, x, Inches(2.42), cw, Inches(0.5), ic + "  " + name, size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x, Inches(2.92), cw, Inches(0.35), sub, size=11.5, color=RGBColor(0xEC,0xEC,0xFB), align=PP_ALIGN.CENTER, italic=True)
    bullets(s, x+Inches(0.25), Inches(3.5), cw-Inches(0.45), Inches(2.4), items, size=12, bcolor=c2, gap=10)
    pill = rect(s, x+Inches(0.25), Inches(6.25), cw-Inches(0.5), Inches(0.5), DARK2); _set_round(pill, 0.4)
    txt(s, x+Inches(0.25), Inches(6.23), cw-Inches(0.5), Inches(0.5), badge, size=11, color=c2, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
footer(s, N, AMBER)

# ============================================================================
# SLIDE — Tối ưu hiệu năng & Cache
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.2.3  Performance", "Chiến lược tối ưu hiệu năng", GREEN)
cards = [
    ("🪟", "Sliding Window Cache", "Cache cửa sổ trượt cho lịch sử tin nhắn — tăng tốc tải, giảm truy vấn trực tiếp tới DB.", INDIGO, VIOLET),
    ("⏱️", "Time-Cut Pagination", "Phân trang theo mốc thời gian — xử lý tốt khi người dùng xóa lịch sử hội thoại, hạn chế truy vấn dư thừa.", BLUE, CYAN),
    ("🧭", "Compound Index", "Chỉ mục kết hợp trên MongoDB cho truy vấn newsfeed — tăng tốc tải các danh sách lớn.", TEAL, GREEN),
    ("👤", "Member & User Cache", "Cache thông tin thành viên và người dùng — giảm tải truy vấn lặp lại nhiều lần.", AMBER, ORANGE),
    ("🚫", "Chống N+1 Query", "Tối ưu truy vấn, loại bỏ vấn đề N+1 — giảm số lần round-trip tới cơ sở dữ liệu.", ROSE, PINK),
    ("↔️", "Horizontal Scaling", "Kiến trúc hỗ trợ mở rộng theo chiều ngang — sẵn sàng phục vụ nhiều người dùng đồng thời.", PURPLE, VIOLET),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(3.78); ch = Inches(2.15); gx = Inches(0.28); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 3; row = i // 3
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=14.5, bsize=11)
# highlight banner
ban = grad_rect(s, Inches(0.85), Inches(6.5), Inches(11.6), Inches(0.5), INDIGO, ROSE, 20); _set_round(ban, 0.4)
txt(s, Inches(0.85), Inches(6.48), Inches(11.6), Inches(0.5),
    "★  Điểm nhấn: Sliding Window Cache + Time-Cut Pagination cho module nhắn tin thời gian thực",
    size=12.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
footer(s, N, GREEN)

# ============================================================================
# SLIDE 12 — Cấu trúc monorepo
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Project Structure", "Cấu trúc Monorepo", TEAL)
mods = [
    ("📦 backend/", "Spring Boot API", ["config/ — Security, CORS, Redis, Mongo, S3, WebSocket, AI", "controller/ — REST & WebSocket + controller/ai/", "domain/entity/ — model MySQL & MongoDB", "service/ · event/ · integration/ai/ · repository/", "docker/ — docker-compose Redis"], INDIGO, VIOLET),
    ("🌐 frontend-web/", "React + Vite", ["api/ · components/ · contexts/", "features/chat-ai/ — UI & hooks AI", "hooks/ · pages/ · services/ (WebSocket singleton)", "stores/ · types/ · utils/", "vite.config.ts — proxy /api & /ws"], BLUE, CYAN),
    ("📱 frontend-mobile/", "Expo Router", ["app/ — route groups", "api/ — Axios client + token refresh", "components/ · hooks/ · screens/", "services/ — auth, chat, page, device, WS", "stores/ · types/ · utils/"], TEAL, GREEN),
]
x0 = Inches(0.85); cw = Inches(3.85); ch = Inches(4.5); gx = Inches(0.33)
for i, (t, sub, items, c1, c2) in enumerate(mods):
    x = Emu(int(x0)+i*(int(cw)+int(gx)))
    card = rect(s, x, Inches(1.95), cw, ch, CARDBG); _set_round(card, 0.05)
    strip = grad_rect(s, x, Inches(1.95), cw, Inches(0.78), c1, c2, 0); _set_round(strip, 0.1)
    txt(s, x+Inches(0.15), Inches(2.0), cw-Inches(0.3), Inches(0.42), t, size=15.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x+Inches(0.15), Inches(2.4), cw-Inches(0.3), Inches(0.3), sub, size=11, color=RGBColor(0xE6,0xE6,0xFA), align=PP_ALIGN.CENTER, italic=True)
    bullets(s, x+Inches(0.22), Inches(2.95), cw-Inches(0.4), ch-Inches(1.1), items, size=11, bcolor=c2, gap=8)
footer(s, N, TEAL)

# ============================================================================
# SLIDE 13 — Xác thực & phiên
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Authentication", "Xác thực & Quản lý phiên", ROSE)
cards = [
    ("☁️", "AWS Cognito", "Đăng ký, đăng nhập, xác nhận, đặt lại mật khẩu, refresh token và đăng xuất do Cognito quản lý.", INDIGO, VIOLET),
    ("🍪", "Token / Cookie", "Web dùng cookie trình duyệt; mobile dùng Expo Secure Store. JWT xác thực mỗi request.", BLUE, CYAN),
    ("📲", "QR Login", "Ghép phiên đăng nhập web với xác nhận trên thiết bị di động qua mã QR.", TEAL, GREEN),
    ("🔄", "Token Refresh", "Axios client tự động làm mới access token khi hết hạn, duy trì phiên liền mạch.", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.7); ch = Inches(2.2); gx = Inches(0.2); gy = Inches(0.22)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=16, bsize=12.5)
footer(s, N, ROSE)

# ============================================================================
# SLIDE 14 — LUỒNG: Đăng ký + OTP
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Flow 01", "Luồng đăng ký & xác nhận OTP", GREEN)
steps = [
    ("①", "Đăng ký", "POST /api/auth/register\nNhập SĐT + mật khẩu", INDIGO, VIOLET),
    ("②", "Gửi OTP", "Cognito gửi mã OTP\nqua kênh xác nhận", BLUE, CYAN),
    ("③", "Xác nhận", "POST /api/auth/confirm\nNgười dùng nhập OTP", TEAL, GREEN),
    ("④", "Kích hoạt", "Tài khoản được\nkích hoạt thành công", AMBER, ORANGE),
    ("⑤", "Đăng nhập", "POST /api/auth/login\nNhận JWT + phiên", ROSE, PINK),
]
x = Inches(0.7); cw = Inches(2.25); gap = Inches(0.18); y = Inches(2.55); ch = Inches(1.7)
for i, (num, t, d, c1, c2) in enumerate(steps):
    b = grad_rect(s, x, y, cw, ch, c1, c2, 55); _set_round(b, 0.1)
    txt(s, x, y+Inches(0.12), cw, Inches(0.6), num, size=30, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x, y+Inches(0.72), cw, Inches(0.4), t, size=15, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x+Inches(0.08), y+Inches(1.12), cw-Inches(0.16), Inches(0.55), d, size=9.5, color=RGBColor(0xEC,0xEC,0xFB), align=PP_ALIGN.CENTER)
    if i < len(steps)-1:
        arrow(s, Emu(int(x)+int(cw)), Emu(int(y)+int(ch)/2), Emu(int(x)+int(cw)+int(gap)), Emu(int(y)+int(ch)/2), GREEN, 2.5)
    x = Emu(int(x)+int(cw)+int(gap))
# note
note = rect(s, Inches(0.85), Inches(4.9), Inches(11.6), Inches(1.4), CARDBG); _set_round(note, 0.06)
txt(s, Inches(1.1), Inches(5.05), Inches(11.2), Inches(0.4), "💡  Phía client (web & mobile)", size=14, color=GREEN, bold=True, font=FONT_B)
bullets(s, Inches(1.1), Inches(5.5), Inches(11.1), Inches(0.8), [
    "Validate SĐT (10–11 số) & mật khẩu (6–50 ký tự) trước khi gọi API; hiển thị SuccessModal cho trạng thái loading/success/error.",
    "Sau xác nhận thành công → điều hướng tới màn hình đăng nhập / verify-otp.",
], size=12, bcolor=GREEN, gap=6)
footer(s, N, GREEN)

# ============================================================================
# SLIDE 15 — LUỒNG: QR Login
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Flow 02", "Luồng đăng nhập QR (Web ↔ Mobile)", CYAN)
# Web side
txt(s, Inches(0.85), Inches(1.8), Inches(5.5), Inches(0.4), "🌐  Trình duyệt Web", size=15, color=BLUE, bold=True, font=FONT_B)
txt(s, Inches(7.0), Inches(1.8), Inches(5.5), Inches(0.4), "📱  Ứng dụng Mobile", size=15, color=TEAL, bold=True, font=FONT_B)
wsteps = [
    ("Tạo phiên QR", "POST /session/qr-login/create → hiển thị mã QR", BLUE, CYAN),
    ("Chờ trạng thái", "GET /qr-login/status/{sessionId} (polling)", BLUE, CYAN),
    ("Nhận access token", "GET /qr-login/access-token → đăng nhập web", BLUE, CYAN),
]
msteps = [
    ("Quét QR", "Mobile (đã đăng nhập) quét mã bằng Expo Camera", TEAL, GREEN),
    ("Xác nhận", "POST /qr-login/confirm — chấp thuận phiên", TEAL, GREEN),
]
y = Inches(2.3); rh = Inches(1.05); gap = Inches(0.2)
for i,(t,d,c1,c2) in enumerate(wsteps):
    b = grad_rect(s, Inches(0.85), y, Inches(5.4), rh, c1, c2, 30); _set_round(b, 0.12)
    txt(s, Inches(1.05), y+Inches(0.1), Inches(5.0), Inches(0.45), f"{i+1}. {t}", size=14, color=WHITE, bold=True, font=FONT_B)
    txt(s, Inches(1.05), y+Inches(0.55), Inches(5.05), Inches(0.45), d, size=11, color=RGBColor(0xEC,0xEC,0xFB))
    y = Emu(int(y)+int(rh)+int(gap))
y = Inches(2.85)
for i,(t,d,c1,c2) in enumerate(msteps):
    b = grad_rect(s, Inches(7.0), y, Inches(5.4), rh, c1, c2, 30); _set_round(b, 0.12)
    txt(s, Inches(7.2), y+Inches(0.1), Inches(5.0), Inches(0.45), f"{i+1}. {t}", size=14, color=WHITE, bold=True, font=FONT_B)
    txt(s, Inches(7.2), y+Inches(0.55), Inches(5.05), Inches(0.45), d, size=11, color=RGBColor(0xEC,0xEC,0xFB))
    y = Emu(int(y)+int(rh)+Inches(0.55))
# cross arrows
arrow(s, Inches(6.25), Inches(3.4), Inches(7.0), Inches(3.4), AMBER, 2.5)
arrow(s, Inches(7.0), Inches(5.0), Inches(6.25), Inches(5.0), AMBER, 2.5)
txt(s, Inches(6.0), Inches(2.95), Inches(1.4), Inches(0.4), "QR", size=11, color=AMBER, bold=True, align=PP_ALIGN.CENTER)
txt(s, Inches(6.0), Inches(5.15), Inches(1.4), Inches(0.4), "confirm", size=10, color=AMBER, bold=True, align=PP_ALIGN.CENTER)
note = rect(s, Inches(0.85), Inches(6.1), Inches(11.55), Inches(0.62), DARK2); _set_round(note, 0.2)
txt(s, Inches(1.05), Inches(6.08), Inches(11.3), Inches(0.66), "🔐  Kết quả: phiên web được cấp access token sau khi mobile xác nhận — không cần nhập lại mật khẩu trên web.", size=12, color=LIGHT, anchor=MSO_ANCHOR.MIDDLE)
footer(s, N, CYAN)

# ============================================================================
# SLIDE 16 — Social Feed
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · Feed", "Bảng tin mạng xã hội", BLUE)
cards = [
    ("📝", "Bài viết", "Tạo, sửa, xóa, xem bài viết; feed theo hồ sơ người dùng.", INDIGO, VIOLET),
    ("📤", "Upload Media", "Tải media qua luồng presigned URL (POST /posts/upload-url).", BLUE, CYAN),
    ("💬", "Tương tác", "Bình luận, trả lời lồng nhau, cảm xúc (reactions), bài đã lưu.", TEAL, GREEN),
    ("🏷️", "Tagged & Saved", "Bài được gắn thẻ và bộ sưu tập bài đã lưu của người dùng.", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.7); ch = Inches(2.15); gx = Inches(0.2); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=16, bsize=12.5)
# endpoints chips
y = Inches(6.45)
eps = ["/api/posts", "/api/comments", "/api/reactions/toggle", "/api/saved-posts/toggle", "/api/posts/tagged/{id}"]
x = Inches(0.85)
for e in eps:
    w = Inches(2.25)
    chip(s, x, y, w, e, DARK2, tcolor=CYAN, size=10.5)
    x = Emu(int(x)+int(w)+int(Inches(0.1)))
footer(s, N, BLUE)

# ============================================================================
# SLIDE 17 — Stories & Profile
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · Stories", "Stories & Trải nghiệm hồ sơ", PINK)
left = rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(4.55), CARDBG); _set_round(left, 0.05)
strip = grad_rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.72), PINK, ROSE, 0); _set_round(strip, 0.1)
txt(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.72), "📸  Stories", size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(1.1), Inches(2.95), Inches(5.25), Inches(3.4), [
    "Tạo story & lấy feed story",
    "Danh sách người xem story",
    "Reaction trên story",
    "Highlights (lưu nổi bật)",
    "Xóa story",
], size=14, bcolor=PINK, gap=12)
right = rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(4.55), CARDBG); _set_round(right, 0.05)
strip2 = grad_rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.72), INDIGO, VIOLET, 0); _set_round(strip2, 0.1)
txt(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.72), "👤  Hồ sơ", size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(7.0), Inches(2.95), Inches(5.25), Inches(3.4), [
    "Trang hồ sơ: bài viết, bài đã lưu, bài gắn thẻ",
    "Danh sách người bị chặn",
    "Chỉnh sửa thông tin tài khoản",
    "Quyền riêng tư hồ sơ (Profile privacy)",
    "Hiển thị ngày sinh & giới tính",
], size=14, bcolor=VIOLET, gap=12)
footer(s, N, PINK)

# ============================================================================
# SLIDE 18 — Friends & Pages
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · Social Graph", "Bạn bè · Chặn · Trang (Pages)", TEAL)
# Friends
left = rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(4.55), CARDBG); _set_round(left, 0.05)
strip = grad_rect(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.72), SKY, CYAN, 0); _set_round(strip, 0.1)
txt(s, Inches(0.85), Inches(1.95), Inches(5.7), Inches(0.72), "👥  Bạn bè & Chặn", size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(1.1), Inches(2.95), Inches(5.25), Inches(3.4), [
    "Gửi, chấp nhận, từ chối, hủy lời mời kết bạn",
    "Danh sách bạn bè & lời mời đến/đi",
    "Chặn / bỏ chặn người dùng",
    "Đếm số bạn bè realtime trên hồ sơ",
    "Luồng chặn người dùng trong chat (read-only)",
], size=13.5, bcolor=CYAN, gap=11)
# Pages
right = rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(4.55), CARDBG); _set_round(right, 0.05)
strip2 = grad_rect(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.72), PURPLE, VIOLET, 0); _set_round(strip2, 0.1)
txt(s, Inches(6.75), Inches(1.95), Inches(5.7), Inches(0.72), "📄  Trang (Pages)", size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(7.0), Inches(2.95), Inches(5.25), Inches(3.4), [
    "Tạo, cập nhật, xóa, thích, theo dõi trang",
    "Bài viết trang & duyệt/từ chối bài",
    "Thêm/xóa thành viên, phân quyền vai trò",
    "Yêu cầu tham gia & duyệt yêu cầu",
    "Quản lý yêu cầu đang chờ (pending)",
], size=13.5, bcolor=VIOLET, gap=11)
footer(s, N, TEAL)

# ============================================================================
# SLIDE 19 — Realtime messaging overview
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · Chat", "Nhắn tin Realtime — Tổng quan", ROSE)
feats = [
    ("💬", "Hội thoại", "1-1 & nhóm; tạo nhóm, phân trang tin nhắn.", INDIGO, VIOLET),
    ("✉️", "Tin nhắn", "Gửi, thu hồi (recall), xóa-cho-tôi, đã đọc.", BLUE, CYAN),
    ("📌", "Pin & Typing", "Ghim tin nhắn, chỉ báo đang nhập, seen.", ROSE, PINK),
    ("👤", "Quản lý nhóm", "Biệt danh, vai trò, rời/kick/giải tán nhóm.", TEAL, GREEN),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(5.7); ch = Inches(1.85); gx = Inches(0.2); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(feats):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=16, bsize=12)
# topic strip
strip = rect(s, Inches(0.85), Inches(5.95), Inches(11.6), Inches(0.85), DARK2); _set_round(strip, 0.12)
txt(s, Inches(1.05), Inches(6.0), Inches(11.3), Inches(0.4), "📡  STOMP topics tiêu biểu", size=12.5, color=ROSE, bold=True, font=FONT_B)
txt(s, Inches(1.05), Inches(6.38), Inches(11.3), Inches(0.4),
    "/topic/conversation/{id}   ·   /topic/user/{id}/conversations   ·   /topic/user/{id}/calls",
    size=12, color=LIGHT, font="Consolas")
footer(s, N, ROSE)

# ============================================================================
# SLIDE 20 — LUỒNG: Realtime chat
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Flow 03", "Luồng gửi tin nhắn Realtime", PINK)
# top row: sender -> server
flow_box(s, Inches(0.85), Inches(2.0), Inches(2.6), Inches(1.0), "Người gửi (A)", "POST /api/messages/send", INDIGO, VIOLET, "🧑")
flow_box(s, Inches(4.0), Inches(2.0), Inches(2.6), Inches(1.0), "Backend API", "Lưu MongoDB + tạo event", BLUE, CYAN, "⚙️")
flow_box(s, Inches(7.15), Inches(2.0), Inches(2.6), Inches(1.0), "Redis Pub/Sub", "Phát tán sự kiện", ROSE, PINK, "⚡")
flow_box(s, Inches(10.3), Inches(2.0), Inches(2.2), Inches(1.0), "STOMP Broker", "Broadcast topic", PURPLE, VIOLET, "📡")
arrow(s, Inches(3.45), Inches(2.5), Inches(4.0), Inches(2.5), AMBER, 2.5)
arrow(s, Inches(6.6), Inches(2.5), Inches(7.15), Inches(2.5), AMBER, 2.5)
arrow(s, Inches(9.75), Inches(2.5), Inches(10.3), Inches(2.5), AMBER, 2.5)
# down to subscribers
arrow(s, Inches(11.4), Inches(3.0), Inches(11.4), Inches(3.7), PURPLE, 2.0)
sub = grad_rect(s, Inches(3.5), Inches(3.7), Inches(6.3), Inches(0.9), TEAL, GREEN, 30); _set_round(sub, 0.15)
txt(s, Inches(3.5), Inches(3.7), Inches(6.3), Inches(0.9), "Thành viên hội thoại đã subscribe  →  nhận tin tức thời", size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
arrow(s, Inches(11.0), Inches(4.15), Inches(9.8), Inches(4.15), PURPLE, 2.0)
# events handled
note = rect(s, Inches(0.85), Inches(4.95), Inches(11.6), Inches(1.55), CARDBG); _set_round(note, 0.06)
txt(s, Inches(1.1), Inches(5.1), Inches(11.2), Inches(0.4), "📨  Các sự kiện được broadcast qua topic", size=14, color=PINK, bold=True, font=FONT_B)
ev = ["new message", "recall", "seen/đã đọc", "typing", "pin/unpin", "member update"]
x = Inches(1.1);
for e in ev:
    w = Inches(1.82)
    chip(s, x, Inches(5.6), w, e, DARK2, tcolor=CYAN, size=11)
    x = Emu(int(x)+int(w)+int(Inches(0.1)))
txt(s, Inches(1.1), Inches(6.12), Inches(11.2), Inches(0.35), "Client publish typing qua /app/chat/{id}/typing — server fan-out tới /topic/conversation/{id}.", size=11.5, color=LIGHTGRAY)
footer(s, N, PINK)

# ============================================================================
# SLIDE 21 — WebSocket destinations table
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "WebSocket API", "Các đích đến WebSocket (STOMP)", PURPLE)
rows = [
    ("/app/chat/{id}/typing", "Client → Server", "Gửi trạng thái đang nhập", CYAN),
    ("/app/call.signal", "Client → Server", "Gửi payload tín hiệu gọi audio/video", AMBER),
    ("/topic/conversation/{id}", "Server → Client", "Tin nhắn, thu hồi, seen, typing", GREEN),
    ("/topic/conversations/{id}/pins", "Server → Client", "Cập nhật ghim/bỏ ghim tin nhắn", PINK),
    ("/topic/conversations/{id}/members", "Server → Client", "Cập nhật thành viên/biệt danh nhóm", VIOLET),
    ("/topic/user/{id}/conversations", "Server → Client", "Thay đổi danh sách hội thoại & nhóm", BLUE),
    ("/topic/user/{id}/calls", "Server → Client", "Cuộc gọi đến & trạng thái cuộc gọi", ROSE),
]
# header
hy = Inches(1.95); rh = Inches(0.62)
hdr = grad_rect(s, Inches(0.85), hy, Inches(11.6), Inches(0.55), INDIGO, PURPLE, 20); _set_round(hdr, 0.1)
txt(s, Inches(1.05), hy, Inches(4.3), Inches(0.55), "Destination", size=13, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
txt(s, Inches(5.5), hy, Inches(2.6), Inches(0.55), "Hướng", size=13, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
txt(s, Inches(8.3), hy, Inches(4.0), Inches(0.55), "Mục đích", size=13, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
y = Emu(int(hy)+int(Inches(0.62)))
for i,(dest, direction, purpose, col) in enumerate(rows):
    rbg = PANEL if i%2==0 else DARK2
    row = rect(s, Inches(0.85), y, Inches(11.6), rh, rbg); _set_round(row, 0.06)
    tick = rect(s, Inches(0.85), y, Inches(0.1), rh, col, rounded=False)
    txt(s, Inches(1.05), y, Inches(4.4), rh, dest, size=11.5, color=CYAN, anchor=MSO_ANCHOR.MIDDLE, font="Consolas")
    dcol = AMBER if "Client →" in direction else GREEN
    txt(s, Inches(5.5), y, Inches(2.6), rh, direction, size=11.5, color=dcol, anchor=MSO_ANCHOR.MIDDLE, bold=True)
    txt(s, Inches(8.3), y, Inches(4.0), rh, purpose, size=11.5, color=LIGHT, anchor=MSO_ANCHOR.MIDDLE)
    y = Emu(int(y)+int(rh)+int(Inches(0.06)))
footer(s, N, PURPLE)

# ============================================================================
# SLIDE 22 — Call signaling
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · Calls", "Tín hiệu gọi Audio/Video", ORANGE)
txt(s, Inches(0.85), Inches(1.8), Inches(11.6), Inches(0.5),
    "WebSocket signaling cho các sự kiện cuộc gọi — backend đóng vai trò trung gian trao đổi tín hiệu.",
    size=14, color=LIGHT)
steps = [
    ("📞", "Call", "Bên gọi khởi tạo cuộc gọi tới đối phương", INDIGO, VIOLET),
    ("✅", "Answer", "Bên nhận chấp nhận cuộc gọi", BLUE, CYAN),
    ("🧊", "ICE Candidate", "Trao đổi ứng viên kết nối ICE", TEAL, GREEN),
    ("🚫", "Reject", "Từ chối cuộc gọi đến", ROSE, PINK),
    ("🔚", "End Call", "Kết thúc & dọn dẹp phiên gọi", AMBER, ORANGE),
]
x = Inches(0.85); cw = Inches(2.2); gap = Inches(0.13); y = Inches(2.6); ch = Inches(1.95)
for i,(ic,t,d,c1,c2) in enumerate(steps):
    b = grad_rect(s, x, y, cw, ch, c1, c2, 55); _set_round(b, 0.1)
    txt(s, x, y+Inches(0.2), cw, Inches(0.7), ic, size=34, align=PP_ALIGN.CENTER)
    txt(s, x, y+Inches(0.95), cw, Inches(0.4), t, size=15, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x+Inches(0.1), y+Inches(1.35), cw-Inches(0.2), Inches(0.55), d, size=10, color=RGBColor(0xEC,0xEC,0xFB), align=PP_ALIGN.CENTER)
    x = Emu(int(x)+int(cw)+int(gap))
note = rect(s, Inches(0.85), Inches(4.95), Inches(11.6), Inches(1.45), CARDBG); _set_round(note, 0.06)
txt(s, Inches(1.1), Inches(5.1), Inches(11.2), Inches(0.4), "📡  Kênh tín hiệu", size=14, color=ORANGE, bold=True, font=FONT_B)
bullets(s, Inches(1.1), Inches(5.55), Inches(11.1), Inches(0.8), [
    "Client gửi payload qua  /app/call.signal  (Client → Server).",
    "Server phát sự kiện gọi đến & trạng thái qua  /topic/user/{userId}/calls  (Server → Client).",
], size=12, bcolor=ORANGE, gap=6)
footer(s, N, ORANGE)

# ============================================================================
# SLIDE 23 — AI chat assistance
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Module · AI", "Trợ lý AI trong hội thoại", VIOLET)
cards = [
    ("🛡️", "Consent Gate", "Người dùng phải đồng ý dùng AI trước khi backend xử lý hội thoại qua provider.  POST /api/users/me/confirm-ai", INDIGO, VIOLET),
    ("📝", "Tóm tắt hội thoại", "Tự động tóm tắt nội dung cuộc trò chuyện dài.  POST /api/ai/summarize", BLUE, CYAN),
    ("💡", "Gợi ý nội dung", "Đề xuất câu trả lời thông minh theo ngữ cảnh & gợi ý nội dung.  POST /api/ai/suggestions", TEAL, GREEN),
    ("🔌", "OpenRouter Gateway", "Chuẩn tương thích OpenAI API qua Spring WebClient — đổi/mở rộng model không ảnh hưởng backend.", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.9); cw = Inches(5.7); ch = Inches(2.0); gx = Inches(0.2); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 2; row = i // 2
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=15.5, bsize=11.5)
# model chips
txt(s, Inches(0.85), Inches(6.18), Inches(3.5), Inches(0.4), "🧠  Mô hình hỗ trợ:", size=12.5, color=VIOLET, bold=True, font=FONT_B)
mods = [("GPT", INDIGO), ("Claude", ORANGE), ("Gemini", BLUE), ("DeepSeek", TEAL), ("Mistral", ROSE)]
x = Inches(3.15)
for label, col in mods:
    w = Inches(1.6)
    chip(s, x, Inches(6.15), w, label, col, size=11.5)
    x = Emu(int(x)+int(w)+int(Inches(0.12)))
footer(s, N, VIOLET)

# ============================================================================
# SLIDE 24 — LUỒNG: AI
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Flow 04", "Luồng xử lý AI (Consent → Kết quả)", TEAL)
steps = [
    ("①", "Đồng ý dùng AI", "Người dùng bật AI\nPOST /confirm-ai", INDIGO, VIOLET),
    ("②", "Kiểm tra ranh giới", "Backend xác minh\nuser đã consent", BLUE, CYAN),
    ("③", "Gọi nhà cung cấp", "WebClient → OpenRouter\nsummarize / suggestions", TEAL, GREEN),
    ("④", "Trả kết quả", "Tóm tắt hoặc gợi ý\nhiển thị trong chat", AMBER, ORANGE),
]
x = Inches(0.95); cw = Inches(2.7); gap = Inches(0.35); y = Inches(2.7); ch = Inches(1.85)
for i,(num,t,d,c1,c2) in enumerate(steps):
    b = grad_rect(s, x, y, cw, ch, c1, c2, 55); _set_round(b, 0.1)
    txt(s, x, y+Inches(0.15), cw, Inches(0.6), num, size=32, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x, y+Inches(0.8), cw, Inches(0.45), t, size=14.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x+Inches(0.1), y+Inches(1.25), cw-Inches(0.2), Inches(0.55), d, size=10, color=RGBColor(0xEC,0xEC,0xFB), align=PP_ALIGN.CENTER)
    if i < len(steps)-1:
        arrow(s, Emu(int(x)+int(cw)), Emu(int(y)+int(ch)/2), Emu(int(x)+int(cw)+int(gap)), Emu(int(y)+int(ch)/2), TEAL, 2.5)
    x = Emu(int(x)+int(cw)+int(gap))
warn = rect(s, Inches(0.95), Inches(5.0), Inches(11.4), Inches(1.3), CARDBG); _set_round(warn, 0.06)
txt(s, Inches(1.2), Inches(5.15), Inches(11.0), Inches(0.4), "⚠️  Ranh giới đồng thuận (Consent Boundary)", size=14, color=AMBER, bold=True, font=FONT_B)
txt(s, Inches(1.2), Inches(5.6), Inches(11.0), Inches(0.6),
    "Nếu người dùng CHƯA đồng ý → backend từ chối xử lý qua AI provider. Đây là rào chắn bảo vệ quyền riêng tư dữ liệu hội thoại.",
    size=12.5, color=LIGHT, line_spacing=1.1)
footer(s, N, TEAL)

# ============================================================================
# SLIDE 25 — Redis Pub/Sub & Event layer
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Infrastructure", "Redis Pub/Sub & Tầng Event", ROSE)
txt(s, Inches(0.85), Inches(1.8), Inches(11.6), Inches(0.6),
    "Tầng Event phát hành sự kiện hội thoại / tin nhắn / thành viên; Redis hỗ trợ hạ tầng chat & fan-out.",
    size=14, color=LIGHT)
# diagram
flow_box(s, Inches(0.85), Inches(2.7), Inches(3.0), Inches(1.2), "Service Layer", "Sinh domain event", INDIGO, VIOLET, "⚙️")
flow_box(s, Inches(5.15), Inches(2.7), Inches(3.0), Inches(1.2), "Event Publisher", "Đẩy sự kiện", BLUE, CYAN, "📤")
flow_box(s, Inches(9.45), Inches(2.7), Inches(3.0), Inches(1.2), "Redis Pub/Sub", "Phát tán đa instance", ROSE, PINK, "⚡")
arrow(s, Inches(3.85), Inches(3.3), Inches(5.15), Inches(3.3), AMBER, 2.5)
arrow(s, Inches(8.15), Inches(3.3), Inches(9.45), Inches(3.3), AMBER, 2.5)
arrow(s, Inches(10.95), Inches(3.9), Inches(10.95), Inches(4.6), PINK, 2.0)
sub = grad_rect(s, Inches(2.5), Inches(4.6), Inches(8.3), Inches(0.9), TEAL, GREEN, 30); _set_round(sub, 0.12)
txt(s, Inches(2.5), Inches(4.6), Inches(8.3), Inches(0.9), "STOMP Broker  →  Broadcast tới client đã subscribe topic", size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
arrow(s, Inches(9.45), Inches(5.05), Inches(10.8), Inches(5.05), PINK, 2.0)
# benefits
note = rect(s, Inches(0.85), Inches(5.8), Inches(11.6), Inches(0.95), CARDBG); _set_round(note, 0.08)
bullets(s, Inches(1.1), Inches(5.92), Inches(11.1), Inches(0.8), [
    "Tách rời người gửi và người nhận sự kiện (decoupling).",
    "Hỗ trợ presence, đếm realtime, đồng bộ trạng thái giữa nhiều phiên/thiết bị.",
], size=12, bcolor=ROSE, gap=5)
footer(s, N, ROSE)

# ============================================================================
# SLIDE 26 — Storage & media
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Storage", "Lưu trữ & Media (Presigned URL)", AMBER)
# flow
steps = [
    ("①", "Yêu cầu URL", "Client gọi\n/api/files/presigned-url", INDIGO, VIOLET),
    ("②", "Cấp presigned", "Backend ký URL\nS3 / R2 có thời hạn", BLUE, CYAN),
    ("③", "Upload trực tiếp", "Client PUT file\nlên object storage", TEAL, GREEN),
    ("④", "Lưu metadata", "Backend lưu link\n+ phục vụ qua CDN", AMBER, ORANGE),
]
x = Inches(0.95); cw = Inches(2.7); gap = Inches(0.35); y = Inches(2.1); ch = Inches(1.8)
for i,(num,t,d,c1,c2) in enumerate(steps):
    b = grad_rect(s, x, y, cw, ch, c1, c2, 55); _set_round(b, 0.1)
    txt(s, x, y+Inches(0.12), cw, Inches(0.55), num, size=30, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x, y+Inches(0.72), cw, Inches(0.4), t, size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
    txt(s, x+Inches(0.1), y+Inches(1.15), cw-Inches(0.2), Inches(0.55), d, size=10, color=RGBColor(0xEC,0xEC,0xFB), align=PP_ALIGN.CENTER)
    if i<len(steps)-1:
        arrow(s, Emu(int(x)+int(cw)), Emu(int(y)+int(ch)/2), Emu(int(x)+int(cw)+int(gap)), Emu(int(y)+int(ch)/2), AMBER, 2.5)
    x = Emu(int(x)+int(cw)+int(gap))
cards = [
    ("☁️", "AWS S3", "Lưu trữ media chính qua AWS S3 SDK & presigned URL.", INDIGO, VIOLET),
    ("🟠", "Cloudflare R2", "Lưu trữ tương thích S3 cho media nhạc/asset.", ORANGE, AMBER),
    ("🚀", "CDN", "Phục vụ nội dung qua app.cdn-domain tăng tốc tải.", TEAL, GREEN),
]
x0 = Inches(0.95); cw = Inches(3.7); ch = Inches(1.85); gx = Inches(0.18)
for i,(ic,t,b,c1,c2) in enumerate(cards):
    x = Emu(int(x0)+i*(int(cw)+int(gx)))
    icon_card(s, x, Inches(4.5), cw, ch, ic, t, b, c1, c2, tsize=15, bsize=11.5)
footer(s, N, AMBER)

# ============================================================================
# SLIDE 27 — API overview table
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "REST API", "Tổng quan các nhóm endpoint", CYAN)
rows = [
    ("Auth", "/api/auth/register · /login · /refresh · /me", INDIGO),
    ("QR Session", "/api/session/qr-login/create · /status · /confirm", BLUE),
    ("Friends", "/api/friends/request · /accept · /reject", SKY),
    ("Posts", "/api/posts · /upload-url · /tagged/{id}", CYAN),
    ("Comments · Reactions", "/api/comments · /api/reactions/toggle", TEAL),
    ("Stories", "/api/stories · /feed · /{id}/view · /react", GREEN),
    ("Pages", "/api/page/create · /api/page-member/request-join", PURPLE),
    ("Conversations · Messages", "/api/conversations · /api/messages/send · /recall", PINK),
    ("Files · Music · AI", "/api/files/presigned-url · /api/music · /api/ai/*", AMBER),
]
y = Inches(1.9); rh = Inches(0.5)
for i,(dom, eps, col) in enumerate(rows):
    rbg = PANEL if i%2==0 else DARK2
    row = rect(s, Inches(0.85), y, Inches(11.6), rh, rbg); _set_round(row, 0.08)
    tick = rect(s, Inches(0.85), y, Inches(0.12), rh, col, rounded=False)
    txt(s, Inches(1.1), y, Inches(3.7), rh, dom, size=12.5, color=INK, bold=True, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    txt(s, Inches(4.9), y, Inches(7.4), rh, eps, size=11.5, color=CYAN, anchor=MSO_ANCHOR.MIDDLE, font="Consolas")
    y = Emu(int(y)+int(rh)+int(Inches(0.055)))
footer(s, N, CYAN)

# ============================================================================
# SLIDE 28 — Security
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Security", "Mô hình bảo mật", ROSE)
cards = [
    ("🔑", "Stateless JWT", "Spring Security xác thực JWT do Cognito phát hành cho mỗi request, không lưu phiên server.", INDIGO, VIOLET),
    ("🍪", "Lưu token an toàn", "Web: secure cookies. Mobile: Expo Secure Store. Tự refresh token khi hết hạn.", BLUE, CYAN),
    ("🛡️", "AI Consent Boundary", "Bắt buộc người dùng đồng ý trước khi dữ liệu hội thoại được xử lý qua AI provider.", TEAL, GREEN),
    ("🚧", "CORS & Proxy", "Cấu hình CORS; web proxy /api & /ws qua Vite; tách credentials theo client.", AMBER, ORANGE),
    ("🔒", "Quyền riêng tư", "Profile privacy, chặn người dùng, hội thoại read-only khi bị chặn.", ROSE, PINK),
    ("📵", "Phân quyền Pages", "Vai trò thành viên trang, duyệt bài & yêu cầu tham gia có kiểm soát.", PURPLE, VIOLET),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(3.78); ch = Inches(2.15); gx = Inches(0.28); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(cards):
    col = i % 3; row = i // 3
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=14, bsize=11)
footer(s, N, ROSE)

# ============================================================================
# SLIDE 29 — Quy trình phát triển / vận hành
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "DevOps", "Quy trình chạy & build hệ thống", GREEN)
cols = [
    ("🖥️ Backend", ["docker compose up -d  (Redis)", "cấu hình application.properties", "./mvnw spring-boot:run", "→ http://localhost:8080", "./mvnw test"], INDIGO, VIOLET),
    ("🌐 Web", ["cd frontend-web", "npm install", "npm run dev → :5173", "proxy /api & /ws → :8080", "npm run build · npm run lint"], BLUE, CYAN),
    ("📱 Mobile", ["cd frontend-mobile", "npm install", "npm start (Expo)", "npm run android / ios / web", "tự resolve backend qua LAN"], TEAL, GREEN),
]
x0 = Inches(0.85); cw = Inches(3.85); ch = Inches(4.3); gx = Inches(0.33)
for i,(t, items, c1, c2) in enumerate(cols):
    x = Emu(int(x0)+i*(int(cw)+int(gx)))
    card = rect(s, x, Inches(1.95), cw, ch, CARDBG); _set_round(card, 0.05)
    strip = grad_rect(s, x, Inches(1.95), cw, Inches(0.72), c1, c2, 0); _set_round(strip, 0.1)
    txt(s, x, Inches(1.95), cw, Inches(0.72), t, size=16, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
    bullets(s, x+Inches(0.25), Inches(2.9), cw-Inches(0.45), ch-Inches(1.1), items, size=12, bcolor=c2, gap=12)
footer(s, N, GREEN)

# ============================================================================
# SLIDE — Phạm vi đề tài
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "1.3  Phạm vi đề tài", "Trong & Ngoài phạm vi", CYAN)
# audience banner
ab = grad_rect(s, Inches(0.85), Inches(1.78), Inches(11.6), Inches(0.62), INDIGO, CYAN, 20); _set_round(ab, 0.3)
txt(s, Inches(0.85), Inches(1.76), Inches(11.6), Inches(0.62),
    "🎯  Đối tượng: sinh viên & người trẻ 18–30 tuổi — năng động, dùng nhiều thiết bị di động, tiếp cận nhanh xu hướng mới",
    size=12.5, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
# In scope
left = rect(s, Inches(0.85), Inches(2.6), Inches(5.7), Inches(3.95), CARDBG); _set_round(left, 0.05)
strip = grad_rect(s, Inches(0.85), Inches(2.6), Inches(5.7), Inches(0.7), GREEN, TEAL, 0); _set_round(strip, 0.1)
txt(s, Inches(0.85), Inches(2.6), Inches(5.7), Inches(0.7), "✅  Trong phạm vi", size=17, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(1.1), Inches(3.5), Inches(5.25), Inches(2.9), [
    "Đăng bài viết, story và reels",
    "Kết bạn & tương tác người dùng",
    "Nhắn tin realtime cá nhân & nhóm, gọi video/audio",
    "Tạo & quản lý Page cộng đồng",
    "Tìm kiếm người dùng, bài viết, hội thoại",
    "AI Chatbot & gợi ý thông minh",
    "Hybrid Database · cache đa tầng · realtime sync",
], size=12, bcolor=GREEN, gap=7)
# Out of scope
right = rect(s, Inches(6.75), Inches(2.6), Inches(5.7), Inches(3.95), CARDBG); _set_round(right, 0.05)
strip2 = grad_rect(s, Inches(6.75), Inches(2.6), Inches(5.7), Inches(0.7), ROSE, PINK, 0); _set_round(strip2, 0.1)
txt(s, Inches(6.75), Inches(2.6), Inches(5.7), Inches(0.7), "⛔  Ngoài phạm vi", size=17, color=WHITE, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=FONT_B)
bullets(s, Inches(7.0), Inches(3.5), Inches(5.25), Inches(2.9), [
    "Recommendation bằng Machine Learning",
    "Distributed Microservices hoàn chỉnh",
    "Kubernetes orchestration",
    "CI/CD enterprise",
    "Distributed tracing toàn hệ thống",
    "Kiểm thử tải quy mô hàng triệu user",
    "→ Kiến trúc đã thiết kế hướng mở rộng tương lai",
], size=12, bcolor=ROSE, gap=7)
footer(s, N, CYAN)

# ============================================================================
# SLIDE 30 — Future improvements
# ============================================================================
N += 1
s = new_slide(); deco_dots(s)
page_header(s, "Roadmap", "Hướng phát triển tương lai", AMBER)
items = [
    ("📜", "OpenAPI / Swagger", "Sinh tài liệu API tự động từ Spring controllers.", INDIGO, VIOLET),
    ("🔐", "Quản lý secrets", "Đưa secrets ra khỏi config & cung cấp .env.example.", BLUE, CYAN),
    ("🐳", "Docker Compose đầy đủ", "Profiles cho MariaDB, MongoDB, Redis & backend.", TEAL, GREEN),
    ("⚙️", "CI/CD", "Workflow test backend, lint frontend, build TypeScript.", ROSE, PINK),
    ("🧪", "Integration tests", "Auth, QR login, conversation events, AI consent.", PURPLE, VIOLET),
    ("🔔", "Push Notifications", "Thông báo đẩy cho chat, kết bạn, cuộc gọi, story.", AMBER, ORANGE),
]
x0 = Inches(0.85); y0 = Inches(1.95); cw = Inches(3.78); ch = Inches(2.15); gx = Inches(0.28); gy = Inches(0.2)
for i, (ic, t, b, c1, c2) in enumerate(items):
    col = i % 3; row = i // 3
    x = Emu(int(x0)+col*(int(cw)+int(gx))); y = Emu(int(y0)+row*(int(ch)+int(gy)))
    icon_card(s, x, y, cw, ch, ic, t, b, c1, c2, tsize=14.5, bsize=11.5)
footer(s, N, AMBER)

# ============================================================================
# SLIDE 31 — Kết luận / Thank you
# ============================================================================
N += 1
s = prs.slides.add_slide(BLANK)
bg_grad(s, WHITE, PALE2, 90)
deco_circle(s, Inches(-1.9), Inches(3.6), Inches(5.6), PALE, alpha=70)
deco_circle(s, Inches(10.2), Inches(-1.9), Inches(5.2), PALE, alpha=65)
# people graph decoration
cnodes = [(Inches(1.7), Inches(1.5)), (Inches(2.95), Inches(2.45)), (Inches(1.55), Inches(3.2)),
          (Inches(11.75), Inches(4.5)), (Inches(10.55), Inches(5.45)), (Inches(12.0), Inches(6.0))]
cedges = [(0,1),(1,2),(0,2),(3,4),(4,5),(3,5)]
deco_people(s, cnodes, cedges, idxs=[8,9,10,11,0,5], d=Inches(0.82), lcolor=PALE3, lw=1.6, lalpha=65)
# logo badge
lb = grad_rect(s, Inches(5.96), Inches(1.0), Inches(1.4), Inches(1.4), BLUE, SKY, 45); _set_round(lb, 0.3)
soft_shadow(lb, blur=0.14, dist=0.08, alpha=28, col=BLUE)
txt(s, Inches(5.96), Inches(0.97), Inches(1.4), Inches(1.4), "🌐", size=54, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
txt(s, Inches(1), Inches(2.7), Inches(11.33), Inches(0.5), "TỔNG KẾT", size=16, color=BLUE, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
txt(s, Inches(1), Inches(3.2), Inches(11.33), Inches(1.0), "Wisdom Social", size=52, color=INK, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)
txt(s, Inches(1.5), Inches(4.35), Inches(10.33), Inches(0.9),
    "Nền tảng MXH đa nền tảng với kiến trúc phân lớp, cơ sở dữ liệu lai, realtime qua STOMP/Redis\nvà trợ lý AI — sẵn sàng mở rộng theo roadmap.",
    size=16, color=INK2, align=PP_ALIGN.CENTER, line_spacing=1.2)
# summary chips
chips2 = [("Spring Boot", INDIGO), ("React · Expo", BLUE), ("Realtime", SKY), ("AWS Cloud", CYAN), ("AI · OpenRouter", NAVY)]
cx = Inches(1.75); cw = Inches(1.95); gap = Inches(0.18)
for label, col in chips2:
    chip(s, cx, Inches(5.5), cw, label, col, size=11.5)
    cx = Emu(int(cx)+int(cw)+int(gap))
txt(s, Inches(1), Inches(6.35), Inches(11.33), Inches(0.5), "Cảm ơn đã theo dõi! 🙏", size=22, color=INK, bold=True, align=PP_ALIGN.CENTER, font=FONT_B)

prs.save(r"c:\Users\PC\Desktop\wisdom-social\Wisdom_Social_Presentation.pptx")
print("Saved with", len(prs.slides.__iter__.__self__._sldIdLst), "slides")
print("Total slides:", N)
