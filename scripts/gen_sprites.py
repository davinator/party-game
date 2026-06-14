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


# ─── helpers ──────────────────────────────────────────────────────────────────

def wave_path(W, y_center, amplitude, freq, n=32):
    """Seamless sine-wave path (integer freq → starts and ends at y_center)."""
    segs = [f'M 0,{y_center:.2f}']
    for i in range(1, n + 1):
        x = W * i / n
        y = y_center + amplitude * math.sin(2 * math.pi * freq * x / W)
        segs.append(f'L {x:.2f},{y:.2f}')
    return ' '.join(segs)


# ── PLATFORM TILE (128×30) ────────────────────────────────────────────────────
# Three horizontal wood planks, wavy grain, dark seams and border on all sides.
# Uniform treatment top/bottom/left/right → looks fine when rotated.
def gen_platform_tile():
    W, H = 128, 30

    # Layout (all values in px):
    # y=0..1   : top border
    # y=2..9   : plank 1  (h=8)
    # y=10..11 : seam
    # y=12..19 : plank 2  (h=8)
    # y=20..21 : seam
    # y=22..27 : plank 3  (h=6)
    # y=28..29 : bottom border

    BORDER = '#2e1408'    # very dark reddish-brown for seams/border
    GRAIN  = 'rgba(45,18,4,0.15)'

    planks = [
        {'y': 2,  'h': 8,  'top': '#cfa470', 'bot': '#b88c58',
         'grains': [(4.0,  0.90, 1), (6.5,  0.65, 2)]},
        {'y': 12, 'h': 8,  'top': '#b88c58', 'bot': '#a07848',
         'grains': [(14.0, 0.85, 2), (16.5, 0.60, 1)]},
        {'y': 22, 'h': 6,  'top': '#a07848', 'bot': '#8a6438',
         'grains': [(24.0, 0.70, 1)]},
    ]

    # Vertical joints at x=43 and x=86 (cross all three planks)
    JOINTS = [43, 86]

    defs_block  = []
    body_block  = []
    grain_block = []

    for i, p in enumerate(planks):
        py, ph = p['y'], p['h']
        gid = f'pg{i}'

        # Plank fill gradient (top lighter → bottom darker)
        defs_block.append(
            f'<linearGradient id="{gid}" x1="0" y1="{py}" x2="0" y2="{py+ph}" '
            f'gradientUnits="userSpaceOnUse">'
            f'<stop offset="0%"   stop-color="{p["top"]}"/>'
            f'<stop offset="100%" stop-color="{p["bot"]}"/>'
            f'</linearGradient>'
        )

        # Clip region for this plank (keeps grain inside)
        clip_id = f'pc{i}'
        defs_block.append(
            f'<clipPath id="{clip_id}">'
            f'<rect x="2" y="{py}" width="{W-4}" height="{ph}"/>'
            f'</clipPath>'
        )

        # Plank body
        body_block.append(
            f'<rect x="2" y="{py}" width="{W-4}" height="{ph}" fill="url(#{gid})"/>'
        )

        # Per-plank bevel: thin highlight at top, shadow at bottom
        body_block.append(
            f'<line x1="2" y1="{py+1}" x2="{W-2}" y2="{py+1}" '
            f'stroke="rgba(220,175,120,0.32)" stroke-width="1"/>'
        )
        body_block.append(
            f'<line x1="2" y1="{py+ph-1}" x2="{W-2}" y2="{py+ph-1}" '
            f'stroke="rgba(0,0,0,0.14)" stroke-width="1"/>'
        )

        # Wood grain lines (clipped)
        for (gy, amp, freq) in p['grains']:
            grain_block.append(
                f'<path d="{wave_path(W, gy, amp, freq)}" '
                f'clip-path="url(#{clip_id})" '
                f'stroke="{GRAIN}" stroke-width="1" fill="none"/>'
            )

    # Vertical wood joints (through all planks, not seams/borders)
    joints_svg = []
    for jx in JOINTS:
        joints_svg.append(
            f'<line x1="{jx}" y1="2" x2="{jx}" y2="27" '
            f'stroke="rgba(40,15,4,0.32)" stroke-width="1.5"/>'
        )
        # Tiny highlight to the right of each joint → slot-cut look
        joints_svg.append(
            f'<line x1="{jx+1.5}" y1="2" x2="{jx+1.5}" y2="27" '
            f'stroke="rgba(200,155,100,0.18)" stroke-width="1"/>'
        )

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {W} {H}" width="{W}" height="{H}"
     preserveAspectRatio="none">
  <defs>
    {''.join(defs_block)}
  </defs>

  <!-- Dark border fill (top+bottom 2px strips, left+right 2px strips) -->
  <rect x="0" y="0" width="{W}" height="{H}" fill="{BORDER}"/>

  <!-- Seam grooves -->
  <rect x="2" y="10" width="{W-4}" height="2" fill="{BORDER}"/>
  <rect x="2" y="20" width="{W-4}" height="2" fill="{BORDER}"/>
  <!-- Seam groove highlights (makes seam look like a carved groove) -->
  <line x1="2" y1="10" x2="{W-2}" y2="10" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
  <line x1="2" y1="11" x2="{W-2}" y2="11" stroke="rgba(180,130,80,0.18)" stroke-width="1"/>
  <line x1="2" y1="20" x2="{W-2}" y2="20" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
  <line x1="2" y1="21" x2="{W-2}" y2="21" stroke="rgba(180,130,80,0.18)" stroke-width="1"/>

  <!-- Plank bodies -->
  {''.join(body_block)}

  <!-- Grain lines -->
  {''.join(grain_block)}

  <!-- Vertical joints -->
  {''.join(joints_svg)}

</svg>'''


# ── SPIKE (32×28) ─────────────────────────────────────────────────────────────
# Two sharp crystal spikes.  Deep indigo-to-violet gradient, bright left-face
# highlight, dark purple base.  Clearly not Mario brown stone.
def gen_spike():
    W, H     = 32, 28
    BASE_H   = 6
    SPIKE_H  = H - BASE_H
    COUNT    = 2
    SW       = W / COUNT   # 16 px per crystal

    defs, els = [], []
    for i in range(COUNT):
        gid = f'cg{i}'
        sx  = i * SW
        cx  = sx + SW / 2

        defs.append(
            f'<linearGradient id="{gid}" x1="{sx:.1f}" y1="2" '
            f'x2="{sx+SW:.1f}" y2="{SPIKE_H}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0%"   stop-color="#c0b0f0"/>'
            f'<stop offset="50%"  stop-color="#7858c8"/>'
            f'<stop offset="100%" stop-color="#3c2880"/>'
            f'</linearGradient>'
        )

        pts = f'{sx+SW*0.08:.2f},{SPIKE_H} {cx:.2f},2 {sx+SW*0.92:.2f},{SPIKE_H}'
        els.append(
            f'<polygon points="{pts}" fill="url(#{gid})" '
            f'stroke="#180c30" stroke-width="1.2" stroke-linejoin="round"/>'
        )
        # Left-face highlight
        els.append(
            f'<line x1="{sx+SW*0.16:.2f}" y1="{SPIKE_H-2:.1f}" '
            f'x2="{cx-SW*0.08:.2f}" y2="7" '
            f'stroke="rgba(230,218,255,0.72)" stroke-width="1.5" stroke-linecap="round"/>'
        )
        # Tip gleam
        els.append(
            f'<circle cx="{cx:.2f}" cy="3" r="1.2" fill="rgba(255,255,255,0.78)"/>'
        )

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


# ── SPRING (48×20) ────────────────────────────────────────────────────────────
# Teal accordion coil, gold bounce pad, dark navy base.
def gen_spring():
    W, H     = 48, 20
    PAD_H    = 5
    BASE_H   = 5
    COIL_H   = H - PAD_H - BASE_H
    STRIPES  = 4
    sh       = COIL_H / STRIPES

    coils = ''.join(
        f'<rect x="5" y="{PAD_H + i*sh:.2f}" width="{W-10}" height="{sh+0.5:.2f}" '
        f'fill="{"#30c0a0" if i%2==0 else "#1a9e80"}"/>'
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


if __name__ == '__main__':
    write('platform_tile.svg', gen_platform_tile())
    write('spike.svg',         gen_spike())
    write('spring.svg',        gen_spring())
    print(f'\nDone — sprites in: {OUT}')
