'use strict';
// Teste automático sem navegador: carrega o jogo, roda fases e tira "prints".
//   node tools/test.js <pasta-de-saida>
const path = require('path');
const fs = require('fs');
const { boot } = require('./softcanvas');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'tools', 'out');
fs.mkdirSync(out, { recursive: true });
const { screen } = boot(root, ['js/core.js', 'js/sprites.js', 'js/world.js', 'js/audio.js', 'js/levels.js', 'js/save.js', 'js/game.js', 'js/main.js']);

const shot = name => fs.writeFileSync(path.join(out, name + '.png'), screen.toPNG());
let errors = 0;
const press = {};
// substitui a leitura de teclado por um "controle virtual"
Input.update = function () {
  this.prev = this.cur;
  const cur = {};
  for (const a in this.map) { cur[a] = !!press[a]; cur[a + '!'] = false; }
  this.cur = cur;
};
function step(n = 1) { for (let i = 0; i < n; i++) { try { App.update(); } catch (e) { errors++; console.error('ERRO update', e.stack); throw e; } } }
function render() { try { App.render(); } catch (e) { errors++; console.error('ERRO render', e.stack); throw e; } }

// tela de título
setTimeout(() => {
  step(5); render(); shot('00-title');
  press.confirm = true; step(1); press.confirm = false; step(2); render(); shot('01-title-menu');
  // novo jogo
  for (let i = 0; i < 40; i++) step(1);
  App.newGame(); step(40); render(); shot('02-story');
  for (let lv = 0; lv < LEVELS.length; lv++) {
    Game.levelIdx = lv; Game.lives = 3; Game.checkpoint = false;
    App.go('play', null, true);
    step(30); render(); shot(`l${lv + 1}-a-start`);
    // anda pela fase com "voo" de teste e tira prints a cada tela
    const Wd = World;
    let n = 0;
    for (let x = 0; x < Wd.w * TS; x += 512) {
      Wd.cam.x = U.clamp(x, 0, Wd.w * TS - W);
      Wd.player.x = Wd.cam.x + 100; Wd.player.y = 40; Wd.player.vy = 0; Wd.player.inv = 9999;
      for (let k = 0; k < 4; k++) { try { updatePlats(); for (const e of Wd.ents) if (e.alive) updateEnt(e); updateProjs(); } catch (e) { errors++; console.error('ERRO ents', e.stack); } }
      Wd.cam.x = U.clamp(x, 0, Wd.w * TS - W);
      render(); shot(`l${lv + 1}-b-${String(n++).padStart(2, '0')}`);
    }
  }
  console.log('fim. erros:', errors);
}, 50);
