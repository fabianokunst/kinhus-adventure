'use strict';
/* =========================================================
   Sprites: Kinhu, inimigos, itens e projéteis.
   Tudo desenhado em pixel art por código (sem imagens).
   ========================================================= */

const OUT = '#20141c'; // cor do contorno

// alinha o conteúdo ao fundo (pés na penúltima linha, contorno na última)
function bottomAlign(rows, h) {
  let last = rows.length - 1;
  while (last > 0 && !/[^.]/.test(rows[last])) last--;
  const w = Math.max(...rows.map(r => r.length));
  const empty = '.'.repeat(w);
  const out = rows.slice(0, last + 1);
  while (out.length < h - 1) out.unshift(empty);
  while (out.length > h - 1) out.shift();
  out.push(empty);
  return out;
}

function build(rows, pal, opt = {}) {
  let r = rows;
  if (opt.h) r = bottomAlign(rows, opt.h);
  const g = Grid.rows(r, pal);
  if (opt.outline !== false) g.outline(opt.outline || OUT);
  return g;
}

const SPR = {};

/* ---------------- KINHU ---------------- */
const K_PAL = {
  h: '#b8865e', H: '#8a5e3c', L: '#ffe4cc', s: '#f2bc94', S: '#d18c68',
  b: '#6e3c1c', B: '#4a2612', g: '#a8601a', G: '#e8f6ff', e: '#1c2a44',
  w: '#ffffff', m: '#9a2232', o: '#f8861c', O: '#ffb45a', r: '#c45a0e',
  j: '#3a5cae', J: '#24397a', k: '#2c2c34', K: '#ececec', c: '#e8eef8', C: '#9aa6b8',
};
const K_TOP = [
  '....................',
  '.......hhLLLLh......',
  '.....hhhLLLLsssh....',
  '....hhhhsssssssss...',
  '....hhhssgggggggg...',
  '....hhSsggGeggGeg...',
  '....hhSssggggggggs..',
  '....bbbssssssssssS..',
  '....bbbbbbbbBwwwwb..',
  '....bbbbbbbbbBmmmb..',
  '.....bbbbbbbbbbbb...',
  '...ooBbbbbbbbbbBoo..',
  '..oooooBBBBBBBoooo..',
  '..oOOoooooooooooor..',
  '..oOooooooooooooor..',
  '..rooooooooooooorr..',
  '..ssrrooooooooorrss.',
  '....rrrrrrrrrrrr....',
  '....jjjjjjjjjjjj....',
];
// braços para cima (pulo / vitória)
const K_ARMS_UP = {
  9: '..s.bbbbbbbbbBmmmbs.',
  10: '..o..bbbbbbbbbbbbo..',
  11: '..oooBbbbbbbbbbBoo..',
  12: '...ooooBBBBBBBooo...',
  13: '...OOooooooooooor...',
  14: '...Ooooooooooooor...',
  15: '...ooooooooooooor...',
  16: '....rooooooooorr....',
};
// balanço dos braços correndo
const K_ARMS_RUN = {
  13: '..oOOoooooooooooorr.',
  14: '.roOoooooooooooooss.',
  15: '.ssoooooooooooorr...',
  16: '....rrooooooooor....',
};
const K_LEGS = {
  idle: ['....jjjjJ..Jjjjj....', '....jjjj....jjjj....', '....kkkk....kkkkk...', '....KKKK....KKKKK...'],
  run1: ['...jjjjJ...Jjjjj....', '..jjjj.......jjjj...', '.kkkk.........kkkk..', '.KKKK.........KKKK..'],
  run2: ['.....jjjjJjjj.......', '......jjjjjj........', '......kkkkkkk.......', '......KKKKKKK.......'],
  run3: ['...Jjjjj...jjjjJ....', '...jjjj.......jjjj..', '..kkkk.........kkkk.', '..KKKK.........KKKK.'],
  jump: ['....jjjjjjjjjjjj....', '....jjjj....jjjj....', '...kkkk......kkkk...', '...KKKK......KKKK...'],
  fall: ['....jjjjJ..Jjjjj....', '....jjjj....jjjj....', '....jjjj....jjjj....', '....kkkk....kkkkk...'],
};

function kinhuRows(legs, opt = {}) {
  let top = K_TOP.slice();
  if (opt.arms) for (const k in opt.arms) top[k] = opt.arms[k];
  if (opt.blink) { top[5] = top[5].replace(/e/g, 'G'); }
  if (opt.hurt) {
    top[5] = top[5].replace(/Ge/g, 'gg');
    top[8] = top[8].replace('wwww', 'mmmm');
    top[9] = top[9].replace('mmm', 'mwm');
  }
  if (opt.wild) { // modo Kinhurine: cabelo arrepiado
    top[0] = '...h........h.......';
    top[1] = '...hh..hhLLLLhh.....';
    top[2] = '..hhhhhhLLLLsssh....';
    top[3] = '...hhhhhsssssssss...';
  }
  if (opt.bob) top = top.slice(1).concat([top[top.length - 1]]);
  const rows = top.concat(legs, ['....................']);
  if (opt.claws) {
    const r = rows.map(s => s.split(''));
    const put = (x, y) => { if (r[y] && x < 20) r[y][x] = 'c'; };
    // garras saindo da mão da frente
    put(18, 15); put(19, 14); put(18, 13); put(19, 12); put(17, 14);
    return r.map(a => a.join(''));
  }
  return rows;
}

function buildKinhu(palOverride = {}, extra = {}) {
  const pal = Object.assign({}, K_PAL, palOverride);
  const mk = (legs, o) => mkSprite(build(kinhuRows(K_LEGS[legs], Object.assign({}, extra, o)), pal));
  return {
    idle: mk('idle', {}),
    blink: mk('idle', { blink: true }),
    run: [mk('run1', { arms: K_ARMS_RUN }), mk('run2', { bob: true }), mk('run3', { arms: K_ARMS_RUN }), mk('run2', { bob: true })],
    jump: mk('jump', { arms: K_ARMS_UP }),
    fall: mk('fall', {}),
    hurt: mk('fall', { arms: K_ARMS_UP, hurt: true }),
    win: mk('idle', { arms: K_ARMS_UP }),
    skid: mk('run2', { arms: K_ARMS_UP }),
  };
}

SPR.kinhu = buildKinhu();
SPR.kinhuCafe = buildKinhu({ o: '#e8402e', O: '#ff8a6a', r: '#a8221c' });
SPR.kinhuWild = [
  buildKinhu({ o: '#ffd23a', O: '#fff2a0', r: '#d89a10', h: '#4a2a14' }, { wild: true, claws: true }),
  buildKinhu({ o: '#ff7ab8', O: '#ffc0e0', r: '#c8407a', h: '#4a2a14' }, { wild: true, claws: true }),
  buildKinhu({ o: '#4ad8f0', O: '#b0f4ff', r: '#1a90b8', h: '#4a2a14' }, { wild: true, claws: true }),
];
SPR.kinhu1up = buildKinhu({ o: '#48c048', O: '#98f088', r: '#208a30' });

// cabeça do Kinhu para o HUD (recorte)
SPR.kinhuHead = (() => {
  const g = build(kinhuRows(K_LEGS.idle).slice(0, 12).concat(['....................']), K_PAL);
  return g.canvas();
})();

/* ---------------- INIMIGOS ---------------- */
// Cachorro caramelo
const DOG_PAL = { a: '#e0a050', A: '#f8cc88', z: '#b07030', n: '#2a1a14', t: '#f8f0e0', q: '#e04848' };
const DOG_TOP = [
  '............zz......',
  '...........zaAaa....',
  '..a........aaAaaa...',
  '..a........aanaatn..',
  '..aa.......aaaattt..',
  '...aaaaaaaaqqaaa....',
  '...aAAAAAAAAaaaa....',
  '...aaaaaaaaaaaaa....',
  '...zaaaaaaaaaaaz....',
  '....zzzzzzzzzzz.....',
];
const DOG_LEGS = [
  ['....aa..aa...aa.aa..', '....tt..tt...tt.tt..'],
  ['...aa...aa..aa..aa..', '..tt....tt..tt...tt.'],
];
SPR.dog = DOG_LEGS.map(l => mkSprite(build(DOG_TOP.concat(l), DOG_PAL, { h: 16 })));
SPR.dogBark = (() => {
  const t = DOG_TOP.slice();
  t[3] = '..a........aanaatn..';
  t[4] = '..aa.......aaaaq....';
  t[5] = '...aaaaaaaaqqaattt..';
  return mkSprite(build(t.concat(DOG_LEGS[1]), DOG_PAL, { h: 16 }));
})();

// Pombo
const PIG_PAL = { c: '#8890a8', C: '#c0c8d8', v: '#586078', i: '#58b098', n: '#d07a48', e: '#e05020' };
SPR.pigeon = [
  build(['.....vCC........', '....vCCC....cc..', '...vCCCc...ccen.', '.vvccccccciic...', '.vvCCCCcccccc...', '..vvcccccccc....', '....vvvvvv......', '.......n.n......'], PIG_PAL),
  build(['................', '............cc..', '...........ccen.', '.vvccccccciic...', '.vvCCCCcccccc...', '..vvcCCCcccc....', '....vvCCCvvv....', '.......CCv......', '.......n.n......'], PIG_PAL),
].map(g => { const f = new Grid(16, 16); f.paste(g, 0, 3); return mkSprite(f); });

// Barata
const ROACH_PAL = { R: '#8a4a20', Y: '#d08a48', D: '#4a2410', l: '#3a2010' };
SPR.roach = [
  ['............l...', '....RRRRR..l....', '..RYYRRRRRDDl...', '..RRRRRRRRDDD...', '...DDDDDDDD.....', '...l.l..l.l.....'],
  ['............l...', '....RRRRR..l....', '..RYYRRRRRDDl...', '..RRRRRRRRDDD...', '...DDDDDDDD.....', '..l..l.l...l....'],
].map(r => mkSprite(build(r, ROACH_PAL, { h: 16 })));

/* ----- gerador de pessoas (colegas, passageiros, skatista, trombadinha) ----- */
const PERSON_BASE = [
  '.....hhhh.......',
  '....hhhhhhh.....',
  '...hhhhssss.....',
  '...hhSsssess....',
  '...hhSssssss....',
  '....Sssssms.....',
  '.....SSsss......',
  '....tttttt......',
  '...tttttttt.....',
  '..ttTtttttt.....',
  '..tTtttttts.....',
  '..s.tttttt......',
  '....TTTTTT......',
  '....pppppp......',
];
const PERSON_LEGS = [
  ['....pp..pp......', '....pp..pp......', '...nnn..nnn.....'],
  ['...pp....pp.....', '..pp......pp....', '.nnn......nnnn..'],
  ['.....pppp.......', '.....pppp.......', '.....nnnnnn.....'],
];
function personRows(o, legs, pose) {
  let r = PERSON_BASE.slice();
  if (o.hair === 'spiky') { r[0] = '....h.h.h.......'; r[1] = '....hhhhhhh.....'; }
  if (o.hair === 'curly') { r[0] = '....hhhhhh......'; r[1] = '...hhhhhhhhh....'; r[2] = '..hhhhhssss.....'; r[3] = '..hhhSsssess....'; r[4] = '..hhhSssssss....'; r[5] = '...hhSssssms....'; }
  if (o.hair === 'cap') { r[0] = '....cccccc......'; r[1] = '...cccccccCC....'; r[2] = '...hhhssssss....'; }
  if (o.hair === 'hood') { r[0] = '.....kkkk.......'; r[1] = '....kkkkkkk.....'; r[2] = '...kkkmmmmm.....'; r[3] = '...kkmwmmwm.....'; r[4] = '...kkSssssss....'; r[5] = '....kSsssms.....'; }
  if (o.tie) { for (const y of [7, 8, 9, 10, 11]) { const a = r[y].split(''); a[7] = 'y'; r[y] = a.join(''); } }
  if (o.stripes) { for (const y of [8, 10, 12]) r[y] = r[y].replace(/t/g, 'T'); }
  if (o.angry) { r[3] = r[3].replace('sess', 'eeSs'); r[5] = r[5].replace('ms', 'mm'); }
  if (pose === 'up') { r[9] = '..ttTtttttt.s...'; r[10] = '..tTttttttts....'; }
  if (pose === 'fwd') { r[9] = '..ttTttttttss...'; r[10] = '..tTtttttt......'; }
  if (o.dress) {
    r = r.concat(['...pppppppp.....', '..pppppppppp....']);
    legs = [['....ss..ss......', '...nnn..nnn.....'], ['...ss....ss.....', '..nnn.....nnn...'], ['.....ssss.......', '.....nnnnn......']][PERSON_LEGS.indexOf(legs)];
  }
  r = r.concat(legs);
  return r;
}
function makePerson(o) {
  const pal = Object.assign({ h: '#3a2418', s: '#e8b088', S: '#c08060', e: '#1c1c28', m: '#8a2a2a', t: '#f0f0f8', T: '#c0c8d8', p: '#505868', n: '#201810', y: '#d02828', c: '#e03030', C: '#a01818', k: '#363648', w: '#ffffff' }, o.pal || {});
  const fr = (legs, pose, extra) => {
    let rows = personRows(o, PERSON_LEGS[legs], pose);
    let g = Grid.rows(bottomAlign(rows, 24), pal);
    if (extra) extra(g);
    g.outline(OUT);
    return mkSprite(g);
  };
  return {
    walk: [fr(0), fr(1), fr(0), fr(2)],
    act: fr(0, o.actPose || 'up', o.actExtra),
    dizzy: fr(2, null),
    item: o.item,
  };
}

SPR.coworker = makePerson({ hair: 'spiky', tie: true, angry: true, actPose: 'up' });
SPR.intern = makePerson({ hair: 'short', pal: { h: '#c88a3a', t: '#40a860', T: '#287040', p: '#3a4a7a' }, actPose: 'fwd' });
SPR.lady = makePerson({ hair: 'curly', dress: true, pal: { h: '#c8c8d8', t: '#9050b0', T: '#6a3088', p: '#9050b0' }, actPose: 'fwd' });
SPR.thief = makePerson({ hair: 'hood', stripes: true, pal: { t: '#e8e8e8', T: '#303040', p: '#2a3050', m: '#101018' } });
SPR.skater = makePerson({ hair: 'cap', pal: { t: '#f0c020', T: '#c08a10', p: '#4a6a9a', h: '#2a1a10' } });
SPR.worker = makePerson({ hair: 'cap', pal: { c: '#f8c818', C: '#c09010', t: '#f87818', T: '#c05010', p: '#3a4a6a' } });

// acessórios desenhados sobre as pessoas
SPR.bag = mkSprite(build(['.qq.', 'q..q', 'qqqq', 'qQqq', 'qqqq'], { q: '#d03848', Q: '#ffd040' }));
SPR.cup = mkSprite(build(['ww', 'bb', 'ww'], { w: '#ffffff', b: '#8a5030' }));
SPR.board = mkSprite(build(['.kkkkkkkkkkkk.', '..KK......KK..'], { k: '#b06830', K: '#303030' }));

// Bug (criaturinha do sistema)
const BUG_PAL = { g: '#58d048', G: '#b0f088', d: '#2c8030', w: '#ffffff', e: '#101018', a: '#20301c', r: '#e84858' };
SPR.bug = [
  ['....a.....a.....', '.....a...a......', '....gggggggg....', '...gGGgggggggg..', '..gGwwggggwwgg..', '..ggweggggwegg..', '..gggggrrggggg..', '..dggggggggggd..', '...dddddddddd...', '...a.a....a.a...'],
  ['....a.....a.....', '.....a...a......', '....gggggggg....', '...gGGgggggggg..', '..gGwwggggwwgg..', '..ggweggggwegg..', '..gggggrrggggg..', '..dggggggggggd..', '...dddddddddd...', '....a.a..a.a....'],
].map(r => mkSprite(build(r, BUG_PAL, { h: 16 })));
SPR.bugFlat = mkSprite(build(['...gGgggggggg...', '..gggeeggeeggg..', '.dddddddddddddd.'], BUG_PAL, { h: 16 }));

const FLY_PAL = { m: '#b058e0', M: '#e8b0ff', D: '#6a2a90', z: '#d8f4ff', w: '#ffffff', e: '#101018', a: '#301040' };
SPR.flybug = [
  ['..zz........zz..', '.zzzz.a..a.zzzz.', '..zzzmmmmmmzzz..', '....mMwwmwwm....', '....mMwemwem....', '....mmmmmmmm....', '.....DDDDDD.....', '......D..D......'],
  ['................', '......a..a......', '.....mmmmmm.....', '.zz.mMwwmwwm.zz.', '.zzzmMwemwemzzz.', '..zzmmmmmmmmzz..', '.....DDDDDD.....', '......D..D......'],
].map(r => { const g = build(r, FLY_PAL); const f = new Grid(16, 16); f.paste(g, 0, 3); return mkSprite(f); });

/* ---------------- CHEFE: MEGA BUG ---------------- */
function buildBoss(variant) {
  const g = new Grid(48, 40);
  const C = variant === 'hurt'
    ? { body: '#ffffff', light: '#ffffff', dark: '#e0e0ff', belly: '#ffffff', eye: '#ff4060' }
    : { body: '#3fb83a', light: '#8ff07a', dark: '#1f6e2a', belly: '#c8f0a0', eye: '#ff2850' };
  const tuck = variant === 'jump';
  // pernas
  const legY = tuck ? 30 : 33;
  for (const [x, dx] of [[8, -1], [15, -1], [32, 1], [39, 1]]) {
    g.line(x, 26, x + dx * 3, legY, '#20301c');
    g.line(x + 1, 26, x + 1 + dx * 3, legY, '#20301c');
    g.rect(x + dx * 3 - 1, legY, 4, 2, '#20301c');
  }
  // corpo
  g.ellipse(24, 21, 20, 13, (nx, ny, x, y) => {
    const l = -nx * 0.45 - ny * 0.75;
    if (l > 0.55) return C.light;
    if (l > 0.42 && U.dither(x, y, 0.5)) return C.light;
    if (l < -0.45) return C.dark;
    if (l < -0.3 && U.dither(x, y, 0.5)) return C.dark;
    return C.body;
  });
  // carapaça com linhas de código
  for (let i = 0; i < 4; i++) g.rect(13 + i * 6, 12 + (i % 2), 3, 1, C.dark);
  g.rect(23, 9, 2, 12, C.dark);
  // barriga
  g.ellipse(24, 28, 11, 5, C.belly);
  // olhos
  for (const ex of [16, 32]) {
    g.ellipse(ex, 19, 5.5, 5.5, '#ffffff');
    g.ellipse(ex + (ex < 24 ? 1 : -1), 20, 2.6, 3, variant === 'hurt' ? '#ff4060' : '#101018');
    g.set(ex - 1 + (ex < 24 ? 1 : -1), 18, '#ffffff');
  }
  // sobrancelhas bravas
  g.line(11, 12, 19, 15, '#101018'); g.line(11, 13, 19, 16, '#101018');
  g.line(37, 12, 29, 15, '#101018'); g.line(37, 13, 29, 16, '#101018');
  // boca
  if (variant === 'open') {
    g.ellipse(24, 28, 7, 4, '#5a0a20');
    g.rect(19, 25, 2, 2, '#ffffff'); g.rect(27, 25, 2, 2, '#ffffff');
  } else {
    g.line(18, 27, 30, 27, '#101018');
    g.rect(20, 28, 2, 2, '#ffffff'); g.rect(26, 28, 2, 2, '#ffffff');
  }
  // antenas
  g.line(17, 9, 11, 1, '#20301c'); g.line(31, 9, 37, 1, '#20301c');
  g.ellipse(11, 1.5, 2, 2, C.eye); g.ellipse(37, 1.5, 2, 2, C.eye);
  g.outline(OUT);
  return mkSprite(g);
}
SPR.boss = { idle: buildBoss('idle'), open: buildBoss('open'), jump: buildBoss('jump'), hurt: buildBoss('hurt') };

/* ---------------- ITENS ---------------- */
// moeda girando
SPR.coin = [4, 3, 1.4, 3].map((rx, i) => {
  const g = new Grid(16, 16);
  g.ellipse(8, 8, rx, 5.6, (nx, ny, x, y) => {
    if (rx < 2) return nx < 0 ? '#fff0a0' : '#d89810';
    const r2 = nx * nx + ny * ny;
    if (r2 > 0.62) return nx + ny < 0 ? '#fff4b0' : '#c88a08';
    if (Math.abs(nx) < 0.22 && Math.abs(ny) < 0.55) return '#c88a08';
    return nx < -0.2 ? '#ffe060' : '#f8c020';
  });
  g.outline(OUT);
  return mkSprite(g);
});
SPR.coinSmall = (() => { const g = build(['.yy.', 'yWyY', 'yWyY', 'yWyY', 'yyyY', '.YY.'], { y: '#f8c020', Y: '#c88a08', W: '#fff4b0' }); return g.canvas(); })();

// cachorro-quente (recupera coração) — inspirado no logo
SPR.hotdog = mkSprite(build([
  '................',
  '..........qq....',
  '........qqQq....',
  '......pqqQqbb...',
  '....ppbqQqqbp...',
  '...pbbyqqyqbp...',
  '..pbbqyqqyqp....',
  '..pbqqqyqqbp....',
  '.qqQqyqqybp.....',
  '.qqqqqqbbp......',
  '..pbbbbbp.......',
  '...pppp.........',
], { p: '#b06a30', b: '#e0a060', q: '#d84030', Q: '#ff8a70', y: '#ffd830' }, { h: 16 }));

// café (poder: arremessar grãos de café)
SPR.coffee = mkSprite(build([
  '.....s..s.......',
  '......s..s......',
  '.....s..s.......',
  '...wwwwwwwww....',
  '...WWWWWWWWW....',
  '....wwwwwww.....',
  '....bbbbbbb.....',
  '....bBbbbbb.....',
  '....bbbbbbb.....',
  '....wwwwwww.....',
  '.....wwwww......',
  '.....WWWWW......',
], { w: '#ffffff', W: '#c8c8d8', b: '#9a5a2a', B: '#d08a48', s: '#e8e8f0' }, { h: 16 }));

// garras (modo Kinhurine: invencível)
SPR.claws = mkSprite(build([
  '..c...c...c.....',
  '..cC..cC..cC....',
  '...cC..cC..cC...',
  '...cC..cC..cC...',
  '....cC..cC..cC..',
  '....cC..cC..cC..',
  '...ssssssssss...',
  '..sLLssssssssS..',
  '..ssssssssssSS..',
  '...SSSSSSSSSS...',
], { c: '#f0f4ff', C: '#8a98b0', s: '#f2bc94', S: '#d18c68', L: '#ffe4cc' }, { h: 16 }));

// crachá 1UP
SPR.badge = mkSprite(build([
  '......bb........',
  '......bb........',
  '...gggggggggg...',
  '...gGGGGGGGGg...',
  '...gGwGwGwwGg...',
  '...gGwGwGwGGg...',
  '...gGwGwGwwGg...',
  '...gGwGwGwGGg...',
  '...gGGwGGwGGg...',
  '...gGGGGGGGGg...',
  '...gggggggggg...',
], { g: '#208a30', G: '#58d058', w: '#ffffff', b: '#3a5cae' }, { h: 16 }));

// troféu final
SPR.trophy = mkSprite(build([
  '...yyyyyyyyyy...',
  '.yyYyyyyyyyyyyy.',
  '.y.YyyyyyyyyY.y.',
  '.y.YyyyyyyyyY.y.',
  '..yyYyyyyyyYyy..',
  '....YyyyyyyY....',
  '.....YyyyyY.....',
  '.......yy.......',
  '.......yy.......',
  '.....dddddd.....',
  '....dDDDDDDd....',
  '....dddddddd....',
], { y: '#ffd030', Y: '#fff4a0', d: '#8a5a20', D: '#c08a40' }, { h: 16 }));

// grão de café (projétil do Kinhu)
SPR.bean = [0, 1].map(f => {
  const g = new Grid(8, 8);
  g.ellipse(4, 4, f ? 2.4 : 3, f ? 3 : 2.4, (nx, ny) => (nx + ny < -0.5 ? '#c88a50' : '#7a4422'));
  if (f) g.line(4, 2, 4, 5, '#3a1e0e'); else g.line(2, 4, 5, 4, '#3a1e0e');
  g.outline(OUT);
  return mkSprite(g);
});

// projéteis inimigos
SPR.poop = mkSprite(build(['.w.', 'wWw', 'www'], { w: '#f8f8f0', W: '#a8a890' }));
SPR.plane = mkSprite(build(['ww......', 'WWwww...', '.WWWwwww', '..WWWW..'], { w: '#ffffff', W: '#b8c0d0' }));
SPR.paper = mkSprite(build(['wwwwwwww', 'wllllllw', 'wwwwwwww', 'wllllw.w', 'wwwwwwww'], { w: '#ffffff', l: '#8890b0' }));
SPR.water = mkSprite(build(['.bb.', 'bBbb', 'bbbb', '.bb.'], { b: '#58a8f0', B: '#d8f0ff' }));
SPR.spark = [0, 1].map(f => mkSprite(build(f ? ['.y.', 'yWy', '.y.'] : ['y.y', '.W.', 'y.y'], { y: '#ffe040', W: '#ffffff' })));
SPR.glitch = [0, 1, 2].map(f => {
  const g = new Grid(10, 10);
  const cols = ['#ff3aa0', '#3af0ff', '#ffffff'];
  for (let y = 1; y < 9; y++) for (let x = 1; x < 9; x++) if (((x + y + f) % 3) !== 0) g.set(x, y, cols[(x * 3 + y + f) % 3]);
  g.outline('#2a0a3a');
  return mkSprite(g);
});

// ícones do HUD
SPR.heart = mkSprite(build(['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'], { r: '#f83850', R: '#a01830', w: '#ffffff' }).shift(1, 1));
SPR.heartEmpty = mkSprite(build(['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'], { r: '#5a4a62', R: '#3a3042', w: '#7a6a82' }).shift(1, 1));
(() => { // corrige o recorte do contorno dos corações
  for (const k of ['heart', 'heartEmpty']) {
    const pal = k === 'heart' ? { r: '#f83850', R: '#a01830', w: '#ffffff' } : { r: '#5a4a62', R: '#3a3042', w: '#7a6a82' };
    const g = new Grid(9, 9);
    g.paste(Grid.rows(['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'], pal), 1, 1);
    g.outline(OUT);
    SPR[k] = mkSprite(g);
  }
})();
SPR.clock = (() => { const g = new Grid(9, 9); g.paste(Grid.rows(['.www.', 'wwkww', 'wwkkw', 'wwwww', '.www.'], { w: '#f0f0f8', k: '#303040' }), 2, 2); g.outline(OUT); return g.canvas(); })();
