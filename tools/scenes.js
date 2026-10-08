'use strict';
// Gera prints de telas especiais (intro, pausa, ônibus chegando, chefe, final...).
//   node tools/scenes.js <pasta>
const path = require('path');
const fs = require('fs');
const { boot } = require('./softcanvas');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'tools', 'out');
fs.mkdirSync(out, { recursive: true });
const { screen } = boot(root, ['js/core.js', 'js/sprites.js', 'js/world.js', 'js/audio.js', 'js/levels.js', 'js/save.js', 'js/game.js', 'js/title.js', 'js/main.js']);
const press = {};
Input.update = function () { this.prev = this.cur; const cur = {}; for (const a in this.map) { cur[a] = !!press[a]; cur[a + '!'] = false; } this.cur = cur; };
const shot = n => { App.render(); fs.writeFileSync(path.join(out, n + '.png'), screen.toPNG()); };
const step = n => { for (let i = 0; i < n; i++) App.update(); };

setTimeout(() => {
  // intro
  Game.reset(); Game.levelIdx = 2; App.go('intro', null, true); step(5); shot('s01-intro');
  // ajuda
  App.go('title', null, true); step(2); App.sub = 'help'; shot('s02-help'); App.sub = null;
  // fase 1: perto do ponto de ônibus
  Game.reset(); Game.levelIdx = 0; App.go('play', null, true);
  const g = World.goal;
  World.player.x = g.x - 60; World.player.y = 171; World.cam.x = g.x - 140;
  press.right = true; step(40); press.right = false;
  shot('s03-bus-a'); step(50); shot('s03-bus-b'); step(60); shot('s03-bus-c'); step(80); shot('s03-bus-d');
  // pausa
  Game.reset(); Game.levelIdx = 1; App.go('play', null, true); step(30); App.openPause(); shot('s04-pause'); App.closePause();
  // freada no ônibus
  World.brake.t = 1; step(40); shot('s05-freada');
  // fase 3 com carros
  Game.reset(); Game.levelIdx = 2; App.go('play', null, true);
  World.player.x = 100 * 16; World.player.y = 171; step(260); shot('s06-carros');
  // chefe
  Game.reset(); Game.levelIdx = 4; App.go('play', null, true);
  World.player.x = World.arena.x + 40; World.player.y = 171; step(160); shot('s07-chefe-a'); step(200); shot('s07-chefe-b');
  World.boss.hp = 4; hitBoss(World.boss, 4); step(150); shot('s07-chefe-c');
  // poder: café e kinhurine
  Game.power = 1; World.player.wild = 300; step(8); shot('s08-kinhurine');
  // game over e final
  App.go('gameover', null, true); step(80); shot('s09-gameover');
  Game.score = 123450; App.go('ending', null, true); step(240); shot('s10-ending-a'); step(500); shot('s10-ending-b');
  console.log('ok');
}, 30);
