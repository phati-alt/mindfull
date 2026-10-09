// Renders prototype/og-image.png (1200×630), the link-preview image for LINE, Facebook, X and email.
// It uses the real characters (CHAR_SVG in content.js), the mindfull logo and the design-system
// tokens, so re-run it after swapping in final illustrations:
//   node scripts/build-og-image.mjs
// Needs Edge or Chrome; set OG_BROWSER to its path if it is not in a standard location.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const proto = join(root, 'prototype');

// content.js is plain globals: run it in a sandbox to read CHAR and CHAR_SVG
const sandbox = {};
vm.runInNewContext(readFileSync(join(proto, 'content.js'), 'utf8') + '\n;this.CHAR=CHAR;this.CHAR_SVG=CHAR_SVG;', sandbox);
const order = ['storm', 'rain', 'fog', 'fluffy'];
const characters = order.map(k => sandbox.CHAR_SVG[sandbox.CHAR[k].name]).join('');

const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;600&display=block" rel="stylesheet">
<link rel="stylesheet" href="${pathToFileURL(join(proto, 'assets', 'mindfull-tokens.css'))}">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:var(--gray-50);font-family:'Prompt',sans-serif;position:relative}
  .text{position:absolute;left:80px;top:64px}
  .logo{height:44px;display:block}
  h1{margin:36px 0 0;font-size:76px;line-height:84px;font-weight:600;color:var(--black)}
  p{margin:12px 0 0;font-size:32px;line-height:44px;font-weight:300;color:var(--turquoise-gray-1)}
  .row{position:absolute;left:0;right:0;bottom:28px;display:flex;justify-content:center;align-items:flex-end;gap:24px}
  .row svg{width:240px;height:auto}
  .band{position:absolute;left:0;right:0;bottom:0;height:120px;background:var(--turquoise-3)}
</style></head>
<body>
  <div class="band"></div>
  <div class="text">
    <img class="logo" src="${pathToFileURL(join(proto, 'assets', 'mindfull-logo.svg'))}" alt="">
    <h1>ท้องฟ้าในใจวันนี้</h1>
    <p>เช็กใจ 2 นาที แล้วพบเพื่อนเมฆที่มาเยือนคุณวันนี้</p>
  </div>
  <div class="row">${characters}</div>
</body></html>`;

const browsers = [
  process.env.OG_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = browsers.find(b => existsSync(b));
if (!browser) throw new Error('No Edge or Chrome found; set OG_BROWSER to its path.');

const tmp = mkdtempSync(join(tmpdir(), 'og-'));
const page = join(tmp, 'og.html');
const out = join(proto, 'og-image.png');
writeFileSync(page, html);
try {
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--virtual-time-budget=10000',
    '--window-size=1200,630', `--screenshot=${out}`, pathToFileURL(page).href,
  ], { stdio: 'ignore', timeout: 60000 });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('wrote prototype/og-image.png');
