'use strict';
/* Canvas mínimo em software para rodar o jogo no Node (testes e prévias).
   Implementa só o que o jogo usa: fillRect, drawImage, image data,
   globalAlpha, save/restore/translate. Exporta PNG via zlib. */
const zlib = require('zlib');
const fs = require('fs');

function parseColor(s) {
  if (!s) return [0, 0, 0, 255];
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 255];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), h.length >= 8 ? parseInt(h.substr(6, 2), 16) : 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(v => parseFloat(v));
    return [p[0], p[1], p[2], p.length > 3 ? Math.round(p[3] * 255) : 255];
  }
  return [255, 0, 255, 255];
}

class Ctx {
  constructor(cv) {
    this.canvas = cv; this.fillStyle = '#000'; this.globalAlpha = 1;
    this.tx = 0; this.ty = 0; this.stack = []; this.imageSmoothingEnabled = false;
    this.globalCompositeOperation = 'source-over';
  }
  save() { this.stack.push([this.tx, this.ty, this.globalAlpha, this.fillStyle]); }
  restore() { const s = this.stack.pop(); if (s) [this.tx, this.ty, this.globalAlpha, this.fillStyle] = s; }
  translate(x, y) { this.tx += x; this.ty += y; }
  setTransform() { this.tx = 0; this.ty = 0; }
  _blend(i, r, g, b, a) {
    const d = this.canvas.data;
    a = (a / 255) * this.globalAlpha;
    if (a >= 0.999) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return; }
    if (a <= 0) return;
    d[i] = d[i] * (1 - a) + r * a; d[i + 1] = d[i + 1] * (1 - a) + g * a; d[i + 2] = d[i + 2] * (1 - a) + b * a;
    d[i + 3] = Math.max(d[i + 3], a * 255);
  }
  fillRect(x, y, w, h) {
    const [r, g, b, a] = parseColor(this.fillStyle);
    const W = this.canvas.width, H = this.canvas.height;
    let x0 = Math.round(x + this.tx), y0 = Math.round(y + this.ty), x1 = Math.round(x + this.tx + w), y1 = Math.round(y + this.ty + h);
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this._blend((yy * W + xx) * 4, r, g, b, a);
  }
  clearRect(x, y, w, h) {
    const W = this.canvas.width, H = this.canvas.height, d = this.canvas.data;
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) d.fill(0, (yy * W + xx) * 4, (yy * W + xx) * 4 + 4);
  }
  drawImage(img, a, b, c, d, e, f, g, h) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (e === undefined) { dx = a; dy = b; dw = c === undefined ? sw : c; dh = d === undefined ? sh : d; }
    else { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
    if (!img.data) return;
    dx = Math.round(dx + this.tx); dy = Math.round(dy + this.ty); dw = Math.round(dw); dh = Math.round(dh);
    const W = this.canvas.width, H = this.canvas.height, sd = img.data;
    for (let yy = 0; yy < dh; yy++) {
      const ty = dy + yy; if (ty < 0 || ty >= H) continue;
      const syy = Math.floor(sy + (yy + 0.5) * sh / dh); if (syy < 0 || syy >= img.height) continue;
      for (let xx = 0; xx < dw; xx++) {
        const tx = dx + xx; if (tx < 0 || tx >= W) continue;
        const sxx = Math.floor(sx + (xx + 0.5) * sw / dw); if (sxx < 0 || sxx >= img.width) continue;
        const si = (syy * img.width + sxx) * 4;
        if (sd[si + 3] === 0) continue;
        this._blend((ty * W + tx) * 4, sd[si], sd[si + 1], sd[si + 2], sd[si + 3]);
      }
    }
  }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  getImageData(x, y, w, h) {
    const out = this.createImageData(w, h), W = this.canvas.width;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const si = ((y + yy) * W + x + xx) * 4, di = (yy * w + xx) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = this.canvas.data[si + k] || 0;
    }
    return out;
  }
  putImageData(img, x, y) {
    const W = this.canvas.width;
    for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
      const ty = y + yy, tx = x + xx;
      if (tx < 0 || ty < 0 || tx >= W || ty >= this.canvas.height) continue;
      const si = (yy * img.width + xx) * 4, di = (ty * W + tx) * 4;
      for (let k = 0; k < 4; k++) this.canvas.data[di + k] = img.data[si + k];
    }
  }
  // não usados no jogo, mas existem para não quebrar
  beginPath() {} closePath() {} moveTo() {} lineTo() {} arc() {} fill() {} stroke() {} rect() {} clip() {}
  createLinearGradient() { return { addColorStop() {} }; }
  measureText() { return { width: 0 }; }
  fillText() {}
}

class SoftCanvas {
  constructor(w = 300, h = 150) { this._w = w; this._h = h; this.data = new Uint8ClampedArray(w * h * 4); this.style = {}; this._ctx = null; }
  get width() { return this._w; }
  set width(v) { this._w = v; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  get height() { return this._h; }
  set height(v) { this._h = v; this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return this._ctx || (this._ctx = new Ctx(this)); }
  addEventListener() {}
  toPNG() { return encodePNG(this._w, this._h, this.data); }
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function decodePNG(buf) {
  // decodificador simples (8 bits RGB/RGBA, sem entrelaçamento)
  let p = 8, w, h, ct, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8ClampedArray(w * h * 4);
  const stride = w * bpp; let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { const si = x * bpp, di = (y * w + x) * 4; out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]; out[di + 3] = bpp === 4 ? line[si + 3] : 255; }
    prev = line;
  }
  return { width: w, height: h, data: out };
}

// prepara um "navegador" falso e carrega os scripts do jogo
function boot(root, files) {
  const vm = require('vm');
  const path = require('path');
  const screen = new SoftCanvas(256, 224);
  const elements = { screen };
  const store = {};
  global.window = global;
  global.document = {
    getElementById: id => elements[id] || (elements[id] = Object.assign(new SoftCanvas(1, 1), { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, hidden: true })),
    createElement: t => (t === 'canvas' ? new SoftCanvas() : { style: {}, click() {}, addEventListener() {}, setAttribute() {}, classList: { add() {}, remove() {} } }),
    addEventListener() {}, body: { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, appendChild() {} },
    visibilityState: 'visible', hidden: false,
  };
  global.window.addEventListener = () => {};
  global.window.innerWidth = 1024; global.window.innerHeight = 896;
  global.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  const def = (k, v) => Object.defineProperty(global, k, { value: v, writable: true, configurable: true });
  def('localStorage', { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } });
  def('navigator', { getGamepads: () => [], userAgent: 'node' });
  def('requestAnimationFrame', () => 0);
  global.Image = class { constructor() { this.width = 0; this.height = 0; this.data = null; } set src(v) { try { const im = decodePNG(fs.readFileSync(path.join(root, v))); Object.assign(this, im); this.complete = true; if (this.onload) setTimeout(() => this.onload(), 0); } catch (e) { if (this.onerror) this.onerror(e); } } };
  global.__NODE_TEST__ = true;
  for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
  return { screen };
}

module.exports = { SoftCanvas, encodePNG, decodePNG, boot };
