'use strict';

// ─────────────────────────────────────────────
//  WORLD CONSTANTS  (game-logic space)
// ─────────────────────────────────────────────
const WORLD_W = 3200, WORLD_H = 900;
const ZOOM = 1.5;
const GRAVITY    = 0.55;
const MAX_FALL   = 20;
const MOVE_MAX   = 5.5;
const MOVE_ACCEL = 1.4;
const FRICTION   = 0.70;
const AIR_FRIC   = 0.87;
const JUMP_VEL   = -13.5;
const SPRING_VEL = -21;
const COYOTE     = 8;
const JUMP_BUF   = 8;
const PW = 26, PH = 40;
const SNAP = 16;
const DEATH_Y = WORLD_H + 80;

const BUILD_TIME       = 60;
const COUNTDOWN_TIME   = 3;
const PLAY_TIME        = 120;
const RESULTS_TIME     = 8;
const DEFAULT_ROUNDS   = 6;

const CAM_LERP = 0.1; // camera smoothing (lower = smoother/slower)
const VERSION  = '0.1.36';

const TEAM = {
  green: { primary: '#27ae60', light: '#2ecc71', name: 'Green Team' },
  blue:  { primary: '#2471a3', light: '#74b9ff', name: 'Blue Team'  },
};

const OBJ = {
  platform:         { w: 128, h: 30, label: 'Platform',    key: '1' },
  spike:            { w: 32,  h: 28, label: 'Spike',       key: '2' },
  spring:           { w: 48,  h: 20, label: 'Spring',      key: '3' },
  moving_platform:  { w: 128, h: 30, label: 'Moving plat', key: '4',
                      defaults: { rangeX:200, rangeY:0, speed:1.2 } },
  conveyor:         { w: 128, h: 30, label: 'Conveyor',    key: '5' },
  ice:              { w: 128, h: 20, label: 'Ice patch',   key: '6' },
  shock_platform:   { w: 128, h: 30, label: 'Shock plat',  key: '7' },
  disappearing:     { w: 128, h: 30, label: 'Vanish plat', key: '8' },
  flip_platform:    { w: 128, h: 30, label: 'Flip plat',   key: '9' },
  elevator:         { w: 80,  h: 30, label: 'Elevator',    key: '0',
                      defaults: { rangeY: 200 } },
  cannon:           { w: 32,  h: 32, label: 'Cannon',      key: 'q' },
  black_hole:       { w: 40,  h: 40, label: 'Black Hole',  key: 'w' },
};

const CONVEYOR_SPEED = 3.2; // px per tick pushed onto player
const SHOCK_PERIOD   = 4;   // seconds per shock cycle
const SHOCK_ACTIVE   = 1;   // seconds the shock is lethal
const VANISH_DELAY   = 0.7; // seconds after trigger before platform disappears
const VANISH_RESET   = 3.0; // seconds before platform reappears
const FLIP_SAFE      = 2.0; // seconds as platform
const FLIP_DANGER    = 2.0; // seconds as spikes
const FLIP_WARN      = 0.5; // seconds of warning flash before becoming spikes
const ELEV_RISE      = 2.0; // seconds to travel up or down
const ELEV_WAIT      = 1.0; // seconds to pause at top and bottom
const CANNON_PERIOD  = 3.0; // seconds between shots
const CANNON_SPEED   = 7;   // pixels per tick
const CANNON_RANGE   = 700; // pixels before projectile despawns
const BH_PULL_RADIUS = 280; // pixels of influence
const BH_KILL_RADIUS = 22;  // pixels from centre = instant death
const BH_FORCE       = 0.35;// pull acceleration per tick (scales with proximity)

const PALETTE = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71',
  '#1abc9c','#3498db','#9b59b6','#e91e63',
];

// ─────────────────────────────────────────────
//  BASE LEVEL  (wider world, more platforms)
// ─────────────────────────────────────────────
const BASE_LEVEL = [
  { id:'bl_start', type:'platform',   x:32,   y:730, w:256, h:30, permanent:true },
  { id:'bl_m1',    type:'platform',   x:496,  y:650, w:128, h:30, permanent:true },
  { id:'bl_m2',    type:'platform',   x:916,  y:600, w:128, h:30, permanent:true },
  { id:'bl_m3',    type:'platform',   x:1366, y:660, w:128, h:30, permanent:true },
  { id:'bl_m4',    type:'platform',   x:1816, y:580, w:128, h:30, permanent:true },
  { id:'bl_m5',    type:'platform',   x:2266, y:630, w:128, h:30, permanent:true },
  { id:'bl_m6',    type:'platform',   x:2696, y:590, w:128, h:30, permanent:true },
  { id:'bl_end',   type:'platform',   x:2892, y:690, w:256, h:30, permanent:true },
  { id:'bl_sz',    type:'start_zone', x:58,   y:700, w:190, h:30 },
  { id:'bl_ez',    type:'end_zone',   x:2920, y:660, w:190, h:30 },
];

// ─────────────────────────────────────────────
//  WAITING ROOM LEVEL
// ─────────────────────────────────────────────
const WAITING_LEVEL = [
  // Full-width floor — falling is impossible
  { id:'wf',   type:'platform', x:0,    y:820, w:WORLD_W, h:80, permanent:true },
  // Left beginner section
  { id:'wp1',  type:'platform', x:206,  y:540, w:128, h:30, permanent:true },
  { id:'wp2',  type:'platform', x:466,  y:460, w:128, h:30, permanent:true },
  { id:'wp3',  type:'platform', x:716,  y:380, w:128, h:30, permanent:true },
  { id:'wp4',  type:'platform', x:976,  y:460, w:128, h:30, permanent:true },
  // Staircase section
  { id:'ws1',  type:'platform', x:1191, y:560, w:128, h:30, permanent:true },
  { id:'ws2',  type:'platform', x:1351, y:480, w:128, h:30, permanent:true },
  { id:'ws3',  type:'platform', x:1511, y:400, w:128, h:30, permanent:true },
  { id:'ws4',  type:'platform', x:1671, y:320, w:128, h:30, permanent:true },
  // Wide landing
  { id:'wp5',  type:'platform', x:1912, y:490, w:256, h:30, permanent:true },
  // Right section
  { id:'wp6',  type:'platform', x:2306, y:410, w:128, h:30, permanent:true },
  { id:'wp7',  type:'platform', x:2576, y:510, w:128, h:30, permanent:true },
  { id:'wp8',  type:'platform', x:2792, y:430, w:256, h:30, permanent:true },
  // Springs for fun
  { id:'wsp1', type:'spring', x:370,  y:800, w:48, h:20, permanent:true },
  { id:'wsp2', type:'spring', x:1820, y:800, w:48, h:20, permanent:true },
  { id:'wsp3', type:'spring', x:2480, y:800, w:48, h:20, permanent:true },
  // ─── OBSTACLE DEMOS ─────────────────────────────────────────
  // Floor-level: step onto these without jumping
  { id:'d_conv', type:'conveyor',        x:60,   y:790, w:256, h:30, permanent:true },
  { id:'d_ice',  type:'ice',             x:440,  y:800, w:192, h:20, permanent:true },
  { id:'d_spk',  type:'spike',           x:660,  y:792, w:32,  h:28, permanent:true },
  // Elevated row at y=660 — one short jump from the floor
  { id:'d_shk',  type:'shock_platform',  x:700,  y:660, w:128, h:30, permanent:true },
  { id:'d_dis',  type:'disappearing',    x:900,  y:660, w:128, h:30, permanent:true },
  { id:'d_flp',  type:'flip_platform',   x:1100, y:660, w:128, h:30, permanent:true },
  { id:'d_mov',  type:'moving_platform', x:1350, y:660, w:128, h:30, permanent:true,
    rangeX:150, rangeY:0, speed:1.2 },
  { id:'d_elv',  type:'elevator',        x:1620, y:660, w:80,  h:30, permanent:true,
    rangeY:200 },
  // Right-section hazards — explore at your own risk
  { id:'d_bh',   type:'black_hole',      x:3060, y:560, w:40,  h:40, permanent:true },
  { id:'d_can',  type:'cannon',          x:3130, y:788, w:32,  h:32, permanent:true,
    rotation:180 },
];

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2,9) + (Date.now()%1e6).toString(36);
}
function lerp(a, b, t) { return a + (b-a)*t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function snap(v) { return Math.round(v / SNAP) * SNAP; }
function overlap(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}
function circleRect(cx,cy,r, rx,ry,rw,rh) {
  const nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
  return (cx-nx)**2+(cy-ny)**2 < r*r;
}

// ─────────────────────────────────────────────
//  INPUT  (screen-space mouse coords; camera offset applied by caller)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  SPRITE LOADER
// ─────────────────────────────────────────────
const SPRITE_MANIFEST = {
  player_green:     { src:'sprites/player_green.png',     fw:26,   fh:40,  anims:{ idle:{row:0,frames:1,fps:1}, walk:{row:1,frames:4,fps:10}, jump:{row:2,frames:1,fps:1}, fall:{row:3,frames:1,fps:1}, ghost:{row:4,frames:4,fps:6}, finished:{row:5,frames:4,fps:6} } },
  player_blue:      { src:'sprites/player_blue.png',      fw:26,   fh:40,  anims:{ idle:{row:0,frames:1,fps:1}, walk:{row:1,frames:4,fps:10}, jump:{row:2,frames:1,fps:1}, fall:{row:3,frames:1,fps:1}, ghost:{row:4,frames:4,fps:6}, finished:{row:5,frames:4,fps:6} } },
  platform:         { src:'sprites/platform_tile.svg',   fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1} } },
  moving_platform:  { src:'sprites/moving_platform.svg', fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1} } },
  conveyor:         { src:'sprites/conveyor.svg',        fw:128, fh:30, tile:true, anims:{ roll:{row:0,frames:1,fps:1}, roll_rev:{row:0,frames:1,fps:1} } },
  ice:              { src:'sprites/ice.svg',             fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1} } },
  shock_platform:   { src:'sprites/shock_platform.svg',  fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1}, shocked:{row:0,frames:1,fps:1} } },
  disappearing:     { src:'sprites/disappearing.svg',    fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1}, gone:{row:0,frames:1,fps:1} } },
  flip_platform:    { src:'sprites/flip_platform.svg',   fw:128, fh:30, tile:true, anims:{ idle:{row:0,frames:1,fps:1}, flipped:{row:0,frames:1,fps:1} } },
  elevator:         { src:'sprites/elevator.svg',        fw:80,  fh:30, anims:{ idle:{row:0,frames:1,fps:1}, moving:{row:0,frames:1,fps:1} } },
  spike:            { src:'sprites/spike.svg',           fw:32,  fh:28, anims:{ idle:{row:0,frames:1,fps:1} } },
  spring:           { src:'sprites/spring.svg',          fw:48,  fh:20, anims:{ idle:{row:0,frames:1,fps:1} } },
  cannon:           { src:'sprites/cannon.svg',          fw:32,  fh:32, anims:{ idle:{row:0,frames:1,fps:1} } },
  black_hole:       { src:'sprites/black_hole.svg',      fw:40,  fh:40, anims:{ spin:{row:0,frames:1,fps:1} } },
  start_zone:       { src:'sprites/start_zone.svg',      fw:190, fh:30, anims:{ idle:{row:0,frames:1,fps:1} } },
  end_zone:         { src:'sprites/end_zone.svg',        fw:190, fh:30, anims:{ idle:{row:0,frames:1,fps:1} } },
};

class SpriteLoader {
  constructor() { this._imgs = {}; this._defs = {}; }

  load(manifest) {
    this._defs = manifest;
    for (const [name, def] of Object.entries(manifest)) {
      if (!def.src) continue;
      const img = new Image();
      img.onload = () => { this._imgs[name] = img; };
      img.src = def.src;
    }
  }

  // Returns true if drawn; false = caller renders its own fallback
  draw(ctx, name, anim, x, y, w, h, flipX = false) {
    const img = this._imgs[name];
    const def = this._defs[name];
    if (!img || !def) return false;
    const a = def.anims?.[anim] ?? def.anims?.idle;
    if (!a) return false;
    const frame = a.frames > 1
      ? Math.floor(performance.now() / 1000 * a.fps) % a.frames
      : 0;
    const sx = frame * def.fw, sy = (a.row ?? 0) * def.fh;
    // Tiled sprites: repeat the tile across the full width
    if (def.tile) {
      const tw = def.fw;
      for (let tx = x; tx < x + w; tx += tw) {
        const dw = Math.min(tw, x + w - tx);
        ctx.drawImage(img, sx, sy, dw / tw * def.fw, def.fh, tx, y, dw, h);
      }
      return true;
    }
    if (flipX) {
      ctx.save();
      ctx.translate(x + w, y); ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, def.fw, def.fh, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, def.fw, def.fh, x, y, w, h);
    }
    return true;
  }
}

const sprites = new SpriteLoader();

// ─────────────────────────────────────────────
class Input {
  constructor(canvas) {
    this.k   = {};
    this._jp = new Set();
    this._jc = false;
    this.mx  = 0; this.my = 0; // screen-space pixels
    this.mdown = false;

    window.addEventListener('keydown', e => {
      if (!this.k[e.code]) this._jp.add(e.code);
      this.k[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.k[e.code] = false; });

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      // canvas CSS size == viewport size, so no extra scale needed
      this.mx = e.clientX - r.left;
      this.my = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', e => { this.mdown = true; this._jc = true; e.preventDefault(); });
    canvas.addEventListener('mouseup',   () => { this.mdown = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  update() { this._jp.clear(); this._jc = false; }

  get clicked() { return this._jc; }
  get left()    { return !!(this.k.ArrowLeft  || this.k.KeyA); }
  get right()   { return !!(this.k.ArrowRight || this.k.KeyD); }
  get up()      { return !!(this.k.ArrowUp    || this.k.KeyW); }
  get down()    { return !!(this.k.ArrowDown  || this.k.KeyS); }
  get jumpHeld()    { return !!(this.k.Space || this.k.ArrowUp || this.k.KeyW); }
  get jumpPressed() { return this._jp.has('Space') || this._jp.has('ArrowUp') || this._jp.has('KeyW'); }
  pressed(code) { return this._jp.has(code); }
}

// ─────────────────────────────────────────────
//  GAME OBJECT
// ─────────────────────────────────────────────
class GO {
  constructor(d) {
    this.id        = d.id || uid();
    this.type      = d.type;
    this.x = d.x; this.y = d.y; this.w = d.w; this.h = d.h;
    this.rotation  = d.rotation || 0;
    this.permanent = !!d.permanent;
    this.placedBy  = d.placedBy || null;
    this.team      = d.team || null;
    this.solid     = ['platform','moving_platform','conveyor','ice','shock_platform','disappearing','flip_platform','elevator','cannon'].includes(d.type);
    this.hazard    = d.type === 'spike';
    this.isSpring  = d.type === 'spring';
    this.isEnd     = d.type === 'end_zone';
    this.shocked      = false; // shock_platform active state
    this._flipped     = false; // flip_platform: true = spike mode
    this._flipWarning = false; // flip_platform: true = about to become spikes
    this._triggered   = false; // disappearing platform: has been stepped on
    this._triggerT    = 0;
    this._gone        = false; // disappearing platform: currently passable
    // Moving platform
    this.baseX  = d.baseX  ?? d.x;
    this.baseY  = d.baseY  ?? d.y;
    this.rangeX = d.rangeX ?? 0;
    this.rangeY = d.rangeY ?? 0;
    this.speed  = d.speed  ?? 1.2;
    this._vx = 0; this._vy = 0; // per-tick velocity (set by update())
  }

  toJSON() {
    const o = { id:this.id, type:this.type, x:this.x, y:this.y, w:this.w, h:this.h,
                rotation:this.rotation, permanent:this.permanent,
                placedBy:this.placedBy, team:this.team };
    if (this.type === 'moving_platform')
      Object.assign(o, { baseX:this.baseX, baseY:this.baseY,
                          rangeX:this.rangeX, rangeY:this.rangeY, speed:this.speed });
    return o;
  }

  // Advance dynamic state; t = seconds since phase start
  update(t) {
    if (this.type === 'moving_platform') {
      const nx = this.baseX + this.rangeX * Math.sin(t * this.speed);
      const ny = this.baseY + this.rangeY * Math.sin(t * this.speed);
      this._vx = nx - this.x;
      this._vy = ny - this.y;
      this.x = nx; this.y = ny;
    }
    if (this.type === 'shock_platform') {
      this.shocked = (t % SHOCK_PERIOD) > (SHOCK_PERIOD - SHOCK_ACTIVE);
    }
    if (this.type === 'flip_platform') {
      const phase = t % (FLIP_SAFE + FLIP_DANGER);
      this._flipped = phase >= FLIP_SAFE;
      this._flipWarning = !this._flipped && phase >= FLIP_SAFE - FLIP_WARN;
    }
    if (this.type === 'disappearing' && this._triggered) {
      const elapsed = t - this._triggerT;
      this._gone = elapsed >= VANISH_DELAY && elapsed < VANISH_RESET;
      if (elapsed >= VANISH_RESET) { this._triggered = false; this._gone = false; }
    }
    if (this.type === 'elevator') {
      if (!this._triggered) { this.x=this.baseX; this.y=this.baseY; this._vx=0; this._vy=0; return; }
      const CYCLE = ELEV_RISE*2 + ELEV_WAIT*2;
      const e = (t - this._triggerT) % CYCLE;
      let frac;
      if      (e < ELEV_RISE)               frac = e / ELEV_RISE;
      else if (e < ELEV_RISE + ELEV_WAIT)   frac = 1;
      else if (e < ELEV_RISE*2 + ELEV_WAIT) frac = 1 - (e - ELEV_RISE - ELEV_WAIT) / ELEV_RISE;
      else                                   frac = 0;
      const ny = this.baseY - this.rangeY * frac;
      this._vx = 0; this._vy = ny - this.y;
      this.x = this.baseX; this.y = ny;
    }
  }

  // Visual dimensions — inverse of the AABB swap applied at creation for 90°/270°
  get vw() { return (this.rotation===90||this.rotation===270) ? this.h : this.w; }
  get vh() { return (this.rotation===90||this.rotation===270) ? this.w : this.h; }

  draw(ctx) {
    if (this._gone) return;
    const rot = this.rotation;
    if (!rot) {
      this._drawAt(ctx, this.x, this.y, this.w, this.h);
    } else {
      ctx.save();
      ctx.translate(this.x + this.w/2, this.y + this.h/2);
      ctx.rotate(rot * Math.PI / 180);
      this._drawAt(ctx, -this.vw/2, -this.vh/2, this.vw, this.vh);
      ctx.restore();
    }
  }

  _spriteAnim() {
    switch (this.type) {
      case 'shock_platform': return this.shocked   ? 'shocked'  : 'idle';
      case 'flip_platform':  return this._flipped ? 'flipped' : this._flipWarning ? 'warning' : 'idle';
      case 'disappearing':   return this._gone     ? 'gone'     : this._triggered ? 'warning' : 'idle';
      case 'elevator':       return this._triggered ? 'moving'  : 'idle';
      case 'conveyor':       return this.rotation===180 ? 'roll_rev' : 'roll';
      case 'black_hole':     return 'spin';
      default:               return 'idle';
    }
  }

  _drawAt(ctx, x, y, w, h) {
    if (sprites.draw(ctx, this.type, this._spriteAnim(), x, y, w, h)) return;
    switch(this.type) {
      case 'platform':        this._dPlat(ctx,x,y,w,h);         break;
      case 'moving_platform': this._dMovingPlat(ctx,x,y,w,h);   break;
      case 'conveyor':        this._dConveyor(ctx,x,y,w,h);     break;
      case 'ice':             this._dIce(ctx,x,y,w,h);          break;
      case 'shock_platform':  this._dShock(ctx,x,y,w,h);        break;
      case 'spike':           this._dSpike(ctx,x,y,w,h);        break;
      case 'spring':          this._dSpring(ctx,x,y,w,h);       break;
      case 'disappearing':    this._dDisappearing(ctx,x,y,w,h);            break;
      case 'flip_platform':   this._dFlip(ctx,x,y,w,h);                   break;
      case 'elevator':        this._dElevator(ctx,x,y,w,h);               break;
      case 'cannon':          this._dCannon(ctx,x,y,w,h);                 break;
      case 'black_hole':      this._dBlackHole(ctx,x,y,w,h);             break;
      case 'start_zone':      this._dZone(ctx,x,y,w,h,'#2ecc71','GRN START','BLU FINISH'); break;
      case 'end_zone':        this._dZone(ctx,x,y,w,h,'#f1c40f','GRN FINISH','BLU START'); break;
    }
  }

  _dMovingPlat(ctx, x, y, w, h) {
    const tc = this.team ? TEAM[this.team] : null;
    // Range track line
    if (this.rangeX || this.rangeY) {
      const cx2 = this.baseX + w/2, cy2 = this.baseY + h/2;
      ctx.save();
      ctx.setLineDash([5,5]);
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=2;
      ctx.beginPath();
      if (this.rangeX) {
        ctx.moveTo(this.baseX - this.rangeX, cy2);
        ctx.lineTo(this.baseX + this.rangeX + w, cy2);
      } else {
        ctx.moveTo(cx2, this.baseY - this.rangeY);
        ctx.lineTo(cx2, this.baseY + this.rangeY + h);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // End-stop markers
      ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=2;
      const stops = this.rangeX
        ? [[this.baseX - this.rangeX, cy2-8, this.baseX - this.rangeX, cy2+8],
           [this.baseX + this.rangeX + w, cy2-8, this.baseX + this.rangeX + w, cy2+8]]
        : [[cx2-8, this.baseY - this.rangeY, cx2+8, this.baseY - this.rangeY],
           [cx2-8, this.baseY + this.rangeY + h, cx2+8, this.baseY + this.rangeY + h]];
      stops.forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      ctx.restore();
    }
    // Platform body (purple tint to distinguish from static)
    ctx.fillStyle = tc ? tc.primary : '#6c5ce7';
    ctx.fillRect(x, y+5, w, h-5);
    ctx.fillStyle = tc ? tc.light : '#a29bfe';
    ctx.fillRect(x, y, w, 6);
    // Direction arrow
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.font=`bold ${Math.min(12,h-2)}px monospace`; ctx.textAlign='center';
    ctx.fillText(this.rangeY ? '↕' : '↔', x+w/2, y+h/2+4);
  }

  _dPlat(ctx, x, y, w, h) {
    const tc = this.team ? TEAM[this.team] : null;
    ctx.fillStyle = tc ? tc.primary : '#555';
    ctx.fillRect(x, y+5, w, h-5);
    ctx.fillStyle = tc ? tc.light : '#7f8c8d';
    ctx.fillRect(x, y, w, 6);
    if (this.permanent) {
      ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1;
      ctx.strokeRect(x+.5, y+.5, w-1, h-1);
    }
  }

  _dSpike(ctx, x, y, w, h) {
    ctx.fillStyle='#444';
    ctx.fillRect(x, y+h-5, w, 5);
    ctx.fillStyle='#bdc3c7';
    const n = Math.floor(w/16);
    for (let i=0;i<n;i++) {
      const sx = x+i*16+8;
      ctx.beginPath();
      ctx.moveTo(sx-6, y+h-5);
      ctx.lineTo(sx,   y);
      ctx.lineTo(sx+6, y+h-5);
      ctx.fill();
    }
  }

  _dSpring(ctx, x, y, w, h) {
    ctx.fillStyle='#444'; ctx.fillRect(x, y+h-5, w, 5);
    ctx.fillStyle='#e67e22'; ctx.fillRect(x+4, y+4, w-8, h-9);
    ctx.fillStyle='#f39c12'; ctx.fillRect(x+4, y, w-8, 5);
  }

  _dConveyor(ctx, x, y, w, h) {
    ctx.fillStyle='#e67e22'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'CONV');
  }

  _dIce(ctx, x, y, w, h) {
    ctx.fillStyle='#74c0fc'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'ICE');
  }

  _dShock(ctx, x, y, w, h) {
    ctx.fillStyle = this.shocked ? '#fff176' : '#546e7a';
    ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'ZAP');
  }

  _dElevator(ctx, x, y, w, h) {
    ctx.fillStyle = '#f39c12'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'ELEV');
  }

  _dFlip(ctx, x, y, w, h) {
    const flashOn = this._flipWarning && Math.floor(performance.now() / 120) % 2 === 0;
    ctx.fillStyle = this._flipped ? '#e74c3c' : flashOn ? '#e74c3c' : '#8e44ad';
    ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, this._flipped ? 'SPIKE' : this._flipWarning ? 'WARN!' : 'FLIP');
  }

  _dDisappearing(ctx, x, y, w, h) {
    ctx.globalAlpha = this._triggered ? 0.4 : 1;
    ctx.fillStyle = '#a29bfe'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'VANISH');
    ctx.globalAlpha = 1;
  }

  _label(ctx, x, y, w, h, text) {
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.font='bold 10px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(text, x+w/2, y+h/2);
  }

  _dCannon(ctx, x, y, w, h) {
    ctx.fillStyle='#2c3e50'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'CANNON');
  }

  _dBlackHole(ctx, x, y, w, h) {
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(x, y, w, h);
    this._label(ctx, x, y, w, h, 'BH');
  }

  _dZone(ctx, x, y, w, h, color, lnGrn, lnBlu) {
    ctx.fillStyle=color+'28'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([6,3]);
    ctx.strokeRect(x+1,y+1,w-2,h-2); ctx.setLineDash([]);
    ctx.font='bold 9px monospace';
    const flipped=ctx.getTransform().a<0;
    const cx=flipped ? -(x+w/2) : x+w/2;
    ctx.save(); if (flipped) ctx.scale(-1,1); ctx.textAlign='center';
    ctx.fillStyle=TEAM.green.light; ctx.fillText(lnGrn, cx, y+h/2-3);
    ctx.fillStyle=TEAM.blue.light;  ctx.fillText(lnBlu, cx, y+h/2+8);
    ctx.restore();
  }

  // Returns current projectile position or null if not in flight
  projectileAt(t) {
    const tFire = Math.floor(t / CANNON_PERIOD) * CANNON_PERIOD;
    const dist  = (t - tFire) * CANNON_SPEED * 60;
    if (dist > CANNON_RANGE) return null;
    const rad = this.rotation * Math.PI / 180;
    return { x: this.x + this.w/2 + Math.cos(rad)*dist,
             y: this.y + this.h/2 + Math.sin(rad)*dist,
             r: 8 };
  }
}

// ─────────────────────────────────────────────
//  LEVEL
// ─────────────────────────────────────────────
class Level {
  constructor() { this.objects=[]; this.reset(); }

  reset() { this.objects = BASE_LEVEL.map(o => new GO({...o})); }

  add(data)   { const o=new GO(data); this.objects.push(o); return o; }
  remove(id)  { this.objects = this.objects.filter(o=>o.id!==id); }

  get solids()  { return this.objects.filter(o=>o.solid && !o._gone && !(o.type==='flip_platform'&&o._flipped)); }
  get hazards() { return this.objects.filter(o=>o.hazard||(o.type==='shock_platform'&&o.shocked)||(o.type==='flip_platform'&&o._flipped)); }
  get springs() { return this.objects.filter(o=>o.isSpring); }
  get endZone() { return this.objects.find(o=>o.isEnd); }

  startPos() {
    const sz = this.objects.find(o=>o.type==='start_zone');
    if (!sz) return { x:80, y:560 };
    return { x: sz.x + sz.w/2 - PW/2, y: sz.y - PH - 4 };
  }

  update(t)          { this.objects.forEach(o=>o.update(t)); }
  serialize()        { return this.objects.filter(o=>!o.permanent).map(o=>o.toJSON()); }
  load(arr)          { this.reset(); arr.forEach(o=>this.add(o)); }
  draw(ctx)          { this.objects.forEach(o=>o.draw(ctx)); }
  projectilesAt(t)   { return this.objects.filter(o=>o.type==='cannon').map(o=>o.projectileAt(t)).filter(Boolean); }
  get blackHoles()   { return this.objects.filter(o=>o.type==='black_hole'); }
  get startZone()    { return this.objects.find(o=>o.type==='start_zone'); }

  endPos() {
    const ez = this.objects.find(o=>o.isEnd);
    if (!ez) return { x: WORLD_W - 160, y: 560 };
    return { x: ez.x + ez.w/2 - PW/2, y: ez.y - PH - 4 };
  }
}

// ─────────────────────────────────────────────
//  PLAYER
// ─────────────────────────────────────────────
class Player {
  constructor(id, name, team, colorIdx) {
    this.id=id; this.name=name.slice(0,14); this.team=team;
    this.color=PALETTE[colorIdx%PALETTE.length];
    this.x=0; this.y=0; this.vx=0; this.vy=0;
    this.onGround=false; this.facing=1;
    this.state='alive'; // alive | dead | finished
    this._coyote=0; this._jbuf=0; this.walk=0;
    this.ghostMode=false;
    this.placementsLeft=0;
    this._riding=null;
    // Dead reckoning for remote players
    this._remX=0; this._remY=0; this._remVX=0; this._remVY=0; this._remAge=0;
  }

  spawn(x,y) {
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.onGround=false; this.state='alive';
    this._coyote=0; this._jbuf=0; this.ghostMode=false;
  }

  updateLocal(inp, level, placementActive=false, ghostSpeed=5, gravityGhost=false) {
    if (this.state==='finished') return null;

    // Blue team's screen is horizontally mirrored — invert left/right
    const isBlue = this.team === 'blue';
    const goLeft  = isBlue ? inp.right : inp.left;
    const goRight = isBlue ? inp.left  : inp.right;

    if (this.ghostMode) {
      if (gravityGhost) {
        // Physics-based ghost (dead during play) — gravity, platform landing, respawn
        const { solids } = level;
        if (goLeft)  { this.vx -= MOVE_ACCEL; this.facing=-1; }
        if (goRight) { this.vx += MOVE_ACCEL; this.facing=1; }
        this.vx = clamp(this.vx, -MOVE_MAX, MOVE_MAX);
        if (!goLeft && !goRight) {
          this.vx *= this.onGround ? FRICTION : AIR_FRIC;
          if (Math.abs(this.vx)<0.08) this.vx=0;
        }
        if (this._coyote>0) this._coyote--; else this._coyote=0;
        if (this.onGround) this._coyote=COYOTE;
        if (this._jbuf>0) {
          if (this.onGround||this._coyote>0) { this.vy=JUMP_VEL; this._coyote=0; this.onGround=false; }
          this._jbuf--;
        }
        this.vy += GRAVITY; if (this.vy>MAX_FALL) this.vy=MAX_FALL;
        this.x += this.vx;
        this._resolveX(solids);
        if (this.x<0)            { this.x=0;            this.vx=0; }
        if (this.x>WORLD_W-PW)   { this.x=WORLD_W-PW;  this.vx=0; }
        this.onGround=false;
        this.y += this.vy;
        this._resolveY(solids);
        return null;
      }
      // Fly mode (build phase)
      if (goLeft)  { this.x-=ghostSpeed; this.facing=-1; }
      if (goRight) { this.x+=ghostSpeed; this.facing=1;  }
      if (inp.up)   this.y-=ghostSpeed;
      if (inp.down) this.y+=ghostSpeed;
      this.vx=0; this.vy=0; this.onGround=false;
      return null;
    }

    const { solids, hazards, springs, endZone, startZone, blackHoles } = level;

    // Pre-carry: displace with riding platform before own physics to avoid double-counting
    if (this._riding?._vx) { this.x += this._riding._vx; this._resolveX(solids); }
    if (this._riding?._vy) this.y += this._riding._vy;

    // Horizontal
    if (goLeft)  this.vx -= MOVE_ACCEL;
    if (goRight) this.vx += MOVE_ACCEL;
    this.vx = clamp(this.vx, -MOVE_MAX, MOVE_MAX);
    if (!goLeft && !goRight) {
      const onIce = this._riding?.type === 'ice';
      this.vx *= this.onGround ? (onIce ? 0.98 : FRICTION) : AIR_FRIC;
      if (Math.abs(this.vx)<0.08) this.vx=0;
    }
    if (this.vx>0) this.facing=1;
    if (this.vx<0) this.facing=-1;

    // Coyote + jump buffer
    if (this.onGround) this._coyote=COYOTE;
    else if (this._coyote>0) this._coyote--;

    if (this._jbuf>0) {
      if (this._coyote>0) {
        this.vy=JUMP_VEL; this._jbuf=0; this._coyote=0; this.onGround=false;
      } else {
        this._jbuf--;
      }
    }

    // Variable height
    if (!inp.jumpHeld && this.vy<-5) this.vy*=0.83;

    // Gravity
    this.vy += GRAVITY;
    if (this.vy>MAX_FALL) this.vy=MAX_FALL;

    // Move X
    this.x += this.vx;
    this._resolveX(solids);
    if (this.x < 0)            { this.x = 0;            this.vx = 0; }
    if (this.x > WORLD_W - PW) { this.x = WORLD_W - PW; this.vx = 0; }

    // Move Y
    this.onGround=false;
    this.y += this.vy;
    const riding = this._resolveY(solids);
    if (this.y < -WORLD_H) { this.y = -WORLD_H; if (this.vy < 0) this.vy = 0; }
    // Conveyor push
    if (riding?.type === 'conveyor') {
      const dir = (riding.rotation === 180) ? -1 : 1;
      this.vx += dir * CONVEYOR_SPEED;
      this.vx = clamp(this.vx, -MOVE_MAX * 2, MOVE_MAX * 2);
    }

    // Springs
    for (const s of springs) {
      if (this.vy>0 && overlap(this.x,this.y,PW,PH, s.x,s.y,s.w,s.h))
        this.vy=SPRING_VEL;
    }

    if (this.onGround && Math.abs(this.vx)>0.4) this.walk+=0.28;
    this._riding = riding;

    // Black hole pull
    for (const bh of blackHoles) {
      const cx=bh.x+bh.w/2, cy=bh.y+bh.h/2;
      const dx=cx-(this.x+PW/2), dy=cy-(this.y+PH/2);
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist < BH_PULL_RADIUS && dist > 1) {
        const f = BH_FORCE * (1 - dist/BH_PULL_RADIUS);
        this.vx += (dx/dist)*f; this.vy += (dy/dist)*f;
      }
      if (dist < BH_KILL_RADIUS) return 'died';
    }

    // Death / finish
    for (const hz of hazards) {
      if (overlap(this.x+3,this.y+3,PW-6,PH-6, hz.x,hz.y,hz.w,hz.h)) return 'died';
    }
    if (this.y>DEATH_Y) return 'died';
    const finishZone = isBlue ? startZone : endZone;
    if (finishZone && overlap(this.x,this.y,PW,PH, finishZone.x,finishZone.y,finishZone.w,finishZone.h)) return 'finished';

    return null;
  }

  _resolveX(solids) {
    for (const o of solids) {
      if (!overlap(this.x,this.y,PW,PH, o.x,o.y,o.w,o.h)) continue;
      const ol=(this.x+PW)-o.x, or2=(o.x+o.w)-this.x;
      const ot=(this.y+PH)-o.y, ob=(o.y+o.h)-this.y;
      // If vertical penetration is shallower, skip — _resolveY will land the player on top instead
      if (Math.min(ol,or2) >= Math.min(ot,ob)) continue;
      if (ol<or2) { this.x-=ol; this.vx=0; } else { this.x+=or2; this.vx=0; }
    }
  }
  _resolveY(solids) {
    let riding = null;
    for (const o of solids) {
      if (!overlap(this.x,this.y,PW,PH, o.x,o.y,o.w,o.h)) continue;
      const ot=(this.y+PH)-o.y, ob=(o.y+o.h)-this.y;
      if (ot<ob) { this.y-=ot; if(this.vy>0){this.vy=0; this.onGround=true; riding=o;} }
      else       { this.y+=ob; if(this.vy<0) this.vy=0; }
    }
    return riding;
  }

  applyRemote(d) {
    const dx=d.x-this.x, dy=d.y-this.y;
    if (dx*dx+dy*dy>300*300) { this.x=d.x; this.y=d.y; } // hard teleport on large gap
    // Store authoritative state; updateRemote() extrapolates each frame
    this._remX=d.x; this._remY=d.y;
    this._remVX=d.vx; this._remVY=d.vy;
    this._remOnGround=d.onGround;
    this._remAge=0;
    this.vx=d.vx; this.vy=d.vy; this.facing=d.facing;
    this.onGround=d.onGround; this.state=d.state;
    this.walk=d.walk; this.ghostMode=d.ghostMode;
  }

  updateRemote(solids=[]) {
    // Cap at 22 ticks — covers the 20-frame far-player send interval plus jitter
    this._remAge = Math.min(this._remAge + 1, 22);
    const ex = this._remX + this._remVX * this._remAge;
    // Skip gravity when the authoritative state had the player grounded — otherwise
    // standing players appear to fall every prediction window and then snap back up
    const ey = this._remOnGround
      ? this._remY
      : this._remY + this._remVY * this._remAge + 0.5 * GRAVITY * this._remAge * this._remAge;
    this.x = lerp(this.x, ex, 0.35);
    this.y = lerp(this.y, ey, 0.35);
    // Clamp predicted Y against solid surfaces so the player never visually
    // phases through a platform while waiting for the next authoritative update
    for (const o of solids) {
      if (!overlap(this.x, this.y, PW, PH, o.x, o.y, o.w, o.h)) continue;
      const ot=(this.y+PH)-o.y, ob=(o.y+o.h)-this.y;
      if (ot<ob) { this.y-=ot; this.onGround=true; }
      else       { this.y+=ob; }
    }
    if (Math.abs(this._remVX) > 0.5 && this.onGround) this.walk += 0.15;
  }

  snap() {
    return { x:this.x, y:this.y, vx:this.vx, vy:this.vy,
             facing:this.facing, onGround:this.onGround,
             state:this.state, walk:this.walk, ghostMode:this.ghostMode };
  }

  draw(ctx, isLocal, asGhost=false) {
    const x=Math.round(isLocal && this._drawX!=null ? this._drawX : this.x);
    const y=Math.round(this.y);
    const tc=TEAM[this.team];
    ctx.globalAlpha = asGhost ? 0.38 : 1;

    const _anim = this.ghostMode          ? 'ghost'
      : this.state === 'finished'         ? 'finished'
      : !this.onGround                    ? (this.vy < 0 ? 'jump' : 'fall')
      : Math.abs(this.vx) > 0.5          ? 'walk' : 'idle';

    if (!sprites.draw(ctx, `player_${this.team}`, _anim, x, y, PW, PH, this.facing < 0)) {
      if (!this.ghostMode) {
        ctx.fillStyle='rgba(0,0,0,0.25)';
        ctx.fillRect(x+3, y+PH+1, PW-6, 4);
      }
      ctx.fillStyle=tc.primary; ctx.fillRect(x,y,PW,PH);
      ctx.fillStyle=tc.light;   ctx.fillRect(x+2,y+2,PW-4,10);
      const ex = this.facing>0 ? x+PW-10 : x+3;
      ctx.fillStyle='#fff'; ctx.fillRect(ex,y+5,6,6);
      ctx.fillStyle='#111'; ctx.fillRect(ex+(this.facing>0?2:0),y+6,4,4);
      if (this.onGround && !this.ghostMode) {
        const sw=Math.sin(this.walk)*5;
        ctx.fillStyle=tc.primary;
        ctx.fillRect(x+3,    y+PH-6, 8, 6+sw);
        ctx.fillRect(x+PW-11,y+PH-6, 8, 6-sw);
      }
      if (this.ghostMode) {
        ctx.globalAlpha=0.18;
        ctx.fillStyle=tc.light;
        ctx.fillRect(x-4,y-4,PW+8,PH+8);
      }
    }

    ctx.globalAlpha=1;

    const _flipped=ctx.getTransform().a<0;
    const _cx=_flipped ? -(x+PW/2) : x+PW/2;
    ctx.save(); if (_flipped) ctx.scale(-1,1);
    if (this.state==='finished') {
      ctx.fillStyle='#f1c40f'; ctx.font='18px serif'; ctx.textAlign='center';
      ctx.fillText('★', _cx, y-5);
    }
    ctx.font='bold 10px monospace'; ctx.textAlign='center';
    const nm = this.name+(isLocal?' (you)':'');
    const nw = ctx.measureText(nm).width+8;
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(_cx-nw/2, y-20, nw, 14);
    ctx.fillStyle=tc.light;
    ctx.fillText(nm, _cx, y-9);
    ctx.restore();

    if (isLocal) {
      ctx.strokeStyle='#f1c40f'; ctx.lineWidth=2;
      ctx.strokeRect(x-2,y-2,PW+4,PH+4);
    }
  }
}

// ─────────────────────────────────────────────
//  PLACEMENT MANAGER
// ─────────────────────────────────────────────
class Placement {
  constructor() {
    this.active=false; this.type='platform'; this.team=null;
    this.rotation=0;
    this.cx=0; this.cy=0;
  }

  get gx() { const d=this._def(); return snap(this.cx - d.w/2); }
  get gy() { const d=this._def(); return snap(this.cy - d.h/2); }

  _def() {
    const base=OBJ[this.type], rot=this.rotation;
    return (rot===90||rot===270) ? { w:base.h, h:base.w } : { w:base.w, h:base.h };
  }

  close() { this.active=false; }
  updateMouse(wx, wy) { this.cx=wx; this.cy=wy; }
  rotate() { this.rotation=(this.rotation+90)%360; }

  build(placedBy) {
    const def=this._def();
    const base=OBJ[this.type];
    const extras=base.defaults ? { ...base.defaults, baseX:this.gx, baseY:this.gy } : {};
    return { id:uid(), type:this.type,
             x:this.gx, y:this.gy, w:def.w, h:def.h,
             rotation:this.rotation, team:this.team, placedBy, permanent:false, ...extras };
  }

  drawGhost(ctx) {
    if (!this.active) return;
    const def=this._def();
    const base=OBJ[this.type];
    const extras=base.defaults ? { ...base.defaults, baseX:this.gx, baseY:this.gy } : {};
    const ghost=new GO({ id:'g', type:this.type,
                         x:this.gx, y:this.gy, w:def.w, h:def.h,
                         rotation:this.rotation, team:this.team, ...extras });
    ctx.globalAlpha=0.5; ghost.draw(ctx); ctx.globalAlpha=1;
    ctx.strokeStyle='#f1c40f'; ctx.lineWidth=2;
    ctx.strokeRect(this.gx, this.gy, def.w, def.h);
  }
}

// ─────────────────────────────────────────────
//  NETWORK
// ─────────────────────────────────────────────
class Net {
  constructor() {
    this.ws=null; this.handlers={}; this.playerId=null; this.connected=false;
    this._url=null; this._joinMsg=null;
    this._retrying=false; this._retryDelay=1000; this._retryTimer=null;
  }

  connect(url, playerId, roomId, info) {
    this._url=url; this._joinMsg={type:'join',playerId,roomId,...info};
    this.playerId=playerId;
    this._retrying=false;
    return new Promise((resolve,reject) => {
      let settled=false;
      const ws = this.ws = new WebSocket(url);
      ws.onopen=()=>{ settled=true; this.connected=true; this._retryDelay=1000; this._send(this._joinMsg); resolve(); };
      ws.onerror=e=>{ if(!settled){ settled=true; reject(e); } };
      ws.onclose=()=>{
        this.connected=false;
        if(!settled){ settled=true; reject(new Error('Connection closed')); return; }
        if(this._retrying) this._scheduleReconnect();
        else this._emit('disconnected',{});
      };
      ws.onmessage=e=>{ let m; try{m=JSON.parse(e.data);}catch{return;} this._emit(m.type,m); };
    });
  }

  _scheduleReconnect() {
    this._emit('reconnecting',{delay:this._retryDelay});
    this._retryTimer=setTimeout(()=>this._attempt(), this._retryDelay);
    this._retryDelay=Math.min(this._retryDelay*2, 30000);
  }

  _attempt() {
    if(!this._retrying) return;
    const ws = this.ws = new WebSocket(this._url);
    ws.onopen=()=>{ this.connected=true; this._retryDelay=1000; this._send(this._joinMsg); this._emit('reconnected',{}); };
    ws.onerror=()=>{};
    ws.onclose=()=>{ this.connected=false; if(this._retrying) this._scheduleReconnect(); };
    ws.onmessage=e=>{ let m; try{m=JSON.parse(e.data);}catch{return;} this._emit(m.type,m); };
  }

  startRetrying() { this._retrying=true; }
  stopRetrying()  { this._retrying=false; clearTimeout(this._retryTimer); }

  _send(msg) { if(this.ws&&this.ws.readyState===WebSocket.OPEN) this.ws.send(JSON.stringify(msg)); }
  broadcast(msg) { this._send(msg); }
  sendTo(pid,msg) { this._send({...msg,to:pid}); }
  on(type,fn) { (this.handlers[type]=this.handlers[type]||[]).push(fn); return this; }
  _emit(type,msg) { (this.handlers[type]||[]).forEach(fn=>fn(msg)); }
}

// ─────────────────────────────────────────────
//  RENDERER  (all overlay/HUD methods use vw, vh — screen space)
// ─────────────────────────────────────────────
class Renderer {
  constructor(canvas) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); }

  // Background fills the canvas (screen space, called before camera transform)
  clear(vw, vh, camX) {
    const c=this.ctx;
    const bgImg = sprites._imgs['background'];
    if (bgImg) {
      // Tile background horizontally with slow parallax
      const bw = bgImg.width, bh = bgImg.height;
      const scale = vh / bh;
      const dw = bw * scale; // drawn width per tile
      const offset = (camX * 0.15) % dw;
      const startX = -(offset + dw) % dw;
      for (let tx = startX; tx < vw; tx += dw) {
        c.drawImage(bgImg, 0, 0, bw, bh, tx, 0, dw, vh);
      }
    } else {
      const g=c.createLinearGradient(0,0,0,vh);
      g.addColorStop(0,'#5DADE2'); g.addColorStop(0.6,'#A9D4F5'); g.addColorStop(1,'#D5EAF8');
      c.fillStyle=g; c.fillRect(0,0,vw,vh);
      // Parallax clouds
      const cx = camX * 0.12;
      c.fillStyle='rgba(255,255,255,0.88)';
      for (let i=0;i<14;i++) {
        const bx = ((i*317.3 - cx) % (vw+500) + vw+500) % (vw+500) - 250;
        const by = 30 + (i*71.9) % (vh*0.42);
        const rw = 55 + (i*53.1) % 90, rh = 28 + (i*29.7) % 32;
        c.beginPath();
        c.ellipse(bx,        by,        rw,       rh,       0,0,Math.PI*2);
        c.ellipse(bx-rw*0.4, by+rh*0.2, rw*0.58,  rh*0.72,  0,0,Math.PI*2);
        c.ellipse(bx+rw*0.38,by+rh*0.18,rw*0.52,  rh*0.68,  0,0,Math.PI*2);
        c.fill();
      }
    }
    // Death-zone warm glow
    const dg=c.createLinearGradient(0,vh-70,0,vh);
    dg.addColorStop(0,'rgba(210,60,0,0)'); dg.addColorStop(1,'rgba(210,60,0,0.28)');
    c.fillStyle=dg; c.fillRect(0,vh-70,vw,70);
  }

  drawHUD(game) {
    const c=this.ctx;
    const { phase, timer, scores, players, vw, vh } = game;

    c.fillStyle='rgba(0,0,0,.8)'; c.fillRect(0,0,vw,46);

    const secs=Math.ceil(timer);
    const labels={build:'BUILD PHASE', play:'⚡ RACE!', results:'RESULTS'};
    c.fillStyle = secs<=10&&phase!=='results' ? '#e74c3c' : '#fff';
    c.font='bold 22px monospace'; c.textAlign='center';
    c.fillText(`${labels[phase]||''} — ${secs}s`, vw/2, 30);

    c.font='bold 16px monospace';
    c.fillStyle=TEAM.green.light; c.textAlign='left';  c.fillText(`🟢 ${TEAM.green.name}: ${scores.green}`, 18, 30);
    c.fillStyle=TEAM.blue.light; c.textAlign='right'; c.fillText(`${TEAM.blue.name}: ${scores.blue} 🔵`, vw-18, 30);

    const pArr=Object.values(players);
    c.font='10px monospace';
    pArr.forEach((p,i) => {
      const px=18+i*105, py=50, tc=TEAM[p.team];
      c.fillStyle=tc.primary+'cc'; c.fillRect(px,py,96,18);
      c.fillStyle={alive:'#2ecc71',dead:'#e74c3c',finished:'#f1c40f'}[p.state]||'#aaa';
      c.fillRect(px,py,4,18);
      c.fillStyle='#ddd'; c.textAlign='left';
      c.fillText(p.name.slice(0,10)+': '+p.state, px+8, py+12);
    });

    const lp=game.localPlayer;
    if (phase==='build' && lp && !game.placement.active) {
      const msg = lp.placementsLeft>0
        ? `WASD to fly  ·  [E] aim object  ·  [Space] place  (${lp.placementsLeft} left)`
        : `WASD to fly  ·  no placements left — round starts soon`;
      const bw=520;
      c.fillStyle='rgba(0,0,0,.75)'; c.fillRect(vw/2-bw/2, vh-52, bw, 34);
      c.fillStyle=lp.placementsLeft>0?'#2ecc71':'#888';
      c.font='13px monospace'; c.textAlign='center'; c.fillText(msg, vw/2, vh-30);
    }
  }

  drawWaitingHUD(game) {
    const c = this.ctx;
    const { vw, vh } = game;
    // Subtle bottom bar
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, vh-36, vw, 36);
    c.fillStyle = '#f1c40f'; c.font = 'bold 13px monospace'; c.textAlign = 'center';
    c.fillText('WAITING ROOM  ·  A/D move  ·  Space jump  ·  Touch the springs!', vw/2, vh-13);
  }

  drawDeathPrompt(game) {
    const lp=game.localPlayer;
    if (!lp||lp.state!=='dead'||game.placement.active||game.phase!=='play') return;
    const { vw, vh } = game;
    const c=this.ctx;
    const bx=vw/2-220, by=vh/2-42;
    c.fillStyle='rgba(0,0,0,.7)'; c.fillRect(bx,by,440,84);
    c.strokeStyle='#e74c3c'; c.lineWidth=2; c.strokeRect(bx+1,by+1,438,82);
    c.fillStyle='#e74c3c'; c.font='bold 22px monospace'; c.textAlign='center';
    c.fillText('YOU DIED', vw/2, by+32);
    c.fillStyle='#f1c40f'; c.font='14px monospace';
    c.fillText('[E] to place an obstacle  ·  WASD to fly around', vw/2, by+58);
  }

  drawResults(game) {
    const c=this.ctx;
    const { scores, players, isHost, vw, vh } = game;
    const bw=520, bh=400;
    const bx=(vw-bw)/2, by=(vh-bh)/2;

    c.fillStyle='rgba(0,0,0,.88)'; c.fillRect(bx,by,bw,bh);
    c.strokeStyle='#f1c40f'; c.lineWidth=3; c.strokeRect(bx+1,by+1,bw-2,bh-2);
    c.fillStyle='#f1c40f'; c.font='bold 30px monospace'; c.textAlign='center';
    c.fillText('ROUND OVER', vw/2, by+52);

    ['green','blue'].forEach((t,i) => {
      const tx=bx+40+i*240, tc=TEAM[t];
      c.fillStyle=tc.primary; c.fillRect(tx,by+70,200,120);
      c.fillStyle=tc.light; c.font='bold 16px monospace'; c.textAlign='center';
      c.fillText(tc.name, tx+100, by+100);
      c.font='bold 42px monospace'; c.fillText(scores[t], tx+100, by+158);
      c.font='12px monospace'; c.fillStyle='rgba(255,255,255,0.7)';
      c.fillText('points', tx+100, by+178);
    });

    const fin=Object.values(players).filter(p=>p.state==='finished');
    c.fillStyle='#ccc'; c.font='13px monospace'; c.textAlign='center';
    c.fillText(fin.length ? 'Finished: '+fin.map(p=>p.name).join(', ')
                          : 'Nobody finished! Better luck next time.', vw/2, by+230);

    if (isHost) {
      c.fillStyle='#2ecc71'; c.fillRect(vw/2-120, by+bh-66, 240, 42);
      c.fillStyle='#000'; c.font='bold 15px monospace';
      c.fillText('[R] Next Round', vw/2, by+bh-38);
    } else {
      c.fillStyle='#888'; c.font='13px monospace';
      c.fillText('Waiting for host to start next round…', vw/2, by+bh-44);
    }
  }
}

// ─────────────────────────────────────────────
//  GAME
// ─────────────────────────────────────────────
class Game {
  constructor() {
    this.canvas   = document.getElementById('canvas');
    this.renderer = new Renderer(this.canvas);
    this.input    = new Input(this.canvas);
    this.level    = new Level();
    this.net      = new Net();
    this.placement= new Placement();

    this.players  = {};
    this.localId  = null;
    this.isHost   = false;

    this.phase       = 'lobby';
    this.timer       = 0;
    this.scores      = { green:0, blue:0 };
    this.round       = 1;
    this.totalRounds = DEFAULT_ROUNDS;
    this._deathOrder = [];
    this._camFreePan = false;

    // Viewport & camera (screen-space)
    this.vw  = window.innerWidth;
    this.vh  = window.innerHeight;
    this.cam = { x:0, y:0 };

    this._lastTick    = 0;
    this._acc         = 0;
    this._phaseTime   = 0; // seconds since phase start — drives deterministic dynamic objects
    this._loopStarted = false;

    sprites.load(SPRITE_MANIFEST);

    this._resize();
    window.addEventListener('resize', ()=>this._resize());
    this._setupLobby();
    this._initBuildPanel();
  }

  get localPlayer() { return this.players[this.localId]; }

  // ── Mouse-driven placement ──────────────────

  screenToWorld(clientX, clientY) {
    const rect=this.canvas.getBoundingClientRect();
    const sx=clientX-rect.left, sy=clientY-rect.top;
    if (this.localPlayer?.team === 'blue') {
      return { x: WORLD_W - this.cam.x - sx/ZOOM, y: sy/ZOOM + this.cam.y };
    }
    return { x: sx/ZOOM + this.cam.x, y: sy/ZOOM + this.cam.y };
  }

  _canPlace() {
    const lp=this.localPlayer; if (!lp) return false;
    return (this.phase==='build' && lp.placementsLeft>0) ||
           (this.phase==='play' && lp.state==='dead' && lp.placementsLeft>0);
  }

  _startNextRound() {
    if (this.round >= this.totalRounds) {
      this._applyPhase('gameover', 0);
      this.net.broadcast({ type:'phase_change', newPhase:'gameover', timer:0 });
    } else {
      this.round++;
      this._applyPhase('build', BUILD_TIME);
      this.net.broadcast({ type:'phase_change', newPhase:'build', timer:BUILD_TIME, round:this.round });
    }
  }

  _returnToWaiting() {
    this._applyPhase('waiting', 0);
    this.net.broadcast({ type:'phase_change', newPhase:'waiting', timer:0 });
  }

  _checkAllBuildDone() {
    if (this.phase!=='build') return;
    const players=Object.values(this.players);
    if (players.length>0 && players.every(p=>p._buildDone)) {
      this._applyPhase('countdown', COUNTDOWN_TIME);
      this.net.broadcast({ type:'phase_change', newPhase:'countdown', timer:COUNTDOWN_TIME });
    }
  }

  _initBuildPanel() {
    const grid=document.getElementById('obstacle-grid');
    if (!grid) return;
    grid.innerHTML='';
    for (const [type, def] of Object.entries(OBJ)) {
      const btn=document.createElement('button');
      btn.className='obs-btn'; btn.dataset.type=type; btn.textContent=def.label;
      btn.addEventListener('click', ()=>{
        this.placement.type=type;
        document.querySelectorAll('.obs-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      grid.appendChild(btn);
    }
    grid.querySelector('.obs-btn')?.classList.add('selected');

    document.getElementById('rotate-btn')
      .addEventListener('click', ()=>this.placement.rotate());

    document.getElementById('next-round-btn')
      .addEventListener('click', ()=>{
        if (this.isHost && this.phase==='results')  this._startNextRound();
        if (this.isHost && this.phase==='gameover') this._returnToWaiting();
      });

    this.canvas.addEventListener('mousemove', e=>{
      if (!this.placement.active) return;
      const w=this.screenToWorld(e.clientX, e.clientY);
      this.placement.updateMouse(w.x, w.y);
    });

    this.canvas.addEventListener('click', e=>{
      if (!this._canPlace()) return;
      const lp=this.localPlayer; if (!lp) return;
      const w=this.screenToWorld(e.clientX, e.clientY);
      this.placement.updateMouse(w.x, w.y);
      const obj=this.placement.build(this.localId);
      this.level.add(obj);
      this.net.broadcast({ type:'place_object', obj });
      if (this.phase==='build') {
        lp.placementsLeft--;
        if (lp.placementsLeft===0) {
          lp._buildDone=true;
          this.net.broadcast({ type:'build_done' });
          if (this.isHost) this._checkAllBuildDone();
        }
      }
      this._updateBuildPanel();
    });
  }

  // ── DOM UI updates (called every step) ─────

  _updateBuildPanel() {
    const canPlace=this._canPlace();
    this.placement.active=canPlace;
    const lp=this.localPlayer;
    if (canPlace && lp) this.placement.team=lp.team;

    const panel=document.getElementById('build-panel');
    const players=document.getElementById('hud-players');
    if (!panel) return;

    if (canPlace) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }

    const counter=document.getElementById('placements-counter');
    if (counter && lp) {
      if (this.phase==='build') {
        counter.textContent=`${lp.placementsLeft} left`;
        counter.className=lp.placementsLeft>0 ? 'has-placements' : 'no-placements';
      } else {
        counter.textContent='∞ placements';
        counter.className='has-placements';
      }
    }
  }

  _updateHUD() {
    const hud=document.getElementById('game-hud');
    const playerBar=document.getElementById('hud-players');
    if (!hud) return;
    const active=['build','countdown','play','results','gameover'].includes(this.phase);
    hud.classList.toggle('hidden', !active);
    if (playerBar) playerBar.classList.toggle('hidden', !active);
    if (!active) return;

    const secs=Math.ceil(this.timer);
    const rt=`${this.round}/${this.totalRounds}`;
    const label={build:`BUILD · ${rt}`,countdown:'GET READY',play:`RACE · ${rt}`,results:`RESULTS · ${rt}`,gameover:'GAME OVER'}[this.phase]||'';
    document.getElementById('hud-phase-label').textContent=label;
    const timerEl=document.getElementById('hud-timer');
    timerEl.textContent=secs+'s';
    timerEl.className=(secs<=10&&this.phase!=='results')?'urgent':'';
    document.getElementById('score-green').textContent=this.scores.green;
    document.getElementById('score-blue').textContent=this.scores.blue;
  }

  _updatePlayerDots() {
    const container=document.getElementById('hud-players');
    if (!container) return;
    container.innerHTML='';
    for (const p of Object.values(this.players)) {
      const div=document.createElement('div');
      div.className=`hud-player s-${p.state}`;
      div.style.borderLeftColor=TEAM[p.team]?.primary||'#888';
      div.innerHTML=`<span class="state-dot"></span>${p.name.slice(0,10)}`;
      container.appendChild(div);
    }
  }

  _updateResultsPanel() {
    const panel=document.getElementById('results-panel');
    if (!panel) return;
    if (this.phase==='results' || this.phase==='gameover') {
      panel.classList.remove('hidden');
      const isGameOver = this.phase==='gameover';
      document.getElementById('results-title').textContent =
        isGameOver ? 'GAME OVER' : `ROUND ${this.round} / ${this.totalRounds}`;
      document.getElementById('results-scores').innerHTML=
        `<span class="res-green">Green: ${this.scores.green}</span>&emsp;<span class="res-blue">Blue: ${this.scores.blue}</span>`;
      const fin=Object.values(this.players).filter(p=>p.state==='finished');
      document.getElementById('results-finished').textContent=
        isGameOver ? (this.scores.green>this.scores.blue?'Green wins!':this.scores.blue>this.scores.green?'Blue wins!':'It\'s a tie!')
                   : (fin.length ? 'Finished: '+fin.map(p=>p.name).join(', ') : 'Nobody finished!');
      const btn=document.getElementById('next-round-btn');
      const waiting=document.getElementById('results-waiting');
      btn.textContent = isGameOver ? '↩ Return to Lobby' : '▶ Next Round';
      btn.style.display=this.isHost?'':'none';
      waiting.style.display=this.isHost?'none':'';
      waiting.textContent = isGameOver ? 'Waiting for host to return to lobby…' : 'Waiting for host to start next round…';
    } else {
      panel.classList.add('hidden');
    }
  }

  _updateCountdownModal() {
    const el=document.getElementById('countdown-modal');
    if (!el) return;
    if (this.phase==='countdown') {
      el.classList.remove('hidden');
      const n=Math.ceil(this.timer);
      document.getElementById('countdown-number').textContent = n>0 ? n : 'GO!';
    } else {
      el.classList.add('hidden');
    }
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    // Physical pixels
    this.canvas.width  = Math.round(this.vw * dpr);
    this.canvas.height = Math.round(this.vh * dpr);
    // CSS logical size
    this.canvas.style.width  = this.vw + 'px';
    this.canvas.style.height = this.vh + 'px';
    // Scale context so all drawing uses logical pixels
    this.renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _updateCamera() {
    const lp = this.localPlayer;
    if (!lp) return;

    const VW = this.vw / ZOOM, VH = this.vh / ZOOM;
    const freePanMode = this.phase === 'build' ||
                       (this.phase === 'play' && lp.state === 'dead');
    if (freePanMode) {
      const isMoving = this.input.left || this.input.right ||
                       (this.phase==='build' && (this.input.up || this.input.down));
      if (isMoving) this._camFreePan = false;

      if (this._camFreePan) {
        // Velocity-based mouse panning: mouse offset from screen centre drives camera speed
        const PAN_MAX = 10;
        const panX = ((this.input.mx - this.vw/2) / (this.vw/2)) * PAN_MAX;
        const panY = ((this.input.my - this.vh/2) / (this.vh/2)) * PAN_MAX;
        this.cam.x = clamp(this.cam.x + panX, 0, Math.max(0, WORLD_W - VW));
        this.cam.y = clamp(this.cam.y + panY, 0, Math.max(0, WORLD_H - VH));
      } else {
        // Ghost-follow
        const tx = clamp(lp.x + PW/2 - VW/2, 0, Math.max(0, WORLD_W - VW));
        const ty = clamp(lp.y + PH/2 - VH/2, 0, Math.max(0, WORLD_H - VH));
        this.cam.x = lerp(this.cam.x, tx, CAM_LERP);
        this.cam.y = lerp(this.cam.y, ty, CAM_LERP);
      }
      return;
    }

    const mirrorBlue = lp.team === 'blue' && this.phase !== 'waiting';
    const tx = mirrorBlue
      ? clamp(WORLD_W - (lp.x + PW/2) - VW/2, 0, Math.max(0, WORLD_W - VW))
      : clamp(lp.x + PW/2 - VW/2, 0, Math.max(0, WORLD_W - VW));
    const ty = clamp(lp.y + PH/2 - VH/2, 0, Math.max(0, WORLD_H - VH));
    this.cam.x = lerp(this.cam.x, tx, CAM_LERP);
    this.cam.y = lerp(this.cam.y, ty, CAM_LERP);
  }

  // ── LOBBY ──
  _setupLobby() {
    let selectedTeam='green';
    document.querySelectorAll('.team-btn').forEach(btn => {
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.team-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); selectedTeam=btn.dataset.team;
      });
    });
    document.querySelector('[data-team="green"]').classList.add('active');

    document.getElementById('join-btn').addEventListener('click', ()=>{
      const name   = (document.getElementById('player-name').value||'').trim()||'Player';
      const room   = (document.getElementById('room-code').value||'').trim()||'default';
      let server = (document.getElementById('server-addr').value||'').trim()||'localhost:8080';
      server = server.includes('://') ? server.replace(/[a-zA-Z]*\:\/\/?/, '') : server
      this._join(`wss://${server}`, room, name, selectedTeam);
    });

    document.getElementById('start-btn').addEventListener('click', ()=>{
      if (this.isHost && (this.phase==='lobby'||this.phase==='waiting')) this._hostStartBuild();
    });
  }

  async _join(url, roomId, name, team) {
    const btn=document.getElementById('join-btn');
    btn.disabled=true; btn.textContent='Connecting…';
    this.localId=uid();
    this.roomId=roomId;
    const colorIdx=Math.floor(Math.random()*PALETTE.length);
    this._pendingInfo={ name, team, colorIdx };
    try {
      await this.net.connect(url, this.localId, roomId, { name, team, colorIdx });
    } catch(e) {
      btn.disabled=false; btn.textContent='JOIN ROOM';
      alert('Connection failed. Is the server running?\n'+e.message); return;
    }
    this._wireNetwork();
  }

  _wireNetwork() {
    const net=this.net;

    net.on('joined', msg=>{
      this.isHost=msg.isHost;
      const {name,team,colorIdx}=this._pendingInfo;
      this._addPlayer(this.localId, name, team, colorIdx);
      if (this.isHost) document.getElementById('start-btn').style.display='block';
      this._enterWaiting();
    });

    net.on('player_joined', msg=>{
      this._addPlayer(msg.playerId, msg.name, msg.team, msg.colorIdx);
    });

    net.on('state_sync', msg=>{
      if (msg.to!==this.localId) return;
      this.scores=msg.scores; this.round=msg.round; this.totalRounds=msg.totalRounds||DEFAULT_ROUNDS;
      msg.players.forEach(p=>{
        if (p.id!==this.localId) this._addPlayer(p.id,p.name,p.team,p.colorIdx);
        const pl=this.players[p.id];
        if (pl) { pl.x=p.x; pl.y=p.y; pl.state=p.state; }
      });
      if (msg.phase==='waiting' || msg.phase==='lobby') {
        this._enterWaiting();
      } else {
        this.level.load(msg.objects);
        this.phase=msg.phase; this.timer=msg.timer;
        this._enterGame();
      }
    });

    net.on('state_request', msg=>{
      if (!this.isHost) return;
      const pArr=Object.values(this.players).map(p=>({
        id:p.id, name:p.name, team:p.team, colorIdx:PALETTE.indexOf(p.color),
        x:p.x, y:p.y, state:p.state,
      }));
      net.sendTo(msg.targetPlayerId, {
        type:'state_sync', to:msg.targetPlayerId,
        objects:this.level.serialize(), phase:this.phase, timer:this.timer,
        scores:this.scores, round:this.round, totalRounds:this.totalRounds, players:pArr,
      });
    });

    net.on('phase_change', msg=>{
      if (msg.from===this.localId) return;
      if (msg.round       !== undefined) this.round       = msg.round;
      if (msg.totalRounds !== undefined) this.totalRounds = msg.totalRounds;
      if (msg.scores      !== undefined) this.scores      = msg.scores;
      this._applyPhase(msg.newPhase, msg.timer);
    });

    net.on('player_update', msg=>{
      const p=this.players[msg.from];
      if (p&&msg.from!==this.localId) p.applyRemote(msg);
    });

    net.on('place_object', msg=>{ this.level.add(msg.obj); });

    net.on('build_done', msg=>{
      const p=this.players[msg.from]; if (p) p._buildDone=true;
      if (this.isHost) this._checkAllBuildDone();
    });

    net.on('platform_trigger', msg=>{
      const go = this.level.objects.find(o=>o.id===msg.id);
      if (go && !go._triggered) { go._triggered=true; go._triggerT=msg.t; }
    });

    net.on('player_event', msg=>{
      const p=this.players[msg.playerId]; if (!p) return;
      if (msg.event==='died') {
        p.state='dead'; p.ghostMode=true;
        if (this.phase==='play') this._deathOrder.push(msg.playerId);
      }
      if (msg.event==='finished') { p.state='finished'; p.ghostMode=false; }
    });

    net.on('player_left', msg=>{
      delete this.players[msg.playerId]; this._refreshLobbyList();
    });

    net.on('promoted_to_host', ()=>{
      this.isHost=true;
      if (this.phase==='lobby') document.getElementById('start-btn').style.display='block';
    });

    this.net.startRetrying();
    const _banner=document.getElementById('reconnect-banner');
    const _bannerMsg=document.getElementById('reconnect-msg');
    net.on('reconnecting',({delay})=>{
      _banner.classList.remove('hidden');
      _bannerMsg.textContent=`Connection lost — reconnecting in ${Math.round(delay/1000)}s…`;
    });
    net.on('reconnected',()=>{ _banner.classList.add('hidden'); });
    net.on('disconnected',()=>{ _banner.classList.remove('hidden'); _bannerMsg.textContent='Disconnected from server.'; });
  }

  _addPlayer(id,name,team,colorIdx) {
    if (this.players[id]) return;
    this.players[id]=new Player(id,name,team,colorIdx);
  }

  _refreshLobbyList() {
    const ul=document.getElementById('player-list');
    ul.innerHTML='';
    Object.values(this.players).forEach(p=>{
      const li=document.createElement('li');
      li.innerHTML=`<span class="dot dot-${p.team}"></span>
        <strong>${p.name}</strong>
        <span style="color:#888">(${TEAM[p.team].name})</span>
        ${p.id===this.localId?'<span class="host-badge">YOU</span>':''}
        ${this.isHost&&p.id===this.localId?'<span class="host-badge" style="background:#f1c40f">HOST</span>':''}`;
      ul.appendChild(li);
    });
    const cnt=Object.keys(this.players).length;
    document.getElementById('status-msg').textContent=
      `${cnt} player${cnt!==1?'s':''} in room. Share the room code!`;
  }

  _refreshWaitingPanel() {
    const ul = document.getElementById('player-list');
    if (!ul) return;
    ul.innerHTML = '';
    Object.values(this.players).forEach(p => {
      const li = document.createElement('li');
      const tc = TEAM[p.team];
      li.innerHTML = `<span class="dot dot-${p.team}"></span>
        <strong>${p.name}</strong>
        ${p.id===this.localId ? '<span class="host-badge">YOU</span>' : ''}
        ${this.isHost&&p.id===this.localId ? '<span class="host-badge" style="background:#f1c40f">HOST</span>' : ''}`;
      ul.appendChild(li);
    });
    const cnt = Object.keys(this.players).length;
    const msg = document.getElementById('status-msg');
    if (msg) msg.textContent = `Room: ${this.roomId||'?'}  ·  ${cnt} player${cnt!==1?'s':''}`;
    const cfg = document.getElementById('host-config');
    if (cfg) cfg.style.display = this.isHost ? '' : 'none';
  }

  // ── PHASES ──
  _hostStartBuild() {
    const el = document.getElementById('rounds-count');
    this.totalRounds = el ? Math.max(1, parseInt(el.value)||DEFAULT_ROUNDS) : DEFAULT_ROUNDS;
    this.round = 1;
    this.scores = { green:0, blue:0 };
    this._deathOrder = [];
    this._applyPhase('build', BUILD_TIME);
    this.net.broadcast({ type:'phase_change', newPhase:'build', timer:BUILD_TIME,
      round:1, totalRounds:this.totalRounds, scores:this.scores });
  }

  _applyPhase(phase, timer) {
    this.phase=phase; this.timer=timer; this._phaseTime=0;

    if (phase==='waiting') { this._enterWaiting(); return; }

    if (phase==='build') {
      if (this.round===1) this.level.reset(); // only on new-game first round
      this._enterGame();
      this._spawnPlayers();
      this._buildCamX = this.cam.x;
      this._camFreePan = true;
      const n = Object.keys(this.players).length;
      const base = n > 6 ? 1 : 2;
      const bonusCount = n > 6 ? Math.floor(n * 0.3) : 0;
      const bonusSet = new Set(this._deathOrder.slice(0, bonusCount));
      this._deathOrder = [];
      Object.values(this.players).forEach(p=>{
        p.state='alive';
        p.placementsLeft = base + (bonusSet.has(p.id) ? 1 : 0);
        p.ghostMode=true; p._buildDone=false;
      });
    }
    if (phase==='countdown') {
      this._spawnPlayers();
      Object.values(this.players).forEach(p=>{
        p.state='alive'; p.placementsLeft=0; p.ghostMode=false;
      });
      this.placement.close();
    }
    if (phase==='play') {
      Object.values(this.players).forEach(p=>{
        p.state='alive'; p.ghostMode=false;
      });
    }
    if (phase==='results') {
      this._tallyScores(); this.placement.close();
      Object.values(this.players).forEach(p=>{ p.ghostMode=false; });
    }
    if (phase==='gameover') {
      this.placement.close();
    }
  }

  _enterWaiting() {
    this.phase = 'waiting';
    this.level.objects = WAITING_LEVEL.map(o => new GO({...o}));
    const lp = this.localPlayer;
    if (lp) {
      lp.spawn(300, 580);
      this.cam.x = 0; this.cam.y = 0;
    }
    this.canvas.style.display = 'block';
    const ov = document.getElementById('overlay');
    ov.style.display = ''; // restore if hidden by _enterGame
    ov.classList.add('compact');
    this._refreshWaitingPanel();
    if (!this._loopStarted) {
      this._loopStarted = true;
      requestAnimationFrame(ts => this._loop(ts));
    }
  }

  _enterGame() {
    const ov = document.getElementById('overlay');
    ov.style.display = 'none';
    ov.classList.remove('compact');
    this.canvas.style.display = 'block';
    if (!this._loopStarted) {
      this._loopStarted = true;
      requestAnimationFrame(ts => this._loop(ts));
    }
  }

  _spawnPlayers() {
    const sp=this.level.startPos();
    const ep=this.level.endPos();
    // Sort by ID so every client assigns the same spawn slot to the same player
    const pArr=Object.values(this.players).sort((a,b)=>a.id<b.id?-1:1);
    let ri=0, bi=0;
    pArr.forEach(p => {
      if (p.team==='blue') { p.spawn(ep.x - bi*(PW+20), ep.y); bi++; }
      else                 { p.spawn(sp.x + ri*(PW+20), sp.y); ri++; }
    });
    const lp=this.localPlayer;
    if (lp) {
      const _VW = this.vw/ZOOM, _VH = this.vh/ZOOM;
      const tx = lp.team==='blue'
        ? clamp(WORLD_W-(lp.x+PW/2)-_VW/2, 0, Math.max(0,WORLD_W-_VW))
        : clamp(lp.x+PW/2-_VW/2, 0, Math.max(0,WORLD_W-_VW));
      this.cam.x = tx;
      this.cam.y = clamp(lp.y+PH/2-_VH/2, 0, Math.max(0,WORLD_H-_VH));
    }
  }

  _tallyScores() {
    Object.values(this.players).filter(p=>p.state==='finished')
      .forEach(p=>{ this.scores[p.team]=(this.scores[p.team]||0)+10; });
  }

  // ── LOOP ──
  _loop(ts) {
    requestAnimationFrame(t=>this._loop(t));
    const dt=Math.min(ts-this._lastTick, 50);
    this._lastTick=ts;

    if (this.phase==='lobby') { this.input.update(); return; }

    this._handleInput();
    this._tick(dt);
    this._updateCamera();
    this._render();
    this._updateCountdownModal();
    this.input.update();

    // Keep waiting-room player list fresh
    if (this.phase==='waiting') this._refreshWaitingPanel();
  }

  _tick(dt) {
    const STEP = 1000/60;
    this._acc += dt;
    // cap accumulator to avoid spiral-of-death after tab suspend
    if (this._acc > 200) this._acc = STEP;
    while (this._acc >= STEP) {
      this._acc -= STEP;
      this._step();
    }
  }

  _step() {
    if (this.phase==='lobby') return;

    if (this.phase==='waiting') {
      this._phaseTime += 1/60;
      this.level.update(this._phaseTime);
      const lp = this.localPlayer;
      if (lp) lp.updateLocal(this.input, this.level, this.placement.active);
      for (const p of Object.values(this.players)) {
        if (p.id !== this.localId) p.updateRemote(this.level.solids);
      }
      this._sendTick = (this._sendTick||0) + 1;
      if (lp) {
        const iv = this._sendInterval();
        if (this._sendTick % iv === 0) this.net.broadcast({ type:'player_update', ...lp.snap() });
      }
      return;
    }

    this._phaseTime += 1/60;
    this.level.update(this._phaseTime);

    if (this.timer>0) {
      this.timer-=1/60;
      if (this.timer<0) this.timer=0;
    }

    if (this.timer===0 && this.isHost) {
      if (this.phase==='build') {
        this._applyPhase('countdown', COUNTDOWN_TIME);
        this.net.broadcast({ type:'phase_change', newPhase:'countdown', timer:COUNTDOWN_TIME });
      } else if (this.phase==='countdown') {
        this._applyPhase('play', PLAY_TIME);
        this.net.broadcast({ type:'phase_change', newPhase:'play', timer:PLAY_TIME });
      } else if (this.phase==='play') {
        this._applyPhase('results', RESULTS_TIME);
        this.net.broadcast({ type:'phase_change', newPhase:'results', timer:RESULTS_TIME });
      }
    }

    if (this.phase==='countdown') return;
    if (this.phase==='results')   return;
    if (this.phase==='gameover')  return;

    const lp=this.localPlayer;
    if (lp) {
      const evt=lp.updateLocal(this.input, this.level, this.placement.active, this.phase==='build' ? 10 : 5, this.phase==='play');

      this._resolvePlayerCollisions();

      // Trigger disappearing platform on first contact
      const ridingNow = lp._riding;
      if (ridingNow && (ridingNow.type==='disappearing'||ridingNow.type==='elevator') && !ridingNow._triggered) {
        ridingNow._triggered = true; ridingNow._triggerT = this._phaseTime;
        this.net.broadcast({ type:'platform_trigger', id:ridingNow.id, t:this._phaseTime });
      }

      // Projectile hits
      if (lp.state==='alive') {
        for (const p of this.level.projectilesAt(this._phaseTime)) {
          if (circleRect(p.x,p.y,p.r, lp.x,lp.y,PW,PH)) {
            lp.state='dead'; lp.ghostMode=true;
            this.net.broadcast({ type:'player_event', playerId:this.localId, event:'died' });
            this._deathOrder.push(this.localId);
            { const tot=Object.keys(this.players).length; lp.placementsLeft=this._deathOrder.length<=Math.ceil(tot*0.5)?1:0; }
            this._camFreePan=true;
            break;
          }
        }
      }

      if (evt==='died' && lp.state==='alive') {
        lp.state='dead'; lp.ghostMode=true;
        this.net.broadcast({ type:'player_event', playerId:this.localId, event:'died' });
        this._deathOrder.push(this.localId);
        { const tot=Object.keys(this.players).length; lp.placementsLeft=this._deathOrder.length<=Math.ceil(tot*0.5)?1:0; }
        this._camFreePan=true;
      }
      if (evt==='finished' && lp.state==='alive') {
        lp.state='finished'; lp.ghostMode=false;
        this.net.broadcast({ type:'player_event', playerId:this.localId, event:'finished' });
      }

      // Ghost respawn — dead player fell off world during play
      if (lp.state==='dead' && lp.ghostMode && this.phase==='play' && lp.y > DEATH_Y + 100) {
        const sp = this.level.startPos();
        lp.spawn(sp.x, sp.y);
      }

      if (this.isHost && this.phase==='play') {
        const alive=Object.values(this.players).filter(p=>p.state==='alive');
        if (alive.length===0) {
          this._applyPhase('results', RESULTS_TIME);
          this.net.broadcast({ type:'phase_change', newPhase:'results', timer:RESULTS_TIME });
        }
      }
    }

    for (const p of Object.values(this.players)) {
      if (p.id !== this.localId) p.updateRemote(this.level.solids);
    }

    this._sendTick=(this._sendTick||0)+1;
    if (lp) {
      const iv = this._sendInterval();
      if (this._sendTick % iv === 0) this.net.broadcast({ type:'player_update', ...lp.snap() });
    }

    this._updateHUD();
    this._updateBuildPanel();
    this._updateResultsPanel();
    if (this._sendTick%6===0) this._updatePlayerDots();
  }

  _sendInterval() {
    const lp = this.localPlayer;
    if (!lp) return 20;
    let minDist2 = Infinity;
    for (const p of Object.values(this.players)) {
      if (p.id === this.localId) continue;
      const dx = lp.x - p.x, dy = lp.y - p.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < minDist2) minDist2 = d2;
    }
    if (minDist2 < 150*150) return 3;   // nearly touching — 20 Hz
    if (minDist2 < 600*600) return 6;   // on screen together — 10 Hz
    return 20;                           // off screen — 3 Hz
  }

  _resolvePlayerCollisions() {
    const lp = this.localPlayer;
    if (!lp || lp.ghostMode || lp.state !== 'alive') return;
    for (const p of Object.values(this.players)) {
      if (p.id === this.localId || p.ghostMode || p.state !== 'alive') continue;
      if (!overlap(lp.x, lp.y, PW, PH, p.x, p.y, PW, PH)) continue;
      const olL = (lp.x+PW) - p.x;
      const olR = (p.x+PW) - lp.x;
      const olU = (lp.y+PH) - p.y;
      const olD = (p.y+PH) - lp.y;
      const minH = Math.min(olL, olR);
      const minV = Math.min(olU, olD);
      // Give vertical resolution a 6px bias so landing from above is reliable
      if (minV <= minH + 6) {
        if (olU < olD) {
          // Landing on top of a player
          lp.y -= olU;
          if (lp.vy >= 0) { lp.vy = 0; lp.onGround = true; }
        } else {
          // Bumping head on a player from below
          lp.y += olD;
          if (lp.vy < 0) lp.vy = 0;
        }
      } else {
        if (olL < olR) { lp.x -= olL; if (lp.vx > 0) lp.vx *= 0.3; }
        else           { lp.x += olR; if (lp.vx < 0) lp.vx *= 0.3; }
      }
    }
  }

  _handleInput() {
    const inp=this.input, lp=this.localPlayer;
    if (!lp) return;

    if (inp.jumpPressed && lp.state==='alive' && !lp.ghostMode) {
      lp._jbuf=JUMP_BUF;
    }
    if (inp.jumpPressed && lp.state==='dead' && lp.ghostMode && this.phase==='play') {
      lp._jbuf=JUMP_BUF;
    }

    if (inp.pressed('KeyR')) {
      if (this._canPlace()) {
        this.placement.rotate();
      } else if (this.isHost && this.phase==='results') {
        this._startNextRound();
      } else if (this.isHost && this.phase==='gameover') {
        this._returnToWaiting();
      }
    }
  }

  _render() {
    const { renderer: r, cam, vw, vh } = this;
    const ctx = r.ctx;

    // ── Screen-space background ──
    r.clear(vw, vh, cam.x);

    // ── World-space objects ──
    ctx.save();
    const localTeam = this.localPlayer?.team;
    ctx.scale(ZOOM, ZOOM);
    if (localTeam === 'blue' && this.phase !== 'waiting') {
      ctx.translate(WORLD_W - cam.x, -cam.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(-cam.x, -cam.y);
    }

    this.level.draw(ctx);

    // Draw cannon projectiles
    if (this.phase==='play') {
      ctx.fillStyle='#e74c3c';
      for (const p of this.level.projectilesAt(this._phaseTime)) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
    }

    const inPlay=this.phase==='play';
    Object.values(this.players)
      .filter(p=>p.id!==this.localId)
      .forEach(p=>p.draw(ctx, false, inPlay&&p.ghostMode));

    const lp=this.localPlayer;
    if (lp) {
      // Extrapolate horizontal position between physics ticks for smooth rendering
      const alpha = Math.min(this._acc / (1000/60), 1);
      lp._drawX = lp.x + lp.vx * alpha;
      lp.draw(ctx, true, inPlay&&lp.ghostMode);
      lp._drawX = null;
    }

    this.placement.drawGhost(ctx);

    ctx.restore();

    // ── Version watermark (screen-space) ──
    ctx.font='10px monospace'; ctx.textAlign='right';
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.fillText('v'+VERSION, vw-8, vh-8);

    // ── Screen-space HUD / overlays ──
    if (this.phase==='waiting') r.drawWaitingHUD(this);
  }
}

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', ()=>{ window._game=new Game(); });
