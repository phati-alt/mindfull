// Renders prototype/og-image.png (1200×630), the link-preview image for LINE, Facebook, X and email.
// It uses both landing pictures (assets/work/ and assets/student/characters/all.jpg), the mindfull logo and the design-system
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

// Left: logo, title, tagline. Right: the two landing pictures (work and student) as overlapping rounded
// cards with their group label, fully inside the right half so they never overlap the text.
const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;500;600&display=block" rel="stylesheet">
<link rel="stylesheet" href="${pathToFileURL(join(proto, 'assets', 'logo', 'mindfull-tokens.css'))}">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:linear-gradient(135deg,var(--turquoise-50) 0%,var(--blue-50) 100%);font-family:'Prompt',sans-serif;position:relative}
  .text{position:absolute;z-index:1;left:72px;top:0;bottom:0;width:420px;display:flex;flex-direction:column;justify-content:center}
  .logo{height:44px;display:block;align-self:flex-start}
  h1{margin:32px 0 0;font-size:56px;line-height:68px;font-weight:600;color:var(--black);white-space:nowrap}
  p{margin:16px 0 0;font-size:32px;line-height:46px;font-weight:500;color:var(--turquoise-gray-1);white-space:nowrap}
  .card{position:absolute;width:400px;border-radius:28px;border:6px solid #fff;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(0,98,90,.20)}
  .card img{display:block;width:100%;height:auto}
  .card span{position:absolute;left:14px;top:14px;background:#fff;color:var(--turquoise-gray-1);border-radius:24px;padding:4px 14px;font-size:18px;line-height:26px;font-weight:500;box-shadow:0 2px 8px rgba(0,98,90,.15)}
  .work{left:560px;top:20px;transform:rotate(-2deg)}
  .student{left:730px;top:306px;transform:rotate(2deg)}
</style></head>
<body>
  <div class="text">
    <img class="logo" src="${pathToFileURL(join(proto, 'assets', 'logo', 'mindfull-logo.svg'))}" alt="">
    <h1>ท้องฟ้าของคุณวันนี้</h1>
    <p>เช็กอิน เช็กใจ ใช้เวลาประมาณ 2 นาที<br>แล้วพบเพื่อนเมฆที่มาเยือนคุณวันนี้</p>
  </div>
  <div class="card work"><img src="${pathToFileURL(join(proto, 'assets', 'work', 'characters', 'all.jpg'))}" alt=""><span>วัยทำงาน</span></div>
  <div class="card student"><img src="${pathToFileURL(join(proto, 'assets', 'student', 'characters', 'all.jpg'))}" alt=""><span>นักเรียน / นักศึกษา</span></div>
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
