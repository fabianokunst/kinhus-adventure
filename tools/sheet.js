'use strict';
// Gera uma folha de prévia dos sprites (PNG) sem navegador:
//   node tools/sheet.js saida.png [escala] [filtro]
const path = require('path');
const fs = require('fs');
const { SoftCanvas, boot } = require('./softcanvas');
const root = path.join(__dirname, '..');
const files = ['js/core.js', 'js/sprites.js'];
if (fs.existsSync(path.join(root, 'js/world.js'))) files.push('js/world.js');
boot(root, files);

const out = process.argv[2] || 'sheet.png';
const S = +process.argv[3] || 4;
const filter = process.argv[4] ? new RegExp(process.argv[4]) : null;
const list = [];
const add = (n, c) => { if (!filter || filter.test(n)) list.push([n, c]); };
const K = SPR.kinhu;
add('k-idle', K.idle.r); add('k-blink', K.blink.r); K.run.forEach((s, i) => add('k-run' + i, s.r));
add('k-jump', K.jump.r); add('k-fall', K.fall.r); add('k-hurt', K.hurt.r); add('k-win', K.win.r); add('k-left', K.idle.l);
add('k-cafe', SPR.kinhuCafe.idle.r); SPR.kinhuWild.forEach((s, i) => add('k-wild' + i, s.run[0].r));
for (const k in SPR) {
  const v = SPR[k];
  if (/^kinhu/.test(k)) continue;
  if (Array.isArray(v)) v.forEach((s, i) => s && s.r && add(k + i, s.r));
  else if (v && v.r) add(k, v.r);
  else if (v && v.walk) { v.walk.forEach((s, i) => add(k + i, s.r)); add(k + '-act', v.act.r); add(k + '-dizzy', v.dizzy.r); }
  else if (v && v.idle && v.idle.r) for (const f in v) add(k + '-' + f, v[f].r);
  else if (v && v.width) add(k, v);
}
if (typeof previewWorld === 'function') previewWorld(add);
if (process.argv[5] === 'bg' && typeof previewBackgrounds === 'function') { list.length = 0; previewBackgrounds(add); }

const maxW = 1400;
let x = 6, y = 6, rh = 0;
const pos = [];
for (const [n, c] of list) {
  const w = c.width * S, h = c.height * S;
  if (x + w > maxW) { x = 6; y += rh + 10; rh = 0; }
  pos.push([n, c, x, y]); x += w + 10; rh = Math.max(rh, h);
}
const cv = new SoftCanvas(maxW, y + rh + 8);
const cx = cv.getContext('2d');
cx.fillStyle = '#7a8aaa'; cx.fillRect(0, 0, cv.width, cv.height);
for (const [, c, px, py] of pos) {
  cx.fillStyle = '#8a9aba'; cx.fillRect(px, py, c.width * S, c.height * S);
  cx.drawImage(c, px, py, c.width * S, c.height * S);
}
fs.writeFileSync(out, cv.toPNG());
console.log('ok', list.length, 'sprites ->', out, cv.width + 'x' + cv.height);
console.log(pos.map(p => p[0]).join(' '));
