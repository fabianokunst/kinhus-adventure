'use strict';
/* =========================================================
   Cenários: temas, tiles, fundos com parallax, decoração,
   veículos e objetos de fase (ponto de ônibus, portas...).
   ========================================================= */

const THEMES = {
  bairro: { ground: 'calcada', fill: 'soil', brick: 'clay', hard: 'concrete', plat: 'awning', spike: 'glass', liquid: 'sewage', prop: 'bin', shooter: 'hydrant', goal: 'busstop', bg: 'bairro', music: 'bairro', decor: 'bairro' },
  onibus: { ground: 'busfloor', fill: 'chassis', brick: 'box', hard: 'metal', plat: 'rack', spike: 'tacks', liquid: 'sewage', prop: 'suitcase', shooter: 'hydrant', goal: 'busdoor', bg: 'onibus', music: 'onibus', decor: 'none' },
  centro: { ground: 'calcada2', fill: 'foundation', brick: 'clay', hard: 'concrete', plat: 'scaffold', spike: 'nails', liquid: 'sewage', prop: 'cone', shooter: 'hydrant', goal: 'building', bg: 'centro', music: 'centro', decor: 'centro' },
  escritorio: { ground: 'carpet', fill: 'slab', brick: 'archive', hard: 'cabinet', plat: 'shelf', spike: 'tacks', liquid: 'sewage', prop: 'cooler', shooter: 'printer', goal: 'elevator', bg: 'escritorio', music: 'escritorio', decor: 'escritorio' },
  servidores: { ground: 'metalfloor', fill: 'under', brick: 'crate', hard: 'rack', plat: 'tray', spike: 'spark', liquid: 'electric', prop: 'ups', shooter: 'server', goal: 'none', bg: 'servidores', music: 'servidores', decor: 'servidores' },
};

/* ---------------- TILES ---------------- */
const TileArt = {
  fill(g, style, r) {
    const sp = (n, cols) => { for (let i = 0; i < n; i++) g.set(r() * 16, r() * 16, cols[(r() * cols.length) | 0]); };
    switch (style) {
      case 'soil':
        g.rect(0, 0, 16, 16, '#6a4432'); sp(14, ['#83502d', '#4f3224', '#5c3a2a']);
        for (let i = 0; i < 2; i++) { const x = 2 + (r() * 11) | 0, y = 3 + (r() * 10) | 0; g.rect(x, y, 3, 2, '#9f6938'); g.set(x, y, '#c18b5a'); g.set(x + 2, y + 1, '#6a4432'); }
        break;
      case 'foundation':
        g.rect(0, 0, 16, 16, '#8c8c96'); sp(10, ['#7e7e88', '#9a9aa4']);
        g.rect(0, 7, 16, 1, '#6a6a74'); g.rect(0, 15, 16, 1, '#6a6a74'); g.rect(0, 8, 16, 1, '#a4a4ae');
        g.rect(7, 0, 1, 7, '#6a6a74'); g.rect(15, 8, 1, 7, '#6a6a74'); g.rect(3, 8, 1, 7, '#6a6a74');
        break;
      case 'chassis':
        g.rect(0, 0, 16, 16, '#3a3e52'); g.rect(15, 0, 1, 16, '#272a3a'); g.rect(0, 0, 1, 16, '#4a5068');
        for (const [x, y] of [[3, 4], [11, 4], [3, 12], [11, 12]]) { g.set(x, y, '#7a80a0'); g.set(x + 1, y + 1, '#22263a'); }
        break;
      case 'slab':
        g.rect(0, 0, 16, 16, '#a8a8b2'); sp(12, ['#989aa4', '#b6b6c0']); g.rect(0, 15, 16, 1, '#8a8a94');
        break;
      case 'under':
        g.rect(0, 0, 16, 16, '#181c2a'); g.rect(0, 6, 16, 3, '#2c3450'); g.rect(0, 6, 16, 1, '#3e4868'); g.rect(0, 9, 16, 1, '#10131e');
        sp(5, ['#222840']);
        break;
    }
  },
  surface(g, style, r, tx) {
    switch (style) {
      case 'calcada': {
        g.rect(0, 0, 16, 5, '#e6e4dc'); g.rect(0, 0, 16, 1, '#f8f6ee');
        for (let x = 0; x < 16; x++) {
          const wy = 1 + Math.round(1.5 + 1.5 * Math.sin(((x + tx * 16) / 16) * Math.PI * 2));
          g.set(x, wy, '#3a3a44');
          const ny = 1 + Math.round(1.5 + 1.5 * Math.sin(((x + 1 + tx * 16) / 16) * Math.PI * 2));
          if (Math.abs(ny - wy) > 1) g.set(x, (wy + ny) >> 1, '#3a3a44');
        }
        g.rect(0, 5, 16, 1, '#b4b2aa'); g.rect(0, 6, 16, 1, '#7a7874'); g.rect(0, 7, 16, 1, '#4a3024');
        break;
      }
      case 'calcada2':
        g.rect(0, 0, 16, 5, '#cac8c2'); g.rect(0, 0, 16, 1, '#e8e6e0'); g.rect(0, 1, 1, 4, '#a2a09a'); g.rect(8, 1, 1, 4, '#a2a09a');
        g.set(4, 2, '#b8b6b0'); g.set(12, 3, '#b8b6b0');
        g.rect(0, 5, 16, 1, '#9a9892'); g.rect(0, 6, 16, 1, '#6a6862');
        break;
      case 'busfloor':
        g.rect(0, 0, 16, 1, '#c8c8d0');
        for (let x = 0; x < 16; x++) { g.set(x, 1, x % 4 < 2 ? '#a0a0aa' : '#7c7c86'); g.set(x, 2, x % 4 < 2 ? '#8a8a94' : '#6a6a74'); }
        g.rect(0, 3, 16, 1, '#f0c020'); g.rect(0, 4, 16, 1, '#2a2c3a');
        break;
      case 'carpet':
        g.rect(0, 0, 16, 5, '#4e5e80');
        for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) if ((x + y * 2) % 4 === 0) g.set(x, y, '#5e7098');
        g.rect(0, 0, 16, 1, '#6a7ca4'); g.rect(0, 5, 16, 1, '#2e3a54');
        break;
      case 'metalfloor':
        g.rect(0, 0, 16, 5, '#7a8498'); g.rect(0, 0, 16, 1, '#aab4c6');
        for (let x = 1; x < 16; x += 3) g.set(x, 2, '#3a4252');
        g.rect(15, 0, 1, 5, '#566070'); g.rect(0, 5, 16, 1, '#2a303e');
        break;
    }
  },
  ground(theme, mask, v) {
    const th = THEMES[theme];
    const r = U.rng(9137 + mask * 31 + v * 977 + theme.length * 7);
    const g = new Grid(16, 16);
    TileArt.fill(g, th.fill, r);
    if (mask & 1) TileArt.surface(g, th.ground, r, v);
    const edge = { soil: '#3e261a', foundation: '#5a5a64', chassis: '#1c1e2c', slab: '#7a7a84', under: '#0c0e16' }[th.fill];
    if (mask & 2) { g.rect(0, 0, 1, 16, edge); }
    if (mask & 4) { g.rect(15, 0, 1, 16, edge); }
    return g.canvas();
  },
  road(v) {
    const g = new Grid(16, 16), r = U.rng(77 + v);
    g.rect(0, 0, 16, 16, '#3e3e46');
    for (let i = 0; i < 12; i++) g.set(r() * 16, 2 + r() * 14, r() < 0.5 ? '#4a4a52' : '#323238');
    g.rect(0, 0, 16, 1, '#6a6a72'); g.rect(0, 1, 16, 1, '#52525a');
    if (v % 2 === 0) g.rect(3, 3, 10, 1, '#f0c020');
    return g.canvas();
  },
  brick(style) {
    const g = new Grid(16, 16);
    if (style === 'clay') {
      g.rect(0, 0, 16, 16, '#c4522e');
      const mortar = '#c8b8a0';
      g.rect(0, 7, 16, 1, mortar); g.rect(0, 15, 16, 1, mortar);
      for (const [x, y0] of [[7, 0], [15, 0], [3, 8], [11, 8]]) g.rect(x, y0, 1, 7, mortar);
      for (const [x0, x1, y0] of [[0, 6, 0], [8, 14, 0], [4, 10, 8], [12, 15, 8], [0, 2, 8]]) {
        g.rect(x0, y0, x1 - x0 + 1, 1, '#e47a50'); g.rect(x0, y0 + 6, x1 - x0 + 1, 1, '#8a3418');
      }
    } else if (style === 'box') {
      g.rect(0, 0, 16, 16, '#c8945a'); g.rect(0, 0, 16, 1, '#e0b47a'); g.rect(0, 0, 1, 16, '#dcae74');
      g.rect(15, 0, 1, 16, '#8a5a2e'); g.rect(0, 15, 16, 1, '#8a5a2e');
      g.rect(6, 0, 4, 15, '#e8d4a8'); g.rect(6, 0, 1, 15, '#d4bc8a');
      g.rect(0, 4, 6, 1, '#a8743e'); g.rect(10, 4, 5, 1, '#a8743e');
      g.set(2, 9, '#5a3a1a'); g.set(1, 10, '#5a3a1a'); g.set(3, 10, '#5a3a1a'); g.set(2, 11, '#5a3a1a'); g.set(2, 12, '#5a3a1a');
    } else if (style === 'archive') {
      g.rect(0, 0, 16, 16, '#d8c49a'); g.rect(0, 0, 16, 4, '#b89e72'); g.rect(0, 0, 16, 1, '#d0b88c');
      g.rect(15, 0, 1, 16, '#8e7650'); g.rect(0, 15, 16, 1, '#8e7650');
      g.rect(6, 5, 4, 1, '#5a4630');
      g.rect(3, 8, 10, 5, '#f8f8f0'); g.rect(4, 9, 8, 1, '#8890b0'); g.rect(4, 11, 6, 1, '#8890b0');
    } else {
      g.rect(0, 0, 16, 16, '#5a6478'); g.line(1, 1, 14, 14, '#3a4252'); g.line(14, 1, 1, 14, '#3a4252');
      g.rect(0, 0, 16, 2, '#8a94a8'); g.rect(0, 14, 16, 2, '#3a4252'); g.rect(0, 0, 2, 16, '#7a849a'); g.rect(14, 0, 2, 16, '#3a4252');
    }
    return g.canvas();
  },
  qblock(f) {
    const g = new Grid(16, 16);
    const base = ['#f8c030', '#ffd448', '#ffe070'][f], light = ['#fff0a0', '#fff6c0', '#ffffe0'][f];
    g.rect(0, 0, 16, 16, base); g.rect(0, 0, 16, 1, light); g.rect(0, 0, 1, 16, light);
    g.rect(15, 0, 1, 16, '#5a3008'); g.rect(0, 15, 16, 1, '#5a3008'); g.rect(14, 1, 1, 14, '#c07810'); g.rect(1, 14, 14, 1, '#c07810');
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) g.set(x, y, '#a05a08');
    const q = ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..', '..##..'];
    q.forEach((row, y) => { for (let x = 0; x < 6; x++) if (row[x] === '#') { g.set(5 + x + 1, 3 + y + 1, '#a05a08'); } });
    q.forEach((row, y) => { for (let x = 0; x < 6; x++) if (row[x] === '#') g.set(5 + x, 3 + y, '#fffbe8'); });
    return g.canvas();
  },
  used() {
    const g = new Grid(16, 16);
    g.rect(0, 0, 16, 16, '#a8784a'); g.rect(0, 0, 16, 1, '#c89a6a'); g.rect(0, 0, 1, 16, '#c89a6a');
    g.rect(15, 0, 1, 16, '#4a2e16'); g.rect(0, 15, 16, 1, '#4a2e16');
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) g.set(x, y, '#5a3a1e');
    return g.canvas();
  },
  hard(style, f = 0) {
    const g = new Grid(16, 16);
    if (style === 'concrete') {
      g.rect(0, 0, 16, 16, '#a4a4aa'); g.rect(0, 0, 16, 1, '#c8c8cc'); g.rect(0, 0, 1, 16, '#c0c0c4');
      g.rect(15, 0, 1, 16, '#6a6a70'); g.rect(0, 15, 16, 1, '#6a6a70');
      for (const x of [3, 9]) { g.rect(x, 4, 4, 8, '#5c5c62'); g.rect(x, 4, 4, 1, '#46464c'); g.rect(x, 11, 4, 1, '#8a8a90'); }
    } else if (style === 'metal') {
      g.rect(0, 0, 16, 16, '#7a8294'); g.rect(0, 0, 16, 1, '#a8b0c0'); g.rect(0, 0, 1, 16, '#9aa2b4');
      g.rect(15, 0, 1, 16, '#4a5060'); g.rect(0, 15, 16, 1, '#4a5060');
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { g.set(x, y, '#c8d0e0'); g.set(x + 1, y + 1, '#4a5060'); }
    } else if (style === 'cabinet') {
      g.rect(0, 0, 16, 16, '#a8b0bc'); g.rect(0, 0, 16, 1, '#c8d0dc'); g.rect(0, 0, 1, 16, '#c0c8d4');
      g.rect(15, 0, 1, 16, '#6a7280'); g.rect(0, 15, 16, 1, '#6a7280'); g.rect(1, 7, 14, 1, '#6a7280'); g.rect(1, 8, 14, 1, '#c8d0dc');
      for (const y of [3, 11]) { g.rect(6, y, 4, 1, '#3a4250'); g.rect(5, y - 2, 6, 1, '#f0f0f0'); }
    } else {
      g.rect(0, 0, 16, 16, '#3a4052'); g.rect(1, 1, 14, 14, '#262a36');
      g.rect(0, 0, 16, 1, '#9aa4ba'); g.rect(0, 0, 1, 16, '#7a849a'); g.rect(15, 0, 1, 16, '#14161e'); g.rect(0, 15, 16, 1, '#14161e');
      for (let y = 3; y < 14; y += 3) { g.rect(2, y, 9, 1, '#4a5064'); }
      const on = ['#40f070', '#f8c030', '#40f070', '#40a0ff'];
      for (let i = 0; i < 4; i++) g.set(12 + (i % 2) * 2, 3 + i * 3, ((i + f) % 3) ? on[i] : '#1a3020');
    }
    return g.canvas();
  },
  plat(style) {
    const g = new Grid(16, 16);
    if (style === 'awning') {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 6; y++) g.set(x, y, Math.floor(x / 4) % 2 ? '#f4f0e8' : '#d83030');
      g.rect(0, 0, 16, 1, '#ffffff');
      for (let x = 0; x < 16; x++) g.set(x, 6, x % 4 === 0 || x % 4 === 3 ? null : Math.floor(x / 4) % 2 ? '#d8d4cc' : '#a82020');
    } else if (style === 'scaffold') {
      g.rect(0, 0, 16, 4, '#c88a50'); g.rect(0, 0, 16, 1, '#e8aa6a'); g.rect(0, 3, 16, 1, '#8a5a2a');
      g.set(4, 1, '#8a5a2a'); g.set(11, 2, '#8a5a2a');
      g.rect(0, 4, 16, 2, '#9aa0a8'); g.rect(0, 5, 16, 1, '#5a6068');
    } else if (style === 'rack') {
      g.rect(0, 0, 16, 2, '#d8dce4'); g.rect(0, 2, 16, 1, '#8a90a0');
      for (let x = 0; x < 16; x++) for (let y = 3; y < 6; y++) if ((x + y) % 2 === 0) g.set(x, y, '#6a7080');
    } else if (style === 'shelf') {
      g.rect(0, 0, 16, 4, '#b8865a'); g.rect(0, 0, 16, 1, '#d8a678'); g.rect(0, 3, 16, 1, '#7a5432');
      g.line(3, 4, 3, 8, '#7a8090'); g.line(3, 4, 7, 4, '#7a8090'); g.line(3, 8, 7, 4, '#7a8090');
    } else {
      g.rect(0, 0, 16, 2, '#8a94a8'); g.rect(0, 0, 16, 1, '#b0bacc');
      for (let x = 0; x < 16; x += 2) g.set(x, 2, '#4a5468');
      g.line(0, 3, 15, 4, '#e8c030'); g.line(0, 4, 15, 3, '#3a7ad8');
    }
    return g.canvas();
  },
  desk() {
    const g = new Grid(16, 16);
    g.rect(0, 0, 16, 3, '#c08a5a'); g.rect(0, 0, 16, 1, '#e0aa78'); g.rect(0, 2, 16, 1, '#8a5e38');
    g.rect(1, 3, 14, 9, '#d4d4dc'); g.rect(1, 3, 14, 1, '#b4b4be'); g.rect(1, 11, 14, 1, '#a4a4ae');
    g.rect(1, 12, 2, 4, '#5a6070'); g.rect(13, 12, 2, 4, '#5a6070');
    return g.canvas();
  },
  seat(back) {
    const g = new Grid(16, 16);
    if (back) {
      g.rect(1, 0, 14, 16, '#3a58c0'); g.rect(1, 0, 14, 3, '#d8dce4'); g.rect(1, 3, 14, 1, '#8a90a0');
      for (let y = 5; y < 16; y += 3) for (let x = 2; x < 15; x += 3) g.set(x + (y % 2), y, '#5a7ae0');
      g.rect(14, 3, 1, 13, '#24388a');
    } else {
      g.rect(0, 0, 16, 5, '#3a58c0'); g.rect(0, 0, 16, 1, '#6a8af0');
      for (let x = 1; x < 16; x += 3) g.set(x, 2, '#5a7ae0');
      g.rect(0, 4, 16, 1, '#24388a'); g.rect(1, 5, 14, 6, '#2a3a7a'); g.rect(1, 10, 14, 1, '#1a2450');
      g.rect(2, 11, 2, 5, '#9aa0b0'); g.rect(12, 11, 2, 5, '#9aa0b0'); g.rect(2, 11, 1, 5, '#c8ccd8'); g.rect(12, 11, 1, 5, '#c8ccd8');
    }
    return g.canvas();
  },
  pole() { const g = new Grid(16, 16); g.rect(7, 0, 2, 16, '#f0c020'); g.rect(7, 0, 1, 16, '#fff080'); g.rect(9, 0, 1, 16, '#a88010'); return g.canvas(); },
  rail() {
    const g = new Grid(16, 16);
    g.rect(0, 0, 16, 2, '#f0c020'); g.rect(0, 0, 16, 1, '#fff080'); g.rect(0, 2, 16, 1, '#a88010');
    return g.canvas();
  },
  spike(style, f) {
    const g = new Grid(16, 16);
    if (style === 'glass') {
      g.rect(0, 10, 16, 6, '#a4a4aa'); g.rect(0, 10, 16, 1, '#c8c8cc'); g.rect(0, 15, 16, 1, '#6a6a70');
      g.poly([[1, 10], [3, 3], [5, 10]], '#58b070'); g.line(3, 4, 2, 9, '#a8f0b8');
      g.poly([[5, 10], [7, 1], [10, 10]], '#d0eef8'); g.line(7, 2, 6, 9, '#ffffff');
      g.poly([[9, 10], [11, 4], [13, 10]], '#a86a28'); g.line(11, 5, 10, 9, '#e0a050');
      g.poly([[12, 10], [14, 5], [16, 10]], '#58b070');
    } else if (style === 'nails') {
      g.rect(0, 11, 16, 5, '#b07840'); g.rect(0, 11, 16, 1, '#d09858'); g.rect(0, 15, 16, 1, '#704a20');
      for (const x of [2, 6, 10, 14]) { g.rect(x, 3, 1, 8, '#c8ccd8'); g.rect(x + 1, 4, 1, 7, '#6a7080'); g.set(x, 2, '#ffffff'); g.rect(x - 1, 10, 3, 1, '#8a90a0'); }
    } else if (style === 'tacks') {
      const heads = ['#e83838', '#3878e8', '#f8c830'];
      [2, 7, 12].forEach((x, i) => {
        g.rect(x + 1, 4 + (i % 2) * 2, 1, 7, '#c8ccd8'); g.set(x + 1, 3 + (i % 2) * 2, '#ffffff');
        g.ellipse(x + 1.5, 12.5, 3, 1.8, heads[i]); g.rect(x, 11, 2, 1, '#ffffff');
      });
    } else {
      g.rect(0, 13, 16, 3, '#1a1a22'); g.line(0, 13, 6, 12, '#e8c030'); g.line(9, 12, 15, 13, '#e8c030');
      const pts = f ? [[7, 4], [4, 8], [11, 7], [8, 10]] : [[8, 6], [5, 3], [12, 9], [3, 10]];
      for (const [x, y] of pts) { g.set(x, y, '#ffffff'); g.set(x - 1, y, '#ffe040'); g.set(x + 1, y, '#ffe040'); g.set(x, y - 1, '#ffe040'); g.set(x, y + 1, '#ffe040'); }
      g.line(7, 12, 8, 6 + f, '#80e0ff');
    }
    return g.canvas();
  },
  liquid(style, top, f) {
    const g = new Grid(16, 16);
    const P = style === 'electric'
      ? { hi: '#a8e0ff', mid: '#4a90e8', base: '#2a5ac0', dark: '#1a3a8a', bub: '#ffe040' }
      : { hi: '#c8c49a', mid: '#8a8458', base: '#5e5a3a', dark: '#46422a', bub: '#a8a070' };
    g.rect(0, 0, 16, 16, P.base);
    for (let y = 6; y < 16; y += 4) for (let x = (y + f * 3) % 8; x < 16; x += 8) g.rect(x, y, 3, 1, P.dark);
    if (top) {
      for (let x = 0; x < 16; x++) {
        const wy = 2 + Math.round(Math.sin(((x + f * 4) / 16) * Math.PI * 2) * 1.2);
        for (let y = 0; y < wy; y++) g.set(x, y, null);
        g.set(x, wy, P.hi); g.set(x, wy + 1, P.mid);
      }
      g.set((f * 5 + 3) % 16, 7, P.bub); g.set((f * 7 + 10) % 16, 10, P.bub);
    }
    if (style === 'electric' && f % 2) { g.set(4, 5, '#ffffff'); g.set(11, 9, '#ffffff'); }
    return g.canvas();
  },
  wet(theme, mask, v) {
    const base = TileArt.ground(theme, mask | 1, v);
    const { c, x } = U.canvas(16, 16);
    x.drawImage(base, 0, 0);
    x.fillStyle = '#9ae0ff';
    x.fillRect(0, 0, 16, 1); x.fillRect(2, 1, 5, 1); x.fillRect(9, 2, 4, 1);
    x.fillStyle = '#ffffff'; x.fillRect(4, 1, 2, 1); x.fillRect(11, 2, 1, 1);
    return c;
  },
  prop(style) {
    const g = new Grid(16, 16);
    if (style === 'bin') {
      g.rect(2, 3, 12, 13, '#2e8a4a'); g.rect(2, 3, 2, 13, '#4ab06a'); g.rect(12, 3, 2, 13, '#1e5a32');
      g.rect(1, 1, 14, 3, '#246e3a'); g.rect(1, 1, 14, 1, '#3e9a58'); g.rect(6, 0, 4, 1, '#1e5a32');
      g.rect(6, 7, 4, 4, '#e8f0e8'); g.set(7, 8, '#2e8a4a'); g.set(8, 9, '#2e8a4a');
    } else if (style === 'cone') {
      g.poly([[3, 15], [7, 1], [9, 1], [13, 15]], '#f87818'); g.rect(5, 6, 6, 2, '#ffffff'); g.rect(4, 10, 8, 2, '#ffffff');
      g.rect(1, 14, 14, 2, '#d85a10'); g.line(7, 2, 5, 13, '#ffa050');
    } else if (style === 'suitcase') {
      g.rect(1, 4, 14, 12, '#8a5a30'); g.rect(1, 4, 14, 1, '#aa7a48'); g.rect(1, 15, 14, 1, '#5a3a1a');
      g.rect(5, 1, 6, 1, '#3a2a1a'); g.rect(5, 1, 1, 3, '#3a2a1a'); g.rect(10, 1, 1, 3, '#3a2a1a');
      g.rect(4, 4, 1, 12, '#c8a040'); g.rect(11, 4, 1, 12, '#c8a040');
    } else if (style === 'cooler') {
      g.ellipse(8, 3.5, 5, 3.5, '#8ad0ff'); g.rect(5, 0, 6, 2, '#5ab0f0'); g.set(6, 2, '#ffffff');
      g.rect(3, 7, 10, 9, '#f0f0f4'); g.rect(3, 7, 1, 9, '#ffffff'); g.rect(12, 7, 1, 9, '#c0c0c8');
      g.rect(5, 10, 2, 2, '#e83838'); g.rect(9, 10, 2, 2, '#3878e8');
    } else {
      g.rect(2, 4, 12, 12, '#202228'); g.rect(2, 4, 12, 1, '#3a3e48'); g.rect(4, 7, 8, 1, '#30343e'); g.rect(4, 9, 8, 1, '#30343e');
      g.set(11, 13, '#40f070');
    }
    g.outline(OUT);
    return g.canvas();
  },
  shooter(style) {
    const g = new Grid(16, 16);
    if (style === 'hydrant') {
      g.rect(5, 0, 6, 2, '#a01818'); g.rect(4, 2, 8, 2, '#c02020'); g.rect(4, 4, 8, 10, '#d83030'); g.rect(4, 4, 2, 10, '#f05a50');
      g.rect(1, 6, 3, 4, '#c02020'); g.rect(12, 6, 3, 4, '#c02020'); g.rect(0, 7, 1, 2, '#601010'); g.rect(15, 7, 1, 2, '#601010');
      g.rect(3, 14, 10, 2, '#a01818');
    } else if (style === 'printer') {
      g.rect(1, 5, 14, 11, '#c8ccd4'); g.rect(1, 5, 14, 1, '#e8ecf0'); g.rect(1, 15, 14, 1, '#7a808c');
      g.rect(3, 2, 10, 3, '#ffffff'); g.rect(3, 4, 10, 1, '#d0d4dc');
      g.rect(0, 9, 16, 2, '#202028'); g.rect(10, 6, 3, 2, '#3a4050'); g.set(4, 7, '#e83838'); g.set(6, 7, '#40d060');
      g.rect(3, 12, 10, 1, '#9aa0ac');
    } else {
      g.rect(1, 0, 14, 16, '#22252e'); g.rect(1, 0, 14, 1, '#3e4250');
      g.ellipse(8, 7, 4.5, 4.5, '#3a3e4a'); g.line(5, 7, 11, 7, '#14161c'); g.line(8, 4, 8, 10, '#14161c');
      g.set(3, 13, '#f84040'); g.set(5, 13, '#f8c030'); g.set(12, 13, '#40f070');
      g.rect(0, 8, 1, 2, '#ff5040'); g.rect(15, 8, 1, 2, '#ff5040');
    }
    g.outline(OUT);
    return g.canvas();
  },
};

const Tiles = {
  cache: {},
  get(theme) {
    if (this.cache[theme]) return this.cache[theme];
    const th = THEMES[theme];
    const T = { ground: [], wet: [] };
    for (let m = 0; m < 8; m++) { T.ground[m] = [0, 1, 2].map(v => TileArt.ground(theme, m, v)); T.wet[m] = TileArt.wet(theme, m, 0); }
    T.road = [0, 1].map(v => TileArt.road(v));
    T.brick = TileArt.brick(th.brick);
    T.q = [0, 1, 2].map(f => TileArt.qblock(f));
    T.used = TileArt.used();
    T.hard = [0, 1].map(f => TileArt.hard(th.hard, f));
    T.plat = TileArt.plat(th.plat);
    T.desk = TileArt.desk();
    T.seat = TileArt.seat(false); T.seatBack = TileArt.seat(true);
    T.pole = TileArt.pole(); T.rail = TileArt.rail();
    T.spike = [0, 1].map(f => TileArt.spike(th.spike, f));
    T.liquidTop = [0, 1, 2, 3].map(f => TileArt.liquid(th.liquid, true, f));
    T.liquid = [0, 1, 2, 3].map(f => TileArt.liquid(th.liquid, false, f));
    T.prop = TileArt.prop(th.prop);
    T.shooter = TileArt.shooter(th.shooter);
    this.cache[theme] = T;
    return T;
  },
};

/* ---------------- OBJETOS ---------------- */
const OBJ = {};
(() => {
  // colchão (mola) — 2 quadros
  OBJ.mattress = [0, 1].map(f => {
    const g = new Grid(16, 16), top = f ? 10 : 6;
    for (let y = top; y < 16; y++) for (let x = 1; x < 15; x++) g.set(x, y, Math.floor(x / 2) % 2 ? '#f4f4fa' : '#7aa0e8');
    g.rect(1, top, 14, 1, '#ffffff'); g.rect(1, 15, 14, 1, '#4a6ab0');
    for (let x = 3; x < 14; x += 4) g.set(x, top + 2, '#3a5aa0');
    g.outline(OUT);
    return g.canvas();
  });
  // peso de 1 tonelada (esmagador)
  OBJ.weight = (() => {
    const g = new Grid(32, 32);
    g.rect(11, 0, 10, 6, '#3a3e48'); g.rect(13, 2, 6, 4, null);
    g.poly([[5, 6], [27, 6], [31, 31], [1, 31]], (x, y) => (x < 8 + (y - 6) * -0.1 ? '#8a90a2' : x > 24 + (y - 6) * 0.15 ? '#2e323c' : '#5a5f6e'));
    g.rect(4, 6, 24, 1, '#a8aec0');
    const t = ['.#..###', '##...#.', '.#...#.', '.#...#.', '###..#.'];
    t.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') g.set(10 + x * 2, 14 + y * 2, '#f0f0f0'), g.set(11 + x * 2, 14 + y * 2, '#f0f0f0'), g.set(10 + x * 2, 15 + y * 2, '#f0f0f0'), g.set(11 + x * 2, 15 + y * 2, '#f0f0f0'); });
    g.outline(OUT);
    return g.canvas();
  })();
  // relógio de ponto (checkpoint)
  OBJ.checkpoint = [false, true].map(on => {
    const g = new Grid(16, 32);
    g.rect(7, 13, 2, 19, '#7a808c'); g.rect(7, 13, 1, 19, '#a8aeba');
    g.rect(1, 0, 14, 13, on ? '#3a8a4a' : '#5a5e6a'); g.rect(1, 0, 14, 1, on ? '#5ab06a' : '#7a7e8a');
    g.ellipse(8, 6, 4.5, 4.5, '#f8f8f0'); g.line(8, 6, 8, 3, '#202028'); g.line(8, 6, 10, 7, '#202028');
    g.rect(11, 10, 3, 2, on ? '#40ff60' : '#ff3030');
    g.rect(4, 31, 8, 1, '#5a5e6a');
    g.outline(OUT);
    return g.canvas();
  });
  // carros (indo para a esquerda)
  OBJ.cars = ['#d83030', '#3a6ad8', '#f0f0f0', '#f8c820', '#3aa058'].map((body, i) => {
    const g = new Grid(48, 24);
    const dark = U.mix(body, '#000000', 0.35), light = U.mix(body, '#ffffff', 0.4);
    g.poly([[11, 2], [33, 2], [40, 10], [6, 10]], body);
    g.poly([[13, 4], [21, 4], [21, 10], [9, 10]], '#9ad0f0'); g.poly([[24, 4], [32, 4], [37, 10], [24, 10]], '#9ad0f0');
    g.line(13, 4, 10, 9, '#d8f0ff');
    g.rect(1, 10, 46, 9, body); g.rect(1, 10, 46, 1, light); g.rect(1, 18, 46, 1, dark);
    g.rect(0, 12, 2, 4, body); g.rect(46, 12, 2, 4, body);
    g.rect(0, 12, 2, 2, '#fff4a0'); g.rect(46, 12, 2, 2, '#e83030');
    g.rect(22, 12, 1, 6, dark);
    if (i === 3) { g.rect(19, 0, 10, 2, '#202020'); g.rect(20, 0, 8, 1, '#f8f8f8'); for (let x = 3; x < 46; x += 4) g.set(x, 15, x % 8 === 3 ? '#202020' : '#f8f8f8'); }
    for (const wx of [10, 37]) {
      g.ellipse(wx, 19, 4.5, 4.5, '#1c1c22');
      g.ellipse(wx, 19, 2, 2, '#a8acb8');
    }
    g.outline(OUT);
    return { r: g.canvas(), l: g.flip().canvas(), w: 48, h: 24 };
  });
  // ônibus (vista externa) para as cenas
  OBJ.bus = (() => {
    const g = new Grid(128, 64);
    g.rect(2, 6, 124, 48, '#f4f4ec'); g.rect(2, 6, 124, 2, '#ffffff');
    g.rect(2, 38, 124, 8, '#2a9a58'); g.rect(2, 46, 124, 3, '#f8c020');
    g.rect(2, 49, 124, 5, '#d8d8d0');
    for (let wx = 26; wx < 122; wx += 16) { g.rect(wx, 12, 14, 20, '#3a5a8a'); g.rect(wx, 12, 14, 2, '#8ab8e8'); g.line(wx + 2, 14, wx + 6, 30, '#5a7ab0'); }
    // passageiros
    const r = U.rng(5);
    for (let wx = 26; wx < 122; wx += 16) if (r() < 0.7) { g.ellipse(wx + 7, 24, 3, 3.5, '#2a3a5a'); g.rect(wx + 3, 27, 8, 5, '#2a3a5a'); }
    g.rect(4, 10, 18, 26, '#5a8ac0'); g.rect(4, 10, 18, 2, '#a8d0f0'); g.line(6, 12, 12, 34, '#8ab8e8');
    g.rect(4, 1, 40, 9, '#202028');
    g.rect(8, 38, 12, 14, '#3a5a8a'); g.rect(13, 38, 1, 14, '#202028');
    g.rect(0, 40, 4, 4, '#fff4a0'); g.rect(124, 40, 4, 4, '#e83030');
    for (const wx of [24, 102]) { g.ellipse(wx, 54, 8, 8, '#1c1c22'); g.ellipse(wx, 54, 4, 4, '#a8acb8'); g.ellipse(wx, 54, 1.5, 1.5, '#5a5e6a'); }
    g.outline(OUT);
    const cv = g.canvas();
    Font.draw('CENTRO', 7, 2, '#f8a020', { ctx: cv.getContext('2d'), shadow: null });
    return cv;
  })();
  // ponto de ônibus (meta da fase 1)
  OBJ.busstop = (() => {
    const g = new Grid(48, 64);
    g.rect(40, 0, 3, 64, '#8a909c'); g.rect(40, 0, 1, 64, '#c0c6d0');
    g.rect(29, 0, 19, 11, '#2a5ac8'); g.rect(29, 0, 19, 1, '#5a8af0');
    g.rect(0, 18, 36, 3, '#2e6a3e'); g.rect(0, 18, 36, 1, '#4a9a5a');
    g.rect(2, 21, 2, 43, '#5a5e6a'); g.rect(32, 21, 2, 43, '#5a5e6a');
    for (let y = 22; y < 50; y++) for (let x = 4; x < 32; x++) if ((x + y) % 3) g.set(x, y, '#a8d0e8');
    g.rect(6, 48, 24, 3, '#b07840'); g.rect(6, 48, 24, 1, '#d09858'); g.rect(8, 51, 2, 13, '#5a5e6a'); g.rect(26, 51, 2, 13, '#5a5e6a');
    g.outline(OUT);
    const cv = g.canvas();
    Font.draw('BUS', 39, 3, '#ffffff', { ctx: cv.getContext('2d'), shadow: null, align: 'center' });
    return cv;
  })();
  // porta de saída do ônibus
  OBJ.busdoor = (() => {
    const g = new Grid(32, 64);
    g.rect(0, 11, 32, 53, '#5a5e6a'); g.rect(2, 13, 28, 51, '#3a3e48');
    g.rect(3, 14, 12, 49, '#7ab0d8'); g.rect(17, 14, 12, 49, '#7ab0d8');
    g.line(5, 16, 9, 40, '#c8e8ff'); g.line(19, 16, 23, 40, '#c8e8ff');
    g.rect(13, 32, 1, 10, '#f0c020'); g.rect(18, 32, 1, 10, '#f0c020');
    g.rect(1, 0, 30, 11, '#c02020'); g.rect(1, 0, 30, 1, '#f05050');
    g.outline(OUT);
    const cv = g.canvas();
    Font.draw('SAÍDA', 16, 3, '#ffffff', { ctx: cv.getContext('2d'), shadow: null, align: 'center' });
    return cv;
  })();
  // prédio do escritório
  OBJ.building = (() => {
    const g = new Grid(64, 80);
    g.rect(0, 0, 64, 80, '#8a9ab8');
    for (let y = 2; y < 40; y += 10) for (let x = 3; x < 62; x += 10) { g.rect(x, y, 8, 7, '#bcd8f4'); g.rect(x, y, 8, 1, '#e0f0ff'); }
    g.rect(0, 44, 64, 10, '#2a3a6a'); g.rect(0, 44, 64, 1, '#4a5a9a');
    g.rect(14, 56, 36, 24, '#3a4a6a'); g.rect(16, 58, 15, 22, '#9ad0f0'); g.rect(33, 58, 15, 22, '#9ad0f0');
    g.line(18, 60, 22, 76, '#d8f0ff'); g.line(35, 60, 39, 76, '#d8f0ff'); g.rect(29, 66, 2, 6, '#f0c020'); g.rect(33, 66, 2, 6, '#f0c020');
    g.outline(OUT);
    const cv = g.canvas();
    Font.draw('ESCRITÓRIO', 3, 47, '#f8d040', { ctx: cv.getContext('2d'), shadow: '#101020' });
    return cv;
  })();
  // elevador para a sala dos servidores
  OBJ.elevator = (() => {
    const g = new Grid(48, 64);
    g.rect(0, 0, 48, 64, '#8a909c'); g.rect(4, 14, 40, 50, '#b8c0cc');
    g.rect(6, 16, 17, 48, '#d0d6e0'); g.rect(25, 16, 17, 48, '#d0d6e0'); g.rect(23, 16, 2, 48, '#6a707c');
    g.line(8, 18, 12, 50, '#f0f4f8'); g.line(27, 18, 31, 50, '#f0f4f8');
    g.rect(14, 2, 20, 10, '#202028'); g.poly([[20, 4], [28, 4], [24, 10]], '#40f070');
    g.outline(OUT);
    return g.canvas();
  })();
})();

/* ---------------- DECORAÇÃO ---------------- */
const DECOR = {};
(() => {
  const mk = (w, h, fn) => { const g = new Grid(w, h); fn(g); g.outline(OUT); return g.canvas(); };
  DECOR.pot = mk(12, 14, g => { g.rect(2, 8, 8, 6, '#c86a3a'); g.rect(1, 7, 10, 2, '#a85028'); g.ellipse(6, 4.5, 5, 4.5, '#3e8a3a'); g.set(3, 3, '#e83850'); g.set(8, 2, '#f8d040'); g.set(6, 5, '#e83850'); g.set(4, 6, '#6ab060'); });
  DECOR.tuft = mk(10, 6, g => { for (const [x, h] of [[1, 3], [3, 5], [5, 4], [7, 5], [8, 2]]) g.rect(x, 6 - h, 1, h, x % 3 ? '#4a9a3a' : '#6ac050'); });
  DECOR.bags = mk(16, 11, g => { g.ellipse(5, 6.5, 4.5, 4.5, '#2a2a32'); g.ellipse(11, 7, 4.5, 4, '#34343e'); g.set(4, 3, '#5a5a66'); g.set(10, 4, '#5a5a66'); g.rect(4, 1, 2, 2, '#2a2a32'); });
  DECOR.phone = mk(16, 30, g => { // orelhão
    g.ellipse(8, 8, 7, 8, (nx, ny) => (ny < 0.4 ? (nx < -0.3 ? '#ffa040' : '#f87818') : null));
    g.rect(1, 8, 14, 2, '#d85a10'); g.rect(6, 10, 4, 6, '#3a4a6a'); g.rect(7, 16, 2, 14, '#7a808c');
  });
  DECOR.bench = mk(32, 12, g => { g.rect(1, 0, 30, 3, '#b07840'); g.rect(1, 0, 30, 1, '#d09858'); g.rect(1, 5, 30, 2, '#b07840'); g.rect(3, 7, 2, 5, '#4a4e5a'); g.rect(27, 7, 2, 5, '#4a4e5a'); g.rect(3, 3, 1, 2, '#4a4e5a'); g.rect(28, 3, 1, 2, '#4a4e5a'); });
  DECOR.paper = mk(12, 3, g => { g.rect(1, 0, 10, 2, '#e8e8e0'); g.rect(2, 0, 7, 1, '#9aa0b0'); });
  DECOR.plant = mk(14, 26, g => { g.rect(3, 18, 8, 8, '#e8e8f0'); g.rect(3, 18, 8, 1, '#ffffff'); for (let i = 0; i < 7; i++) g.ellipse(7 + Math.sin(i * 2.1) * 4, 8 + i * 1.3, 2.4, 4, i % 2 ? '#3e8a3a' : '#5ab050'); });
  DECOR.monitor = mk(14, 12, g => { g.rect(0, 0, 14, 9, '#2a2e38'); g.rect(1, 1, 12, 7, '#3a7ad8'); g.rect(2, 2, 6, 1, '#a8d8ff'); g.rect(2, 4, 8, 1, '#8ac0f0'); g.rect(6, 9, 2, 2, '#2a2e38'); g.rect(3, 11, 8, 1, '#2a2e38'); });
  DECOR.mug = mk(7, 7, g => { g.rect(0, 1, 5, 6, '#f8f8f8'); g.rect(5, 2, 2, 3, '#f8f8f8'); g.rect(1, 1, 3, 1, '#7a4422'); g.set(2, 4, '#e83838'); });
  DECOR.stack = mk(12, 8, g => { for (let y = 0; y < 8; y += 2) { g.rect(1 + (y % 4 ? 1 : 0), y, 9, 2, '#f4f4ee'); g.rect(1 + (y % 4 ? 1 : 0), y + 1, 9, 1, '#c8ccd8'); } });
  DECOR.chair = mk(14, 20, g => { g.rect(2, 0, 9, 10, '#2a2e38'); g.rect(3, 1, 7, 8, '#3a3e4a'); g.rect(1, 10, 12, 3, '#2a2e38'); g.rect(6, 13, 2, 4, '#5a6070'); g.rect(1, 17, 12, 1, '#5a6070'); g.set(1, 18, '#202020'); g.set(12, 18, '#202020'); });
  DECOR.cables = mk(20, 5, g => { g.line(0, 4, 19, 1, '#e8c030'); g.line(0, 3, 19, 4, '#3a7ad8'); g.line(2, 4, 17, 2, '#e83838'); });
  DECOR.sign = mk(14, 18, g => { g.poly([[2, 16], [7, 0], [12, 16]], '#f8d020'); g.poly([[4, 15], [7, 4], [10, 15]], '#f8e050'); g.rect(6, 6, 2, 6, '#202020'); g.rect(6, 13, 2, 2, '#202020'); g.rect(0, 16, 14, 2, '#d8b010'); });
  DECOR.newspaper = mk(16, 18, g => { g.rect(1, 0, 14, 12, '#d8c890'); g.rect(1, 0, 14, 3, '#c84030'); g.rect(3, 4, 10, 1, '#5a5040'); g.rect(3, 6, 10, 1, '#5a5040'); g.rect(3, 8, 6, 3, '#8a9aa8'); g.rect(3, 12, 2, 6, '#4a4e5a'); g.rect(11, 12, 2, 6, '#4a4e5a'); });
})();

/* ---------------- FUNDOS (parallax) ---------------- */
const BG = {
  cache: {},
  // céu em faixas com pontilhado entre as cores
  sky(stops) {
    const g = new Grid(W, H);
    for (let y = 0; y < H; y++) {
      const t = y / (H - 1);
      let i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
      const k = U.clamp((t - t0) / (t1 - t0), 0, 1);
      for (let x = 0; x < W; x++) g.d[y * W + x] = U.dither(x, y, k) ? c1 : c0;
    }
    return g.canvas();
  },
  // nuvens pontilhadas no estilo do logo
  clouds(w, h, seed, n, cols) {
    const g = new Grid(w, h), r = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = r() * w, cy = 10 + r() * (h - 30), sc = 0.6 + r() * 1.1;
      for (let k = 0; k < 6; k++) {
        const ox = (k - 2.5) * 9 * sc, oy = -Math.sin((k / 5) * Math.PI) * 6 * sc;
        for (const dx of [0, -w, w]) {
          g.ellipse(cx + ox + dx, cy + oy, 12 * sc, 7 * sc, (nx, ny, x, y) => {
            const d = nx * nx + ny * ny;
            if (d > 0.7) return U.dither(x, y, 0.5) ? cols[0] : null;
            if (ny > 0.35) return U.dither(x, y, 0.5) ? cols[1] : cols[0];
            return cols[0];
          });
        }
      }
    }
    return g.canvas();
  },
  // relevo contínuo (morros, horizonte)
  ridge(w, h, base, amps, cols, seed) {
    const g = new Grid(w, h), r = U.rng(seed);
    const ph = amps.map(() => r() * Math.PI * 2);
    for (let x = 0; x < w; x++) {
      let y = base;
      amps.forEach(([a, k], i) => { y -= a * Math.sin((x / w) * Math.PI * 2 * k + ph[i]); });
      y = Math.round(y);
      for (let yy = Math.max(0, y); yy < h; yy++) {
        const d = yy - y;
        g.set(x, yy, d < 2 ? cols[0] : d < 5 && U.dither(x, yy, 0.5) ? cols[0] : d > 30 && cols[2] ? (U.dither(x, yy, U.clamp((d - 30) / 30, 0, 1)) ? cols[2] : cols[1]) : cols[1]);
      }
    }
    return g.canvas();
  },
  // casas do bairro, coqueiros e postes com fios
  houses(w, seed) {
    const g = new Grid(w, H), r = U.rng(seed);
    const walls = ['#f8e08a', '#f8b8c0', '#a8d8f0', '#b8e0a0', '#f0eee0', '#f8c890'];
    const base = 196;
    let x = 4;
    while (x < w - 50) {
      const hw = 44 + ((r() * 4) | 0) * 6, hh = 36 + ((r() * 3) | 0) * 8;
      const wall = walls[(r() * walls.length) | 0], shade = U.mix(wall, '#5a3a3a', 0.25);
      const top = base - hh;
      g.rect(x, top, hw, hh, wall); g.rect(x + hw - 3, top, 3, hh, shade);
      // telhado
      if (r() < 0.6) g.poly([[x - 4, top + 1], [x + hw / 2, top - 16], [x + hw + 4, top + 1]], (px, py) => ((px + py) % 4 === 0 ? '#9a3a1c' : '#c85a30'));
      else { g.rect(x - 2, top - 4, hw + 4, 4, '#8a8a90'); g.rect(x + 6, top - 12, 12, 8, '#4a7ad0'); g.rect(x + 6, top - 12, 12, 2, '#6a9af0'); }
      // janelas e porta
      for (let wx = x + 6; wx < x + hw - 14; wx += 16) {
        g.rect(wx, top + 8, 10, 10, '#ffffff'); g.rect(wx + 1, top + 9, 8, 8, '#5a7ab0'); g.rect(wx + 5, top + 9, 1, 8, '#ffffff'); g.rect(wx + 1, top + 12, 8, 1, '#ffffff');
        g.rect(wx + 2, top + 10, 2, 1, '#a8c8f0');
      }
      g.rect(x + hw - 14, base - 18, 9, 18, '#8a5a30'); g.set(x + hw - 7, base - 9, '#f0c020');
      // muro com portão
      g.rect(x - 2, base - 10, hw + 4, 10, U.mix(wall, '#ffffff', 0.3)); g.rect(x - 2, base - 10, hw + 4, 1, '#ffffff');
      for (let gx = x + 6; gx < x + 20; gx += 2) g.rect(gx, base - 9, 1, 9, '#3a3a44');
      x += hw + 10;
      // coqueiro
      if (r() < 0.55 && x < w - 20) {
        const tx = x - 4;
        for (let y = base; y > base - 54; y--) { const ox = Math.round(Math.sin((base - y) / 22) * 4); g.set(tx + ox, y, (y % 4) ? '#83502d' : '#6a4432'); g.set(tx + ox + 1, y, '#6a4432'); g.set(tx + ox - 1, y, '#9f6938'); }
        const cx = tx + Math.round(Math.sin(54 / 22) * 4), cy = base - 54;
        for (let a = 0; a < 7; a++) {
          const ang = -Math.PI + (a / 6) * Math.PI, len = 16 + (a % 2) * 4;
          for (let s = 0; s < len; s++) { const px = cx + Math.cos(ang) * s, py = cy + Math.sin(ang) * s * 0.6 + (s * s) / 28; g.set(px, py, a % 2 ? '#3e6131' : '#457331'); g.set(px, py + 1, '#203a16'); }
        }
      }
    }
    // postes e fios
    for (let px = 60; px < w; px += 128) {
      g.rect(px, base - 92, 4, 92, '#3e322a'); g.rect(px, base - 92, 1, 92, '#6a4432');
      g.rect(px - 10, base - 86, 24, 3, '#31251c');
    }
    for (let px = 60; px < w + 60; px += 128) {
      for (const [yoff, sag] of [[-85, 12], [-83, 16]]) {
        for (let t = 0; t <= 128; t++) {
          const x0 = px + 2 + t, y0 = base + yoff + Math.round(sag * Math.sin((t / 128) * Math.PI));
          g.set(((x0 % w) + w) % w, y0, '#0e0e0e');
        }
      }
    }
    return g.canvas();
  },
  // horizonte de prédios
  skyline(w, h, seed, cols, opt = {}) {
    const g = new Grid(w, h), r = U.rng(seed);
    let x = 0;
    while (x < w) {
      const bw = 16 + ((r() * 5) | 0) * 6, bh = (opt.min || 40) + r() * (opt.var || 70);
      const top = h - bh;
      const c = cols[(r() * cols.length) | 0];
      g.rect(x, top, bw, bh, c[0]); g.rect(x, top, 2, bh, c[1]); g.rect(x + bw - 2, top, 2, bh, c[2] || c[0]);
      if (r() < 0.3) { g.rect(x + bw / 2 - 1, top - 8, 1, 8, c[2] || c[0]); }
      if (opt.tank && r() < 0.5) { g.rect(x + 4, top - 6, 10, 6, '#7a8aa0'); g.rect(x + 4, top - 6, 10, 1, '#a8b8cc'); }
      for (let wy = top + 4; wy < h - 4; wy += opt.wy || 6) for (let wx = x + 4; wx < x + bw - 4; wx += opt.wx || 5) if (r() < 0.75) g.rect(wx, wy, opt.ww || 2, opt.wh || 3, r() < 0.15 ? opt.lit || c[1] : c[3] || c[2]);
      x += bw + ((r() * 3) | 0) * 2;
    }
    return g.canvas();
  },
  // fachadas de lojas do centro
  shops(w, seed) {
    const g = new Grid(w, H), r = U.rng(seed);
    const base = 196;
    const walls = [['#c87a5a', '#a85a40'], ['#d8c8a0', '#b0a078'], ['#9aa8b8', '#7a8898'], ['#e8d8c8', '#c0b0a0'], ['#a8c8a0', '#80a078']];
    const names = ['PADARIA', 'FARMÁCIA', 'LANCHES', 'BANCA', 'CAFÉ', 'ÓTICA', 'MERCADO', 'PASTEL'];
    let x = 0, i = 0;
    const labels = [];
    while (x < w - 40) {
      const bw = 56 + ((r() * 3) | 0) * 12, bh = 90 + ((r() * 4) | 0) * 14;
      const [wall, shade] = walls[(r() * walls.length) | 0];
      const top = base - bh;
      g.rect(x, top, bw, bh, wall); g.rect(x + bw - 3, top, 3, bh, shade); g.rect(x, top, bw, 3, shade);
      for (let wy = top + 10; wy < base - 46; wy += 18) for (let wx = x + 6; wx < x + bw - 12; wx += 14) { g.rect(wx, wy, 9, 12, '#4a6a9a'); g.rect(wx, wy, 9, 2, '#8ab0e0'); g.rect(wx - 1, wy + 12, 11, 1, shade); }
      // loja térrea
      const aw = ['#d83030', '#2a7ad8', '#2a9a58', '#f0a020'][i % 4];
      g.rect(x + 2, base - 40, bw - 6, 10, '#f8f4e8'); labels.push([names[i % names.length], x + 2 + (bw - 6) / 2, base - 38]);
      for (let ax = x + 2; ax < x + bw - 4; ax++) for (let ay = base - 30; ay < base - 24; ay++) g.set(ax, ay, Math.floor((ax - x) / 4) % 2 ? '#f4f0e8' : aw);
      g.rect(x + 6, base - 22, bw - 14, 22, '#5a7090'); g.rect(x + 6, base - 22, bw - 14, 2, '#9ab8d8');
      x += bw + 2; i++;
    }
    // postes de luz
    for (let px = 40; px < w; px += 128) { g.rect(px, base - 70, 2, 70, '#4a4e5a'); g.rect(px, base - 70, 10, 2, '#4a4e5a'); g.rect(px + 8, base - 68, 4, 2, '#fff4c0'); }
    const cv = g.canvas();
    const cx = cv.getContext('2d');
    for (const [t, lx, ly] of labels) Font.draw(t, lx, ly, '#3a2a2a', { ctx: cx, align: 'center', shadow: null });
    return cv;
  },
  busInterior() {
    const w = 128, g = new Grid(w, H);
    g.rect(0, 0, w, 34, '#d8d4c8'); g.rect(0, 14, w, 6, '#fffbe8'); g.rect(0, 13, w, 1, '#b8b4a8'); g.rect(0, 20, w, 1, '#b8b4a8');
    g.rect(0, 30, w, 2, '#c8ccd4'); g.rect(0, 32, w, 1, '#8a90a0');
    for (const sx of [20, 84]) { g.rect(sx, 33, 2, 10, '#5a5e6a'); g.ellipse(sx + 1, 46, 3.5, 3.5, '#f0c020'); g.ellipse(sx + 1, 46, 1.6, 1.6, '#cfc6b4'); }
    g.rect(0, 34, w, H - 34, '#cfc6b4');
    g.rect(0, 112, w, 80, '#b0a690'); g.rect(0, 112, w, 2, '#e0d8c4');
    g.rect(0, 120, w, 3, '#f0c020'); g.rect(0, 120, w, 1, '#fff080');
    // janelas (transparentes)
    for (const wx of [6, 70]) {
      g.rect(wx - 2, 50, 56, 58, '#4a4e5a');
      g.rect(wx, 52, 52, 54, null);
      g.rect(wx, 66, 52, 1, '#4a4e5a');
      g.rect(wx + 25, 52, 2, 14, '#4a4e5a');
    }
    // botão de parada e propaganda
    g.rect(62, 70, 4, 6, '#d8d8e0'); g.rect(63, 71, 2, 3, '#e83030');
    g.rect(14, 132, 40, 22, '#f8f8f0'); g.rect(14, 132, 40, 4, '#2a7ad8'); g.rect(17, 140, 20, 2, '#5a6070'); g.rect(17, 145, 30, 2, '#5a6070');
    const cv = g.canvas();
    return cv;
  },
  officeWall() {
    const w = 512, g = new Grid(w, H);
    g.rect(0, 0, w, 30, '#ecece8');
    for (let x = 0; x < w; x += 32) g.rect(x, 0, 1, 30, '#c8c8d0');
    g.rect(0, 15, w, 1, '#c8c8d0');
    for (let x = 8; x < w; x += 64) { g.rect(x, 5, 40, 6, '#ffffff'); g.rect(x, 11, 40, 1, '#c8ccd8'); }
    g.rect(0, 30, w, 2, '#b8b8c0');
    g.rect(0, 32, w, H - 32, '#e6e0d4');
    g.rect(0, 150, w, 46, '#c8bca8'); g.rect(0, 150, w, 2, '#ece4d4');
    const r = U.rng(42);
    for (let x = 0; x < w; x += 128) {
      // janelão
      g.rect(x + 8, 40, 80, 96, '#7a808c'); g.rect(x + 10, 42, 76, 92, null);
      g.rect(x + 47, 42, 2, 92, '#7a808c'); g.rect(x + 10, 88, 76, 2, '#7a808c');
      // elemento entre janelas
      const k = (x / 128) % 4;
      if (k === 0) { g.ellipse(x + 108, 64, 9, 9, '#ffffff'); g.ellipse(x + 108, 64, 7.5, 7.5, '#f8f8f0'); g.line(x + 108, 64, x + 108, 58, '#202028'); g.line(x + 108, 64, x + 112, 66, '#202028'); }
      if (k === 1) { g.rect(x + 96, 48, 26, 34, '#f8f8f8'); g.rect(x + 96, 48, 26, 2, '#8a90a0'); g.line(x + 100, 60, x + 116, 56, '#3a7ad8'); g.line(x + 100, 70, x + 112, 74, '#e83838'); g.rect(x + 100, 64, 14, 1, '#5a6070'); }
      if (k === 2) { g.rect(x + 98, 46, 22, 30, '#2a7ad8'); g.rect(x + 100, 48, 18, 18, '#ffd040'); }
      if (k === 3) { g.rect(x + 104, 96, 8, 20, '#e83030'); g.rect(x + 105, 92, 6, 4, '#202028'); }
    }
    const cv = g.canvas();
    const cx = cv.getContext('2d');
    for (let x = 0; x < w; x += 128) {
      const k = (x / 128) % 4;
      if (k === 1) Font.draw('SPRINT', x + 109, 52, '#202028', { ctx: cx, align: 'center', shadow: null });
      if (k === 2) Font.draw('FOCO', x + 109, 69, '#ffffff', { ctx: cx, align: 'center', shadow: null });
    }
    return cv;
  },
  serverRoom(w, seed, dark) {
    const g = new Grid(w, H), r = U.rng(seed);
    const leds = [];
    g.rect(0, 0, w, H, dark ? '#070912' : '#0c1020');
    if (!dark) { for (let y = 0; y < 40; y += 8) g.rect(0, y, w, 1, '#141a30'); g.line(0, 20, w, 26, '#e8c030'); g.line(0, 24, w, 18, '#3a7ad8'); }
    for (let x = 4; x < w; x += dark ? 26 : 40) {
      const top = dark ? 70 : 44, rw = dark ? 22 : 34;
      g.rect(x, top, rw, 196 - top, dark ? '#0e1220' : '#1a1e2a'); g.rect(x, top, rw, 2, dark ? '#161c2e' : '#2e3446');
      for (let y = top + 6; y < 190; y += dark ? 8 : 6) {
        g.rect(x + 3, y, rw - 6, dark ? 5 : 4, dark ? '#121828' : '#262c3c');
        if (!dark) leds.push([x + rw - 7, y + 1, (r() * 4) | 0], [x + rw - 10, y + 1, (r() * 4) | 0]);
      }
    }
    const cv = g.canvas();
    cv.leds = leds;
    return cv;
  },
  get(name) {
    if (this.cache[name]) return this.cache[name];
    let L;
    switch (name) {
      case 'bairro':
        L = {
          sky: this.sky([[0, '#86b2fa'], [0.45, '#a2c4ff'], [0.68, '#c8d8f8'], [0.8, '#ffb791'], [1, '#ff9a60']]),
          layers: [
            { img: this.clouds(512, 120, 11, 7, ['#e9effb', '#c8d8f4']), f: 0.06, y: 6, auto: 0.06 },
            { img: this.ridge(512, 90, 22, [[8, 2], [5, 5], [3, 9]], ['#52774e', '#3b5638', '#2e4a2c'], 3), f: 0.12, y: 134 },
            { img: this.houses(512, 7), f: 0.4, y: 0 },
          ],
        };
        break;
      case 'onibus':
        L = {
          sky: this.sky([[0, '#86b2fa'], [0.5, '#b8d4fc'], [1, '#f0e0c8']]),
          layers: [
            { img: this.skyline(512, 120, 21, [['#90a8cc', '#a8c0e0', '#7890b8', '#b8d0ec']], { min: 30, var: 60 }), f: 0, y: 40, auto: -0.8 },
            { img: this.houses(512, 19), f: 0, y: -40, auto: -4 },
          ],
          interior: this.busInterior(),
        };
        break;
      case 'centro':
        L = {
          sky: this.sky([[0, '#6e9ef0'], [0.5, '#a8c8f8'], [0.85, '#f0e4c8'], [1, '#f8d8a8']]),
          layers: [
            { img: this.clouds(512, 90, 5, 5, ['#f4f6fc', '#d0dcf4']), f: 0.05, y: 4, auto: 0.05 },
            { img: this.skyline(512, 150, 9, [['#8098c0', '#98b0d4', '#6a80a8', '#a8c0e0'], ['#7088b0', '#8aa0c8', '#5a7098', '#9ab0d4']], { min: 50, var: 90, tank: true }), f: 0.12, y: 50 },
            { img: this.shops(512, 3), f: 0.4, y: 0 },
          ],
        };
        break;
      case 'escritorio':
        L = {
          sky: this.sky([[0, '#8ab8f0'], [0.6, '#c8e0f8'], [1, '#f0e8d8']]),
          layers: [
            { img: this.skyline(512, 170, 31, [['#7a92bc', '#92aad0', '#62789e', '#a2bad8'], ['#6a82ac', '#8298c0', '#566c92', '#94acd0']], { min: 70, var: 90, tank: true }), f: 0.1, y: 40 },
            { img: this.officeWall(), f: 1, y: 0 },
          ],
        };
        break;
      case 'servidores':
        L = {
          sky: this.sky([[0, '#05060c'], [1, '#101830']]),
          layers: [
            { img: this.serverRoom(512, 4, true), f: 0.2, y: 0 },
            { img: this.serverRoom(512, 8, false), f: 0.5, y: 0 },
          ],
        };
        break;
      case 'final':
        L = {
          sky: this.sky([[0, '#3a3a8a'], [0.35, '#a85a9a'], [0.65, '#ff8a60'], [1, '#ffc070']]),
          layers: [
            { img: this.clouds(512, 110, 13, 6, ['#ffb0a0', '#e07a8a']), f: 0.06, y: 10, auto: 0.04 },
            { img: this.ridge(512, 90, 22, [[8, 2], [5, 5], [3, 9]], ['#4a3a5a', '#2e2a42', '#221e34'], 3), f: 0.12, y: 134 },
            { img: this.houses(512, 7), f: 0.4, y: 0, tint: 'rgba(60,30,80,0.35)' },
          ],
        };
        break;
    }
    this.cache[name] = L;
    return L;
  },
  // desenha o fundo do tema
  draw(name, camX, t, c = ctx) {
    const L = this.get(name);
    c.drawImage(L.sky, 0, 0);
    for (const ly of L.layers) {
      const iw = ly.img.width;
      let off = -(camX * ly.f + (ly.auto ? t * ly.auto * -1 : 0));
      off = ((off % iw) + iw) % iw - iw;
      for (let x = off; x < W; x += iw) c.drawImage(ly.img, Math.round(x), ly.y);
      if (ly.img.leds) {
        for (let x = off; x < W; x += iw) {
          for (let i = 0; i < ly.img.leds.length; i++) {
            const [lx, lyy, k] = ly.img.leds[i];
            const sx = Math.round(x + lx);
            if (sx < -2 || sx > W) continue;
            const on = ((Math.floor(t / (12 + k * 5)) + i * 7) % 5) !== 0;
            c.fillStyle = on ? ['#40f070', '#40f070', '#f8c030', '#40a0ff'][k] : '#1a2a20';
            c.fillRect(sx, lyy, 2, 1);
          }
        }
      }
      if (ly.tint) { c.fillStyle = ly.tint; c.fillRect(0, ly.y, W, H); }
    }
    if (L.interior) {
      const iw = L.interior.width;
      let off = ((-camX % iw) + iw) % iw - iw;
      for (let x = off; x < W; x += iw) c.drawImage(L.interior, Math.round(x), 0);
    }
  },
};

// usado pela ferramenta de prévia
function previewWorld(add) {
  for (const th of Object.keys(THEMES)) {
    const T = Tiles.get(th);
    for (const m of [1, 3, 5, 0]) add(th + '-g' + m, T.ground[m][0]);
    add(th + '-road', T.road[0]); add(th + '-brick', T.brick); add(th + '-q', T.q[0]); add(th + '-used', T.used);
    add(th + '-hard', T.hard[0]); add(th + '-plat', T.plat); add(th + '-spike', T.spike[0]); add(th + '-lq', T.liquidTop[0]);
    add(th + '-wet', T.wet[1]); add(th + '-prop', T.prop); add(th + '-shoot', T.shooter);
  }
  const T = Tiles.get('onibus'); add('seat', T.seat); add('seatback', T.seatBack); add('pole', T.pole); add('rail', T.rail); add('desk', T.desk);
  OBJ.mattress.forEach((c, i) => add('mattress' + i, c)); add('weight', OBJ.weight);
  OBJ.checkpoint.forEach((c, i) => add('cp' + i, c)); OBJ.cars.forEach((c, i) => add('car' + i, c.r));
  for (const k of ['bus', 'busstop', 'busdoor', 'building', 'elevator']) add(k, OBJ[k]);
  for (const k in DECOR) add('d-' + k, DECOR[k]);
}

function previewBackgrounds(add) {
  for (const n of ['bairro', 'onibus', 'centro', 'escritorio', 'servidores', 'final']) {
    const { c, x } = U.canvas(W, H);
    BG.draw(n, 300, 100, x);
    add('bg-' + n, c);
  }
}

/* casa do Kinhu (início da fase 1) e plataformas móveis */
(() => {
  OBJ.house = (() => {
    const g = new Grid(64, 64);
    g.rect(4, 24, 56, 40, '#f8b878'); g.rect(4, 24, 3, 40, '#ffd8a8'); g.rect(56, 24, 4, 40, '#d08a50');
    g.poly([[0, 27], [32, 3], [64, 27]], (x, y) => ((x + y) % 4 === 0 ? '#9a3a1c' : '#c85a30'));
    g.rect(0, 26, 64, 2, '#8a3418');
    g.rect(25, 38, 14, 26, '#6a4024'); g.rect(26, 39, 12, 25, '#a8743e'); g.rect(27, 40, 10, 10, '#b8844e'); g.rect(27, 52, 10, 10, '#b8844e'); g.set(35, 51, '#f0c020');
    for (const wx of [9, 44]) { g.rect(wx, 33, 12, 12, '#ffffff'); g.rect(wx + 1, 34, 10, 10, '#5a7ab0'); g.rect(wx + 5, 34, 1, 10, '#ffffff'); g.rect(wx + 1, 38, 10, 1, '#ffffff'); g.rect(wx + 2, 35, 2, 1, '#a8c8f0'); }
    g.rect(28, 30, 8, 5, '#2a5ac8'); g.rect(29, 31, 6, 3, '#ffffff');
    g.rect(48, 10, 7, 12, '#8a3418'); g.rect(47, 9, 9, 2, '#6a2a10');
    g.outline(OUT);
    return g.canvas();
  })();
  const plank = (style) => {
    const g = new Grid(48, 8);
    if (style === 'elevator') {
      g.rect(0, 0, 48, 8, '#9aa2b0'); g.rect(0, 0, 48, 1, '#d0d6e0');
      for (let x = 0; x < 48; x++) if ((x >> 2) % 2) g.rect(x, 5, 1, 3, '#f0c020'); else g.rect(x, 5, 1, 3, '#202028');
    } else if (style === 'crack') {
      g.rect(0, 0, 48, 6, '#b07840'); g.rect(0, 0, 48, 1, '#d09858'); g.rect(0, 5, 48, 1, '#704a20');
      g.line(14, 1, 17, 5, '#5a3a18'); g.line(32, 0, 30, 4, '#5a3a18'); g.rect(0, 6, 48, 2, null);
    } else {
      g.rect(0, 0, 48, 6, '#c88a50'); g.rect(0, 0, 48, 1, '#e8aa6a'); g.rect(0, 5, 48, 1, '#8a5a2a');
      g.rect(0, 0, 4, 7, '#8a90a0'); g.rect(44, 0, 4, 7, '#8a90a0'); g.set(2, 3, '#d0d6e0'); g.set(46, 3, '#d0d6e0');
    }
    g.outline(OUT);
    return g.canvas();
  };
  OBJ.plank = plank('wood'); OBJ.elevatorPlat = plank('elevator'); OBJ.crackPlank = plank('crack');
})();
