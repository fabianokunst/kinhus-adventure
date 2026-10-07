'use strict';
/* =========================================================
   Lógica do jogo: mundo, física, Kinhu, inimigos, itens,
   chefe, cenas de chegada e desenho do mundo.
   ========================================================= */

const SOLID = new Set(['#', '_', 'B', '?', 'H', '!', 'L', 'U', 'S', 'Z', 'Y', 'y', 'T', 'X', 'I', '^']);
const ONEWAY = new Set(['=', 'D', '-']);
const GROUNDISH = new Set(['#', '_', 'I', 'Z']);
const ENEMY_CHARS = 'dpxktlwiufr';

const Game = {
  lives: 3, score: 0, coins: 0, hearts: 3, maxHearts: 3, power: 0,
  levelIdx: 0, checkpoint: false, hiscore: 0, unlocked: 1, completed: false,
  reset() { this.lives = 3; this.score = 0; this.coins = 0; this.hearts = 3; this.power = 0; this.levelIdx = 0; this.checkpoint = false; },
};

let World = null;

/* ---------------- utilidades de mapa ---------------- */
function tileAt(tx, ty) {
  if (tx < 0 || tx >= World.w) return 'Z';
  if (ty < 0 || ty >= World.h) return '.';
  return World.map[ty][tx];
}
function setTile(tx, ty, c) { if (tx >= 0 && ty >= 0 && tx < World.w && ty < World.h) World.map[ty][tx] = c; }
const isSolid = t => SOLID.has(t);

function moveBody(b, o = {}) {
  b.hitWall = 0;
  if (b.vx) {
    b.x += b.vx;
    const y0 = Math.floor(b.y / TS), y1 = Math.floor((b.y + b.h - 0.01) / TS);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + b.w - 0.01) / TS);
      for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { b.x = tx * TS - b.w; b.hitWall = 1; b.wallTile = tileAt(tx, ty); break; }
    } else {
      const tx = Math.floor(b.x / TS);
      for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { b.x = (tx + 1) * TS; b.hitWall = -1; b.wallTile = tileAt(tx, ty); break; }
    }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy;
  b.onGround = false; b.headHit = null;
  const x0 = Math.floor((b.x + 0.01) / TS), x1 = Math.floor((b.x + b.w - 0.01) / TS);
  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h - 0.01) / TS);
    let hit = false;
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, ty);
      if (isSolid(t) || (ONEWAY.has(t) && !o.drop && prevBottom <= ty * TS + 0.6)) { hit = true; break; }
    }
    if (hit) { b.y = ty * TS - b.h; b.vy = 0; b.onGround = true; }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / TS);
    const sL = isSolid(tileAt(x0, ty)), sR = isSolid(tileAt(x1, ty));
    if (sL || sR) {
      // correção de quina: empurra o Kinhu para o lado se encostou só na pontinha
      if (o.corner && sL && !sR && (x0 + 1) * TS - b.x <= 5 && !isSolid(tileAt(x0 + 1, ty))) { b.x = (x0 + 1) * TS; }
      else if (o.corner && sR && !sL && b.x + b.w - x1 * TS <= 5 && !isSolid(tileAt(x1 - 1, ty))) { b.x = x1 * TS - b.w; }
      else {
        const cx = Math.floor((b.x + b.w / 2) / TS);
        const htx = isSolid(tileAt(cx, ty)) ? cx : sL ? x0 : x1;
        b.y = (ty + 1) * TS; b.vy = 0; b.headHit = { tx: htx, ty };
      }
    }
  }
}
function groundTileUnder(b) {
  const ty = Math.floor((b.y + b.h + 1) / TS);
  const c = tileAt(Math.floor((b.x + b.w / 2) / TS), ty);
  if (c !== '.') return c;
  return tileAt(Math.floor((b.x + 1) / TS), ty) !== '.' ? tileAt(Math.floor((b.x + 1) / TS), ty) : tileAt(Math.floor((b.x + b.w - 1) / TS), ty);
}
function onOneWay(b) {
  const ty = Math.floor((b.y + b.h + 1) / TS);
  const a = tileAt(Math.floor((b.x + 1) / TS), ty), c = tileAt(Math.floor((b.x + b.w - 1) / TS), ty);
  return (ONEWAY.has(a) || a === '.') && (ONEWAY.has(c) || c === '.') && (ONEWAY.has(a) || ONEWAY.has(c)) || (b.ride && b.ride.oneway);
}
// borda à frente (para inimigos que não caem)
function edgeAhead(e) {
  const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const t = tileAt(Math.floor(fx / TS), Math.floor((e.y + e.h + 2) / TS));
  return !isSolid(t) && !ONEWAY.has(t);
}

/* ---------------- efeitos ---------------- */
function part(o) { World.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 30, t: 0, size: 2, color: '#ffffff' }, o)); }
function dust(x, y, n = 4) { for (let i = 0; i < n; i++) part({ x: x + (Math.random() - 0.5) * 8, y: y - Math.random() * 3, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.6, life: 18 + Math.random() * 10, color: '#e8e4d8', size: 2, kind: 'dust' }); }
function sparkle(x, y, n = 6, color = '#fff8a0') { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; part({ x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 18, color, size: 2, kind: 'spark' }); } }
function debris(x, y, color) { for (const [dx, dy, vx] of [[2, 2, -1.4], [10, 2, 1.4], [2, 10, -1], [10, 10, 1]]) part({ x: x + dx, y: y + dy, vx, vy: -5 + dy * 0.15, g: 0.3, life: 60, color, size: 5, kind: 'debris' }); }
function popup(x, y, text, color = '#ffffff') { World.parts.push({ x, y, vx: 0, vy: -0.6, g: 0, life: 50, t: 0, text, color, kind: 'text' }); }
function shake(n) { World.cam.shake = Math.max(World.cam.shake, n); }
function addScore(n, x, y) { Game.score += n; if (x !== undefined) popup(x, y, String(n)); }
function addCoin(x, y) {
  Game.coins++; Game.score += 100; Sound.fx('coin');
  if (Game.coins >= 100) { Game.coins -= 100; oneUp(x, y); }
}
function oneUp(x, y) { Game.lives = Math.min(99, Game.lives + 1); Sound.fx('oneup'); popup(x, y - 8, '1UP', '#80ff80'); }

/* ---------------- carregar fase ---------------- */
function loadLevel(idx, fromCheckpoint) {
  const def = LEVELS[idx];
  const rows = buildLevelRows(def);
  const map = rows.map(r => r.split(''));
  const th = THEMES[def.theme];
  World = {
    idx, def, th, theme: def.theme, T: Tiles.get(def.theme), w: rows[0].length, h: rows.length, map,
    ents: [], projs: [], parts: [], plats: [], decor: [], bumps: [],
    cam: { x: 0, shake: 0, lock: null }, time: def.time, timeT: 0, hurry: false, t: 0,
    start: null, goal: null, cps: [], arena: null, boss: null, house: null,
    brake: def.brakes ? { t: 420, phase: 'idle', kind: null, k: 0 } : null, push: 0, busSpeed: 1,
    clear: null, banner: null, bannerT: 0,
  };
  const Wd = World;
  for (let y = 0; y < Wd.h; y++) for (let x = 0; x < Wd.w; x++) {
    const ch = map[y][x];
    const px = x * TS, py = y * TS;
    let clearIt = true;
    switch (ch) {
      case 'P': Wd.start = { x: px + 2, y: py + TS - 21 }; break;
      case 'G': Wd.goal = { tx: x, x: px, y: py + TS, kind: th.goal }; break;
      case 'E': Wd.house = { x: px, y: py + TS }; break;
      case 'C': Wd.cps.push(addEnt({ kind: 'checkpoint', x: px, y: py + TS - 32, w: 16, h: 32, on: false })); break;
      case 'O': addEnt({ kind: 'spring', x: px + 1, y: py + 6, w: 14, h: 10, t: 0 }); break;
      case 'Q': addEnt({ kind: 'crusher', x: px + 1, y: py, w: 30, h: 30, homeY: py, state: 'wait', t: 0, vy: 0, dx: 0, dy: 0, prevY: py, oneway: true, alive: true, plat: true }); break;
      case 'm': case 'M': Wd.plats.push({ kind: 'h', x0: px - 16, y0: py, x: px - 16, y: py, w: 48, h: 8, amp: 48, ph: ch === 'M' ? Math.PI : 0, dx: 0, dy: 0, prevY: py, oneway: true, alive: true }); break;
      case 'v': Wd.plats.push({ kind: 'v', x0: px, y0: py, x: px, y: py, w: 48, h: 8, amp: 32, ph: 0, dx: 0, dy: 0, prevY: py, oneway: true, alive: true }); break;
      case 'n': Wd.plats.push({ kind: 'fall', x0: px, y0: py, x: px, y: py, w: 48, h: 8, state: 'idle', t: 0, vy: 0, dx: 0, dy: 0, prevY: py, oneway: true, alive: true }); break;
      case 'V': {
        let x0 = x;
        while (x0 > 0 && tileAt(x0 - 1, y + 1) === '_') x0--;
        addEnt({ kind: 'lane', x: x0 * TS, x1: px + TS, y: py + TS - 24, timer: 60 });
        break;
      }
      case 'A': Wd.arena = { tx: x, x: px, active: false }; break;
      case 'W': Wd.boss = addEnt(makeBoss(px, py + TS)); break;
      case 'X': addEnt({ kind: 'shooter', tx: x, ty: y, x: px, y: py, w: 16, h: 16, timer: 90 + ((x * 37) % 60) }); clearIt = false; break;
      default:
        if (ENEMY_CHARS.includes(ch)) addEnt(makeEnemy(ch, px, py + TS));
        else clearIt = false;
    }
    if (clearIt) map[y][x] = '.';
  }
  buildDecor();
  let sx = Wd.start.x, sy = Wd.start.y;
  if (fromCheckpoint && Wd.cps.length) {
    const cp = Wd.cps[0];
    cp.on = true;
    sx = cp.x + 2; sy = cp.y + 32 - 21;
  }
  Wd.player = makePlayer(sx, sy);
  Wd.cam.x = U.clamp(sx - W / 2 + 40, 0, Wd.w * TS - W);
  return Wd;
}
function addEnt(e) { e.alive = e.alive !== false; e.t = e.t || 0; World.ents.push(e); return e; }

function buildDecor() {
  const Wd = World, r = U.rng(Wd.def.id * 1013);
  const lists = {
    bairro: [['pot', 0.07], ['tuft', 0.14], ['bags', 0.04], ['phone', 0.025]],
    centro: [['bench', 0.035], ['newspaper', 0.02], ['tuft', 0.05], ['pot', 0.03]],
    escritorio: [['plant', 0.05], ['chair', 0.05], ['stack', 0.04]],
    servidores: [['cables', 0.12]],
    none: [],
  };
  const list = lists[Wd.th.decor] || [];
  const busy = new Set();
  for (const e of Wd.ents) busy.add(Math.floor(e.x / TS));
  if (Wd.goal) for (let k = -2; k < 5; k++) busy.add(Wd.goal.tx + k);
  if (Wd.start) busy.add(Math.floor(Wd.start.x / TS));
  for (let x = 1; x < Wd.w - 1; x++) {
    for (let y = 1; y < Wd.h; y++) {
      const t = Wd.map[y][x], up = Wd.map[y - 1][x];
      if (up !== '.') continue;
      if (t === 'D') {
        const k = r();
        if (k < 0.45) Wd.decor.push({ img: DECOR.monitor, x: x * TS + 1, y: y * TS - 12 });
        else if (k < 0.65) Wd.decor.push({ img: DECOR.mug, x: x * TS + 5, y: y * TS - 7 });
        else if (k < 0.8) Wd.decor.push({ img: DECOR.stack, x: x * TS + 2, y: y * TS - 8 });
        continue;
      }
      if (t === 'I' && Wd.map[y][x - 1] !== 'I') { Wd.decor.push({ img: DECOR.sign, x: x * TS + 1, y: y * TS - 18 }); continue; }
      if (t !== '#' || busy.has(x)) continue;
      for (const [name, p] of list) {
        if (r() < p) {
          const img = DECOR[name];
          if (img.width > 16 && (Wd.map[y][x + 1] !== '#' || Wd.map[y - 1][x + 1] !== '.')) continue;
          Wd.decor.push({ img, x: x * TS + Math.floor((16 - Math.min(img.width, 16)) / 2), y: y * TS - img.height });
          if (img.width > 16) x++;
          break;
        }
      }
    }
  }
}

/* ---------------- jogador ---------------- */
function makePlayer(x, y) {
  return { x, y, w: 12, h: 21, vx: 0, vy: 0, facing: 1, onGround: false, coyote: 0, jumpBuf: 0, inv: 0, wild: 0, ride: null, prevY: y,
    dead: false, deadT: 0, anim: 0, look: 0, combo: 0, hidden: false, control: true, skid: false, drop: 0, blink: 0, spikeT: 0 };
}

function updatePlayer(p) {
  if (p.dead) { updateDeath(p); return; }
  const ctl = p.control;
  const L = ctl && Input.down('left'), R = ctl && Input.down('right'), run = ctl && Input.down('run');
  if (p.ride) {
    const r = p.ride;
    if (!r.alive || p.x + p.w < r.x + 1 || p.x > r.x + r.w - 1) p.ride = null;
    else { p.x += r.dx; p.y = r.y - p.h; }
  }
  const gt = p.onGround ? groundTileUnder(p) : null;
  const ice = gt === 'I';
  const maxS = run ? 2.9 : 1.9;
  const acc = p.onGround ? (ice ? 0.035 : 0.13) : 0.09;
  const prevSpeed = Math.abs(p.vx);
  if (L && !R) { p.vx -= p.vx > 0 && p.onGround && !ice ? acc * 2.4 : acc; p.facing = -1; }
  else if (R && !L) { p.vx += p.vx < 0 && p.onGround && !ice ? acc * 2.4 : acc; p.facing = 1; }
  else if (!World.push) { p.vx *= p.onGround ? (ice ? 0.985 : 0.78) : 0.97; if (Math.abs(p.vx) < 0.04) p.vx = 0; }
  const lim = World.push ? 4 : maxS;
  if (Math.abs(p.vx) > lim) p.vx = U.sign(p.vx) * Math.max(lim, Math.min(Math.abs(p.vx), prevSpeed) - (World.push ? 0.4 : 0.08));
  if (World.push && (p.onGround || p.ride)) p.vx += World.push;
  p.skid = p.onGround && ((L && p.vx > 1) || (R && p.vx < -1));
  if (p.skid && World.t % 4 === 0) dust(p.x + p.w / 2, p.y + p.h, 1);
  // pulo (com memória de botão e "tempo de coiote")
  if (ctl && Input.pressed('jump')) p.jumpBuf = 7; else if (p.jumpBuf > 0) p.jumpBuf--;
  if (p.onGround || p.ride) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    if (ctl && Input.down('down') && onOneWay(p)) { p.drop = 12; p.y += 2; p.ride = null; }
    else {
      p.vy = -(5.9 + Math.abs(p.vx) * 0.22);
      p.onGround = false; p.ride = null;
      Sound.fx('jump');
    }
    p.jumpBuf = 0; p.coyote = 0;
  }
  const hold = ctl && Input.down('jump');
  p.vy += p.vy < 0 && hold ? 0.28 : 0.55;
  if (p.vy > 6.5) p.vy = 6.5;
  if (ctl && Input.pressed('run') && Game.power === 1) throwBean(p);
  p.prevY = p.y;
  const wasGround = p.onGround;
  moveBody(p, { corner: true, drop: p.drop > 0 });
  if (p.drop > 0) p.drop--;
  landOnPlats(p);
  if (p.onGround && !wasGround && p.vy === 0) dust(p.x + p.w / 2, p.y + p.h, 3);
  if (p.headHit) bumpBlock(p.headHit.tx, p.headHit.ty);
  if (p.onGround && !p.ride) p.combo = 0;
  collectTiles(p);
  hazards(p);
  if (p.inv > 0) p.inv--;
  if (p.wild > 0) {
    p.wild--;
    if (World.t % 3 === 0) part({ x: p.x + Math.random() * p.w, y: p.y + Math.random() * p.h, vy: -0.5, life: 16, color: ['#ffe040', '#ff80c0', '#60e0ff'][World.t % 3], size: 2, kind: 'spark' });
    if (p.wild === 0 && !World.clear && !World.bossFight) Sound.play(World.th.music, true);
    if (p.wild === 0 && World.bossFight) Sound.play('boss', true);
  }
  // animação
  if (Math.abs(p.vx) > 0.2 && p.onGround) p.anim += Math.abs(p.vx) * 0.09; else if (p.onGround) p.anim = 0;
  p.blink = (p.blink + 1) % 200;
}

function landOnPlats(p) {
  let landed = null;
  if (p.vy >= 0 && p.drop <= 0) {
    for (const pl of World.plats) {
      if (!pl.alive) continue;
      if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 && p.prevY + p.h <= pl.prevY + 2 + Math.max(0, pl.dy) && p.y + p.h >= pl.y) {
        landed = pl; break;
      }
    }
  }
  if (landed) {
    p.y = landed.y - p.h; p.vy = 0; p.onGround = true; p.ride = landed;
    if (landed.kind === 'fall' && landed.state === 'idle') { landed.state = 'shake'; landed.t = 0; }
  } else if (p.ride && (p.vy < 0 || !p.ride.alive)) p.ride = null;
  else if (p.ride && p.vy >= 0) { // continua em cima
    const r = p.ride;
    if (p.x + p.w > r.x + 1 && p.x < r.x + r.w - 1 && Math.abs(p.y + p.h - r.y) < 3) { p.y = r.y - p.h; p.vy = 0; p.onGround = true; }
    else p.ride = null;
  }
}

function collectTiles(p) {
  const x0 = Math.floor((p.x + 1) / TS), x1 = Math.floor((p.x + p.w - 1) / TS);
  const y0 = Math.floor((p.y + 2) / TS), y1 = Math.floor((p.y + p.h - 2) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tileAt(tx, ty) === 'c') {
      setTile(tx, ty, '.');
      addCoin(tx * TS + 8, ty * TS);
      sparkle(tx * TS + 8, ty * TS + 8, 5);
    }
  }
}

function hazards(p) {
  // espinhos (vidro, pregos, tachinhas, faíscas)
  const x0 = Math.floor((p.x + 2) / TS), x1 = Math.floor((p.x + p.w - 2) / TS);
  const under = Math.floor((p.y + p.h + 1) / TS);
  let spike = false;
  if (p.onGround) for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, under) === '^') spike = true;
  if (p.hitWall && p.wallTile === '^') spike = true;
  if (spike) { hurtPlayer(); if (!p.dead) { p.vy = -5.5; p.onGround = false; } }
  // líquido (esgoto / água eletrificada)
  const lt = tileAt(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h - 5) / TS));
  if (lt === '~') { splash(p.x + p.w / 2, p.y + p.h); killPlayer('liquid'); return; }
  if (p.y > World.h * TS + 24) killPlayer('fall');
}
function splash(x, y) { Sound.fx('splash'); for (let i = 0; i < 10; i++) part({ x, y, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 3, g: 0.25, life: 40, color: World.th.liquid === 'electric' ? '#8ad0ff' : '#9ac06a', size: 2, kind: 'drop' }); }

function hurtPlayer() {
  const p = World.player;
  if (p.dead || p.inv > 0 || p.wild > 0 || World.clear) return;
  if (Game.power === 1) { Game.power = 0; p.inv = 120; Sound.fx('hurt'); popup(p.x, p.y - 8, 'SEM CAFÉ!', '#ffb0a0'); }
  else {
    Game.hearts--;
    if (Game.hearts <= 0) { killPlayer('hit'); return; }
    p.inv = 120; Sound.fx('hurt');
  }
  p.vy = Math.min(p.vy, -3); p.vx = -p.facing * 1.6; p.onGround = false; p.ride = null;
  shake(4);
}
function killPlayer(how) {
  const p = World.player;
  if (p.dead || World.clear) return;
  p.dead = true; p.deadT = 0; p.how = how; p.vx = 0; p.vy = 0; Game.hearts = 0;
  Sound.stop(); Sound.play('death');
}
function updateDeath(p) {
  p.deadT++;
  if (p.how === 'hit' || p.how === 'time') {
    if (p.deadT === 30) p.vy = -6.5;
    if (p.deadT > 30) { p.vy += 0.35; p.y += p.vy; }
  }
  if (p.deadT > 170) App.onDeath();
}

function throwBean(p) {
  if (World.projs.filter(b => b.type === 'bean').length >= 2) return;
  World.projs.push({ type: 'bean', x: p.x + (p.facing > 0 ? p.w : -6), y: p.y + 8, w: 6, h: 6, vx: p.facing * 3.6 + p.vx * 0.3, vy: -1.5, life: 150, hostile: false, t: 0 });
  Sound.fx('throw');
}

/* ---------------- blocos ---------------- */
function bumpBlock(tx, ty) {
  const t = tileAt(tx, ty);
  const bx = tx * TS, by = ty * TS;
  if ('?HL!'.includes(t)) {
    setTile(tx, ty, 'U');
    World.bumps.push({ tx, ty, t: 0 });
    if (t === '?') popCoin(bx, by);
    else {
      const kind = t === 'L' ? 'badge' : t === '!' ? 'claws' : Game.hearts < Game.maxHearts ? 'hotdog' : 'coffee';
      spawnItem(kind, bx, by);
      Sound.fx('appear');
    }
    Sound.fx('bump');
  } else if (t === 'B') {
    setTile(tx, ty, '.');
    const col = { clay: '#c4522e', box: '#c8945a', archive: '#d8c49a', crate: '#5a6478' }[World.th.brick];
    debris(bx, by, col); addScore(50); Sound.fx('break');
  } else Sound.fx('bump');
  for (const e of World.ents) {
    if (e.enemy && e.alive && !e.dying && e.y + e.h >= by - 3 && e.y + e.h <= by + 4 && e.x + e.w > bx && e.x < bx + TS) killEnemy(e, 'bump');
  }
  if (tileAt(tx, ty - 1) === 'c') { setTile(tx, ty - 1, '.'); popCoin(bx, by - TS); }
}
function popCoin(bx, by) {
  addEnt({ kind: 'popcoin', x: bx, y: by - 16, vy: -5.5, t: 0 });
  addCoin(bx + 8, by);
}
function spawnItem(kind, bx, by) {
  addEnt({ kind: 'item', item: kind, x: bx + 2, y: by + 2, w: 12, h: 12, vx: 0, vy: 0, emerge: 14, dir: World.player.x + 6 < bx + 8 ? -1 : 1 });
}

/* ---------------- inimigos ---------------- */
function makeEnemy(ch, px, bottom) {
  const base = { enemy: true, vx: 0, vy: 0, dir: -1, t: 0, frame: 0, dying: false, deadT: 0, stomp: true, score: 100 };
  const at = (w, h) => ({ x: px + (16 - w) / 2, y: bottom - h, w, h });
  switch (ch) {
    case 'd': return Object.assign(base, at(16, 13), { type: 'dog', state: 'walk', speed: 0.5, score: 200 });
    case 'p': return Object.assign(base, at(14, 10), { type: 'pigeon', baseY: bottom - 16, drop: 60, fly: true });
    case 'x': return Object.assign(base, at(12, 6), { type: 'roach', speed: 1.1 });
    case 'k': return Object.assign(base, at(12, 20), { type: 'skater', speed: 2.1, score: 200 });
    case 't': return Object.assign(base, at(12, 20), { type: 'thief', state: 'walk', speed: 0.5, score: 300 });
    case 'l': return Object.assign(base, at(12, 22), { type: 'lady', state: 'idle', speed: 0.25, stomp: 'bounce', swing: 0, cool: 60 });
    case 'w': return Object.assign(base, at(12, 21), { type: 'coworker', cool: 90, act: 0, score: 200 });
    case 'i': return Object.assign(base, at(12, 20), { type: 'intern', speed: 1.5, score: 200 });
    case 'u': return Object.assign(base, at(12, 9), { type: 'bug', speed: 0.5 });
    case 'f': return Object.assign(base, at(12, 10), { type: 'flybug', baseY: bottom - 16, fly: true, score: 200 });
    case 'r': return Object.assign(base, at(12, 21), { type: 'worker', speed: 0.45 });
  }
}

function killEnemy(e, how) {
  if (e.dying || !e.alive) return;
  e.dying = true; e.deadT = 0; e.how = how;
  if (how === 'stomp' && (e.type === 'bug' || e.type === 'roach')) { e.squish = true; }
  else { e.vy = -3.5; e.vx = (World.player.x < e.x ? 1 : -1) * 1; }
  if (e.type === 'thief') for (let i = 0; i < 4; i++) addEnt({ kind: 'coin', x: e.x, y: e.y, w: 10, h: 10, vx: (i - 1.5) * 0.9, vy: -4 - Math.random() * 2, t: 0 });
  Sound.fx(how === 'stomp' ? 'stomp' : 'kill');
  const p = World.player;
  let pts = e.score;
  if (how === 'stomp') {
    const table = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
    if (p.combo >= table.length) { oneUp(e.x, e.y); pts = 0; }
    else pts = Math.max(e.score, table[p.combo]);
    p.combo++;
  }
  if (pts) addScore(pts, e.x, e.y - 4);
  for (let i = 0; i < 3; i++) part({ x: e.x + e.w / 2, y: e.y, vx: (i - 1) * 0.8, vy: -1.5, life: 30, color: '#ffe060', size: 2, kind: 'spark' });
}

function updateEnemy(e) {
  const p = World.player;
  e.t++;
  if (e.dying) {
    e.deadT++;
    if (e.squish) { if (e.deadT > 30) e.alive = false; return; }
    e.vy += 0.3; e.x += e.vx; e.y += e.vy;
    if (e.y > World.h * TS + 40) e.alive = false;
    return;
  }
  const pdx = p.x + p.w / 2 - (e.x + e.w / 2), pdy = p.y + p.h - (e.y + e.h);
  const walker = (stopAtEdges, speed) => {
    e.vx = e.dir * speed + (World.push && e.onGround ? World.push * 5 : 0);
    e.vy = Math.min(e.vy + 0.4, 6);
    moveBody(e);
    if (e.hitWall) e.dir = -e.hitWall;
    else if (stopAtEdges && e.onGround && edgeAhead(e)) e.dir = -e.dir;
    if (e.y > World.h * TS + 40) e.alive = false;
  };
  switch (e.type) {
    case 'dog':
      if (e.state === 'walk') {
        walker(true, e.speed);
        if (Math.abs(pdx) < 96 && Math.abs(pdy) < 28 && U.sign(pdx) === e.dir && !p.dead) { e.state = 'bark'; e.st = 0; Sound.fx('bark'); }
        if (e.t % 160 === 0) e.dir = -e.dir;
      } else if (e.state === 'bark') {
        e.vx = 0; e.vy = Math.min(e.vy + 0.4, 6); moveBody(e);
        if (++e.st > 26) { e.state = 'run'; e.st = 0; }
      } else {
        walker(true, 2);
        if (++e.st > 110) { e.state = 'walk'; }
      }
      e.frame = Math.floor(e.t / (e.state === 'run' ? 5 : 10)) % 2;
      break;
    case 'roach':
      walker(false, e.speed);
      e.frame = Math.floor(e.t / 4) % 2;
      break;
    case 'bug':
      walker(false, e.speed);
      e.frame = Math.floor(e.t / 10) % 2;
      break;
    case 'worker':
      walker(true, e.speed);
      e.frame = Math.floor(e.t / 10) % 4;
      break;
    case 'skater':
      walker(false, e.speed);
      e.frame = 0;
      break;
    case 'intern':
      walker(true, e.speed);
      e.frame = Math.floor(e.t / 6) % 4;
      break;
    case 'thief':
      if (e.state === 'walk') {
        walker(true, e.speed);
        if (Math.abs(pdx) < 110 && Math.abs(pdy) < 30 && !p.dead) { e.state = 'dash'; e.dir = U.sign(pdx) || -1; }
      } else if (e.state === 'dash') walker(true, 2.3);
      else if (e.state === 'flee') { e.vx = e.dir * 3; e.vy = Math.min(e.vy + 0.4, 6); moveBody(e); if (e.hitWall) e.dir = -e.dir; if (Math.abs(e.x - World.cam.x - W / 2) > W) e.alive = false; }
      e.frame = Math.floor(e.t / (e.state === 'walk' ? 10 : 5)) % 4;
      break;
    case 'lady':
      e.vy = Math.min(e.vy + 0.4, 6);
      if (e.swing > 0) { e.swing--; e.vx = 0; }
      else {
        e.dir = U.sign(pdx) || e.dir;
        e.vx = Math.abs(pdx) > 40 ? 0 : 0;
        if (--e.cool <= 0 && Math.abs(pdx) < 44 && Math.abs(pdy) < 30) { e.swing = 26; e.cool = 70; }
      }
      moveBody(e);
      e.frame = e.swing > 0 ? 'act' : Math.floor(e.t / 30) % 2 ? 0 : 2;
      break;
    case 'coworker':
      e.vy = Math.min(e.vy + 0.4, 6); e.vx = 0; moveBody(e);
      e.dir = U.sign(pdx) || e.dir;
      if (e.act > 0) e.act--;
      if (--e.cool <= 0 && Math.abs(pdx) < 170 && Math.abs(pdy) < 80 && !p.dead) {
        e.cool = 130; e.act = 24;
        World.projs.push({ type: 'plane', x: e.x + (e.dir > 0 ? e.w : -8), y: e.y + 4, w: 8, h: 4, vx: e.dir * 1.7, vy: 0, life: 200, hostile: true, t: 0, dir: e.dir });
        Sound.fx('throw');
      }
      e.frame = e.act > 0 ? 'act' : 0;
      break;
    case 'pigeon':
      if (!e.started) { e.started = true; e.dir = pdx < 0 ? -1 : 1; }
      e.x += e.dir * 0.8;
      e.y = e.baseY + Math.sin(e.t * 0.05) * 8;
      if (--e.drop <= 0 && Math.abs(pdx) < 10 && pdy > 0 && !p.dead) {
        e.drop = 90;
        World.projs.push({ type: 'poop', x: e.x + 5, y: e.y + 8, w: 3, h: 3, vx: 0, vy: 1, g: 0.15, life: 120, hostile: true, t: 0 });
      }
      if (Math.abs(e.x - World.cam.x - W / 2) > W * 1.5) e.alive = false;
      e.frame = Math.floor(e.t / 8) % 2;
      break;
    case 'flybug': {
      const tx = U.clamp(pdx, -1, 1) * 0.5;
      e.x += tx;
      e.baseY += U.clamp((p.y - 6) - e.baseY, -0.25, 0.25);
      e.y = e.baseY + Math.sin(e.t * 0.08) * 10;
      e.dir = U.sign(pdx) || e.dir;
      e.frame = Math.floor(e.t / 4) % 2;
      break;
    }
  }
}

/* ---------------- itens, molas, carros, etc ---------------- */
function updateEnt(e) {
  const p = World.player;
  switch (e.kind) {
    case 'popcoin':
      e.t++; e.vy += 0.35; e.y += e.vy;
      if (e.t > 26) { e.alive = false; sparkle(e.x + 8, e.y + 8, 4); }
      break;
    case 'coin':
      e.t++; e.vy = Math.min(e.vy + 0.3, 5); moveBody(e);
      if (e.onGround) e.vy = -2;
      e.vx *= 0.98;
      if (e.t > 20 && U.overlap(e, p) && !p.dead) { e.alive = false; addCoin(e.x, e.y); sparkle(e.x + 5, e.y + 5); }
      if (e.t > 400) e.alive = false;
      break;
    case 'item': updateItem(e, p); break;
    case 'spring':
      if (e.t > 0) e.t--;
      if (!p.dead && p.vy > 0 && p.x + p.w > e.x && p.x < e.x + e.w && p.prevY + p.h <= e.y + 6 && p.y + p.h >= e.y) {
        p.y = e.y - p.h; p.vy = -9.5; p.onGround = false; p.ride = null; e.t = 12; Sound.fx('spring'); p.combo = 0;
      }
      break;
    case 'checkpoint':
      if (!e.on && p.x + p.w / 2 > e.x + 8 && !p.dead) {
        e.on = true; Game.checkpoint = true; Sound.fx('check'); popup(e.x - 20, e.y - 6, 'BATEU O PONTO!', '#80ff80');
        sparkle(e.x + 8, e.y + 4, 10, '#80ff80');
        App.saveProgress();
      }
      break;
    case 'crusher': updateCrusher(e, p); break;
    case 'shooter': updateShooter(e, p); break;
    case 'lane': updateLane(e, p); break;
    case 'car': updateCar(e, p); break;
    case 'boss': updateBoss(e, p); break;
    default: if (e.enemy) updateEnemy(e);
  }
}

function updateItem(e, p) {
  e.t++;
  if (e.emerge > 0) { e.y -= 0.5; e.emerge -= 0.5; return; }
  switch (e.item) {
    case 'hotdog': case 'badge':
      e.vx = e.dir * 0.9; e.vy = Math.min(e.vy + 0.35, 6); moveBody(e);
      if (e.hitWall) e.dir = -e.hitWall;
      break;
    case 'coffee': e.vy = Math.min(e.vy + 0.35, 6); e.vx = 0; moveBody(e); break;
    case 'claws':
      e.vx = e.dir * 1.1; e.vy = Math.min(e.vy + 0.3, 6); moveBody(e);
      if (e.onGround) e.vy = -4.2;
      if (e.hitWall) e.dir = -e.hitWall;
      break;
    case 'trophy':
      e.vy = Math.min(e.vy + 0.2, 3); moveBody(e);
      if (World.t % 6 === 0) part({ x: e.x + Math.random() * 12, y: e.y + Math.random() * 12, vy: -0.4, life: 20, color: '#fff4a0', size: 1, kind: 'spark' });
      break;
  }
  if (e.y > World.h * TS + 20) e.alive = false;
  if (!p.dead && U.overlap(e, p)) {
    e.alive = false;
    const cx = e.x, cy = e.y - 6;
    switch (e.item) {
      case 'hotdog':
        if (Game.hearts < Game.maxHearts) { Game.hearts++; popup(cx - 6, cy, '+♥', '#ff8090'); } else addScore(1000, cx, cy);
        Sound.fx('eat'); break;
      case 'coffee': {
        Game.power = 1; Sound.fx('power'); popup(cx - 10, cy, 'CAFÉ!', '#ffd0a0'); Game.score += 1000;
        const touch = typeof document !== 'undefined' && document.body && document.body.classList.contains('touch');
        World.banner = touch ? 'APERTE B PARA JOGAR GRÃOS!' : 'APERTE X PARA JOGAR GRÃOS!'; World.bannerT = 160;
        break;
      }
      case 'claws':
        p.wild = 600; Sound.fx('kinhurine'); Sound.play('kinhurine', true);
        popup(cx - 24, cy, 'KINHURINE!', '#ffe040'); Game.score += 1000; shake(6);
        break;
      case 'badge': oneUp(cx, cy); break;
      case 'trophy': App.bossClear(); break;
    }
    sparkle(e.x + 6, e.y + 6, 8);
  }
}

function updateCrusher(e, p) {
  e.prevY = e.y; e.t++;
  const pc = p.x + p.w / 2, cx = e.x + e.w / 2;
  switch (e.state) {
    case 'wait':
      if (Math.abs(pc - cx) < 26 && p.y > e.y && !p.dead && e.t > 40) { e.state = 'fall'; e.vy = 0; }
      break;
    case 'fall': {
      e.vy = Math.min(e.vy + 0.5, 7);
      const before = e.y;
      const body = { x: e.x, y: e.y, w: e.w, h: e.h, vx: 0, vy: e.vy };
      moveBody(body);
      e.y = body.y;
      if (body.onGround || e.y > World.h * TS) { e.state = 'land'; e.t = 0; shake(8); Sound.fx('thud'); dust(e.x + 4, e.y + e.h, 4); dust(e.x + e.w - 4, e.y + e.h, 4); }
      e.dy = e.y - before;
      break;
    }
    case 'land': if (e.t > 50) { e.state = 'rise'; } e.dy = 0; break;
    case 'rise':
      e.y = Math.max(e.homeY, e.y - 1); e.dy = -1;
      if (e.y <= e.homeY) { e.state = 'wait'; e.t = 0; e.dy = 0; }
      break;
  }
  e.dx = 0;
  // dano: tocar na lateral ou embaixo
  const hit = { x: e.x + 2, y: e.y + 6, w: e.w - 4, h: e.h - 6 };
  if (!p.dead && p.ride !== e && U.overlap(hit, p) && e.state !== 'wait' && e.state !== 'land') hurtPlayer();
  if (!p.dead && e.state === 'fall' && U.overlap(hit, p) && p.onGround && p.y > e.y + 10) hurtPlayer();
}

function updateShooter(e, p) {
  const pdx = p.x + p.w / 2 - (e.x + 8), pdy = p.y + p.h / 2 - (e.y + 8);
  if (--e.timer > 0 || p.dead) return;
  if (Math.abs(pdx) < 200 && Math.abs(pdx) > 20 && Math.abs(pdy) < 70 && e.x > World.cam.x - 16 && e.x < World.cam.x + W) {
    const dir = U.sign(pdx);
    const style = World.th.shooter;
    const type = style === 'printer' ? 'paper' : style === 'hydrant' ? 'water' : 'zap';
    World.projs.push({ type, x: e.x + (dir > 0 ? 16 : -8), y: e.y + (style === 'printer' ? 7 : 5), w: 8, h: 5, vx: dir * (type === 'water' ? 2.2 : 1.5), vy: type === 'water' ? -1.2 : 0, g: type === 'water' ? 0.05 : 0, life: 220, hostile: true, t: 0, dir });
    Sound.fx(type === 'zap' ? 'zap' : 'shoot');
    e.timer = 150;
  } else e.timer = 20;
}

function updateLane(e, p) {
  if (p.dead || World.clear) return;
  const near = p.x > e.x - 96 && p.x < e.x1 - 8;
  if (!near) return;
  if (--e.timer > 0) return;
  e.timer = 170 + Math.floor(Math.random() * 120);
  let sx = World.cam.x + W + 6;
  let fade = false;
  if (sx > e.x1) { sx = e.x1 - 48; fade = true; }
  if (sx < e.x + 32) return;
  const car = { kind: 'car', x: sx, y: e.y, w: 48, h: 24, vx: -2.3, color: Math.floor(Math.random() * OBJ.cars.length), lane: e, alpha: fade ? 0 : 1, honked: false, t: 0 };
  car.plat = { kind: 'car', x: car.x + 9, y: car.y + 2, w: 30, h: 4, dx: 0, dy: 0, prevY: car.y + 2, oneway: true, alive: true };
  World.plats.push(car.plat);
  addEnt(car);
}
function updateCar(e, p) {
  e.t++;
  e.x += e.vx;
  if (e.alpha < 1 && !e.leaving) e.alpha = Math.min(1, e.alpha + 0.08);
  if (e.x + 40 < e.lane.x) e.leaving = true;
  if (e.leaving) e.alpha -= 0.08;
  e.plat.dx = e.vx; e.plat.prevY = e.plat.y; e.plat.x = e.x + 9; e.plat.y = e.y + 2;
  if (e.alpha <= 0 || e.x < World.cam.x - 80) { e.alive = false; e.plat.alive = false; return; }
  if (!e.honked && Math.abs(e.x - p.x) < 110 && e.x > p.x) { e.honked = true; Sound.fx('honk'); }
  const body = { x: e.x + 2, y: e.y + 9, w: 44, h: 15 };
  if (!p.dead && p.ride !== e.plat && U.overlap(body, p) && e.alpha > 0.5) {
    if (p.vy > 0 && p.prevY + p.h <= e.y + 6) { p.y = e.plat.y - p.h; p.vy = 0; p.onGround = true; p.ride = e.plat; }
    else { hurtPlayer(); if (!p.dead) p.vx = -3; }
  }
}

/* ---------------- plataformas ---------------- */
function updatePlats() {
  const t = World.t;
  for (const pl of World.plats) {
    if (pl.kind !== 'h' && pl.kind !== 'v' && pl.kind !== 'fall') continue;
    pl.prevY = pl.y;
    const ox = pl.x, oy = pl.y;
    if (pl.kind === 'h') pl.x = pl.x0 + Math.sin(t * 0.022 + pl.ph) * pl.amp;
    else if (pl.kind === 'v') pl.y = pl.y0 + Math.sin(t * 0.025 + pl.ph) * pl.amp;
    else if (pl.kind === 'fall') {
      pl.t++;
      if (pl.state === 'shake' && pl.t > 28) { pl.state = 'fall'; pl.vy = 0; }
      if (pl.state === 'fall') { pl.vy = Math.min(pl.vy + 0.25, 6); pl.y += pl.vy; if (pl.y > World.h * TS + 20) { pl.state = 'gone'; pl.alive = false; pl.t = 0; } }
      if (pl.state === 'gone' && pl.t > 180) { pl.state = 'idle'; pl.alive = true; pl.y = pl.y0; pl.vy = 0; }
    }
    pl.dx = pl.x - ox; pl.dy = pl.y - oy;
  }
  // pesos que caem também servem de plataforma
  for (const e of World.ents) if (e.kind === 'crusher') { if (!World.plats.includes(e)) World.plats.push(e); }
}

/* ---------------- projéteis ---------------- */
function updateProjs() {
  const p = World.player;
  for (const b of World.projs) {
    b.t++; b.life--;
    if (b.type === 'bean') {
      b.vy = Math.min(b.vy + 0.32, 5);
      moveBody(b);
      if (b.onGround) b.vy = -3.3;
      if (b.hitWall || b.life <= 0) { b.dead = true; sparkle(b.x + 3, b.y + 3, 4, '#c88a50'); continue; }
      for (const e of World.ents) {
        if ((e.enemy || e.kind === 'boss') && e.alive && !e.dying && U.overlap(b, e)) {
          b.dead = true;
          if (e.kind === 'boss') hitBoss(e, 1);
          else if (e.type === 'lady') { popup(e.x - 4, e.y - 6, 'HMPF!', '#ffc0e0'); Sound.fx('bump'); }
          else killEnemy(e, 'bean');
          break;
        }
      }
      for (const o of World.projs) if (o.hostile && !o.dead && U.overlap(o, b) && o.type !== 'wave') { o.dead = true; b.dead = true; sparkle(o.x, o.y, 4); }
      continue;
    }
    b.vy += b.g || 0;
    if (b.type === 'plane') b.vy = Math.sin(b.t * 0.08) * 0.5 + 0.12;
    if (b.type === 'paper') b.vy = Math.sin(b.t * 0.1) * 0.4;
    if (b.type === 'zap') b.vy = Math.sin(b.t * 0.3) * 1.2;
    b.x += b.vx; b.y += b.vy;
    if (b.type === 'wave') {
      const below = tileAt(Math.floor((b.x + b.w / 2) / TS), Math.floor((b.y + b.h + 2) / TS));
      const ahead = tileAt(Math.floor((b.x + (b.vx > 0 ? b.w : 0)) / TS), Math.floor((b.y + 4) / TS));
      if (!isSolid(below) || isSolid(ahead)) b.dead = true;
      if (b.t % 3 === 0) part({ x: b.x + Math.random() * b.w, y: b.y + b.h - 2, vy: -0.8, life: 14, color: '#c8f0a0', size: 2, kind: 'dust' });
    } else if (b.type !== 'glitch') {
      const tt = tileAt(Math.floor((b.x + b.w / 2) / TS), Math.floor((b.y + b.h / 2) / TS));
      if (isSolid(tt) && tt !== 'X') { b.dead = true; if (b.type === 'water') splashSmall(b.x, b.y); continue; }
    }
    if (b.life <= 0 || b.y > World.h * TS || Math.abs(b.x - World.cam.x - W / 2) > W) { b.dead = true; continue; }
    if (b.hostile && !p.dead && U.overlap(b, { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 3 })) {
      if (p.wild > 0) { b.dead = true; sparkle(b.x, b.y, 4); continue; }
      if (b.type === 'paper' || b.type === 'plane') { if (p.vy > 0 && p.prevY + p.h <= b.y + 4) { b.dead = true; p.vy = -4; addScore(100, b.x, b.y); Sound.fx('stomp'); continue; } }
      if (b.type === 'poop') popup(p.x - 8, p.y - 10, 'ECA!', '#e8e8d0');
      b.dead = true; hurtPlayer();
    }
  }
  World.projs = World.projs.filter(b => !b.dead);
}
function splashSmall(x, y) { for (let i = 0; i < 4; i++) part({ x, y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, g: 0.2, life: 20, color: '#8ac8ff', size: 2, kind: 'drop' }); }

/* ---------------- colisões jogador x inimigos ---------------- */
function playerVsEnemies() {
  const p = World.player;
  if (p.dead || World.clear) return;
  for (const e of World.ents) {
    if (!e.enemy || !e.alive || e.dying) continue;
    let box = e;
    if (e.type === 'lady' && e.swing > 4 && e.swing < 22) box = { x: e.dir > 0 ? e.x : e.x - 12, y: e.y + 6, w: e.w + 12, h: e.h - 6 };
    if (!U.overlap(box, p)) continue;
    if (p.wild > 0) { killEnemy(e, 'wild'); continue; }
    const fromAbove = p.vy > 0 && p.prevY + p.h <= e.y + Math.max(7, e.vy + 5);
    if (fromAbove && e.stomp) {
      p.y = e.y - p.h;
      p.vy = Input.down('jump') ? -7 : -4.6;
      if (e.stomp === 'bounce') { Sound.fx('bump'); popup(e.x - 4, e.y - 6, 'HMPF!', '#ffc0e0'); continue; }
      killEnemy(e, 'stomp');
      continue;
    }
    if (e.type === 'lady' && box === e) { p.vx = U.sign(p.x - e.x) * 1.5; continue; }
    if (e.type === 'thief' && e.state !== 'flee' && Game.coins > 0) {
      const n = Math.min(10, Game.coins);
      Game.coins -= n; Sound.fx('steal'); popup(p.x - 4, p.y - 10, '-' + n + ' MOEDAS', '#ffb0b0');
      e.state = 'flee'; e.dir = U.sign(e.x - p.x) || 1; p.inv = Math.max(p.inv, 60);
      continue;
    }
    if (e.type === 'thief' && e.state === 'flee') continue;
    hurtPlayer();
  }
}

/* ---------------- chefe: MEGA BUG ---------------- */
function makeBoss(px, bottom) {
  return { kind: 'boss', x: px - 10, y: bottom - 30, w: 36, h: 30, vx: 0, vy: 0, hp: 12, maxHp: 12, state: 'sleep', t: 0, dir: -1, inv: 0, phase: 1, step: 0, onGround: true };
}
function updateBoss(b, p) {
  b.t++;
  if (b.inv > 0) b.inv--;
  const pdx = p.x + p.w / 2 - (b.x + b.w / 2);
  const grav = () => { b.vy = Math.min(b.vy + 0.32, 7); moveBody(b); };
  switch (b.state) {
    case 'sleep': b.vx = 0; break;
    case 'intro': grav(); if (b.t === 30) { shake(10); Sound.fx('bosshit'); } if (b.t > 100) { b.state = 'walk'; b.t = 0; } break;
    case 'walk':
      if (b.t % 40 === 1) b.dir = U.sign(pdx) || b.dir;
      b.vx = b.dir * (b.phase === 2 ? 1.1 : 0.6); grav();
      if (b.t > (b.phase === 2 ? 70 : 100)) {
        const seq = b.phase === 2 ? ['jump', 'spit', 'summon', 'jump', 'spit'] : ['jump', 'spit', 'jump', 'spit'];
        b.state = seq[b.step++ % seq.length]; b.t = 0; b.vx = 0;
      }
      break;
    case 'jump':
      if (b.t < 18) { b.vx = 0; grav(); break; }
      if (b.t === 18) { b.vy = -7.6; b.vx = U.clamp(pdx / 48, -2.6, 2.6); b.onGround = false; }
      { const was = b.onGround; grav(); if (b.onGround && b.t > 20 && !was) {
        shake(12); Sound.fx('thud'); dust(b.x + 6, b.y + b.h, 5); dust(b.x + b.w - 6, b.y + b.h, 5);
        for (const d of [-1, 1]) World.projs.push({ type: 'wave', x: b.x + b.w / 2 - 5 + d * 14, y: b.y + b.h - 10, w: 10, h: 10, vx: d * (b.phase === 2 ? 2.6 : 2.1), vy: 0, life: 200, hostile: true, t: 0 });
        b.state = 'walk'; b.t = 0; b.vx = 0;
      } }
      break;
    case 'spit':
      b.vx = 0; grav();
      if (b.t === 30) {
        const n = b.phase === 2 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const ang = Math.atan2(p.y + 8 - (b.y + 18), pdx) + (i - (n - 1) / 2) * 0.35;
          World.projs.push({ type: 'glitch', x: b.x + b.w / 2 - 5, y: b.y + 14, w: 10, h: 10, vx: Math.cos(ang) * 2.1, vy: Math.sin(ang) * 2.1, life: 240, hostile: true, t: 0 });
        }
        Sound.fx('zap');
      }
      if (b.t > 56) { b.state = 'walk'; b.t = 0; }
      break;
    case 'summon':
      b.vx = 0; grav();
      if (b.t === 24 && World.ents.filter(e => e.type === 'bug' && e.alive && !e.dying).length < 3) {
        for (const d of [-1, 1]) { const e = addEnt(makeEnemy('u', b.x + b.w / 2 - 8, b.y + b.h)); e.dir = d; e.vy = -3; e.x += d * 12; }
        Sound.fx('appear');
      }
      if (b.t > 50) { b.state = 'walk'; b.t = 0; }
      break;
    case 'hurt':
      grav(); b.vx *= 0.9;
      if (b.t > 40) { b.state = 'walk'; b.t = 0; }
      break;
    case 'dead':
      b.vx = 0;
      if (b.t % 6 === 0 && b.t < 120) { sparkle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 6, ['#ff4080', '#40f0ff', '#ffffff'][b.t % 3]); shake(4); }
      if (b.t >= 120) { b.vy += 0.3; b.y += b.vy; }
      if (b.t === 140) {
        addEnt({ kind: 'item', item: 'trophy', x: World.arena.x + 120, y: 20, w: 12, h: 12, vx: 0, vy: 0, emerge: 0, dir: 1 });
        popup(World.arena.x + 92, 60, 'BUG CORRIGIDO!', '#80ff80');
      }
      if (b.y > World.h * TS + 40) b.alive = false;
      return;
  }
  if (b.state === 'sleep' || p.dead || World.clear) return;
  // colisão com o Kinhu
  if (U.overlap(b, p)) {
    const fromAbove = p.vy > 0 && p.prevY + p.h <= b.y + 10;
    if (fromAbove || p.wild > 0) {
      p.vy = -7.2; p.y = b.y - p.h;
      hitBoss(b, p.wild > 0 ? 2 : 4);
    } else if (b.state !== 'dead') { hurtPlayer(); if (!p.dead) p.vx = U.sign(p.x - b.x) * 3; }
  }
}
function hitBoss(b, dmg) {
  if (b.inv > 0 || b.state === 'dead') return;
  b.hp -= dmg; b.inv = dmg >= 4 ? 70 : 12;
  Sound.fx('bosshit'); shake(dmg >= 4 ? 8 : 3);
  addScore(dmg >= 4 ? 1000 : 200, b.x + 8, b.y - 6);
  if (b.hp <= 6 && b.phase === 1) { b.phase = 2; World.banner = 'ELE FICOU BRAVO!'; World.bannerT = 90; }
  if (b.hp <= 0) {
    b.state = 'dead'; b.t = 0; b.vy = -2;
    Sound.stop(); Sound.fx('bossdie');
    addScore(10000, b.x, b.y - 10);
    World.projs = World.projs.filter(q => !q.hostile);
    for (const e of World.ents) if (e.enemy && !e.dying) killEnemy(e, 'bean');
  } else if (dmg >= 4) { b.state = 'hurt'; b.t = 0; b.vy = -2; }
}

/* ---------------- chegada (fim de fase) ---------------- */
function startClear() {
  const p = World.player;
  World.clear = { phase: 'walk', t: 0, kind: World.goal.kind };
  p.control = false; p.inv = 0;
  Sound.stop();
  if (World.clear.kind === 'busstop') {
    World.clear.phase = 'wait';
    World.clear.bus = { x: World.cam.x + W + 20, y: World.goal.y - 62, vx: -4 };
    Sound.fx('honk');
  } else Sound.play('clear');
  App.saveProgress(true);
}
function updateClear() {
  const c = World.clear, p = World.player;
  c.t++;
  const doorX = World.goal ? World.goal.x + (c.kind === 'building' ? 24 : c.kind === 'elevator' ? 16 : c.kind === 'busdoor' ? 8 : 0) : 0;
  const gravity = () => { p.vy = Math.min(p.vy + 0.55, 6); p.prevY = p.y; moveBody(p); landOnPlats(p); };
  switch (c.phase) {
    case 'wait': {
      p.vx *= 0.8; gravity();
      const bus = c.bus;
      const stopX = World.goal.x - 22;
      bus.x += bus.vx;
      if (bus.x < stopX + 60) bus.vx = Math.min(-0.4, bus.vx * 0.94);
      if (bus.x <= stopX) { bus.x = stopX; bus.vx = 0; c.phase = 'board'; c.t = 0; Sound.fx('door'); Sound.play('clear'); }
      break;
    }
    case 'board': {
      const target = c.bus.x + 14;
      const dx = target - (p.x + p.w / 2);
      p.facing = U.sign(dx) || -1;
      p.vx = Math.abs(dx) > 2 ? U.sign(dx) * 1.2 : 0; gravity();
      p.anim += 0.12;
      if (Math.abs(dx) <= 2 && c.t > 20) { p.hidden = true; c.phase = 'leave'; c.t = 0; Sound.fx('door'); }
      break;
    }
    case 'leave':
      if (c.t > 30) { c.bus.vx = Math.max(-4, c.bus.vx - 0.08); c.bus.x += c.bus.vx; }
      if (c.t > 60) { c.phase = 'tally'; c.t = 0; }
      break;
    case 'walk': {
      const dx = doorX - (p.x + p.w / 2);
      p.facing = U.sign(dx) || 1;
      p.vx = Math.abs(dx) > 2 ? U.sign(dx) * 1.2 : 0; gravity();
      p.anim += 0.12;
      if (Math.abs(dx) <= 2) { c.phase = 'enter'; c.t = 0; Sound.fx('door'); }
      break;
    }
    case 'enter':
      p.vx = 0; p.win = true;
      if (c.t > 40) { p.hidden = true; c.phase = 'tally'; c.t = 0; }
      break;
    case 'tally':
      if (World.time > 0) {
        const n = Math.min(World.time, 3);
        World.time -= n; Game.score += n * 50;
        if (c.t % 3 === 0) Sound.fx('tick');
      } else if (c.t > 60 && !Sound.isPlaying()) App.levelDone();
      else if (c.t > 240) App.levelDone();
      break;
  }
}

/* ---------------- atualização geral ---------------- */
function updateWorld() {
  const Wd = World, p = Wd.player;
  Wd.t++;
  Wd.busX = (Wd.busX || 0) + Wd.busSpeed;
  updatePlats();
  if (Wd.clear) updateClear();
  else updatePlayer(p);
  for (const e of Wd.ents) {
    if (!e.alive) continue;
    const far = e.x > Wd.cam.x + W + 64 || e.x + (e.w || 16) < Wd.cam.x - 96;
    if (far && e.kind !== 'lane' && e.kind !== 'car' && e.kind !== 'boss' && !e.dying && e.kind !== 'popcoin') continue;
    updateEnt(e);
  }
  playerVsEnemies();
  updateProjs();
  Wd.ents = Wd.ents.filter(e => e.alive);
  Wd.plats = Wd.plats.filter(pl => pl.alive || pl.kind === 'fall');
  for (const q of Wd.parts) { q.t++; q.vy += q.g || 0; q.x += q.vx; q.y += q.vy; }
  Wd.parts = Wd.parts.filter(q => q.t < q.life);
  for (const b of Wd.bumps) b.t++;
  Wd.bumps = Wd.bumps.filter(b => b.t < 10);
  if (Wd.bannerT > 0) Wd.bannerT--;
  // chegada
  if (!Wd.clear && !p.dead && Wd.goal && p.x + p.w / 2 >= Wd.goal.x + (Wd.goal.kind === 'busstop' ? 4 : 0)) startClear();
  // arena do chefe
  if (Wd.arena && !Wd.arena.active && p.x > Wd.arena.x + 20 && !p.dead) {
    Wd.arena.active = true; Wd.cam.lock = Wd.arena.x; Wd.bossFight = true;
    for (let ty = 2; ty < 12; ty++) setTile(Wd.arena.tx - 1, ty, 'S');
    Wd.boss.state = 'intro'; Wd.boss.t = 0;
    Wd.banner = 'MEGA BUG!'; Wd.bannerT = 120;
    Sound.play('boss', true);
  }
  // tempo
  if (!Wd.clear && !p.dead) {
    if (++Wd.timeT >= 48) {
      Wd.timeT = 0; Wd.time--;
      if (Wd.time === 100 && !Wd.hurry) { Wd.hurry = true; Sound.fx('warn'); Sound.tempo = 1.25; Wd.banner = 'ANDA LOGO, KINHU!'; Wd.bannerT = 100; }
      if (Wd.time <= 0) { Wd.time = 0; killPlayer('time'); }
    }
  }
  // freadas do ônibus
  if (Wd.brake && !Wd.clear) updateBrakes(Wd);
  // câmera
  const cam = Wd.cam;
  if (cam.lock !== null) { cam.x += (cam.lock - cam.x) * 0.1; if (Math.abs(cam.x - cam.lock) < 0.5) cam.x = cam.lock; }
  else if (!p.dead) {
    if (Math.abs(p.vx) > 0.5) p.look = U.lerp(p.look, p.facing * 24, 0.03);
    const target = p.x + p.w / 2 - W / 2 + p.look;
    cam.x += (target - cam.x) * 0.12;
  }
  cam.x = U.clamp(cam.x, 0, Wd.w * TS - W);
  if (cam.shake > 0) cam.shake *= 0.85;
  if (cam.shake < 0.3) cam.shake = 0;
}

function updateBrakes(Wd) {
  const b = Wd.brake;
  b.t--;
  Wd.push = 0;
  if (b.phase === 'idle') {
    Wd.busSpeed = U.lerp(Wd.busSpeed, 1, 0.02);
    if (b.t <= 0) {
      b.kind = ['freada', 'lombada', 'arrancada', 'freada'][b.k++ % 4];
      b.phase = 'warn'; b.t = 80;
      Wd.banner = b.kind === 'freada' ? '! FREADA !' : b.kind === 'lombada' ? '! LOMBADA !' : '! ARRANCADA !'; Wd.bannerT = 80;
      Sound.fx('warn');
    }
  } else if (b.phase === 'warn') {
    if (b.t <= 0) {
      b.phase = 'act'; b.t = b.kind === 'lombada' ? 2 : 45;
      if (b.kind === 'freada') Sound.fx('brake');
      if (b.kind === 'lombada') {
        shake(10); Sound.fx('thud');
        const p = Wd.player;
        if (p.onGround && !p.dead && !Wd.clear) { p.vy = -5; p.onGround = false; p.ride = null; }
        for (const e of Wd.ents) if (e.enemy && e.onGround && !e.dying) { e.vy = -4; e.onGround = false; }
      }
    }
  } else if (b.phase === 'act') {
    if (b.kind === 'freada') { Wd.push = 0.3; Wd.busSpeed = U.lerp(Wd.busSpeed, 0.2, 0.08); shake(2); }
    if (b.kind === 'arrancada') { Wd.push = -0.3; Wd.busSpeed = U.lerp(Wd.busSpeed, 1.8, 0.08); shake(1.5); }
    if (b.t <= 0) { b.phase = 'idle'; b.t = 360 + Math.floor(Math.random() * 180); }
  }
}

/* ---------------- desenho ---------------- */
const flipVCache = new Map();
function flipV(c) {
  let f = flipVCache.get(c);
  if (f) return f;
  const { c: o, x } = U.canvas(c.width, c.height);
  const src = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  const dst = x.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) dst.data.set(src.data.subarray((c.height - 1 - y) * c.width * 4, (c.height - y) * c.width * 4), y * c.width * 4);
  x.putImageData(dst, 0, 0);
  flipVCache.set(c, o);
  return o;
}

function drawTiles(Wd, cx) {
  const T = Wd.T, t = Wd.t;
  const tx0 = Math.max(0, Math.floor(cx / TS)), tx1 = Math.min(Wd.w - 1, Math.floor((cx + W) / TS) + 1);
  const qf = [0, 0, 0, 1, 2, 1][Math.floor(t / 8) % 6];
  // buracos em fases internas ficam escuros (poço do elevador, piso do ônibus)
  if (Wd.def.indoor) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (Wd.map[Wd.h - 1][tx] === '.' && Wd.map[Wd.h - 2][tx] === '.') {
        ctx.fillStyle = '#121219'; ctx.fillRect(tx * TS, (Wd.h - 2) * TS, TS, 2 * TS);
        ctx.fillStyle = '#1e1e2a'; ctx.fillRect(tx * TS, (Wd.h - 2) * TS, TS, 2);
        if (Wd.theme === 'onibus') { ctx.fillStyle = '#d8d8d0'; if ((tx * TS + Math.floor(Wd.busX * 4)) % 64 < 24) ctx.fillRect(tx * TS + ((Math.floor(Wd.busX * 4)) % 16), (Wd.h - 1) * TS + 4, 6, 2); }
      }
    }
  }
  for (let ty = 0; ty < Wd.h; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = Wd.map[ty][tx];
      if (ch === '.' || ch === 'Z') continue;
      let x = tx * TS, y = ty * TS;
      let img = null;
      switch (ch) {
        case '#': case 'I': {
          const up = tileAt(tx, ty - 1), l = tileAt(tx - 1, ty), r = tileAt(tx + 1, ty);
          const m = (GROUNDISH.has(up) ? 0 : 1) | (isSolid(l) ? 0 : 2) | (isSolid(r) ? 0 : 4);
          img = ch === 'I' ? T.wet[m] : T.ground[m][(tx * 7 + ty * 3) % 3];
          break;
        }
        case '_': img = T.road[tx % 2]; break;
        case 'B': img = T.brick; break;
        case '?': case 'H': case 'L': case '!': img = T.q[qf]; break;
        case 'U': img = T.used; break;
        case 'S': img = T.hard[Math.floor(t / 20 + tx) % 2]; break;
        case '=': img = T.plat; break;
        case 'D': img = T.desk; break;
        case 'Y': img = T.seat; break;
        case 'y': img = T.seatBack; break;
        case '|': img = T.pole; break;
        case '-': img = T.rail; break;
        case '^': img = T.spike[Math.floor(t / 6) % 2]; break;
        case '~': img = tileAt(tx, ty - 1) === '~' ? T.liquid[Math.floor(t / 10) % 4] : T.liquidTop[Math.floor(t / 10) % 4]; break;
        case 'T': img = T.prop; break;
        case 'X': img = T.shooter; break;
        case 'c': img = SPR.coin[Math.floor(t / 7) % 4].r; break;
      }
      if (!img) continue;
      for (const b of Wd.bumps) if (b.tx === tx && b.ty === ty) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 5);
      ctx.drawImage(img, x, y);
    }
  }
}

function personSprite(set, frame) {
  if (frame === 'act') return set.act;
  return set.walk[frame % set.walk.length];
}

function drawEnemy(e) {
  const left = e.dir < 0;
  let spr = null, ox = 0, oy = 0;
  switch (e.type) {
    case 'dog': spr = e.state === 'bark' ? SPR.dogBark : SPR.dog[e.frame]; ox = -2; oy = -3; break;
    case 'pigeon': spr = SPR.pigeon[e.frame]; ox = -1; oy = -4; break;
    case 'roach': spr = SPR.roach[e.frame]; ox = -2; oy = -10; break;
    case 'bug': spr = e.squish ? SPR.bugFlat : SPR.bug[e.frame]; ox = -2; oy = -7; break;
    case 'flybug': spr = SPR.flybug[e.frame]; ox = -2; oy = -4; break;
    case 'skater': spr = SPR.skater.walk[0]; ox = -2; oy = -24 + e.h - 2; break;
    case 'thief': spr = personSprite(SPR.thief, e.frame); break;
    case 'lady': spr = personSprite(SPR.lady, e.frame); break;
    case 'coworker': spr = personSprite(SPR.coworker, e.frame); break;
    case 'intern': spr = personSprite(SPR.intern, e.frame); break;
    case 'worker': spr = personSprite(SPR.worker, e.frame); break;
  }
  if (!spr) return;
  if (['thief', 'lady', 'coworker', 'intern', 'worker'].includes(e.type)) { ox = -2; oy = e.h - 24; }
  if (e.dying && !e.squish && ['thief', 'lady', 'coworker', 'intern', 'worker', 'skater'].includes(e.type)) spr = SPR[e.type].dizzy;
  const img = left ? spr.l : spr.r;
  const dx = Math.round(e.x + ox), dy = Math.round(e.y + oy);
  if (e.dying && !e.squish) ctx.drawImage(flipV(img), dx, dy);
  else ctx.drawImage(img, dx, dy);
  // acessórios
  if (!e.dying) {
    if (e.type === 'skater') drawSpr(SPR.board, e.x - 1, e.y + e.h - 3, left);
    if (e.type === 'intern') drawSpr(SPR.cup, left ? e.x - 3 : e.x + e.w + 1, e.y + 8, left);
    if (e.type === 'lady') {
      const sw = e.swing > 4 && e.swing < 22;
      drawSpr(SPR.bag, sw ? (left ? e.x - 10 : e.x + e.w + 4) : (left ? e.x - 3 : e.x + e.w - 1), sw ? e.y + 6 : e.y + 11, left);
    }
    if (e.type === 'thief' && e.state === 'flee') drawSpr(SPR.coin[0], e.x - 2, e.y - 12, false);
  }
}

function drawWorld() {
  const Wd = World, cam = Wd.cam, p = Wd.player;
  const sx = cam.shake ? Math.round((Math.random() - 0.5) * cam.shake) : 0;
  const sy = cam.shake ? Math.round((Math.random() - 0.5) * cam.shake) : 0;
  const cx = Math.round(cam.x);
  const bgT = Wd.theme === 'onibus' ? Wd.busX : Wd.t;
  BG.draw(Wd.th.bg, cx, bgT);
  ctx.save();
  ctx.translate(-cx + sx, sy);
  // casa e objetivo
  if (Wd.house) ctx.drawImage(OBJ.house, Wd.house.x - 4, Wd.house.y - 64);
  if (Wd.goal) {
    const g = Wd.goal, k = g.kind;
    if (k === 'busstop') ctx.drawImage(OBJ.busstop, g.x - 24, g.y - 64);
    if (k === 'busdoor') ctx.drawImage(OBJ.busdoor, g.x - 8, g.y - 64);
    if (k === 'building') ctx.drawImage(OBJ.building, g.x - 8, g.y - 80);
    if (k === 'elevator') ctx.drawImage(OBJ.elevator, g.x - 8, g.y - 64);
  }
  for (const d of Wd.decor) if (d.x > cx - 40 && d.x < cx + W + 8) ctx.drawImage(d.img, d.x, d.y);
  // itens saindo dos blocos (atrás dos blocos)
  for (const e of Wd.ents) if (e.kind === 'item' && e.emerge > 0) drawItem(e);
  drawTiles(Wd, cx);
  // plataformas
  for (const pl of Wd.plats) {
    if (!pl.alive || (pl.kind !== 'h' && pl.kind !== 'v' && pl.kind !== 'fall')) continue;
    if (pl.x > cx + W || pl.x + pl.w < cx) continue;
    const img = Wd.theme === 'escritorio' ? OBJ.elevatorPlat : pl.kind === 'fall' ? OBJ.crackPlank : OBJ.plank;
    const shakeX = pl.kind === 'fall' && pl.state === 'shake' ? (pl.t % 4 < 2 ? 1 : -1) : 0;
    ctx.drawImage(img, Math.round(pl.x) + shakeX, Math.round(pl.y));
    if (pl.kind === 'v' && Wd.theme === 'escritorio') { ctx.fillStyle = '#5a606c'; ctx.fillRect(Math.round(pl.x) + 23, 32, 2, Math.round(pl.y) - 32); }
  }
  for (const e of Wd.ents) {
    if (!e.alive) continue;
    if (e.x > cx + W + 48 || e.x + 64 < cx) continue;
    switch (e.kind) {
      case 'spring': ctx.drawImage(OBJ.mattress[e.t > 0 ? 1 : 0], e.x - 1, e.y - 6); break;
      case 'checkpoint': ctx.drawImage(OBJ.checkpoint[e.on ? 1 : 0], e.x, e.y); break;
      case 'crusher': {
        const top = 32;
        ctx.fillStyle = '#5a606c';
        for (let y = top; y < e.y; y += 4) ctx.fillRect(e.x + 14, y, 3, 2);
        ctx.drawImage(OBJ.weight, Math.round(e.x - 1), Math.round(e.y - 2));
        break;
      }
      case 'car': {
        const c = OBJ.cars[e.color];
        ctx.globalAlpha = U.clamp(e.alpha, 0, 1);
        ctx.drawImage(c.r, Math.round(e.x), Math.round(e.y));
        ctx.globalAlpha = 1;
        break;
      }
      case 'popcoin': ctx.drawImage(SPR.coin[Math.floor(e.t / 3) % 4].r, Math.round(e.x), Math.round(e.y)); break;
      case 'coin': if (e.t < 340 || e.t % 6 < 3) ctx.drawImage(SPR.coin[Math.floor(e.t / 4) % 4].r, Math.round(e.x - 3), Math.round(e.y - 3)); break;
      case 'item': if (e.emerge <= 0) drawItem(e); break;
      case 'boss': drawBoss(e); break;
      default: if (e.enemy) drawEnemy(e);
    }
  }
  drawPlayer(p);
  if (Wd.clear && Wd.clear.bus) ctx.drawImage(OBJ.bus, Math.round(Wd.clear.bus.x), Math.round(Wd.clear.bus.y));
  // projéteis
  for (const b of Wd.projs) {
    const bx = Math.round(b.x), by = Math.round(b.y);
    switch (b.type) {
      case 'bean': ctx.drawImage(SPR.bean[Math.floor(b.t / 4) % 2].r, bx - 1, by - 1); break;
      case 'poop': ctx.drawImage(SPR.poop.r, bx - 1, by - 1); break;
      case 'plane': ctx.drawImage(b.dir < 0 ? SPR.plane.l : SPR.plane.r, bx - 1, by - 1); break;
      case 'paper': ctx.drawImage(SPR.paper.r, bx - 1, by - 1); break;
      case 'water': ctx.drawImage(SPR.water.r, bx, by); break;
      case 'zap': ctx.drawImage(SPR.spark[Math.floor(b.t / 3) % 2].r, bx + 1, by); break;
      case 'glitch': ctx.drawImage(SPR.glitch[Math.floor(b.t / 3) % 3].r, bx, by); break;
      case 'wave':
        ctx.fillStyle = '#c8f0a0'; ctx.fillRect(bx + 1, by + 4, 8, 6);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 3 + (b.t % 4 < 2 ? 1 : 0), by + 2, 4, 3);
        break;
    }
  }
  // partículas
  for (const q of Wd.parts) {
    if (q.kind === 'text') {
      if (q.t < q.life - 10 || q.t % 2) Font.draw(q.text, q.x, q.y, q.color);
      continue;
    }
    ctx.globalAlpha = q.kind === 'dust' ? Math.max(0, 1 - q.t / q.life) : 1;
    ctx.fillStyle = q.color;
    const s = q.size;
    ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawItem(e) {
  const spr = { hotdog: SPR.hotdog, coffee: SPR.coffee, claws: SPR.claws, badge: SPR.badge, trophy: SPR.trophy }[e.item];
  const bob = e.item === 'coffee' && e.emerge <= 0 ? Math.round(Math.sin(e.t * 0.1)) : 0;
  ctx.drawImage(e.dir < 0 ? spr.l : spr.r, Math.round(e.x - 2), Math.round(e.y - 4 + bob));
}

function drawBoss(b) {
  if (b.inv > 0 && b.state !== 'dead' && Math.floor(b.t / 3) % 2) return;
  const S = SPR.boss;
  let spr = S.idle;
  if (b.state === 'spit' && b.t > 14) spr = S.open;
  if (b.state === 'jump' && !b.onGround) spr = S.jump;
  if (b.state === 'hurt' || (b.state === 'dead' && b.t % 8 < 4)) spr = S.hurt;
  const bob = b.state === 'walk' ? Math.round(Math.sin(b.t * 0.2)) : 0;
  const crouch = b.state === 'jump' && b.t < 18 ? 2 : 0;
  ctx.drawImage(b.dir < 0 ? spr.l : spr.r, Math.round(b.x - 6), Math.round(b.y - 10 + bob + crouch));
}

function drawPlayer(p) {
  if (p.hidden) return;
  if (p.inv > 0 && !p.dead && Math.floor(p.inv / 3) % 2) return;
  let set = Game.power === 1 ? SPR.kinhuCafe : SPR.kinhu;
  if (p.wild > 0 && (p.wild > 120 || Math.floor(p.wild / 4) % 2)) set = SPR.kinhuWild[Math.floor(World.t / 3) % 3];
  let s = set.idle;
  if (p.dead) s = set.hurt;
  else if (p.win) s = set.win;
  else if (!p.onGround && !p.ride) s = p.vy < 0 ? set.jump : set.fall;
  else if (p.skid) s = set.skid;
  else if (Math.abs(p.vx) > 0.2) s = set.run[Math.floor(p.anim) % 4];
  else if (p.blink < 8) s = set.blink;
  ctx.drawImage(p.facing < 0 ? s.l : s.r, Math.round(p.x - 4), Math.round(p.y - 3));
}
