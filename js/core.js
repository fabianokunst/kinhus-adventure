'use strict';
/* =========================================================
   Kinhu's Adventure — núcleo: tela, utilidades, entrada,
   fonte bitmap e ferramentas de pixel art (Grid).
   ========================================================= */

const W = 256, H = 224, TS = 16;

const cv = document.getElementById('screen');
const ctx = cv.getContext('2d', { alpha: false });
cv.width = W; cv.height = H;
ctx.imageSmoothingEnabled = false;

/* ---------- utilidades ---------- */
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  sign: v => (v > 0 ? 1 : v < 0 ? -1 : 0),
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  overlap: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
  _rgb: new Map(),
  rgb(hex) {
    let v = U._rgb.get(hex);
    if (!v) {
      const h = hex.replace('#', '');
      v = [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
      U._rgb.set(hex, v);
    }
    return v;
  },
  hex(r, g, b) {
    const f = n => U.clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  },
  mix(c1, c2, t) {
    const a = U.rgb(c1), b = U.rgb(c2);
    return U.hex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  },
  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return { c, x };
  },
  // matriz de Bayer 4x4 para pontilhado (dither) estilo SNES
  bayer: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  dither: (x, y, t) => t * 16 > U.bayer[(y & 3) * 4 + (x & 3)] + 0.5,
};

/* ---------- ajuste da tela ao navegador ---------- */
function fitScreen() {
  const touch = document.body.classList.contains('touch');
  const vw = window.innerWidth, vh = window.innerHeight;
  const portrait = vh > vw;
  const availW = vw - 32, availH = touch ? (portrait ? vh - 270 : vh - 8) : vh - 56;
  let s = Math.min(availW / W, availH / H);
  if (s >= 2) s = Math.floor(s);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fitScreen);

/* ---------- entrada: teclado, controle e toque ---------- */
const Input = {
  keys: {}, hits: {}, touch: {}, cur: {}, prev: {},
  map: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyZ', 'KeyK', 'ArrowUp', 'KeyW'],
    run: ['KeyX', 'KeyJ', 'ShiftLeft', 'ShiftRight'],
    start: ['Enter', 'Escape', 'KeyP'],
    confirm: ['Enter', 'Space', 'KeyZ', 'KeyK'],
    back: ['Escape', 'Backspace', 'KeyX'],
    mute: ['KeyM'],
    full: ['KeyF'],
  },
  anyKey: false,
  init() {
    const block = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
    window.addEventListener('keydown', e => {
      if (block.has(e.code)) e.preventDefault();
      if (!e.repeat) { this.hits[e.code] = true; this.anyKey = true; }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
  },
  update() {
    this.prev = this.cur;
    const cur = {};
    for (const a in this.map) {
      cur[a] = this.map[a].some(k => this.keys[k]) || !!this.touch[a];
      cur[a + '!'] = this.map[a].some(k => this.hits[k]);
    }
    // controles (gamepad)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (b(14) || ax < -0.4) cur.left = true;
      if (b(15) || ax > 0.4) cur.right = true;
      if (b(12) || ay < -0.5) cur.up = true;
      if (b(13) || ay > 0.5) cur.down = true;
      if (b(0) || b(3)) { cur.jump = true; cur.confirm = true; }
      if (b(1) || b(2)) { cur.run = true; }
      if (b(1)) cur.back = true;
      if (b(9)) cur.start = true;
      if (Object.keys(cur).some(k => cur[k])) this.anyKey = this.anyKey || gp.buttons.some(x => x.pressed);
    }
    this.cur = cur;
    this.hits = {};
  },
  down(a) { return !!this.cur[a]; },
  pressed(a) { return (!!this.cur[a] && !this.prev[a]) || !!this.cur[a + '!']; },
  // esquece toques "apertados" pendentes, mas mantém o que está sendo segurado
  clear() { this.hits = {}; this.prev = Object.assign({}, this.cur); for (const k in this.cur) if (k.endsWith('!')) this.cur[k] = false; },
};

/* ---------- fonte bitmap 5x7 com acentos ---------- */
const Font = {
  g: {
    'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], 'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E], 'D': [0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C],
    'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F], 'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F], 'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E], 'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], 'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11], 'N': [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D], 'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E], 'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A], 'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    'Y': [0x11, 0x11, 0x11, 0x0A, 0x04, 0x04, 0x04], 'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F], '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 0x0C, 0x0C], ',': [0, 0, 0, 0, 0x0C, 0x04, 0x08],
    '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04], '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
    "'": [0x04, 0x04, 0x08, 0, 0, 0, 0], '"': [0x0A, 0x0A, 0, 0, 0, 0, 0],
    ':': [0, 0x0C, 0x0C, 0, 0x0C, 0x0C, 0], ';': [0, 0x0C, 0x0C, 0, 0x0C, 0x04, 0x08],
    '-': [0, 0, 0, 0x1F, 0, 0, 0], '_': [0, 0, 0, 0, 0, 0, 0x1F], '+': [0, 0x04, 0x04, 0x1F, 0x04, 0x04, 0],
    '=': [0, 0, 0x1F, 0, 0x1F, 0, 0], '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02], '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
    '×': [0, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0], '$': [0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04],
    '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03], '#': [0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A],
    '♥': [0, 0x0A, 0x1F, 0x1F, 0x0E, 0x04, 0], '★': [0x04, 0x04, 0x1F, 0x0E, 0x0E, 0x1B, 0x11],
    '►': [0x10, 0x18, 0x1C, 0x1E, 0x1C, 0x18, 0x10], '◄': [0x01, 0x03, 0x07, 0x0F, 0x07, 0x03, 0x01],
    '▲': [0, 0x04, 0x0E, 0x1F, 0, 0, 0], '▼': [0, 0, 0x1F, 0x0E, 0x04, 0, 0],
    '♪': [0x06, 0x05, 0x04, 0x04, 0x1C, 0x1C, 0x18], '@': [0x0E, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0E],
  },
  marks: {
    '́': [[3, -3], [2, -2]], // agudo
    '̀': [[1, -3], [2, -2]], // grave
    '̂': [[1, -2], [2, -3], [3, -2]], // circunflexo
    '̃': [[1, -3], [2, -3], [4, -3], [0, -2], [3, -2]], // til
    '̧': [[2, 7], [1, 8]], // cedilha
    '̈': [[1, -2], [3, -2]], // trema
  },
  cache: new Map(),
  split(str) {
    // separa letra base + acentos
    const out = [];
    for (const ch of String(str).toUpperCase()) {
      const n = ch.normalize('NFD');
      out.push({ b: n[0], m: n.slice(1) });
    }
    return out;
  },
  glyph(b, m, color) {
    const key = b + m + color;
    let c = this.cache.get(key);
    if (c) return c;
    const cv = U.canvas(5, 12);
    cv.x.fillStyle = color;
    const rows = this.g[b] || this.g['?'];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) cv.x.fillRect(x, y + 3, 1, 1);
    for (const mk of m) {
      const pts = this.marks[mk];
      if (pts) for (const [x, y] of pts) cv.x.fillRect(x, y + 3, 1, 1);
    }
    this.cache.set(key, cv.c);
    return cv.c;
  },
  width(str) { const n = this.split(str).length; return n ? n * 6 - 1 : 0; },
  draw(str, x, y, color = '#ffffff', o = {}) {
    const g = this.split(str);
    const sc = o.scale || 1;
    let w = (g.length ? g.length * 6 - 1 : 0) * sc;
    if (o.align === 'center') x -= Math.floor(w / 2);
    else if (o.align === 'right') x -= w;
    x = Math.round(x); y = Math.round(y);
    const shadow = o.shadow === undefined ? '#101020' : o.shadow;
    const passes = [];
    if (shadow) {
      if (o.outline) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) passes.push([dx, dy, shadow]);
      } else passes.push([1, 1, shadow]);
    }
    passes.push([0, 0, color]);
    const c = o.ctx || ctx;
    for (const [dx, dy, col] of passes) {
      let cx = x;
      for (const { b, m } of g) {
        if (b !== ' ') {
          const gl = this.glyph(b, m, col);
          c.drawImage(gl, 0, 0, 5, 12, cx + dx * sc, y - 3 * sc + dy * sc, 5 * sc, 12 * sc);
        }
        cx += 6 * sc;
      }
    }
    return w;
  },
};

/* ---------- Grid: pixel art desenhada por código ---------- */
class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  static rows(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const g = new Grid(w, h);
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (c) g.d[y * w + x] = c; }
    });
    return g;
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, typeof c === 'function' ? c(i, j) : c); return this; }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          const c = typeof col === 'function' ? col(nx, ny, x, y) : col;
          if (c) this.set(x, y, c);
        }
      }
    }
    return this;
  }
  poly(pts, col) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof col === 'function' ? col(x, y) : col);
      }
    }
    return this;
  }
  outline(c, diag = false) {
    const m = this.d.slice(), w = this.w, h = this.h;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] !== null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (m[y * w + x] !== null) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) ||
        (diag && (on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1)))) this.d[y * w + x] = c;
    }
    return this;
  }
  clone() { const g = new Grid(this.w, this.h); g.d = this.d.slice(); return g; }
  flip() {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.d[y * this.w + x] = this.d[y * this.w + (this.w - 1 - x)];
    return g;
  }
  flipV() {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.d[y * this.w + x] = this.d[(this.h - 1 - y) * this.w + x];
    return g;
  }
  swap(map) { const g = this.clone(); g.d = g.d.map(c => (c && map[c] !== undefined ? map[c] : c)); return g; }
  paste(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c) this.set(ox + x, oy + y, c); } return this; }
  shift(dx, dy) { const g = new Grid(this.w, this.h); g.paste(this, dx, dy); return g; }
  canvas() {
    const { c, x } = U.canvas(this.w, this.h);
    const img = x.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const col = this.d[i];
      if (!col) continue;
      if (col.length === 9) { // #rrggbbaa
        const [r, g, b] = U.rgb(col.slice(0, 7));
        img.data.set([r, g, b, parseInt(col.slice(7), 16)], i * 4);
      } else {
        const [r, g, b] = U.rgb(col);
        img.data.set([r, g, b, 255], i * 4);
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
}

// sprite com versões para direita e esquerda
function mkSprite(grid) { return { r: grid.canvas(), l: grid.flip().canvas(), w: grid.w, h: grid.h }; }
function drawSpr(s, x, y, left, c = ctx) { c.drawImage(left ? s.l : s.r, Math.round(x), Math.round(y)); }
