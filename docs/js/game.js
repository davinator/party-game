'use strict';

// ─────────────────────────────────────────────
//  WORLD CONSTANTS  (game-logic space)
// ─────────────────────────────────────────────
const WORLD_W = 3200, WORLD_H = 720;
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

const BUILD_TIME       = 30;
const PLAY_TIME        = 120;
const RESULTS_TIME     = 8;
const BUILD_PLACEMENTS = 2;

const CAM_LERP = 0.1; // camera smoothing (lower = smoother/slower)

const TEAM = {
  red:  { primary: '#c0392b', light: '#ff6b6b', name: 'Red Team'  },
  blue: { primary: '#2471a3', light: '#74b9ff', name: 'Blue Team' },
};

const OBJ = {
  platform: { w: 128, h: 20, label: 'Platform', key: '1' },
  spike:    { w: 32,  h: 24, label: 'Spike',    key: '2' },
  spring:   { w: 48,  h: 16, label: 'Spring',   key: '3' },
};

const PALETTE = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71',
  '#1abc9c','#3498db','#9b59b6','#e91e63',
];

// ─────────────────────────────────────────────
//  BASE LEVEL  (wider world, more platforms)
// ─────────────────────────────────────────────
const BASE_LEVEL = [
  { id:'bl_start', type:'platform',   x:40,   y:610, w:240, h:22, permanent:true },
  { id:'bl_m1',    type:'platform',   x:480,  y:530, w:160, h:22, permanent:true },
  { id:'bl_m2',    type:'platform',   x:900,  y:480, w:160, h:22, permanent:true },
  { id:'bl_m3',    type:'platform',   x:1350, y:540, w:160, h:22, permanent:true },
  { id:'bl_m4',    type:'platform',   x:1800, y:460, w:160, h:22, permanent:true },
  { id:'bl_m5',    type:'platform',   x:2250, y:510, w:160, h:22, permanent:true },
  { id:'bl_m6',    type:'platform',   x:2680, y:470, w:160, h:22, permanent:true },
  { id:'bl_end',   type:'platform',   x:2900, y:570, w:240, h:22, permanent:true },
  { id:'bl_sz',    type:'start_zone', x:58,   y:580, w:190, h:30 },
  { id:'bl_ez',    type:'end_zone',   x:2920, y:540, w:190, h:30 },
];

// ─────────────────────────────────────────────
//  WAITING ROOM LEVEL
// ─────────────────────────────────────────────
const WAITING_LEVEL = [
  // Full-width floor — falling is impossible
  { id:'wf',   type:'platform', x:0,    y:640, w:WORLD_W, h:80, permanent:true },
  // Left beginner section
  { id:'wp1',  type:'platform', x:180,  y:540, w:180, h:20, permanent:true },
  { id:'wp2',  type:'platform', x:460,  y:460, w:140, h:20, permanent:true },
  { id:'wp3',  type:'platform', x:720,  y:380, w:120, h:20, permanent:true },
  { id:'wp4',  type:'platform', x:960,  y:460, w:160, h:20, permanent:true },
  // Staircase section
  { id:'ws1',  type:'platform', x:1200, y:560, w:110, h:20, permanent:true },
  { id:'ws2',  type:'platform', x:1360, y:480, w:110, h:20, permanent:true },
  { id:'ws3',  type:'platform', x:1520, y:400, w:110, h:20, permanent:true },
  { id:'ws4',  type:'platform', x:1680, y:320, w:110, h:20, permanent:true },
  // Wide landing
  { id:'wp5',  type:'platform', x:1900, y:490, w:280, h:20, permanent:true },
  // Right section
  { id:'wp6',  type:'platform', x:2280, y:410, w:180, h:20, permanent:true },
  { id:'wp7',  type:'platform', x:2560, y:510, w:160, h:20, permanent:true },
  { id:'wp8',  type:'platform', x:2820, y:430, w:200, h:20, permanent:true },
  // Springs for fun
  { id:'wsp1', type:'spring', x:370,  y:624, w:48, h:16, permanent:true },
  { id:'wsp2', type:'spring', x:1820, y:624, w:48, h:16, permanent:true },
  { id:'wsp3', type:'spring', x:2480, y:624, w:48, h:16, permanent:true },
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

// ─────────────────────────────────────────────
//  INPUT  (screen-space mouse coords; camera offset applied by caller)
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
    this.rotation  = d.rotation || 0; // 0 | 90 | 180 | 270  (AABB w/h swapped at 90/270)
    this.permanent = !!d.permanent;
    this.placedBy  = d.placedBy || null;
    this.team      = d.team || null;
    this.solid     = d.type === 'platform';
    this.hazard    = d.type === 'spike';
    this.isSpring  = d.type === 'spring';
    this.isEnd     = d.type === 'end_zone';
  }

  toJSON() {
    return { id:this.id, type:this.type, x:this.x, y:this.y, w:this.w, h:this.h,
             rotation:this.rotation, permanent:this.permanent,
             placedBy:this.placedBy, team:this.team };
  }

  // Visual dimensions — inverse of the AABB swap applied at creation for 90°/270°
  get vw() { return (this.rotation===90||this.rotation===270) ? this.h : this.w; }
  get vh() { return (this.rotation===90||this.rotation===270) ? this.w : this.h; }

  draw(ctx) {
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

  _drawAt(ctx, x, y, w, h) {
    switch(this.type) {
      case 'platform':   this._dPlat(ctx,x,y,w,h);  break;
      case 'spike':      this._dSpike(ctx,x,y,w,h); break;
      case 'spring':     this._dSpring(ctx,x,y,w,h);break;
      case 'start_zone': this._dZone(ctx,x,y,w,h,'#2ecc71','START');  break;
      case 'end_zone':   this._dZone(ctx,x,y,w,h,'#f1c40f','FINISH'); break;
    }
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
    const tc = this.team ? TEAM[this.team] : null;
    ctx.fillStyle='#444';
    ctx.fillRect(x, y+h-5, w, 5);
    ctx.fillStyle = tc ? tc.light : '#bdc3c7';
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
    const tc = this.team ? TEAM[this.team] : null;
    ctx.fillStyle='#444'; ctx.fillRect(x, y+h-5, w, 5);
    ctx.fillStyle = tc ? tc.primary : '#e67e22';
    ctx.fillRect(x+4, y+4, w-8, h-9);
    ctx.fillStyle='#f39c12'; ctx.fillRect(x+4, y, w-8, 5);
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
    for (let i=1;i<3;i++) {
      const ly = y+4+i*((h-9)/3);
      ctx.beginPath(); ctx.moveTo(x+4,ly); ctx.lineTo(x+w-4,ly); ctx.stroke();
    }
  }

  _dZone(ctx, x, y, w, h, color, label) {
    ctx.fillStyle=color+'28'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([6,3]);
    ctx.strokeRect(x+1,y+1,w-2,h-2); ctx.setLineDash([]);
    ctx.fillStyle=color; ctx.font='bold 11px monospace'; ctx.textAlign='center';
    ctx.fillText(label, x+w/2, y+h/2+4);
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

  get solids()  { return this.objects.filter(o=>o.solid); }
  get hazards() { return this.objects.filter(o=>o.hazard); }
  get springs() { return this.objects.filter(o=>o.isSpring); }
  get endZone() { return this.objects.find(o=>o.isEnd); }

  startPos() {
    const sz = this.objects.find(o=>o.type==='start_zone');
    if (!sz) return { x:80, y:560 };
    return { x: sz.x + sz.w/2 - PW/2, y: sz.y - PH - 4 };
  }

  serialize() { return this.objects.filter(o=>!o.permanent).map(o=>o.toJSON()); }
  load(arr)   { this.reset(); arr.forEach(o=>this.add(o)); }
  draw(ctx)   { this.objects.forEach(o=>o.draw(ctx)); }
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
  }

  spawn(x,y) {
    this.x=x; this.y=y; this.vx=0; this.vy=0;
    this.onGround=false; this.state='alive';
    this._coyote=0; this._jbuf=0; this.ghostMode=false;
  }

  updateLocal(inp, level, placementActive=false) {
    if (this.state==='finished') return null;

    if (this.ghostMode) {
      if (!placementActive) {
        const spd=5;
        if (inp.left)  this.x-=spd;
        if (inp.right) this.x+=spd;
        if (inp.up)    this.y-=spd;
        if (inp.down)  this.y+=spd;
        if (inp.left)  this.facing=-1;
        if (inp.right) this.facing=1;
      }
      this.vx=0; this.vy=0; this.onGround=false;
      return null;
    }

    const { solids, hazards, springs, endZone } = level;

    // Horizontal
    if (inp.left)  this.vx -= MOVE_ACCEL;
    if (inp.right) this.vx += MOVE_ACCEL;
    this.vx = clamp(this.vx, -MOVE_MAX, MOVE_MAX);
    if (!inp.left && !inp.right) {
      this.vx *= this.onGround ? FRICTION : AIR_FRIC;
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
    this._resolveY(solids);
    if (this.y < -WORLD_H) { this.y = -WORLD_H; if (this.vy < 0) this.vy = 0; }

    // Springs
    for (const s of springs) {
      if (this.vy>0 && overlap(this.x,this.y,PW,PH, s.x,s.y,s.w,s.h))
        this.vy=SPRING_VEL;
    }

    if (this.onGround && Math.abs(this.vx)>0.4) this.walk+=0.28;

    // Death / finish
    for (const hz of hazards) {
      if (overlap(this.x+3,this.y+3,PW-6,PH-6, hz.x,hz.y,hz.w,hz.h)) return 'died';
    }
    if (this.y>DEATH_Y) return 'died';
    if (endZone && overlap(this.x,this.y,PW,PH, endZone.x,endZone.y,endZone.w,endZone.h)) return 'finished';

    return null;
  }

  _resolveX(solids) {
    for (const o of solids) {
      if (!overlap(this.x,this.y,PW,PH, o.x,o.y,o.w,o.h)) continue;
      const ol=(this.x+PW)-o.x, or2=(o.x+o.w)-this.x;
      if (ol<or2) { this.x-=ol; this.vx=0; } else { this.x+=or2; this.vx=0; }
    }
  }
  _resolveY(solids) {
    for (const o of solids) {
      if (!overlap(this.x,this.y,PW,PH, o.x,o.y,o.w,o.h)) continue;
      const ot=(this.y+PH)-o.y, ob=(o.y+o.h)-this.y;
      if (ot<ob) { this.y-=ot; if(this.vy>0){this.vy=0; this.onGround=true;} }
      else       { this.y+=ob; if(this.vy<0) this.vy=0; }
    }
  }

  applyRemote(d) {
    const dx=d.x-this.x, dy=d.y-this.y;
    if (dx*dx+dy*dy>250*250) { this.x=d.x; this.y=d.y; }
    else { this.x=lerp(this.x,d.x,.28); this.y=lerp(this.y,d.y,.28); }
    this.vx=d.vx; this.vy=d.vy; this.facing=d.facing;
    this.onGround=d.onGround; this.state=d.state;
    this.walk=d.walk; this.ghostMode=d.ghostMode;
  }

  snap() {
    return { x:this.x, y:this.y, vx:this.vx, vy:this.vy,
             facing:this.facing, onGround:this.onGround,
             state:this.state, walk:this.walk, ghostMode:this.ghostMode };
  }

  draw(ctx, isLocal, asGhost=false) {
    const x=Math.round(this.x), y=Math.round(this.y);
    const tc=TEAM[this.team];
    ctx.globalAlpha = asGhost ? 0.38 : 1;

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

    ctx.globalAlpha=1;

    if (this.state==='finished') {
      ctx.fillStyle='#f1c40f'; ctx.font='18px serif'; ctx.textAlign='center';
      ctx.fillText('★', x+PW/2, y-5);
    }

    ctx.font='bold 10px monospace'; ctx.textAlign='center';
    const nm = this.name+(isLocal?' (you)':'');
    const nw = ctx.measureText(nm).width+8;
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(x+PW/2-nw/2, y-20, nw, 14);
    ctx.fillStyle=tc.light;
    ctx.fillText(nm, x+PW/2, y-9);

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
    this.cx=0; this.cy=0; // world-space cursor centre
  }

  open(team, wx, wy) {
    this.active=true; this.team=team;
    this.cx=wx; this.cy=wy;
    // keep type & rotation from previous placement for convenience
  }
  close() { this.active=false; }

  // Cursor grid position (top-left of ghost object)
  get gx() { const d=this._def(); return snap(this.cx - d.w/2); }
  get gy() { const d=this._def(); return snap(this.cy - d.h/2); }

  _def() {
    const base = OBJ[this.type];
    const rot  = this.rotation;
    return (rot===90||rot===270)
      ? { w:base.h, h:base.w }
      : { w:base.w, h:base.h };
  }

  update(inp) {
    if (!this.active) return;
    const spd=6;
    if (inp.left  || inp.k.ArrowLeft)  this.cx -= spd;
    if (inp.right || inp.k.ArrowRight) this.cx += spd;
    if (inp.up    || inp.k.ArrowUp)    this.cy -= spd;
    if (inp.down  || inp.k.ArrowDown)  this.cy += spd;
    if (inp.pressed('Digit1')) this.type='platform';
    if (inp.pressed('Digit2')) this.type='spike';
    if (inp.pressed('Digit3')) this.type='spring';
    if (inp.pressed('KeyR'))   this.rotation=(this.rotation+90)%360;
    if (inp.pressed('Escape')) this.close();
  }

  build(placedBy) {
    const def=this._def();
    const base=OBJ[this.type];
    // For 90/270 the AABB dimensions are already swapped in _def(); store
    // original visual dims via rotation so draw() can unswap them.
    return { id:uid(), type:this.type,
             x:this.gx, y:this.gy, w:def.w, h:def.h,
             rotation:this.rotation, team:this.team, placedBy, permanent:false };
  }

  // Called inside camera transform (world space)
  drawGhost(ctx) {
    if (!this.active) return;
    const def=this._def();
    const ghost=new GO({ id:'g', type:this.type,
                         x:this.gx, y:this.gy, w:def.w, h:def.h,
                         rotation:this.rotation, team:this.team });
    ctx.globalAlpha=0.5; ghost.draw(ctx); ctx.globalAlpha=1;
    ctx.strokeStyle='#f1c40f'; ctx.lineWidth=2;
    ctx.strokeRect(this.gx, this.gy, def.w, def.h);
  }

  // Called in screen space — toolbar at bottom of viewport
  drawBar(ctx, vw, vh) {
    if (!this.active) return;
    const types=Object.keys(OBJ);
    const bw=150, bh=38, gap=8;
    const total=types.length*(bw+gap)-gap;
    const bx0=(vw-total)/2, by=vh-56;

    ctx.fillStyle='rgba(0,0,0,.85)';
    ctx.fillRect(bx0-12, by-42, total+24, 100);
    ctx.fillStyle='#f1c40f'; ctx.font='12px monospace'; ctx.textAlign='center';
    ctx.fillText(
      `WASD/Arrows to move  ·  [R] Rotate (${this.rotation}°)  ·  [Space] Place  ·  [Esc] Cancel`,
      vw/2, by-26);
    ctx.fillStyle='#aaa';
    ctx.fillText('[1] Platform  [2] Spike  [3] Spring', vw/2, by-10);

    types.forEach((t,i) => {
      const tx=bx0+i*(bw+gap);
      const active=t===this.type;
      ctx.fillStyle=active ? '#f1c40f' : 'rgba(255,255,255,0.1)';
      ctx.fillRect(tx,by,bw,bh);
      ctx.fillStyle=active ? '#000' : '#ddd';
      ctx.font='bold 13px monospace'; ctx.textAlign='center';
      ctx.fillText(`[${OBJ[t].key}] ${OBJ[t].label}`, tx+bw/2, by+bh/2+5);
    });
  }
}

// ─────────────────────────────────────────────
//  NETWORK
// ─────────────────────────────────────────────
class Net {
  constructor() { this.ws=null; this.handlers={}; this.playerId=null; this.connected=false; }

  connect(url, playerId, roomId, info) {
    this.playerId=playerId;
    return new Promise((resolve,reject) => {
      this.ws=new WebSocket(url);
      this.ws.onopen=()=>{ this.connected=true; this._send({type:'join',playerId,roomId,...info}); resolve(); };
      this.ws.onerror=e=>reject(e);
      this.ws.onclose=()=>{ this.connected=false; this._emit('disconnected',{}); };
      this.ws.onmessage=e=>{ let m; try{m=JSON.parse(e.data);}catch{return;} this._emit(m.type,m); };
    });
  }

  _send(msg) { if (this.ws&&this.ws.readyState===WebSocket.OPEN) this.ws.send(JSON.stringify(msg)); }
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
    const g=c.createLinearGradient(0,0,0,vh);
    g.addColorStop(0,'#0d0d1a'); g.addColorStop(1,'#131328');
    c.fillStyle=g; c.fillRect(0,0,vw,vh);
    // Parallax stars — offset slowly with camera
    c.fillStyle='rgba(255,255,255,0.45)';
    const sx = camX * 0.08; // parallax factor
    for (let i=0;i<80;i++) {
      const px = ((i*173.7 - sx) % vw + vw) % vw;
      const py = (i*97.3) % (vh*0.75);
      c.fillRect(px|0, py|0, 1, 1);
    }
    // Death-zone gradient hint (world-space-ish, always at screen bottom)
    c.fillStyle='rgba(200,0,0,0.07)';
    c.fillRect(0, vh-40, vw, 40);
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
    c.fillStyle=TEAM.red.light;  c.textAlign='left';  c.fillText(`🔴 ${TEAM.red.name}: ${scores.red}`,  18, 30);
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

    ['red','blue'].forEach((t,i) => {
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

    this.phase    = 'lobby';
    this.timer    = 0;
    this.scores   = { red:0, blue:0 };
    this.round    = 1;

    // Viewport & camera (screen-space)
    this.vw  = window.innerWidth;
    this.vh  = window.innerHeight;
    this.cam = { x:0, y:0 };

    this._lastTick    = 0;
    this._acc         = 0;
    this._loopStarted = false;

    this._resize();
    window.addEventListener('resize', ()=>this._resize());
    this._setupLobby();
  }

  get localPlayer() { return this.players[this.localId]; }

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
    const tx = clamp(lp.x + PW/2 - this.vw/2, 0, Math.max(0, WORLD_W - this.vw));
    const ty = clamp(lp.y + PH/2 - this.vh/2, 0, Math.max(0, WORLD_H - this.vh));
    this.cam.x = lerp(this.cam.x, tx, CAM_LERP);
    this.cam.y = lerp(this.cam.y, ty, CAM_LERP);
  }

  // ── LOBBY ──
  _setupLobby() {
    let selectedTeam='red';
    document.querySelectorAll('.team-btn').forEach(btn => {
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.team-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); selectedTeam=btn.dataset.team;
      });
    });
    document.querySelector('[data-team="red"]').classList.add('active');

    document.getElementById('join-btn').addEventListener('click', ()=>{
      const name   = (document.getElementById('player-name').value||'').trim()||'Player';
      const room   = (document.getElementById('room-code').value||'').trim()||'default';
      const server = (document.getElementById('server-addr').value||'').trim()||'localhost:8080';
      this._join(`ws://${server}`, room, name, selectedTeam);
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
      this.scores=msg.scores; this.round=msg.round;
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
        scores:this.scores, round:this.round, players:pArr,
      });
    });

    net.on('phase_change', msg=>{
      if (msg.from===this.localId) return;
      this._applyPhase(msg.newPhase, msg.timer);
    });

    net.on('player_update', msg=>{
      const p=this.players[msg.from];
      if (p&&msg.from!==this.localId) p.applyRemote(msg);
    });

    net.on('place_object', msg=>{ this.level.add(msg.obj); });

    net.on('player_event', msg=>{
      const p=this.players[msg.playerId]; if (!p) return;
      if (msg.event==='died')     { p.state='dead';     p.ghostMode=true;  }
      if (msg.event==='finished') { p.state='finished'; p.ghostMode=false; }
    });

    net.on('player_left', msg=>{
      delete this.players[msg.playerId]; this._refreshLobbyList();
    });

    net.on('promoted_to_host', ()=>{
      this.isHost=true;
      if (this.phase==='lobby') document.getElementById('start-btn').style.display='block';
    });

    net.on('disconnected', ()=>alert('Disconnected from server.'));
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
  }

  // ── PHASES ──
  _hostStartBuild() {
    this._applyPhase('build', BUILD_TIME);
    this.net.broadcast({ type:'phase_change', newPhase:'build', timer:BUILD_TIME });
  }

  _applyPhase(phase, timer) {
    this.phase=phase; this.timer=timer;

    if (phase==='build') {
      this.level.reset();
      this._enterGame();
      this._spawnPlayers();
      Object.values(this.players).forEach(p=>{
        p.state='alive'; p.placementsLeft=BUILD_PLACEMENTS; p.ghostMode=true;
      });
    }
    if (phase==='play') {
      this._spawnPlayers();
      Object.values(this.players).forEach(p=>{
        p.state='alive'; p.placementsLeft=0; p.ghostMode=false;
      });
      this.placement.close();
    }
    if (phase==='results') {
      this._tallyScores(); this.placement.close();
      Object.values(this.players).forEach(p=>{ p.ghostMode=false; });
    }
  }

  _enterWaiting() {
    this.phase = 'waiting';
    this.level.objects = WAITING_LEVEL.map(o => new GO({...o}));
    // Spawn local player near the left side
    const lp = this.localPlayer;
    if (lp) {
      lp.spawn(300, 580);
      this.cam.x = 0; this.cam.y = 0;
    }
    // Show canvas, shrink overlay to corner panel
    this.canvas.style.display = 'block';
    const ov = document.getElementById('overlay');
    ov.classList.add('compact');
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
    // Sort by ID so every client assigns the same spawn slot to the same player
    const pArr=Object.values(this.players).sort((a,b)=>a.id<b.id?-1:1);
    pArr.forEach((p,i)=>p.spawn(sp.x+i*(PW+20), sp.y));
    // Point camera immediately at local player (no lerp lag on spawn)
    const lp=this.localPlayer;
    if (lp) {
      this.cam.x = clamp(lp.x+PW/2-this.vw/2, 0, Math.max(0,WORLD_W-this.vw));
      this.cam.y = clamp(lp.y+PH/2-this.vh/2, 0, Math.max(0,WORLD_H-this.vh));
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
      const lp = this.localPlayer;
      if (lp) lp.updateLocal(this.input, this.level, this.placement.active);
      this._sendTick = (this._sendTick||0) + 1;
      if (this._sendTick%3===0 && lp) {
        this.net.broadcast({ type:'player_update', ...lp.snap() });
      }
      return;
    }

    if (this.timer>0) {
      this.timer-=1/60;
      if (this.timer<0) this.timer=0;
    }

    if (this.timer===0 && this.isHost) {
      if (this.phase==='build') {
        this._applyPhase('play', PLAY_TIME);
        this.net.broadcast({ type:'phase_change', newPhase:'play', timer:PLAY_TIME });
      } else if (this.phase==='play') {
        this._applyPhase('results', RESULTS_TIME);
        this.net.broadcast({ type:'phase_change', newPhase:'results', timer:RESULTS_TIME });
      }
    }

    if (this.phase==='results') return;

    const lp=this.localPlayer;
    if (lp) {
      const evt=lp.updateLocal(this.input, this.level, this.placement.active);

      this._resolvePlayerCollisions();

      if (evt==='died' && lp.state==='alive') {
        lp.state='dead'; lp.ghostMode=true; this.placement.close();
        this.net.broadcast({ type:'player_event', playerId:this.localId, event:'died' });
      }
      if (evt==='finished' && lp.state==='alive') {
        lp.state='finished'; lp.ghostMode=false; this.placement.close();
        this.net.broadcast({ type:'player_event', playerId:this.localId, event:'finished' });
      }

      if (this.isHost && this.phase==='play') {
        const alive=Object.values(this.players).filter(p=>p.state==='alive');
        if (alive.length===0) {
          this._applyPhase('results', RESULTS_TIME);
          this.net.broadcast({ type:'phase_change', newPhase:'results', timer:RESULTS_TIME });
        }
      }
    }

    this._sendTick=(this._sendTick||0)+1;
    if (this._sendTick%3===0 && lp) {
      this.net.broadcast({ type:'player_update', ...lp.snap() });
    }
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
      const min = Math.min(olL, olR, olU, olD);
      if      (min === olL) { lp.x -= olL; if (lp.vx > 0) lp.vx *= 0.3; }
      else if (min === olR) { lp.x += olR; if (lp.vx < 0) lp.vx *= 0.3; }
      else if (min === olU) { lp.y -= olU; if (lp.vy > 0) { lp.vy = 0; lp.onGround = true; } }
      else                  { lp.y += olD; if (lp.vy < 0) lp.vy = 0; }
    }
  }

  _handleInput() {
    const inp=this.input, lp=this.localPlayer;
    if (!lp) return;

    if (inp.jumpPressed && lp.state==='alive' && !lp.ghostMode) {
      lp._jbuf=JUMP_BUF;
    }

    if (inp.pressed('KeyE')) {
      if (!this.placement.active) {
        const canPlace =
          (this.phase==='build' && lp.placementsLeft>0) ||
          (this.phase==='play'  && lp.state==='dead');
        if (canPlace) this.placement.open(lp.team, lp.x+PW/2, lp.y+PH/2);
      } else {
        this.placement.close();
      }
    }

    this.placement.update(inp);

    if (this.placement.active && inp.pressed('Space')) {
      const obj=this.placement.build(this.localId);
      this.level.add(obj);
      this.net.broadcast({ type:'place_object', obj });
      this.placement.close();
      if (this.phase==='build') lp.placementsLeft--;
    }

    if (this.isHost && this.phase==='results' && inp.pressed('KeyR')) {
      this.round++;
      this._applyPhase('build', BUILD_TIME);
      this.net.broadcast({ type:'phase_change', newPhase:'build', timer:BUILD_TIME });
    }
  }

  _render() {
    const { renderer: r, cam, vw, vh } = this;
    const ctx = r.ctx;

    // ── Screen-space background ──
    r.clear(vw, vh, cam.x);

    // ── World-space objects ──
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    this.level.draw(ctx);

    const inPlay=this.phase==='play';
    Object.values(this.players)
      .filter(p=>p.id!==this.localId)
      .forEach(p=>p.draw(ctx, false, inPlay&&p.ghostMode));

    const lp=this.localPlayer;
    if (lp) lp.draw(ctx, true, inPlay&&lp.ghostMode);

    this.placement.drawGhost(ctx);

    ctx.restore();

    // ── Screen-space HUD / overlays ──
    this.placement.drawBar(ctx, vw, vh);
    if (this.phase==='waiting') {
      r.drawWaitingHUD(this);
    } else {
      r.drawHUD(this);
      r.drawDeathPrompt(this);
      if (this.phase==='results') r.drawResults(this);
    }
  }
}

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', ()=>{ window._game=new Game(); });
