'use strict';
// Robô de teste: tenta zerar cada fase segurando "direita" e pulando obstáculos.
// Serve para achar trechos impossíveis. Uso:
//   node tools/bot.js [fase(1-5)|all] [inv] [walk] [pastaPrints]
const path = require('path');
const fs = require('fs');
const { boot } = require('./softcanvas');
const root = path.join(__dirname, '..');
const { screen } = boot(root, ['js/core.js', 'js/sprites.js', 'js/world.js', 'js/audio.js', 'js/levels.js', 'js/save.js', 'js/game.js', 'js/main.js']);
const which = process.argv[2] || 'all';
const INV = process.argv.includes('inv');
const WALK = process.argv.includes('walk');
const shotDir = process.argv.find(a => a.startsWith('shots='));
const shots = shotDir ? shotDir.slice(6) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });

const press = {};
Input.update = function () {
  this.prev = this.cur;
  const cur = {};
  for (const a in this.map) { cur[a] = !!press[a]; cur[a + '!'] = false; }
  this.cur = cur;
};

const solidAt = (x, y) => { const t = tileAt(Math.floor(x / TS), Math.floor(y / TS)); return isSolid(t) || ONEWAY.has(t); };
const tileAtPx = (x, y) => tileAt(Math.floor(x / TS), Math.floor(y / TS));

function nextLanding(Wd, p) {
  const front = p.x + p.w, feet = p.y + p.h;
  let best = null;
  for (const pl of Wd.plats) {
    if (!pl.alive || pl.kind === 'car' || pl === p.ride) continue;
    if (pl.x + pl.w > front + 4 && pl.x < front + 130 && pl.y < feet + 60 && pl.y > feet - 80 && (!best || pl.x < best.x)) best = { x: pl.x, top: pl.y, c: pl.x + pl.w / 2, w: pl.w };
  }
  for (let dx = 8; dx < 130; dx += 4) {
    const tx = Math.floor((front + dx) / TS);
    let found = null;
    for (let ty = Math.floor((feet - 80) / TS); ty <= Math.floor((feet + 60) / TS); ty++) {
      const t = tileAt(tx, ty);
      if (((isSolid(t) && t !== '^') || ONEWAY.has(t)) && !isSolid(tileAt(tx, ty - 1))) { found = { x: tx * TS, top: ty * TS }; break; }
    }
    if (found && (found.top < feet - 2 || dx > 20)) { if (!best || found.x < best.x) best = found; break; }
  }
  return best;
}

function control(Wd) {
  const p = Wd.player;
  for (const k in press) press[k] = false;
  if (p.dead || Wd.clear) return;
  const front = p.x + p.w;
  const feet = p.y + p.h;
  press.right = true;
  press.run = !WALK;
  const grounded = p.onGround || p.ride;
  let jump = false, wait = false;
  if (grounded) {
    // parede à frente
    for (let dy = 2; dy < p.h; dy += 6) if (isSolid(tileAtPx(front + 10, p.y + dy))) jump = true;
    // buraco à frente
    const gapAhead = !solidAt(front + 6, feet + 4) && !(p.ride && front + 6 < p.ride.x + p.ride.w);
    if (gapAhead) {
      // existe plataforma móvel por perto? espera ela chegar
      const mp = Wd.plats.find(pl => pl.alive && pl.kind !== 'car' && Math.abs(pl.y - feet) < 70 && pl.x > p.x - 20 && pl.x < p.x + 160 && pl !== p.ride);
      const landing = (() => { for (let dx = 16; dx < 110; dx += 4) for (let dy = -64; dy < 48; dy += 8) if (solidAt(front + dx, feet + dy) && !solidAt(front + dx, feet + dy - 16)) return true; return false; })();
      if (mp && mp.kind !== 'fall') {
        const reach = mp.x - front;
        if (reach < 40 && mp.x + mp.w > front + 4) jump = true; else wait = true;
      } else jump = true;
    }
    // perigo à frente
    for (let dx = 2; dx < (WALK ? 10 : 18); dx += 2) { const t = tileAtPx(front + dx, feet + 2), t2 = tileAtPx(front + dx, feet - 4); if (t === '^' || t === '~' || t2 === '^') jump = true; }
    // inimigo à frente
    for (const e of Wd.ents) if (e.enemy && e.alive && !e.dying && e.x > p.x && e.x - front < 36 && Math.abs((e.y + e.h) - feet) < 30) jump = true;
    for (const e of Wd.ents) if (e.kind === 'car' && e.x > p.x - 10 && e.x - front < 50) jump = true;
    for (const b of Wd.projs) if (b.hostile && b.x > p.x - 8 && b.x - front < 40 && Math.abs(b.y - p.y - 10) < 20) jump = true;
  }
  control.why = (jump ? 'J' : '') + (wait ? 'W' : '');
  if (wait) { press.right = false; press.run = false; }
  if (jump && grounded) { press.jump = true; control.target = nextLanding(Wd, p); }
  if (!grounded && p.vy < 0) press.jump = !control.target || feet > control.target.top - 30 || front < control.target.x + 24; // segura o pulo só o necessário
  if (grounded && !jump) control.target = null;
  // no ar: mira em plataformas pequenas para não passar direto
  if (!grounded) {
    const cx = p.x + p.w / 2;
    let best = null;
    for (const pl of Wd.plats) {
      if (!pl.alive || pl.kind === 'car') continue;
      if (pl.y < feet - 4 || pl.y > feet + 90) continue;
      if (pl.x + pl.w < cx - 40 || pl.x > cx + 70) continue;
      const d = Math.abs(pl.x + pl.w / 2 - cx);
      if (!best || d < best.d) best = { d, c: pl.x + pl.w / 2 };
    }
    const tg = control.target;
    if (tg && tg.w && tg.w <= 64 && p.vy > -3) { press.right = cx < tg.c - 2; press.left = cx > tg.c + 2; }
    else if (best && p.vy > -1) { press.right = cx < best.c - 3; press.left = cx > best.c + 3; }
  }
  const trophy = Wd.ents.find(e => e.kind === 'item' && e.item === 'trophy');
  if (trophy) { press.right = trophy.x > p.x + 2; press.left = trophy.x < p.x - 2; }
  // chefe: pula em cima
  if (Wd.bossFight && Wd.boss && Wd.boss.alive) {
    const b = Wd.boss;
    const bx = b.x + b.w / 2, px = p.x + p.w / 2;
    press.right = px < bx - 4; press.left = px > bx + 4;
    if (grounded && Math.abs(bx - px) < 60) press.jump = true;
  }
}

function runLevel(i) {
  Game.reset(); Game.lives = 99; Game.levelIdx = i; App.trans = null;
  App.go('play', null, true);
  let frames = 0, deaths = [], best = 0, stuckT = 0, lastX = 0, done = false;
  const log = [];
  while (frames < 60 * 240) {
    frames++;
    const Wd = World;
    if (INV && Wd.player && !Wd.player.dead) { Wd.player.inv = 2; Game.hearts = 3; }
    control(Wd);
    if (Wd.player && !Wd.player.dead) { (runLevel.hist = runLevel.hist || []).push(`t${Wd.t} x${(Wd.player.x / 16).toFixed(2)} y${Wd.player.y.toFixed(0)} vy${Wd.player.vy.toFixed(1)} g${Wd.player.onGround ? 1 : 0} ${control.why} R${Wd.player.ride ? Math.round(Wd.player.ride.x / 16) : '-'} P[${Wd.plats.filter(q => q.kind === 'fall' && Math.abs(q.x - Wd.player.x) < 120).map(q => Math.round(q.x / 16) + ':' + q.state + ':' + Math.round(q.y)).join(',')}] k${press.right ? 'R' : ''}${press.left ? 'L' : ''}${press.jump ? 'J' : ''}`); if (runLevel.hist.length > 50) runLevel.hist.shift(); }
    const before = App.state;
    App.update();
    if (App.state === 'intro') { // morreu
      const p = Wd.player;
      deaths.push({ x: Math.round(p.x / TS), y: Math.round(p.y / TS), how: p.how });
      if (deaths.length === 1 && process.argv.includes('trace')) console.log(runLevel.hist.join(String.fromCharCode(10)));
      if (shots) { App.state = 'play'; World = Wd; App.render(); fs.writeFileSync(path.join(shots, `death-l${i + 1}-${deaths.length}.png`), screen.toPNG()); App.state = 'intro'; }
      if (deaths.length >= 6) break;
      App.trans = null;
      App.go('play', null, true);
      continue;
    }
    if (before === 'play' && App.trans && Wd.clear) { done = true; break; }
    if (App.state === 'ending') { done = true; break; }
    const p = World.player;
    if (p.x > best) best = p.x;
    if (Math.abs(p.x - lastX) < 1) stuckT++; else stuckT = 0;
    lastX = p.x;
    if (stuckT > 400) { log.push('preso em x=' + Math.round(p.x / TS) + ' y=' + Math.round(p.y) + (World.boss ? ' boss ' + World.boss.state + ' bx=' + Math.round(World.boss.x / TS) + ' by=' + Math.round(World.boss.y) + ' hp=' + World.boss.hp : '')); if (process.argv.includes('trace')) console.log(runLevel.hist.slice(-12).join(String.fromCharCode(10))); if (shots) { App.render(); fs.writeFileSync(path.join(shots, `stuck-l${i + 1}.png`), screen.toPNG()); } break; }
  }
  return { level: i + 1, done, frames, secs: Math.round(frames / 60), best: Math.round(best / TS), width: World.w, deaths, log };
}

const list = which === 'all' ? [0, 1, 2, 3, 4] : [+which - 1];
setTimeout(() => {
  for (const i of list) console.log(JSON.stringify(runLevel(i)));
}, 30);
