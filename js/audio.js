'use strict';
/* =========================================================
   Som: sintetizador chiptune (WebAudio) com eco estilo SNES.
   Músicas originais compostas em texto + efeitos sonoros.
   ========================================================= */

const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function parseLine(str) {
  return str.trim().split(/\s+/).filter(Boolean).map(tok => {
    const [n, l] = tok.split(':');
    return { m: n === 'r' ? null : noteMidi(n), s: +(l || 2) };
  });
}

const CHORD_Q = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim: [0, 3, 6], sus: [0, 5, 7] };
function chord(name) {
  const m = /^([A-G][#b]?)(maj7|m7|7|m|dim|sus)?$/.exec(name);
  const root = NOTE_IDX[m[1][0]] + (m[1][1] === '#' ? 1 : m[1][1] === 'b' ? -1 : 0);
  return { root, iv: CHORD_Q[m[2] || ''] };
}

const BASS_STYLES = {
  pump: [[0, 0, 2], [0, 12, 2], [7, 0, 2], [0, 12, 2], [0, 0, 2], [0, 12, 2], [7, 0, 2], [0, 12, 2]],
  drive: [[0, 0, 2], [0, 0, 2], [0, 12, 2], [0, 0, 2], [0, 0, 2], [0, 12, 2], [0, 0, 2], [7, 0, 2]],
  samba: [[0, 0, 3], [0, 0, 1], [7, 0, 2], [0, 12, 2], [0, 0, 3], [0, 0, 1], [7, 0, 2], [7, 0, 2]],
  bossa: [[0, 0, 3], [7, 0, 3], [0, 12, 2], [7, 0, 3], [0, 0, 3], [7, 0, 2]],
  long: [[0, 0, 16]],
  half: [[0, 0, 8], [7, 0, 8]],
};

function compileSong(def) {
  const bars = def.chords.map(chord);
  const L = def.barLen || 16;
  const chans = [];
  // melodia
  chans.push({ kind: 'tone', wave: def.leadWave || 'pulse', duty: def.leadDuty || 25, vol: def.leadVol || 0.11, vib: true, ev: parseLine(def.mel.join(' ')), gate: 0.92 });
  if (def.harm) chans.push({ kind: 'tone', wave: 'pulse', duty: 12, vol: def.harmVol || 0.05, ev: parseLine(def.harm.join(' ')), gate: 0.85 });
  // baixo
  if (def.bass) {
    const ev = [];
    const pat = BASS_STYLES[def.bass];
    for (const b of bars) {
      let used = 0;
      for (const [iv, oct, s] of pat) {
        if (used >= L) break;
        const st = Math.min(s, L - used);
        const base = 36 + b.root + (b.root > 6 ? -12 : 0);
        ev.push({ m: base + (iv === 7 ? b.iv[2] : iv) + oct, s: st });
        used += st;
      }
      if (used < L) ev.push({ m: null, s: L - used });
    }
    chans.push({ kind: 'tone', wave: 'triangle', vol: def.bassVol || 0.24, ev, gate: 0.8 });
  }
  // arpejo / acordes
  if (def.arp) {
    const ev = [];
    for (const b of bars) {
      const base = 60 + b.root + (b.root > 7 ? -12 : 0);
      const tones = b.iv.map(i => base + i);
      if (def.arp === 'up16') for (let i = 0; i < L; i++) ev.push({ m: tones[i % tones.length] + (i % 8 >= 4 ? 12 : 0), s: 1 });
      else if (def.arp === 'up8') for (let i = 0; i < L / 2; i++) ev.push({ m: tones[[0, 1, 2, 1][i % 4] % tones.length], s: 2 });
      else if (def.arp === 'stab') for (let i = 0; i < L / 4; i++) { ev.push({ m: null, s: 2 }); ev.push({ ms: tones.slice(0, 3), s: 2 }); }
      else if (def.arp === 'pad') ev.push({ ms: tones, s: L });
    }
    chans.push({ kind: 'tone', wave: 'pulse', duty: def.arp === 'pad' ? 12 : 12, vol: def.arpVol || (def.arp === 'pad' ? 0.035 : 0.045), ev, gate: def.arp === 'pad' ? 0.97 : 0.7 });
  }
  // bateria
  if (def.drums) {
    const ev = [];
    const pats = Array.isArray(def.drums) ? def.drums : [def.drums];
    bars.forEach((b, i) => { for (const ch of pats[i % pats.length]) ev.push({ d: ch === '.' ? null : ch, s: 1 }); });
    chans.push({ kind: 'drum', vol: def.drumVol || 0.5, ev });
  }
  return { bpm: def.bpm, loop: def.loop !== false, chans };
}

const SONGS = {
  title: {
    bpm: 120, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    mel: ['E5:2 G5:2 C6:6 B5:2 G5:4', 'D5:2 G5:2 B5:6 A5:2 G5:4', 'A5:3 G5:1 E5:4 A5:2 B5:2 C6:4', 'C6:2 A5:2 F5:4 G5:2 A5:2 G5:4',
      'E5:2 G5:2 C6:4 D6:2 E6:2 D6:2 C6:2', 'B5:4 G5:4 D6:4 B5:4', 'A5:2 C6:2 F6:4 E6:2 D6:2 C6:4', 'D6:6 B5:2 G5:4 r:4'],
    bass: 'pump', arp: 'up16', drums: ['k...s...k.k.s...', 'k...s...k.k.s.s.'],
  },
  bairro: {
    bpm: 140, chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
    mel: ['B4:2 D5:2 G5:4 F#5:2 G5:2 A5:2 B5:2', 'A5:4 F#5:2 D5:2 r:2 D5:2 E5:2 F#5:2', 'G5:3 F#5:1 E5:2 B4:2 E5:2 G5:2 B5:4', 'A5:2 G5:2 E5:2 C5:2 D5:4 r:4',
      'B4:2 D5:2 G5:4 A5:2 B5:2 D6:4', 'C6:2 B5:2 A5:2 F#5:2 A5:4 D5:4', 'E5:2 G5:2 C6:4 B5:2 A5:2 G5:2 E5:2', 'F#5:2 A5:2 D6:2 C6:2 B5:4 A5:4'],
    bass: 'pump', arp: 'stab', drums: ['k.h.s.h.k.hks.h.', 'k.h.s.h.k.hks.hh'],
  },
  onibus: {
    bpm: 124, chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    mel: ['A5:2 C6:2 F6:3 E6:1 C6:2 A5:2 r:1 A5:3', 'G5:2 C6:2 E6:3 D6:1 C6:2 G5:2 r:1 G5:3', 'F5:2 A5:2 D6:3 C6:1 A5:2 F5:2 r:1 F5:3', 'D5:2 F5:2 Bb5:6 A5:2 G5:4',
      'A5:3 C6:3 A5:2 G5:2 F5:3 r:1 F5:2', 'E5:2 G5:2 C6:6 D6:2 E6:4', 'F6:3 D6:3 Bb5:2 D6:3 F6:3 E6:2', 'C6:6 Bb5:2 G5:3 E5:3 G5:2'],
    bass: 'samba', arp: 'up16', arpVol: 0.035, drums: ['k.hkh.sk.hkhs.hh', 'k.hkh.sk.hkhshss'],
  },
  centro: {
    bpm: 136, chords: ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'],
    mel: ['E5:2 r:2 E5:2 G5:2 F#5:2 E5:2 D#5:2 E5:2', 'B4:4 E5:4 G5:4 B5:4', 'C6:2 r:2 B5:2 A5:2 G5:2 E5:2 C5:4', 'D5:2 F#5:2 A5:4 G5:2 F#5:2 D5:4',
      'E5:2 r:2 E5:2 G5:2 B5:2 A5:2 G5:2 F#5:2', 'G5:4 E5:4 B4:8', 'C5:2 E5:2 G5:2 C6:2 B5:4 G5:4', 'D#5:4 F#5:4 B5:4 A5:2 F#5:2'],
    bass: 'drive', arp: 'up8', drums: ['k.h.s.hkk.h.s.h.', 'k.h.s.hkk.hss.ss'],
  },
  escritorio: {
    bpm: 108, chords: ['Dmaj7', 'Bm7', 'Em7', 'A7', 'Dmaj7', 'Bm7', 'Gmaj7', 'A7'],
    mel: ['F#5:3 E5:1 F#5:2 A5:2 C#6:4 B5:2 A5:2', 'B5:4 A5:2 F#5:2 D5:4 r:4', 'G5:3 F#5:1 G5:2 B5:2 D6:4 C#6:2 B5:2', 'A5:6 G5:2 E5:4 C#5:4',
      'D5:2 F#5:2 A5:2 C#6:2 E6:4 D6:2 C#6:2', 'B5:6 A5:2 F#5:4 D5:4', 'B5:2 A5:2 G5:2 F#5:2 E5:4 G5:2 B5:2', 'A5:8 r:4 C#5:2 E5:2'],
    bass: 'bossa', arp: 'pad', leadDuty: 50, leadVol: 0.08, drums: ['k..hk.h.k..hk.hh'], drumVol: 0.35,
  },
  servidores: {
    bpm: 100, chords: ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'],
    mel: ['A4:4 C5:4 E5:6 D5:2', 'C5:4 B4:4 A4:8', 'F5:4 E5:4 C5:6 A4:2', 'C5:4 D5:4 E5:8',
      'D5:4 F5:4 A5:6 G5:2', 'F5:4 E5:4 D5:8', 'E5:4 G#5:4 B5:6 A5:2', 'G#5:4 B4:4 E5:8'],
    bass: 'half', arp: 'up16', arpVol: 0.04, drums: ['k.......h...s...', 'k.....k.h...s.h.'], drumVol: 0.4,
  },
  boss: {
    bpm: 160, chords: ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'G'],
    mel: ['C5:1 C5:1 r:2 Eb5:2 G5:2 C6:2 G5:2 Eb5:2 C5:2', 'D5:2 Eb5:2 F5:2 G5:2 Ab5:4 G5:4', 'Ab5:2 r:2 Ab5:2 G5:2 F5:2 Eb5:2 C5:4', 'Bb4:2 D5:2 F5:2 Bb5:2 A5:4 Bb5:4',
      'C6:2 r:2 G5:2 r:2 Eb5:2 r:2 C5:4', 'Eb5:2 F5:2 G5:2 Ab5:2 Bb5:2 B5:2 C6:4', 'C6:4 Ab5:4 Eb5:4 C5:4', 'B4:2 D5:2 G5:2 B5:2 D6:4 B5:4'],
    bass: 'drive', arp: 'up16', drums: ['k.hks.hkk.hks.hs'],
  },
  kinhurine: {
    bpm: 168, chords: ['F', 'Bb', 'C', 'F'],
    mel: ['F5:2 A5:2 C6:2 F6:2 E6:2 C6:2 A5:2 C6:2', 'D6:2 F6:2 D6:2 Bb5:2 F5:4 Bb5:4', 'C6:2 E6:2 G6:2 E6:2 C6:2 G5:2 E5:2 G5:2', 'F5:2 A5:2 C6:4 F6:4 r:4'],
    bass: 'drive', arp: 'up16', drums: ['k.hsk.hsk.hsk.hs'],
  },
  ending: {
    bpm: 104, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    mel: ['E5:2 G5:2 C6:6 B5:2 G5:4', 'D5:2 G5:2 B5:6 A5:2 G5:4', 'A5:3 G5:1 E5:4 A5:2 B5:2 C6:4', 'C6:2 A5:2 F5:4 G5:2 A5:2 G5:4',
      'E5:2 G5:2 C6:4 D6:2 E6:2 D6:2 C6:2', 'B5:4 G5:4 D6:4 B5:4', 'A5:2 C6:2 F6:4 E6:2 D6:2 C6:4', 'C6:12 r:4'],
    bass: 'half', arp: 'pad', leadDuty: 50, drums: ['k...h...s...h...'], drumVol: 0.3,
  },
  clear: {
    bpm: 150, loop: false, chords: ['C', 'F', 'C'],
    mel: ['G4:2 C5:2 E5:2 G5:2 C6:4 B5:2 C6:2', 'A5:2 C6:2 F6:4 G5:2 B5:2 D6:4', 'E6:12 r:4'],
    bass: 'long', arp: 'up16', drums: ['k.h.s.h.k.h.s.h.', 'k.h.s.h.k.h.s.s.', 'k...............'],
  },
  death: {
    bpm: 120, loop: false, chords: ['Cm', 'G'],
    mel: ['C6:2 B5:2 Bb5:2 A5:4 r:2 F5:2 E5:2', 'D5:2 C5:2 G4:4 C4:8'],
    bass: 'long',
  },
  gameover: {
    bpm: 84, loop: false, chords: ['Am', 'E', 'Am'],
    mel: ['E5:4 D5:4 C5:4 B4:4', 'A4:4 G#4:4 B4:4 E5:4', 'A4:12 r:4'],
    bass: 'long', arp: 'pad',
  },
};

const Sound = {
  ctx: null, master: null, music: null, sfx: null, noise: null, waves: {},
  VOL: 1, muted: false, song: null, songName: null, pending: null, tempo: 1, timer: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    // compressor no final evita estourar quando muitos sons tocam juntos
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.VOL; this.master.connect(comp);
    this.music = c.createGain(); this.music.gain.value = 0.9; this.music.connect(this.master);
    // eco (marca registrada do som do SNES)
    const delay = c.createDelay(1); delay.delayTime.value = 0.21;
    const fb = c.createGain(); fb.gain.value = 0.3;
    const wet = c.createGain(); wet.gain.value = 0.28;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    this.music.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 1.7; this.sfx.connect(this.master);
    for (const d of [12, 25, 50]) {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * (d / 100));
      this.waves[d] = c.createPeriodicWave(re, im);
    }
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 25);
  },
  unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
  },
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.VOL, this.ctx.currentTime, 0.02);
  },
  play(name, force) {
    if (!this.ctx || this.ctx.state !== 'running') { this.pending = name; return; }
    if (this.songName === name && !force && this.song) return;
    this.stop();
    const def = SONGS[name];
    if (!def) return;
    this.songName = name; this.tempo = 1;
    const comp = compileSong(def);
    const t0 = this.ctx.currentTime + 0.08;
    this.song = { comp, chans: comp.chans.map(ch => ({ ...ch, i: 0, next: t0, done: false })), out: this.ctx.createGain() };
    this.song.out.gain.value = 1;
    this.song.out.connect(this.music);
  },
  stop() {
    if (this.song) {
      const out = this.song.out, t = this.ctx.currentTime;
      out.gain.setTargetAtTime(0, t, 0.03);
      setTimeout(() => out.disconnect(), 300);
    }
    this.song = null; this.songName = null; this.pending = null;
  },
  isPlaying() { return !!this.song && this.song.chans.some(c => !c.done); },
  schedule() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    const step = 60 / s.comp.bpm / 4 / this.tempo;
    for (const ch of s.chans) {
      while (!ch.done && ch.next < ahead) {
        if (ch.i >= ch.ev.length) {
          if (!s.comp.loop) { ch.done = true; break; }
          ch.i = 0;
        }
        const ev = ch.ev[ch.i++];
        const dur = ev.s * step;
        if (ch.kind === 'drum') { if (ev.d) this.drum(ev.d, ch.next, ch.vol, s.out); }
        else if (ev.m !== null && ev.m !== undefined) this.note(ch, [ev.m], ch.next, dur, s.out);
        else if (ev.ms) this.note(ch, ev.ms, ch.next, dur, s.out);
        ch.next += dur;
      }
    }
  },
  note(ch, ms, t, dur, out) {
    const c = this.ctx;
    const g = c.createGain();
    const v = ch.vol / Math.sqrt(ms.length);
    const len = Math.max(0.03, dur * ch.gate);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0005, v * 0.55), t + Math.max(0.02, len * 0.85));
    g.gain.linearRampToValueAtTime(0, t + len);
    g.connect(out);
    for (const m of ms) {
      const o = c.createOscillator();
      if (ch.wave === 'triangle') o.type = 'triangle';
      else o.setPeriodicWave(this.waves[ch.duty || 25]);
      o.frequency.setValueAtTime(mtof(m), t);
      if (ch.vib && dur > 0.3) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(0.35, dur));
        lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + len + 0.02);
      }
      o.connect(g); o.start(t); o.stop(t + len + 0.02);
    }
  },
  drum(d, t, vol, out) {
    const c = this.ctx;
    if (d === 'k') {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.18);
    } else {
      const src = c.createBufferSource(); src.buffer = this.noise;
      const f = c.createBiquadFilter(), g = c.createGain();
      const snare = d === 's', len = snare ? 0.13 : d === 'o' ? 0.12 : 0.035;
      f.type = snare ? 'bandpass' : 'highpass'; f.frequency.value = snare ? 1900 : 7000;
      g.gain.setValueAtTime(vol * (snare ? 0.5 : 0.22), t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
    }
  },
  // ---------- efeitos ----------
  tone(f0, f1, dur, vol, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    if (o.wave === 'triangle' || o.wave === 'sine' || o.wave === 'sawtooth') osc.type = o.wave;
    else osc.setPeriodicWave(this.waves[o.duty || 50]);
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency[o.lin ? 'linearRampToValueAtTime' : 'exponentialRampToValueAtTime'](f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.sfx); osc.start(t); osc.stop(t + dur + 0.02);
  },
  hiss(dur, vol, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(), g = c.createGain();
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0 || 1200, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.02);
  },
  arp(notes, step, vol, duty = 25) { notes.forEach((n, i) => this.tone(mtof(noteMidi(n)), mtof(noteMidi(n)), step * 1.4, vol, { delay: i * step, duty })); },
  fx(name) {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
    switch (name) {
      case 'jump': this.tone(260, 640, 0.14, 0.13, { duty: 25 }); break;
      case 'coin': this.tone(1318, 1318, 0.06, 0.1, { duty: 50 }); this.tone(1976, 1976, 0.22, 0.1, { duty: 50, delay: 0.06 }); break;
      case 'stomp': this.tone(520, 120, 0.12, 0.16, { duty: 50 }); this.hiss(0.08, 0.15, { f0: 900 }); break;
      case 'bump': this.tone(180, 90, 0.09, 0.18, { wave: 'triangle' }); break;
      case 'break': this.hiss(0.25, 0.3, { f0: 2400, f1: 300 }); this.tone(200, 60, 0.15, 0.12, { duty: 50 }); break;
      case 'appear': this.arp(['C5', 'G5', 'C6', 'E6', 'G6'], 0.04, 0.07, 12); break;
      case 'power': this.arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.045, 0.09); break;
      case 'eat': this.arp(['E5', 'G5', 'B5', 'E6'], 0.05, 0.1, 50); break;
      case 'hurt': this.tone(700, 160, 0.3, 0.16, { duty: 12 }); this.tone(520, 140, 0.3, 0.1, { duty: 50, delay: 0.05 }); break;
      case 'throw': this.tone(900, 300, 0.08, 0.1, { duty: 25 }); break;
      case 'kill': this.tone(1200, 200, 0.12, 0.12, { duty: 12 }); this.hiss(0.1, 0.15, { f0: 3000 }); break;
      case 'oneup': this.arp(['E6', 'G6', 'E7', 'C7', 'D7', 'G7'], 0.07, 0.08, 50); break;
      case 'spring': this.tone(200, 900, 0.22, 0.13, { wave: 'triangle' }); this.tone(400, 1800, 0.18, 0.05, { duty: 25 }); break;
      case 'check': this.arp(['G5', 'C6', 'E6', 'G6'], 0.06, 0.09, 50); break;
      case 'pause': this.arp(['E6', 'C6', 'E6', 'C6'], 0.05, 0.07, 50); break;
      case 'cursor': this.tone(880, 880, 0.04, 0.07, { duty: 25 }); break;
      case 'select': this.tone(660, 1320, 0.1, 0.1, { duty: 25 }); break;
      case 'bosshit': this.tone(300, 60, 0.4, 0.2, { duty: 50 }); this.hiss(0.3, 0.25, { f0: 600, f1: 100 }); break;
      case 'bossdie': for (let i = 0; i < 8; i++) { this.hiss(0.35, 0.22, { f0: 1500 - i * 150, f1: 80, delay: i * 0.18 }); this.tone(400 - i * 30, 40, 0.3, 0.1, { duty: 50, delay: i * 0.18 }); } break;
      case 'thud': this.tone(90, 40, 0.25, 0.3, { wave: 'triangle' }); this.hiss(0.25, 0.3, { f0: 400, f1: 80 }); break;
      case 'shoot': this.hiss(0.12, 0.2, { f0: 1800, f1: 600 }); this.tone(300, 150, 0.1, 0.08, { duty: 50 }); break;
      case 'bark': this.tone(520, 300, 0.07, 0.15, { duty: 12 }); this.tone(560, 320, 0.08, 0.15, { duty: 12, delay: 0.12 }); break;
      case 'honk': this.tone(330, 330, 0.25, 0.12, { duty: 50 }); this.tone(415, 415, 0.25, 0.08, { duty: 50 }); break;
      case 'brake': this.hiss(0.6, 0.18, { f0: 4500, f1: 2500, q: 8 }); this.tone(1800, 1500, 0.5, 0.04, { duty: 12 }); break;
      case 'steal': this.arp(['G6', 'E6', 'C6', 'G5'], 0.04, 0.08, 12); break;
      case 'tick': this.tone(1800, 1800, 0.025, 0.05, { duty: 25 }); break;
      case 'door': this.hiss(0.4, 0.15, { f0: 800, f1: 300, type: 'lowpass' }); break;
      case 'warn': this.tone(988, 988, 0.08, 0.1, { duty: 25 }); this.tone(988, 988, 0.08, 0.1, { duty: 25, delay: 0.14 }); break;
      case 'kinhurine': this.arp(['C5', 'G5', 'C6', 'G6', 'C7'], 0.035, 0.1, 12); this.hiss(0.4, 0.2, { f0: 600, f1: 3000 }); break;
      case 'zap': this.hiss(0.15, 0.2, { f0: 5000, q: 4 }); break;
      case 'splash': this.hiss(0.3, 0.2, { f0: 1200, f1: 300 }); break;
    }
  },
};
