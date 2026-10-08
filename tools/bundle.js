'use strict';
// Gera dist/kinhus-adventure.html: o jogo inteiro em UM arquivo (CSS, JS e imagens embutidos).
// Útil para mandar por e-mail/WhatsApp ou jogar sem internet.
//   node tools/bundle.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(root, f)).toString('base64');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="css\/style.css">/, () => '<style>\n' + read('css/style.css') + '\n</style>');
html = html.replace(/<link rel="icon" type="image\/png" href="assets\/icon.png">/, () => `<link rel="icon" type="image/png" href="${dataUri('assets/icon.png')}">`);
html = html.replace(/\s*<meta property="og:image"[^>]*>/, '');
html = html.replace(/<script src="(js\/[a-z]+\.js)"><\/script>/g, (m, f) => {
  let js = read(f);
  if (js.includes('</script')) throw new Error('</script dentro de ' + f);
  return '<script>\n' + js + '\n</script>';
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'kinhus-adventure.html');
fs.writeFileSync(out, html);
console.log('ok', out, Math.round(html.length / 1024) + ' KB');
