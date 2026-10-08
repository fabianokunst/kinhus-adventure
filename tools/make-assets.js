'use strict';
// Gera ícone, imagem de prévia (redes sociais) e prints para o README.
//   node tools/make-assets.js
const path = require('path');
const fs = require('fs');
const { SoftCanvas, boot } = require('./softcanvas');
const root = path.join(__dirname, '..');
const { screen } = boot(root, ['js/core.js', 'js/sprites.js', 'js/world.js', 'js/audio.js', 'js/levels.js', 'js/save.js', 'js/game.js', 'js/title.js', 'js/main.js']);
const press = {};
Input.update = function () { this.prev = this.cur; const cur = {}; for (const a in this.map) { cur[a] = !!press[a]; cur[a + '!'] = false; } this.cur = cur; };
const dir = path.join(root, 'assets', 'screens');
fs.mkdirSync(dir, { recursive: true });
const scaled = (src, s) => { const c = new SoftCanvas(src.width * s, src.height * s); c.getContext('2d').drawImage(src, 0, 0, src.width * s, src.height * s); return c; };
const step = n => { for (let i = 0; i < n; i++) App.update(); };
const save = (name, s = 2) => { App.render(); fs.writeFileSync(path.join(dir, name + '.png'), scaled(screen, s).toPNG()); };

setTimeout(() => {
  // ícone: cabeça do Kinhu
  const icon = new SoftCanvas(64, 64);
  const ix = icon.getContext('2d');
  ix.fillStyle = '#00153b'; ix.fillRect(4, 4, 56, 56);
  ix.fillStyle = '#ffbf30'; ix.fillRect(4, 4, 56, 2); ix.fillRect(4, 58, 56, 2); ix.fillRect(4, 4, 2, 56); ix.fillRect(58, 4, 2, 56);
  ix.drawImage(SPR.kinhuHead, 0, 0, 20, 13, 2, 12, 60, 39);
  fs.writeFileSync(path.join(root, 'assets', 'icon.png'), icon.toPNG());

  App.go('title', null, true); step(2); save('01-titulo');
  Game.reset(); Game.levelIdx = 0; App.go('play', null, true);
  World.player.x = 13 * 16; World.player.y = 140; World.player.vy = -3; World.player.onGround = false; World.cam.x = 0; step(4); save('02-bairro');
  fs.copyFileSync(path.join(dir, '02-bairro.png'), path.join(root, 'assets', 'preview.png'));
  Game.reset(); Game.levelIdx = 1; App.go('play', null, true); World.player.x = 36 * 16; World.cam.x = 30 * 16; step(3); save('03-onibus');
  Game.reset(); Game.levelIdx = 2; App.go('play', null, true); World.player.x = 74 * 16; World.cam.x = 68 * 16; step(3); save('04-centro');
  Game.reset(); Game.levelIdx = 3; App.go('play', null, true); World.player.x = 66 * 16; World.cam.x = 62 * 16; step(3); save('05-escritorio');
  Game.reset(); Game.levelIdx = 4; App.go('play', null, true); World.player.x = World.arena.x + 40; World.player.y = 171; step(170); save('06-chefe');
  console.log('ok');
}, 30);
