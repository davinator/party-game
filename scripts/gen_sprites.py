#!/usr/bin/env python3
"""
Generate SVG sprite files for party-game obstacles.
Run:  python3 scripts/gen_sprites.py
"""

import os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'docs', 'sprites')
os.makedirs(OUT, exist_ok=True)

def write(name, svg):
    path = os.path.join(OUT, name)
    with open(path, 'w') as f:
        f.write(svg)
    print(f'  wrote {name}')

def wave_path(W, y_center, amplitude, freq, n=32):
    """Seamless sine-wave path (integer freq → ends at y_center)."""
    segs = [f'M 0,{y_center:.2f}']
    for i in range(1, n + 1):
        x = W * i / n
        y = y_center + amplitude * math.sin(2 * math.pi * freq * x / W)
        segs.append(f'L {x:.2f},{y:.2f}')
    return ' '.join(segs)


# ─── shared wood-plank tile builder ───────────────────────────────────────────
# planks:  list of {'y','h','top','bot','grains':[(y,amp,freq),...]}
# border:  CSS color for the outer frame + seam grooves
# overlay: raw SVG string appended after the wood body (decorations, markings)

def wood_tile_svg(W, H, planks, border, grain_rgba, overlay='', dash=''):
    SEAM_Y = [planks[i]['y'] + planks[i]['h'] for i in range(len(planks) - 1)]
    JOINTS = [43, 86]

    defs_bl, body_bl, grain_bl, joints_bl = [], [], [], []

    for i, p in enumerate(planks):
        py, ph = p['y'], p['h']
        gid, cid = f'pg{i}', f'pc{i}'
        defs_bl.append(
            f'<linearGradient id="{gid}" x1="0" y1="{py}" x2="0" y2="{py+ph}"'
            f' gradientUnits="userSpaceOnUse">'
            f'<stop offset="0%"   stop-color="{p["top"]}"/>'
            f'<stop offset="100%" stop-color="{p["bot"]}"/>'
            f'</linearGradient>'
            f'<clipPath id="{cid}">'
            f'<rect x="2" y="{py}" width="{W-4}" height="{ph}"/>'
            f'</clipPath>'
        )
        body_bl += [
            f'<rect x="2" y="{py}" width="{W-4}" height="{ph}" fill="url(#{gid})"/>',
            f'<line x1="2" y1="{py+1}" x2="{W-2}" y2="{py+1}"'
            f' stroke="rgba(220,175,120,0.28)" stroke-width="1"/>',
            f'<line x1="2" y1="{py+ph-1}" x2="{W-2}" y2="{py+ph-1}"'
            f' stroke="rgba(0,0,0,0.10)" stroke-width="1"/>',
        ]
        for (gy, amp, freq) in p['grains']:
            grain_bl.append(
                f'<path d="{wave_path(W, gy, amp, freq)}"'
                f' clip-path="url(#{cid})"'
                f' stroke="{grain_rgba}" stroke-width="1" fill="none"/>'
            )

    for jx in JOINTS:
        joints_bl += [
            f'<line x1="{jx}" y1="2" x2="{jx}" y2="{H-3}"'
            f' stroke="rgba(40,15,4,0.28)" stroke-width="1.5"/>',
            f'<line x1="{jx+1.5}" y1="2" x2="{jx+1.5}" y2="{H-3}"'
            f' stroke="rgba(200,155,100,0.15)" stroke-width="1"/>',
        ]

    seam_svg = []
    for sy in SEAM_Y:
        seam_svg += [
            f'<rect x="2" y="{sy}" width="{W-4}" height="2" fill="{border}"/>',
            f'<line x1="2" y1="{sy}" x2="{W-2}" y2="{sy}"'
            f' stroke="rgba(0,0,0,0.22)" stroke-width="1"/>',
            f'<line x1="2" y1="{sy+1}" x2="{W-2}" y2="{sy+1}"'
            f' stroke="rgba(180,130,80,0.14)" stroke-width="1"/>',
        ]

    dash_attr = f' stroke-dasharray="{dash}"' if dash else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="none">
  <defs>{''.join(defs_bl)}</defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="{border}"/>
  {''.join(seam_svg)}
  {''.join(body_bl)}
  {''.join(grain_bl)}
  {''.join(joints_bl)}
  {overlay}
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="{border}" stroke-width="2"{dash_attr}/>
</svg>'''


# ─── plank configs ─────────────────────────────────────────────────────────────

def warm_planks():   # standard honey-oak
    return [
        {'y':2,  'h':8, 'top':'#cfa470','bot':'#b88c58','grains':[(4.0,0.90,1),(6.5,0.65,2)]},
        {'y':12, 'h':8, 'top':'#b88c58','bot':'#a07848','grains':[(14.0,0.85,2),(16.5,0.60,1)]},
        {'y':22, 'h':6, 'top':'#a07848','bot':'#8a6438','grains':[(24.0,0.70,1)]},
    ]

def cool_planks():   # slightly blue-gray tinted (moving platform)
    return [
        {'y':2,  'h':8, 'top':'#b4a8c0','bot':'#9e90ae','grains':[(4.0,0.90,1),(6.5,0.65,2)]},
        {'y':12, 'h':8, 'top':'#9e90ae','bot':'#8a7a9a','grains':[(14.0,0.85,2),(16.5,0.60,1)]},
        {'y':22, 'h':6, 'top':'#8a7a9a','bot':'#786888','grains':[(24.0,0.70,1)]},
    ]

def faded_planks():  # washed-out (disappearing)
    return [
        {'y':2,  'h':8, 'top':'#dfc8a8','bot':'#cdb890','grains':[(4.0,0.70,1),(6.5,0.50,2)]},
        {'y':12, 'h':8, 'top':'#cdb890','bot':'#baa87c','grains':[(14.0,0.65,2),(16.5,0.45,1)]},
        {'y':22, 'h':6, 'top':'#baa87c','bot':'#a89468','grains':[(24.0,0.55,1)]},
    ]

def rust_planks():   # terracotta-red (flip platform)
    return [
        {'y':2,  'h':8, 'top':'#c07860','bot':'#a86048','grains':[(4.0,0.90,1),(6.5,0.65,2)]},
        {'y':12, 'h':8, 'top':'#a86048','bot':'#905038','grains':[(14.0,0.85,2),(16.5,0.60,1)]},
        {'y':22, 'h':6, 'top':'#905038','bot':'#7a4028','grains':[(24.0,0.70,1)]},
    ]

BORDER_WARM   = '#8a5c32'   # medium-dark warm brown  (much less dark than before)
BORDER_COOL   = '#5a5068'
BORDER_FADED  = '#9a8868'
BORDER_RUST   = '#6a3020'
GRAIN_WARM    = 'rgba(45,18,4,0.14)'
GRAIN_COOL    = 'rgba(20,10,30,0.14)'
GRAIN_FADED   = 'rgba(40,18,4,0.10)'
GRAIN_RUST    = 'rgba(50,15,8,0.16)'


# ── 1. PLATFORM TILE ──────────────────────────────────────────────────────────
def gen_platform_tile():
    return wood_tile_svg(128, 30, warm_planks(), BORDER_WARM, GRAIN_WARM)


# ── 2. MOVING PLATFORM ────────────────────────────────────────────────────────
def gen_moving_platform():
    W = 128
    # Three small right-pointing chevrons in the middle plank (y≈12..19)
    cx = W // 2
    chevrons = ''.join(
        f'<polyline points="{cx-14+i*14},{15} {cx-7+i*14},{15.5} {cx-14+i*14},{16}"'
        f' fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"'
        f' stroke-linejoin="round"/>'
        for i in range(3)
    )
    return wood_tile_svg(128, 30, cool_planks(), BORDER_COOL, GRAIN_COOL, overlay=chevrons)


# ── 3. CONVEYOR ───────────────────────────────────────────────────────────────
def gen_conveyor():
    W, H = 128, 30
    B = 2
    BELT  = '#383838'
    RIDGE = 'rgba(255,255,255,0.13)'

    # Diagonal ridges at 30° angle, spaced 10px
    ridges = []
    spacing = 10
    for ox in range(-H, W + H, spacing):
        x1 = ox;     y1 = B + 1
        x2 = ox + H; y2 = H - B - 1
        ridges.append(
            f'<line x1="{x1:.1f}" y1="{y1}" x2="{x2:.1f}" y2="{y2}"'
            f' stroke="{RIDGE}" stroke-width="2"/>'
        )

    # Yellow direction arrow strip at top
    arrows = ''.join(
        f'<polyline points="{x},{5} {x+6},{7.5} {x},{10}"'
        f' fill="none" stroke="rgba(255,200,0,0.55)" stroke-width="1.5"'
        f' stroke-linejoin="round"/>'
        for x in range(16, W - 10, 20)
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="belt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#484848"/>
      <stop offset="100%" stop-color="#282828"/>
    </linearGradient>
    <clipPath id="bc"><rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}"/></clipPath>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#1e1e1e"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}" fill="url(#belt)"/>
  <g clip-path="url(#bc)">
    {''.join(ridges)}
    {arrows}
  </g>
  <line x1="{B}" y1="{B+1}" x2="{W-B}" y2="{B+1}"
        stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="#1e1e1e" stroke-width="2"/>
</svg>'''


# ── 4. ICE ────────────────────────────────────────────────────────────────────
def gen_ice():
    W, H = 128, 30
    B = 2

    # Frost crack lines (branching from random-ish points)
    cracks = [
        # format: path d string
        f'M 22,{H//2} L 18,{B+3} L 14,{B+6}',
        f'M 22,{H//2} L 28,{B+4}',
        f'M 55,{B+4} L 50,{H//2-2} L 46,{H-B-3}',
        f'M 55,{B+4} L 62,{H//2}',
        f'M 88,{H//2+1} L 84,{B+3} L 90,{B+6}',
        f'M 88,{H//2+1} L 94,{H-B-4}',
        f'M 110,{B+5} L 106,{H//2} L 112,{H-B-3}',
    ]

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#cce8f4"/>
      <stop offset="50%"  stop-color="#96c8e0"/>
      <stop offset="100%" stop-color="#6aacc8"/>
    </linearGradient>
    <clipPath id="ic"><rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}"/></clipPath>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#4888a8"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}" fill="url(#ice)"/>
  <!-- Specular gloss strip -->
  <rect x="{B}" y="{B}" width="{W-2*B}" height="5"
        fill="rgba(255,255,255,0.50)"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="2"
        fill="rgba(255,255,255,0.70)"/>
  <!-- Frost cracks -->
  <g clip-path="url(#ic)">
    {''.join(f'<path d="{d}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1" stroke-linecap="round"/>' for d in cracks)}
  </g>
  <!-- Subtle bubble dots -->
  {''.join(f'<circle cx="{x}" cy="{y}" r="1.2" fill="rgba(255,255,255,0.30)"/>'
           for x,y in [(35,12),(70,8),(95,16),(16,20),(108,11)])}
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="#4888a8" stroke-width="2"/>
</svg>'''


# ── 5. SHOCK PLATFORM ─────────────────────────────────────────────────────────
def gen_shock_platform():
    W, H = 128, 30
    # Wood base with a yellow warning band at top + lightning marks
    warning_band = (
        f'<rect x="2" y="2" width="{W-4}" height="5"'
        f' fill="rgba(255,200,0,0.72)"/>'
        f'<rect x="2" y="2" width="{W-4}" height="1"'
        f' fill="rgba(255,240,100,0.60)"/>'
    )
    # Lightning bolt symbols in the middle plank
    bolts = ''
    for bx in [28, 64, 100]:
        # Simple zigzag bolt at center of plank 2 (y≈12..19)
        bolts += (
            f'<polyline points="{bx+2},{13} {bx-1},{16} {bx+1},{16} {bx-2},{19}"'
            f' fill="none" stroke="rgba(255,200,0,0.60)" stroke-width="1.5"'
            f' stroke-linejoin="round" stroke-linecap="round"/>'
        )
    overlay = warning_band + bolts
    # Use slightly darker/more serious wood
    planks = [
        {'y':2,  'h':8, 'top':'#b07848','bot':'#9a6438','grains':[(4.0,0.90,1),(6.5,0.65,2)]},
        {'y':12, 'h':8, 'top':'#9a6438','bot':'#845428','grains':[(14.0,0.85,2),(16.5,0.60,1)]},
        {'y':22, 'h':6, 'top':'#845428','bot':'#6e4018','grains':[(24.0,0.70,1)]},
    ]
    return wood_tile_svg(W, H, planks, '#6a4018', GRAIN_WARM, overlay=overlay)


# ── 6. DISAPPEARING ───────────────────────────────────────────────────────────
def gen_disappearing():
    return wood_tile_svg(128, 30, faded_planks(), BORDER_FADED, GRAIN_FADED,
                         dash='5 3')


# ── 7. FLIP PLATFORM ──────────────────────────────────────────────────────────
def gen_flip_platform():
    W, H = 128, 30
    # Pivot diamond in the center of the middle plank
    cx, cy = W // 2, 16
    pivot = (
        f'<polygon points="{cx},{cy-4} {cx+5},{cy} {cx},{cy+4} {cx-5},{cy}"'
        f' fill="rgba(255,220,180,0.55)" stroke="rgba(200,140,80,0.70)" stroke-width="1"/>'
    )
    return wood_tile_svg(W, H, rust_planks(), BORDER_RUST, GRAIN_RUST, overlay=pivot)


# ── 8. ELEVATOR ───────────────────────────────────────────────────────────────
def gen_elevator():
    W, H = 80, 30
    B = 2

    # Corner rivets
    rivets = ''.join(
        f'<circle cx="{rx}" cy="{ry}" r="2.2"'
        f' fill="#8898a8" stroke="#5a6878" stroke-width="1"/>'
        for rx, ry in [(B+5, B+5), (W-B-5, B+5), (B+5, H-B-5), (W-B-5, H-B-5)]
    )
    # Horizontal grip lines across middle
    grips = ''.join(
        f'<line x1="{B+12}" y1="{y}" x2="{W-B-12}" y2="{y}"'
        f' stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>'
        for y in [10, 15, 20]
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#8898b0"/>
      <stop offset="100%" stop-color="#5a6878"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#3a4858"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}" fill="url(#elev)"/>
  <line x1="{B}" y1="{B+1}" x2="{W-B}" y2="{B+1}"
        stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
  {grips}
  {rivets}
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="#3a4858" stroke-width="2"/>
</svg>'''


# ── 9. SPIKE ──────────────────────────────────────────────────────────────────
def gen_spike():
    W, H     = 32, 28
    BASE_H   = 6
    SPIKE_H  = H - BASE_H
    COUNT    = 2
    SW       = W / COUNT

    defs, els = [], []
    for i in range(COUNT):
        gid = f'cg{i}'
        sx  = i * SW
        cx  = sx + SW / 2
        defs.append(
            f'<linearGradient id="{gid}" x1="{sx:.1f}" y1="2"'
            f' x2="{sx+SW:.1f}" y2="{SPIKE_H}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0%"   stop-color="#c0b0f0"/>'
            f'<stop offset="50%"  stop-color="#7858c8"/>'
            f'<stop offset="100%" stop-color="#3c2880"/>'
            f'</linearGradient>'
        )
        pts = f'{sx+SW*0.08:.2f},{SPIKE_H} {cx:.2f},2 {sx+SW*0.92:.2f},{SPIKE_H}'
        els += [
            f'<polygon points="{pts}" fill="url(#{gid})"'
            f' stroke="#180c30" stroke-width="1.2" stroke-linejoin="round"/>',
            f'<line x1="{sx+SW*0.16:.2f}" y1="{SPIKE_H-2:.1f}"'
            f' x2="{cx-SW*0.08:.2f}" y2="7"'
            f' stroke="rgba(230,218,255,0.72)" stroke-width="1.5" stroke-linecap="round"/>',
            f'<circle cx="{cx:.2f}" cy="3" r="1.2" fill="rgba(255,255,255,0.78)"/>',
        ]

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="base" x1="0" y1="{SPIKE_H}" x2="0" y2="{H}"
        gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#4030a0"/>
      <stop offset="100%" stop-color="#120a20"/>
    </linearGradient>
    {''.join(defs)}
  </defs>
  <rect x="0" y="{SPIKE_H}" width="{W}" height="{BASE_H}" rx="1"
        fill="url(#base)" stroke="#180c30" stroke-width="1.2"/>
  <line x1="2" y1="{SPIKE_H+2}" x2="{W-2}" y2="{SPIKE_H+2}"
        stroke="rgba(190,170,255,0.20)" stroke-width="1"/>
  {''.join(els)}
</svg>'''


# ── 10. SPRING ────────────────────────────────────────────────────────────────
def gen_spring():
    W, H     = 48, 20
    PAD_H    = 5
    BASE_H   = 5
    COIL_H   = H - PAD_H - BASE_H
    STRIPES  = 4
    sh       = COIL_H / STRIPES

    coils = ''.join(
        f'<rect x="5" y="{PAD_H + i*sh:.2f}" width="{W-10}" height="{sh+0.5:.2f}"'
        f' fill="{"#30c0a0" if i%2==0 else "#1a9e80"}"/>'
        for i in range(STRIPES)
    )
    shine_x = round(W * 0.14)
    shine_w = round(W * 0.44)
    shine_h = max(1, round(PAD_H * 0.40))

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="base" x1="0" y1="{H-BASE_H}" x2="0" y2="{H}"
        gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#2a3a50"/>
      <stop offset="100%" stop-color="#101828"/>
    </linearGradient>
    <linearGradient id="pad" x1="0" y1="0" x2="0" y2="{PAD_H}"
        gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#f0ce38"/>
      <stop offset="100%" stop-color="#c08808"/>
    </linearGradient>
  </defs>
  {coils}
  <rect x="5" y="{PAD_H}" width="{W-10}" height="{COIL_H}"
        fill="none" stroke="#0e7058" stroke-width="1"/>
  <rect x="0" y="{H-BASE_H}" width="{W}" height="{BASE_H}" rx="2"
        fill="url(#base)" stroke="#080e18" stroke-width="1.2"/>
  <line x1="4" y1="{H-BASE_H+2}" x2="{W-4}" y2="{H-BASE_H+2}"
        stroke="rgba(80,150,210,0.28)" stroke-width="1"/>
  <rect x="0" y="0" width="{W}" height="{PAD_H}" rx="2"
        fill="url(#pad)" stroke="#906000" stroke-width="1.2"/>
  <rect x="{shine_x}" y="1" width="{shine_w}" height="{shine_h}" rx="1"
        fill="rgba(255,255,255,0.46)"/>
</svg>'''


# ── 11. CANNON ────────────────────────────────────────────────────────────────
def gen_cannon():
    W, H = 32, 32
    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="barrel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#888898"/>
      <stop offset="100%" stop-color="#444454"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#6a6a7a"/>
      <stop offset="100%" stop-color="#383848"/>
    </linearGradient>
  </defs>
  <!-- Barrel (pointing right, slightly upward) -->
  <rect x="10" y="9" width="20" height="9" rx="4" fill="url(#barrel)"
        stroke="#222232" stroke-width="1.2"/>
  <!-- Muzzle ring -->
  <circle cx="29" cy="13.5" r="4" fill="#2a2a3a" stroke="#111120" stroke-width="1"/>
  <circle cx="29" cy="13.5" r="2.2" fill="#111120"/>
  <!-- Barrel highlight -->
  <line x1="12" y1="10.5" x2="26" y2="10.5"
        stroke="rgba(255,255,255,0.30)" stroke-width="1" stroke-linecap="round"/>
  <!-- Body / base -->
  <rect x="4" y="18" width="18" height="10" rx="2" fill="url(#body)"
        stroke="#222232" stroke-width="1.2"/>
  <line x1="6" y1="20" x2="20" y2="20"
        stroke="rgba(255,255,255,0.20)" stroke-width="1"/>
  <!-- Wheel left -->
  <circle cx="8"  cy="28" r="4" fill="#383848" stroke="#111120" stroke-width="1"/>
  <circle cx="8"  cy="28" r="1.5" fill="#222232"/>
  <!-- Wheel right -->
  <circle cx="18" cy="28" r="4" fill="#383848" stroke="#111120" stroke-width="1"/>
  <circle cx="18" cy="28" r="1.5" fill="#222232"/>
</svg>'''


# ── 12. BLACK HOLE ────────────────────────────────────────────────────────────
def gen_black_hole():
    W, H = 40, 40
    cx, cy, R = 20, 20, 18

    # Concentric rings from outside in
    rings = [
        (R,      'rgba(160,40,200,0.45)'),
        (R-3,    'rgba(120,20,160,0.60)'),
        (R-7,    'rgba(80,10,120,0.75)'),
        (R-11,   'rgba(40,4,80,0.88)'),
        (R-14,   '#120820'),
        (R-17,   '#000008'),
    ]

    circles = ''.join(
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>'
        for r, c in rings
    )

    # Swirl arcs
    swirls = []
    for angle_deg in [30, 120, 210, 300]:
        a = math.radians(angle_deg)
        r1, r2 = R - 4, R - 10
        x1 = cx + r1 * math.cos(a)
        y1 = cy + r1 * math.sin(a)
        x2 = cx + r2 * math.cos(a + 0.9)
        y2 = cy + r2 * math.sin(a + 0.9)
        swirls.append(
            f'<path d="M {x1:.1f},{y1:.1f} Q {cx:.1f},{cy:.1f} {x2:.1f},{y2:.1f}"'
            f' fill="none" stroke="rgba(180,60,220,0.40)" stroke-width="1.2"'
            f' stroke-linecap="round"/>'
        )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <!-- Outer glow -->
  <circle cx="{cx}" cy="{cy}" r="{R+1}" fill="rgba(140,20,180,0.25)"/>
  {circles}
  {''.join(swirls)}
  <!-- Edge highlight -->
  <circle cx="{cx-3}" cy="{cy-4}" r="3"
          fill="none" stroke="rgba(220,120,255,0.35)" stroke-width="1"/>
</svg>'''


# ── 13. START ZONE ────────────────────────────────────────────────────────────
def gen_start_zone():
    W, H = 190, 30
    B = 2
    # Green gradient panel with white chevron arrows
    arrows = ''.join(
        f'<polyline points="{x},{H//2-6} {x+10},{H//2} {x},{H//2+6}"'
        f' fill="none" stroke="rgba(255,255,255,0.70)" stroke-width="2"'
        f' stroke-linejoin="round" stroke-linecap="round"/>'
        for x in range(18, W - 14, 22)
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#48c868"/>
      <stop offset="100%" stop-color="#28a048"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#1a7830"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}" fill="url(#sg)"/>
  <line x1="{B}" y1="{B+1}" x2="{W-B}" y2="{B+1}"
        stroke="rgba(255,255,255,0.40)" stroke-width="1"/>
  {arrows}
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="#1a7830" stroke-width="2"/>
</svg>'''


# ── 14. END ZONE ──────────────────────────────────────────────────────────────
def gen_end_zone():
    W, H = 190, 30
    B = 2
    SQ = 5   # checkerboard square size

    squares = []
    for row in range((H - 2*B) // SQ + 1):
        for col in range((W - 2*B) // SQ + 1):
            if (row + col) % 2 == 0:
                rx = B + col * SQ
                ry = B + row * SQ
                rw = min(SQ, W - B - rx)
                rh = min(SQ, H - B - ry)
                if rw > 0 and rh > 0:
                    squares.append(
                        f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}"'
                        f' fill="rgba(255,220,60,0.55)"/>'
                    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#e8b030"/>
      <stop offset="100%" stop-color="#c08010"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#8a5800"/>
  <rect x="{B}" y="{B}" width="{W-2*B}" height="{H-2*B}" fill="url(#eg)"/>
  {''.join(squares)}
  <line x1="{B}" y1="{B+1}" x2="{W-B}" y2="{B+1}"
        stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
  <rect x="1" y="1" width="{W-2}" height="{H-2}"
        fill="none" stroke="#8a5800" stroke-width="2"/>
</svg>'''


# ─── main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    write('platform_tile.svg',    gen_platform_tile())
    write('moving_platform.svg',  gen_moving_platform())
    write('conveyor.svg',         gen_conveyor())
    write('ice.svg',              gen_ice())
    write('shock_platform.svg',   gen_shock_platform())
    write('disappearing.svg',     gen_disappearing())
    write('flip_platform.svg',    gen_flip_platform())
    write('elevator.svg',         gen_elevator())
    write('spike.svg',            gen_spike())
    write('spring.svg',           gen_spring())
    write('cannon.svg',           gen_cannon())
    write('black_hole.svg',       gen_black_hole())
    write('start_zone.svg',       gen_start_zone())
    write('end_zone.svg',         gen_end_zone())
    print(f'\nDone — sprites in: {OUT}')
