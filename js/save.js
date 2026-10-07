'use strict';
/* =========================================================
   Salvamento: progresso automático no navegador (localStorage)
   e arquivo de estado (.json) para exportar/importar em
   outro computador ou navegador.
   ========================================================= */

const Save = {
  KEY: 'kinhus-adventure:save',
  FORMAT: 1,
  data: null,
  blank() { return { unlocked: 1, hiscore: 0, completed: false, run: null, plays: 0 }; },
  hash(str) {
    // FNV-1a 32 bits: detecta arquivo corrompido ou editado por engano
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  },
  sanitize(d) {
    const n = (v, a, b, def) => (Number.isFinite(+v) ? U.clamp(Math.floor(+v), a, b) : def);
    const out = this.blank();
    if (!d || typeof d !== 'object') return out;
    out.unlocked = n(d.unlocked, 1, LEVELS.length, 1);
    out.hiscore = n(d.hiscore, 0, 9999999, 0);
    out.completed = !!d.completed;
    out.plays = n(d.plays, 0, 1e6, 0);
    const r = d.run;
    if (r && typeof r === 'object') {
      out.run = {
        level: n(r.level, 0, LEVELS.length - 1, 0),
        lives: n(r.lives, 1, 99, 3),
        score: n(r.score, 0, 9999999, 0),
        coins: n(r.coins, 0, 99, 0),
        hearts: n(r.hearts, 1, 3, 3),
        power: n(r.power, 0, 1, 0),
        checkpoint: !!r.checkpoint,
        savedAt: n(r.savedAt, 0, 4102444800000, Date.now()),
      };
      out.unlocked = Math.max(out.unlocked, out.run.level + 1);
    }
    return out;
  },
  load() {
    this.data = this.blank();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) this.data = this.sanitize(JSON.parse(raw));
    } catch (e) { /* navegador sem armazenamento: segue sem salvar */ }
    return this.data;
  },
  persist() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  },
  // monta o arquivo de estado
  fileText() {
    const save = this.data;
    const body = { game: "Kinhu's Adventure", format: this.FORMAT, exportedAt: new Date().toISOString(), save, check: this.hash(JSON.stringify(save)) };
    return JSON.stringify(body, null, 2);
  },
  fileName() {
    const d = new Date();
    const pad = v => String(v).padStart(2, '0');
    return `kinhus-adventure-save-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  },
  exportFile() {
    try {
      const blob = new Blob([this.fileText()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = this.fileName();
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  },
  // lê o texto de um arquivo de estado; devolve { ok, msg }
  importText(text) {
    let body;
    try { body = JSON.parse(text); } catch (e) { return { ok: false, msg: 'ARQUIVO INVÁLIDO' }; }
    if (!body || body.game !== "Kinhu's Adventure" || !body.save) return { ok: false, msg: 'NÃO É UM SAVE DO KINHU' };
    if (body.format > this.FORMAT) return { ok: false, msg: 'SAVE DE VERSÃO MAIS NOVA' };
    if (body.check !== this.hash(JSON.stringify(body.save))) return { ok: false, msg: 'ARQUIVO CORROMPIDO' };
    const d = this.sanitize(body.save);
    // mantém o melhor recorde entre os dois
    d.hiscore = Math.max(d.hiscore, (this.data && this.data.hiscore) || 0);
    this.data = d;
    this.persist();
    return { ok: true, msg: d.run ? 'SAVE CARREGADO: FASE ' + (d.run.level + 1) : 'SAVE CARREGADO' };
  },
};
