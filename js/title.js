'use strict';
/* =========================================================
   Tela de título: logo "KINHU'S ADVENTURE" em pixel art feito
   em código (letras grossas com relevo 3D) e uma cena animada:
   Kinhu correndo atrás do ônibus ao nascer do sol.
   ========================================================= */

const TitleArt = {
  built: false,

  // Máscara de texto grosso e arredondado a partir da fonte 5x7.
  // s = tamanho de cada "pixel da fonte"; pad = margem para contorno/relevo.
  bigMask(str, s, pad) {
    const glyphs = [...str.toUpperCase()].map(ch => {
      const rows = Font.g[ch] || Font.g[' '];
      let a = 5, b = -1;
      rows.forEach(r => { for (let c = 0; c < 5; c++) if (r & (16 >> c)) { a = Math.min(a, c); b = Math.max(b, c); } });
      if (b < 0) { a = 0; b = 1; }
      return { rows, a, b };
    });
    const fw = glyphs.reduce((n, g) => n + (g.b - g.a + 2), -1), fh = 7;
    const fm = new Uint8Array(fw * fh);
    let cx = 0;
    for (const g of glyphs) {
      for (let y = 0; y < 7; y++) for (let c = g.a; c <= g.b; c++) if (g.rows[y] & (16 >> c)) fm[y * fw + cx + c - g.a] = 1;
      cx += g.b - g.a + 2;
    }
    const F = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh && fm[y * fw + x] === 1;
    const m = new Grid(fw * s + pad * 2, fh * s + pad * 2);
    const ON = '#ffffff';
    // triângulo num canto de um bloco (cx/cy: 0 = esquerda/topo, 1 = direita/baixo)
    const tri = (bx, by, cxs, cys, n, col) => {
      const ox = pad + bx * s + (cxs ? s - 1 : 0), oy = pad + by * s + (cys ? s - 1 : 0);
      const sx = cxs ? -1 : 1, sy = cys ? -1 : 1;
      for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) m.set(ox + sx * i, oy + sy * j, col);
    };
    const r = Math.max(1, Math.floor(s / 2));
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (F(x, y)) m.rect(pad + x * s, pad + y * s, s, s, ON);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cxs = dx > 0 ? 1 : 0, cys = dy > 0 ? 1 : 0;
        if (F(x, y)) {
          // canto externo: arredonda
          if (!F(x + dx, y) && !F(x, y + dy) && !F(x + dx, y + dy)) tri(x, y, cxs, cys, r, null);
          // diagonal: engrossa a ligação entre blocos que só se tocam na quina
          if (F(x + dx, y + dy) && !F(x + dx, y) && !F(x, y + dy)) {
            tri(x + dx, y, 1 - cxs, cys, r + 1, ON);
            tri(x, y + dy, cxs, 1 - cys, r + 1, ON);
          }
        } else if (F(x + dx, y) && F(x, y + dy)) {
          // canto interno: suaviza
          tri(x, y, cxs, cys, Math.max(1, r - 1), ON);
        }
      }
    }
    m.textTop = pad; m.textH = fh * s;
    return m;
  },

  // Pinta a máscara: relevo 3D, degradê, brilho e contorno grosso.
  style(m, o) {
    const W2 = m.w, H2 = m.h, on = (x, y) => m.get(x, y) !== null;
    const g = new Grid(W2, H2);
    for (let k = o.ext.length; k >= 1; k--) {
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (on(x, y)) g.set(x + k, y + k, o.ext[k - 1]);
    }
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      if (!on(x, y)) continue;
      const t = U.clamp((y - m.textTop) / m.textH, 0, 0.999);
      const bands = o.fill;
      const f = t * bands.length;
      let i = Math.floor(f);
      const frac = f - i;
      if (frac > 0.72 && i < bands.length - 1 && U.dither(x, y, (frac - 0.72) / 0.28)) i++;
      let c = bands[i];
      if (!on(x, y - 1)) c = o.top;
      else if (!on(x, y - 2) && o.top2) c = o.top2;
      else if (!on(x, y + 1)) c = o.bottom;
      else if (!on(x - 1, y) && t < 0.6) c = o.left || c;
      g.set(x, y, c);
    }
    g.outline(o.line);
    if (o.line2) g.outline(o.line2, true);
    return g;
  },

  build() {
    if (this.built) return;
    this.built = true;
    // KINHU'S: laranja da camiseta do Kinhu, relevo marrom
    const kin = this.style(this.bigMask("KINHU'S", 5, 7), {
      fill: ['#fff1a8', '#ffd23e', '#ffa01e', '#f26a1c'],
      top: '#ffffff', top2: '#fffbe0', bottom: '#c2421a', left: '#fff6cc',
      ext: ['#b8401a', '#8a2a12', '#5a1a0c', '#3a1008'],
      line: '#1a0c16', line2: '#1a0c16',
    });
    this.kin = kin.canvas();
    this.kinMask = kin;
    // ADVENTURE: letras brancas numa faixa vermelha
    const adv = this.style(this.bigMask('ADVENTURE', 2, 3), {
      fill: ['#ffffff', '#f4f6ff', '#dfe8ff'],
      top: '#ffffff', bottom: '#a8bce8',
      ext: ['#3a2a6a'],
      line: '#14102e',
    });
    const rw = adv.w + 34, rh = 26;
    const rb = new Grid(rw, rh);
    // pontas dobradas da faixa
    for (const side of [0, 1]) {
      for (let y = 6; y < rh - 1; y++) for (let x = 0; x < 16; x++) {
        const notch = Math.abs(y - (6 + (rh - 7) / 2)) * 0.55;
        if (x < 7 - notch) continue;
        rb.set(side ? rw - 1 - x : x, y, y < 8 ? '#e85a5a' : '#b81e32');
      }
      for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) if (x <= y * 0.7) rb.set(side ? rw - 16 - x : 15 + x, rh - 2 - y, '#5e0a1a');
    }
    rb.rect(12, 0, rw - 24, rh - 6, '#e2303e');
    rb.rect(12, 0, rw - 24, 2, '#ff8080');
    rb.rect(12, rh - 9, rw - 24, 3, '#a8182c');
    for (let x = 14; x < rw - 14; x += 6) rb.set(x, 3, '#ffb0b0');
    rb.outline('#1a0c16');
    rb.paste(adv, Math.floor((rw - adv.w) / 2), -2);
    this.ribbon = rb.canvas();
    // pontos que brilham (só nas partes claras do logo)
    this.shine = [];
    const rr = U.rng(77);
    for (let y = 0; y < kin.h; y++) for (let x = 0; x < kin.w; x++) {
      const c = kin.get(x, y);
      if ((c === '#ffffff' || c === '#fff1a8') && rr() < 0.08) this.shine.push([x, y]);
    }
    // sol nascendo
    const sun = new Grid(56, 56);
    sun.ellipse(28, 28, 27, 27, (nx, ny, x, y) => (U.dither(x, y, 0.5) ? '#ffe7b0' : null));
    sun.ellipse(28, 28, 21, 21, (nx, ny, x, y) => (U.dither(x, y, 0.75) ? '#ffe2a0' : '#ffd890'));
    sun.ellipse(28, 28, 15, 15, (nx, ny) => (nx + ny < -0.5 ? '#fffbe0' : '#fff0b0'));
    this.sun = sun.canvas();
  },

  // cena completa; t = quadros desde que a tela abriu
  draw(t, c = ctx) {
    this.build();
    const camX = t * 0.7;
    BG.draw('bairro', camX, t, c, { afterSky: () => c.drawImage(this.sun, 196, 74) });
    // calçada rolando
    const T = Tiles.get('bairro');
    const sx = Math.floor(camX), off = sx % 16;
    for (let x = -off; x < W; x += 16) {
      const tx = Math.floor((x + sx) / 16);
      c.drawImage(T.ground[1][((tx % 3) + 3) % 3], x, 192);
      c.drawImage(T.ground[0][((tx % 3) + 3) % 3], x, 208);
    }
    // ônibus indo embora... e o Kinhu correndo atrás
    const bx = Math.round(118 + Math.sin(t * 0.012) * 8);
    const by = 130 + (Math.floor(t / 6) % 2);
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.8 + i * 9) % 36;
      c.fillStyle = 'rgba(200,200,210,' + (0.6 - k / 60).toFixed(2) + ')';
      const s = 3 + Math.floor(k / 9);
      c.fillRect(bx - 4 - Math.round(k), 178 - Math.round(k / 4), s, s);
    }
    c.drawImage(OBJ.busR, bx, by);
    const kf = SPR.kinhu.run[Math.floor(t / 5) % 4];
    const ky = 144 - (Math.floor(t / 5) % 2);
    c.drawImage(kf.r, 0, 0, 20, 24, 54, ky, 40, 48);
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.5 + i * 14) % 42;
      c.fillStyle = 'rgba(240,236,224,' + (0.8 - k / 52).toFixed(2) + ')';
      c.fillRect(54 - Math.round(k), 186 - Math.round(k / 7), 3, 3);
    }
    // balão de fala
    if (Math.floor(t / 90) % 2 === 1) {
      c.fillStyle = '#ffffff'; c.fillRect(82, 124, 46, 14); c.fillRect(84, 138, 4, 2); c.fillRect(82, 140, 2, 2);
      c.fillStyle = '#1a0c16'; c.fillRect(82, 123, 46, 1); c.fillRect(81, 124, 1, 14); c.fillRect(128, 124, 1, 14); c.fillRect(82, 138, 2, 1); c.fillRect(88, 138, 40, 1);
      Font.draw('ESPERA!', 105, 128, '#e23040', { align: 'center', shadow: null, ctx: c });
    }
    // logo (cai do alto e quica)
    const p = Math.min(1, t / 34);
    let y = 10 - Math.round(110 * Math.pow(1 - p, 3));
    if (t > 34 && t < 50) y -= Math.round(Math.sin(((t - 34) / 16) * Math.PI) * 5);
    const lx = Math.round((W - this.kin.width) / 2);
    c.drawImage(this.kin, lx, y);
    // brilhos
    if (t > 40 && this.shine.length) {
      const k = Math.floor(t / 26), ph = t % 26;
      const [px, py] = this.shine[(k * 37) % this.shine.length];
      const sz = ph < 13 ? Math.floor(ph / 4) : Math.floor((26 - ph) / 4);
      c.fillStyle = '#ffffff';
      c.fillRect(lx + px - sz, y + py, sz * 2 + 1, 1);
      c.fillRect(lx + px, y + py - sz, 1, sz * 2 + 1);
    }
    const ry = y + this.kin.height - 8;
    if (t > 28) c.drawImage(this.ribbon, Math.round((W - this.ribbon.width) / 2), ry);
  },
};
