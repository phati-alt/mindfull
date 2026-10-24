// Renders prototype/og-image.png (1200×630), the link-preview image for LINE, Facebook, X and email.
// It uses the landing picture (assets/work/characters/all.jpg), the mindfull logo and the design-system
// tokens, so re-run it after swapping in final illustrations:
//   node scripts/build-og-image.mjs
// Needs Edge or Chrome; set OG_BROWSER to its path if it is not in a standard location.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const proto = join(root, 'prototype');

// Left: logo, title, tagline. Right: the landing picture (all four characters). The picture's own
// background colour (#C9E3F3) fills the whole canvas, so its edges blend in.
const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;600&display=block" rel="stylesheet">
<link rel="stylesheet" href="${pathToFileURL(join(proto, 'assets', 'logo', 'mindfull-tokens.css'))}">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:#C9E3F3;font-family:'Prompt',sans-serif;position:relative}
  .text{position:absolute;z-index:1;left:72px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center}
  .logo{height:44px;display:block;align-self:flex-start}
  h1{margin:32px 0 0;font-size:56px;line-height:68px;font-weight:600;color:var(--black);white-space:nowrap}
  p{margin:12px 0 0;font-size:28px;line-height:40px;font-weight:300;color:var(--turquoise-gray-1)}
  .pic{position:absolute;right:-60px;top:50%;width:820px;height:auto;transform:translateY(-46%);-webkit-mask-image:radial-gradient(ellipse 62% 62% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 62% 62% at 50% 50%,#000 62%,transparent 100%)}
</style></head>
<body>
  <div class="text">
    <img class="logo" src="${pathToFileURL(join(proto, 'assets', 'logo', 'mindfull-logo.svg'))}" alt="">
    <h1>ท้องฟ้าในใจวันนี้</h1>
    <p>เช็กใจ 2 นาที แล้วพบเพื่อนเมฆที่มาเยือนคุณวันนี้</p>
  </div>
  <img class="pic" src="${pathToFileURL(join(proto, 'assets', 'work', 'characters', 'all.jpg'))}" alt="">
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
