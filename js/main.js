'use strict';
/* =========================================================
   Telas, menus, HUD, transições, salvamento e laço principal.
   ========================================================= */

const STORY = [
  'SEGUNDA-FEIRA, 07:42.',
  'O DESPERTADOR NÃO TOCOU...',
  '',
  'KINHU ESTÁ ATRASADO',
  'PARA O TRABALHO!',
  '',
  'AJUDE KINHU A PEGAR O ÔNIBUS,',
  'ATRAVESSAR O CENTRO DA CIDADE',
  'E SOBREVIVER AO ESCRITÓRIO!',
];
const CREDITS = [
  'PARABÉNS, KINHU!', '',
  'O MEGA BUG FOI CORRIGIDO', 'E O SISTEMA VOLTOU AO AR.', '',
  'DEPOIS DE UM LONGO DIA', 'DE ÔNIBUS, CHEFES E BUGS,', 'KINHU VOLTA PARA CASA', 'COM O DEVER CUMPRIDO.', '', '',
  '- KINHU\'S ADVENTURE -', '', 'UMA AVENTURA URBANA', 'EM 5 FASES', '', '',
  '{SCORE}', '', '',
  'OBRIGADO POR JOGAR!', '', '', '', 'FIM',
];

const App = {
  state: 'title', t: 0, sub: null, menu: null, trans: null, toastMsg: null, toastT: 0, titleImg: null, saveIcon: 0,
  storyT: 0,

  init() {
    Input.init();
    Save.load();
    Game.hiscore = Save.data.hiscore;
    Game.unlocked = Save.data.unlocked;
    this.titleImg = new Image();
    this.titleImg.src = 'assets/title.png';
    this.setupDom();
    fitScreen();
    this.go('title', null, true);
  },

  /* ---------- DOM: arquivo, toque, botões ---------- */
  setupDom() {
    if (typeof __NODE_TEST__ !== 'undefined') return;
    const file = document.getElementById('loadFile');
    file.addEventListener('change', () => { if (file.files[0]) this.readFile(file.files[0]); file.value = ''; });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) this.readFile(f); });
    const unlock = () => Sound.unlock();
    ['keydown', 'pointerdown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'play') this.openPause(); if (Sound.ctx) Sound.ctx.suspend(); }
      else if (Sound.ctx) Sound.ctx.resume();
    });
    const btn = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', e => { e.preventDefault(); fn(); el.blur(); }); };
    btn('btnSave', () => this.exportSave());
    btn('btnLoad', () => this.openFile());
    btn('btnFull', () => this.toggleFull());
    btn('btnMute', () => this.toggleMute());
    // controles de toque
    const touchy = 'ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (touchy) document.body.classList.add('touch');
    document.querySelectorAll('[data-act]').forEach(el => {
      const acts = el.dataset.act.split(',');
      const set = v => { for (const a of acts) Input.touch[a] = v; if (v) for (const a of acts) Input.hits['touch-' + a] = true; };
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); set(true); el.classList.add('on'); });
      const off = e => { e.preventDefault(); set(false); el.classList.remove('on'); };
      el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    });
    // tocar na tela do título/história também avança
    cv.addEventListener('pointerdown', () => { if (this.state !== 'play') Input.hits['touch-confirm'] = true; });
    // toques valem como "apertou" também
    for (const a of ['jump', 'run', 'start', 'confirm', 'left', 'right', 'up', 'down', 'back']) Input.map[a].push('touch-' + a);
    window.addEventListener('keydown', () => { if (!touchy) return; document.body.classList.remove('touch'); fitScreen(); }, { once: true });
  },
  openFile() { const f = document.getElementById('loadFile'); if (f) f.click(); },
  readFile(file) {
    const rd = new FileReader();
    rd.onload = () => {
      const r = Save.importText(String(rd.result));
      this.toast(r.msg);
      if (!r.ok) { Sound.fx('hurt'); return; }
      Sound.fx('check');
      Game.hiscore = Save.data.hiscore; Game.unlocked = Save.data.unlocked;
      if (Save.data.run && (this.state === 'play' || this.state === 'pause' || this.state === 'gameover')) this.continueRun();
      else if (this.state === 'title' || this.state === 'select') { this.openTitleMenu(); }
    };
    rd.readAsText(file);
  },
  exportSave() {
    if (this.state === 'play' || this.state === 'pause') this.saveProgress(false, true);
    const ok = Save.exportFile();
    this.toast(ok ? 'ARQUIVO DE SAVE BAIXADO!' : 'NÃO FOI POSSÍVEL SALVAR');
  },
  toggleFull() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) { /* sem tela cheia */ }
  },
  toggleMute() {
    Sound.setMuted(!Sound.muted);
    this.toast(Sound.muted ? 'SOM DESLIGADO' : 'SOM LIGADO');
    try { localStorage.setItem('kinhus-adventure:mute', Sound.muted ? '1' : '0'); } catch (e) { /* ok */ }
  },
  toast(msg) { this.toastMsg = msg; this.toastT = 150; },

  /* ---------- progresso ---------- */
  saveProgress(cleared, quiet) {
    let level = Game.levelIdx, checkpoint = Game.checkpoint;
    if (cleared) { level++; checkpoint = false; }
    Game.hiscore = Math.max(Game.hiscore, Game.score);
    const d = Save.data;
    d.hiscore = Game.hiscore;
    if (level >= LEVELS.length) { d.completed = true; d.run = null; }
    else {
      d.run = { level, lives: Game.lives, score: Game.score, coins: Game.coins, hearts: cleared ? Game.maxHearts : Math.max(1, Game.hearts), power: Game.power, checkpoint, savedAt: Date.now() };
      d.unlocked = Math.max(d.unlocked, level + 1);
    }
    Game.unlocked = d.unlocked;
    Save.persist();
    if (!quiet) this.saveIcon = 90;
  },
  continueRun() {
    const r = Save.data.run;
    if (!r) return;
    Game.levelIdx = r.level; Game.lives = r.lives; Game.score = r.score; Game.coins = r.coins;
    Game.hearts = r.hearts; Game.power = r.power; Game.checkpoint = r.checkpoint;
    this.go('intro');
  },
  newGame() {
    Game.reset();
    Save.data.plays++;
    Save.persist();
    this.go('story');
  },
  startLevel(idx) {
    Game.levelIdx = idx; Game.checkpoint = false;
    Game.lives = Math.max(Game.lives, 3);
    this.go('intro');
  },

  /* ---------- transições ---------- */
  go(state, fn, instant) {
    const apply = () => { this.state = state; this.t = 0; this.menu = null; if (fn) fn(); this.enter(state); };
    if (instant) { apply(); return; }
    this.trans = { t: 0, dur: 18, apply, done: false };
  },
  enter(state) {
    Input.clear();
    switch (state) {
      case 'title': Sound.play('title'); break;
      case 'story': Sound.play('title'); this.storyT = 0; break;
      case 'intro': Sound.stop(); break;
      case 'play':
        loadLevel(Game.levelIdx, Game.checkpoint);
        Game.hearts = Math.max(1, Game.hearts);
        Sound.tempo = 1;
        Sound.play(World.th.music, true);
        this.saveProgress(false, true);
        break;
      case 'gameover':
        Sound.play('gameover', true);
        Game.hiscore = Math.max(Game.hiscore, Game.score);
        Save.data.hiscore = Game.hiscore; Save.persist();
        this.menu = this.makeMenu([
          { label: 'TENTAR DE NOVO (FASE ' + (Game.levelIdx + 1) + ')', fn: () => { Game.lives = 3; Game.score = 0; Game.coins = 0; Game.hearts = 3; Game.power = 0; Game.checkpoint = false; this.go('intro'); } },
          { label: 'MENU INICIAL', fn: () => this.go('title') },
        ]);
        break;
      case 'ending': Sound.play('ending', true); break;
    }
  },

  /* ---------- menus ---------- */
  makeMenu(items, opt = {}) { return { items, i: opt.i || 0, title: opt.title, back: opt.back }; },
  openTitleMenu() {
    const d = Save.data, items = [];
    if (d.run) items.push({ label: 'CONTINUAR - FASE ' + (d.run.level + 1) + (d.run.checkpoint ? ' (PONTO)' : ''), fn: () => this.continueRun() });
    items.push({ label: 'NOVO JOGO', fn: () => this.newGame() });
    if (d.unlocked > 1 || d.completed) items.push({ label: 'ESCOLHER FASE', fn: () => this.openSelect() });
    items.push({ label: 'CARREGAR ARQUIVO DE SAVE', fn: () => this.openFile() });
    if (d.run || d.unlocked > 1 || d.completed) items.push({ label: 'BAIXAR ARQUIVO DE SAVE', fn: () => this.exportSave() });
    items.push({ label: 'COMO JOGAR', fn: () => { this.sub = 'help'; } });
    this.menu = this.makeMenu(items, { back: () => { this.menu = null; } });
  },
  openSelect() {
    const max = Save.data.completed ? LEVELS.length : Save.data.unlocked;
    const items = LEVELS.slice(0, max).map((L, i) => ({ label: (i + 1) + '. ' + L.name, fn: () => { Game.reset(); this.startLevel(i); } }));
    this.menu = this.makeMenu(items, { title: 'ESCOLHER FASE', back: () => this.openTitleMenu() });
  },
  openPause() {
    this.state = 'pause'; Sound.fx('pause');
    if (Sound.ctx && Sound.song) Sound.song.out.gain.setTargetAtTime(0.25, Sound.ctx.currentTime, 0.05);
    this.menu = this.makeMenu([
      { label: 'CONTINUAR', fn: () => this.closePause() },
      { label: 'BAIXAR ARQUIVO DE SAVE', fn: () => this.exportSave() },
      { label: 'CARREGAR ARQUIVO DE SAVE', fn: () => this.openFile() },
      { label: () => 'SOM: ' + (Sound.muted ? 'DESLIGADO' : 'LIGADO'), fn: () => this.toggleMute() },
      { label: 'REINICIAR FASE', fn: () => { Game.hearts = Game.maxHearts; this.go('play'); } },
      { label: 'SAIR PARA O MENU', fn: () => { this.saveProgress(false, true); this.go('title'); } },
    ], { title: 'PAUSA', back: () => this.closePause() });
  },
  closePause() {
    this.state = 'play'; this.menu = null; Input.clear();
    if (Sound.ctx && Sound.song) Sound.song.out.gain.setTargetAtTime(1, Sound.ctx.currentTime, 0.05);
  },
  updateMenu() {
    const m = this.menu;
    if (!m) return;
    if (Input.pressed('up')) { m.i = (m.i + m.items.length - 1) % m.items.length; Sound.fx('cursor'); }
    if (Input.pressed('down')) { m.i = (m.i + 1) % m.items.length; Sound.fx('cursor'); }
    if (Input.pressed('confirm')) { Sound.fx('select'); m.items[m.i].fn(); return; }
    if (Input.pressed('back') && m.back) { Sound.fx('cursor'); m.back(); }
  },
  drawMenu(m, cx, y, opt = {}) {
    const lines = m.items.map(it => (typeof it.label === 'function' ? it.label() : it.label));
    const w = Math.max(...lines.map(l => Font.width(l)), m.title ? Font.width(m.title) : 0) + 28;
    const h = lines.length * 12 + (m.title ? 18 : 6) + 6;
    const x = Math.round(cx - w / 2);
    ctx.fillStyle = opt.bg || '#00153b'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffbf30'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = '#ff8130'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    let yy = y + 6;
    if (m.title) { Font.draw(m.title, cx, yy, '#ffbf30', { align: 'center' }); yy += 16; }
    lines.forEach((l, i) => {
      const sel = i === m.i;
      if (sel) Font.draw('►', x + 7 + (Math.floor(this.t / 8) % 2), yy, '#ffbf30');
      Font.draw(l, x + 16, yy, sel ? '#ffe384' : '#e9effb');
      yy += 12;
    });
  },

  /* ---------- atualização ---------- */
  update() {
    Input.update();
    this.t++;
    if (this.toastT > 0) this.toastT--;
    if (this.saveIcon > 0) this.saveIcon--;
    if (Input.pressed('mute')) this.toggleMute();
    if (Input.pressed('full')) this.toggleFull();
    if (this.trans) {
      const tr = this.trans;
      tr.t++;
      if (tr.t === tr.dur && !tr.done) { tr.done = true; tr.apply(); }
      if (tr.t >= tr.dur * 2) this.trans = null;
      if (tr.t < tr.dur) return;
    }
    switch (this.state) {
      case 'title':
        if (this.sub === 'help') { if (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('start')) { this.sub = null; Sound.fx('cursor'); } break; }
        if (this.menu) this.updateMenu();
        else if (Input.pressed('start') || Input.pressed('confirm') || Input.pressed('jump')) { Sound.unlock(); Sound.fx('select'); this.openTitleMenu(); }
        break;
      case 'story':
        this.storyT++;
        if ((Input.pressed('start') || Input.pressed('confirm')) && this.storyT > 20) {
          const total = STORY.join('').length;
          if (this.storyT * 0.7 < total + 10) this.storyT = Math.ceil((total + 10) / 0.7);
          else { Game.levelIdx = 0; this.go('intro'); }
        }
        break;
      case 'intro':
        if (this.t > 170 || (this.t > 30 && (Input.pressed('start') || Input.pressed('confirm')))) this.go('play');
        break;
      case 'play':
        if (Input.pressed('start') && !World.clear && !World.player.dead) { this.openPause(); break; }
        updateWorld();
        break;
      case 'pause': this.updateMenu(); break;
      case 'gameover': if (this.t > 60) this.updateMenu(); break;
      case 'ending':
        if (this.t > 600 && (Input.pressed('start') || Input.pressed('confirm'))) this.go('title');
        break;
    }
  },
  onDeath() {
    if (this.trans) return;
    Game.lives--;
    Game.hearts = Game.maxHearts; Game.power = 0;
    if (Game.lives <= 0) { Game.lives = 0; Save.data.run = null; Save.persist(); this.go('gameover'); }
    else { this.saveProgress(false, true); this.go('intro'); }
  },
  levelDone() {
    if (this.trans) return;
    Game.levelIdx++;
    Game.checkpoint = false;
    Game.hearts = Game.maxHearts;
    if (Game.levelIdx >= LEVELS.length) { this.go('ending'); return; }
    this.go('intro');
  },
  bossClear() {
    World.clear = { phase: 'tally', t: 0, kind: 'trophy' };
    World.player.control = false; World.player.win = true;
    Sound.stop(); Sound.play('clear');
    Game.completed = true;
    this.saveProgress(true);
  },

  /* ---------- desenho ---------- */
  render() {
    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'story': this.drawStory(); break;
      case 'intro': this.drawIntro(); break;
      case 'play': case 'pause': drawWorld(); this.drawHUD(); if (this.state === 'pause') { ctx.fillStyle = 'rgba(0,10,30,0.55)'; ctx.fillRect(0, 0, W, H); this.drawMenu(this.menu, W / 2, 62); } break;
      case 'gameover': this.drawGameOver(); break;
      case 'ending': this.drawEnding(); break;
    }
    if (this.toastT > 0 && this.toastMsg) {
      const w = Font.width(this.toastMsg) + 12;
      ctx.fillStyle = 'rgba(0,21,59,0.9)'; ctx.fillRect(W / 2 - w / 2, H - 22, w, 14);
      Font.draw(this.toastMsg, W / 2, H - 18, '#ffe384', { align: 'center' });
    }
    if (this.trans) this.applyTrans();
  },
  applyTrans() {
    const tr = this.trans, k = tr.t < tr.dur ? tr.t / tr.dur : 2 - tr.t / tr.dur;
    const m = 1 + Math.floor(k * 10);
    if (m > 1) {
      // efeito mosaico (marca registrada do SNES)
      if (!this.mos) this.mos = U.canvas(W, H);
      const sw = Math.ceil(W / m), sh = Math.ceil(H / m);
      this.mos.x.drawImage(cv, 0, 0, W, H, 0, 0, sw, sh);
      ctx.drawImage(this.mos.c, 0, 0, sw, sh, 0, 0, sw * m, sh * m);
    }
    ctx.fillStyle = 'rgba(0,0,0,' + U.clamp(k * 1.1, 0, 1).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  },
  drawTitle() {
    const img = this.titleImg;
    if (img && (img.complete || img.data) && img.width) {
      ctx.drawImage(img, 0, 0);
      ctx.drawImage(img, 0, 195, 256, 1, 0, 196, 256, 28);
    } else { ctx.fillStyle = '#a2c4ff'; ctx.fillRect(0, 0, W, H); Font.draw("KINHU'S ADVENTURE", W / 2, 80, '#ffbf30', { align: 'center', scale: 2, outline: true }); }
    if (this.sub === 'help') { this.drawHelp(); return; }
    if (!this.menu) {
      if (Math.floor(this.t / 30) % 2 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(101, 130, 60, 1); ctx.fillRect(101, 150, 60, 1); ctx.fillRect(101, 130, 1, 21); ctx.fillRect(160, 130, 1, 21); }
      const touch = typeof document !== 'undefined' && document.body && document.body.classList.contains('touch');
      if (Math.floor(this.t / 30) % 2 === 0) Font.draw(touch ? 'TOQUE PARA COMEÇAR' : 'APERTE ENTER OU ESPAÇO', W / 2, 205, '#ffffff', { align: 'center', outline: true });
      if (Game.hiscore > 0) Font.draw('RECORDE ' + String(Game.hiscore).padStart(7, '0'), W / 2, 215, '#ffe384', { align: 'center' });
    } else this.drawMenu(this.menu, W / 2, 118);
  },
  drawHelp() {
    ctx.fillStyle = 'rgba(0,21,59,0.94)'; ctx.fillRect(12, 20, W - 24, H - 40);
    const L = [
      ['COMO JOGAR', '#ffbf30'], ['', ''],
      ['SETAS / A D: ANDAR', '#e9effb'], ['Z / ESPAÇO / ▲: PULAR', '#e9effb'], ['X / SHIFT: CORRER', '#e9effb'],
      ['X COM CAFÉ: JOGAR GRÃOS', '#e9effb'], ['▼ + PULAR: DESCER PLATAFORMA', '#e9effb'], ['ENTER: PAUSA   M: SOM   F: TELA CHEIA', '#e9effb'], ['', ''],
      ['CACHORRO-QUENTE: +1 CORAÇÃO', '#ffb0a0'], ['CAFÉ: PODER DE ARREMESSO', '#ffd0a0'], ['GARRAS: MODO KINHURINE!', '#ffe384'], ['CRACHÁ: VIDA EXTRA', '#a0ffa0'], ['', ''],
      ['O JOGO SALVA SOZINHO NO NAVEGADOR.', '#a2c4ff'], ['NA PAUSA DÁ PARA BAIXAR O SAVE', '#a2c4ff'], ['E CARREGAR EM OUTRO LUGAR.', '#a2c4ff'],
    ];
    L.forEach(([t, c], i) => { if (t) Font.draw(t.replace('↑', '▲'), W / 2, 28 + i * 10, c, { align: 'center' }); });
  },
  drawStory() {
    BG.draw('bairro', this.storyT * 0.5, this.storyT);
    ctx.fillStyle = 'rgba(0,21,59,0.82)'; ctx.fillRect(14, 30, W - 28, 140);
    let n = Math.floor(this.storyT * 0.7);
    STORY.forEach((line, i) => {
      if (n <= 0) return;
      const s = line.slice(0, n); n -= line.length;
      Font.draw(s, W / 2 - Font.width(line) / 2, 44 + i * 13, i < 2 ? '#ffe384' : '#ffffff');
    });
    const k = SPR.kinhu, frame = k.run[Math.floor(this.storyT / 6) % 4];
    ctx.drawImage(frame.r, W / 2 - 10, 182);
    if (this.storyT * 0.7 > STORY.join('').length && Math.floor(this.t / 20) % 2) Font.draw('APERTE ENTER', W / 2, 212, '#ffffff', { align: 'center' });
  },
  drawIntro() {
    const L = LEVELS[Game.levelIdx];
    ctx.fillStyle = '#00153b'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = y % 8 ? '#021a44' : '#00153b'; ctx.fillRect(0, y, W, 2); }
    Font.draw('FASE ' + L.id, W / 2, 46, '#ffbf30', { align: 'center', scale: 2, outline: true });
    Font.draw(L.name, W / 2, 78, '#ffffff', { align: 'center' });
    ctx.drawImage(SPR.clock, W / 2 - 22, 92);
    Font.draw(L.clock, W / 2 - 10, 95, '#a2c4ff');
    Font.draw(L.goal, W / 2, 116, '#ffe384', { align: 'center' });
    const k = SPR.kinhu.idle;
    ctx.drawImage(k.r, W / 2 - 26, 140);
    Font.draw('× ' + Game.lives, W / 2 + 2, 150, '#ffffff');
    if (Game.checkpoint) Font.draw('CONTINUANDO DO PONTO', W / 2, 180, '#80ff80', { align: 'center' });
  },
  drawGameOver() {
    ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
    Font.draw('FIM DE JOGO', W / 2, 60, '#ff5a40', { align: 'center', scale: 2, outline: true });
    Font.draw('PONTOS ' + String(Game.score).padStart(7, '0'), W / 2, 92, '#ffffff', { align: 'center' });
    Font.draw('RECORDE ' + String(Game.hiscore).padStart(7, '0'), W / 2, 104, '#ffe384', { align: 'center' });
    ctx.drawImage(SPR.kinhu.hurt.r, W / 2 - 10, 116);
    if (this.menu && this.t > 60) this.drawMenu(this.menu, W / 2, 150);
  },
  drawEnding() {
    BG.draw('final', this.t * 0.8, this.t);
    const T = Tiles.get('bairro');
    for (let x = -16; x < W + 16; x += 16) {
      const ox = Math.round(x - ((this.t * 0.8) % 16));
      ctx.drawImage(T.ground[1][((x / 16) | 0) % 3 < 0 ? 0 : ((x / 16) | 0) % 3], ox, 192); ctx.drawImage(T.ground[0][0], ox, 208);
    }
    const k = SPR.kinhu.run[Math.floor(this.t / 7) % 4];
    ctx.drawImage(k.r, 60, 168);
    ctx.fillStyle = 'rgba(20,10,40,0.35)'; ctx.fillRect(0, 0, W, 160);
    const y0 = 170 - this.t * 0.35;
    CREDITS.forEach((line, i) => {
      const y = y0 + i * 12;
      if (y < -10 || y > 160) return;
      const txt = line === '{SCORE}' ? 'PONTUAÇÃO FINAL: ' + String(Game.score).padStart(7, '0') : line;
      Font.draw(txt, W / 2, y, i === 0 || line === 'FIM' ? '#ffe384' : '#ffffff', { align: 'center' });
    });
    if (this.t > 600 && Math.floor(this.t / 20) % 2) Font.draw('APERTE ENTER', W / 2, 212, '#ffffff', { align: 'center', outline: true });
  },
  drawHUD() {
    const Wd = World, p = Wd.player;
    ctx.fillStyle = 'rgba(0,10,30,0.35)'; ctx.fillRect(0, 0, W, 15);
    ctx.drawImage(SPR.kinhuHead, 0, 0, 20, 12, 1, 1, 20, 12);
    Font.draw('×' + Game.lives, 20, 5);
    for (let i = 0; i < Game.maxHearts; i++) ctx.drawImage((i < Game.hearts ? SPR.heart : SPR.heartEmpty).r, 38 + i * 10, 3);
    if (Game.power === 1) ctx.drawImage(SPR.coffee.r, 69, -2);
    ctx.drawImage(SPR.coinSmall, 90, 5);
    Font.draw('×' + String(Game.coins).padStart(2, '0'), 97, 5);
    Font.draw(String(Game.score).padStart(7, '0'), 128, 5);
    ctx.drawImage(SPR.clock, 180, 2);
    Font.draw(String(Math.max(0, Wd.time)).padStart(3, '0'), 191, 5, Wd.hurry && Wd.t % 20 < 10 ? '#ff6040' : '#ffffff');
    Font.draw('F' + Wd.def.id, 233, 5, '#ffe384');
    if (p.wild > 0) { const w = Math.round((p.wild / 600) * 60); ctx.fillStyle = '#20141c'; ctx.fillRect(W / 2 - 31, 17, 62, 4); ctx.fillStyle = ['#ffe040', '#ff80c0', '#60e0ff'][Math.floor(Wd.t / 4) % 3]; ctx.fillRect(W / 2 - 30, 18, w, 2); }
    if (Wd.bannerT > 0 && (Wd.bannerT > 20 || Wd.bannerT % 4 < 2)) Font.draw(Wd.banner, W / 2, 34, '#ffe384', { align: 'center', outline: true });
    if (Wd.bossFight && Wd.boss && Wd.boss.alive && Wd.boss.state !== 'dead') {
      const b = Wd.boss;
      Font.draw('MEGA BUG', W / 2, 202, '#a0ff80', { align: 'center', outline: true });
      ctx.fillStyle = '#20141c'; ctx.fillRect(W / 2 - 51, 212, 102, 6);
      ctx.fillStyle = '#3a1020'; ctx.fillRect(W / 2 - 50, 213, 100, 4);
      ctx.fillStyle = b.phase === 2 ? '#ff4060' : '#58d048'; ctx.fillRect(W / 2 - 50, 213, Math.round((Math.max(0, b.hp) / b.maxHp) * 100), 4);
    }
    if (this.saveIcon > 0 && this.saveIcon % 10 < 7) Font.draw('SALVO', W - 4, 18, '#80ff80', { align: 'right' });
  },
};

/* ---------- laço principal (60 quadros por segundo fixos) ---------- */
(function boot() {
  try { if (localStorage.getItem('kinhus-adventure:mute') === '1') Sound.muted = true; } catch (e) { /* ok */ }
  App.init();
  if (typeof __NODE_TEST__ !== 'undefined') return;
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(250, now - last); last = now;
    let n = 0;
    while (acc >= STEP && n < 5) { App.update(); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    App.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
