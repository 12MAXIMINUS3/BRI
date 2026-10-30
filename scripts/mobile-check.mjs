// Loads every public page in Chrome at iPhone, Android, and iPad sizes (touch
// enabled) and reports anything that sticks out sideways or text under 10.5px.
// Needs the dev server running (npm run dev) and Google Chrome installed.
// Set CHROME_PATH if Chrome is not in the default Windows location.
import puppeteer from 'puppeteer-core';
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const pages = ['/', '/categories', '/work', '/work/walnut-dining-table', '/shop', '/shop/oak-side-table', '/custom-order', '/about', '/contact', '/sign-in', '/register', '/forgot-password', '/nope'];
const devices = [
  { name: 'iPhone 14', width: 390, height: 844, dpr: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
  { name: 'Android small', width: 360, height: 740, dpr: 3, ua: 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' },
  { name: 'iPad mini', width: 768, height: 1024, dpr: 2, ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
  { name: 'Pixel 7', width: 412, height: 915, dpr: 2.625, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' },
];
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
let problems = 0;
for (const d of devices) {
  const page = await browser.newPage();
  await page.setUserAgent(d.ua);
  await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth - vw;
      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (el.closest('[aria-hidden="true"][class*="-left-[9999px]"]')) continue; // off-screen spam trap
        if (b.right > vw + 1 || b.left < -1) {
          // Ignore descendants of elements that clip their content.
          let p = el.parentElement, clipped = false;
          while (p && p !== document.body) { const s = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { const pb = p.getBoundingClientRect(); if (pb.right <= vw + 1 && pb.left >= -1) { clipped = true; break; } } p = p.parentElement; }
          if (!clipped) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(b.left)}→${Math.round(b.right)}]`);
        }
      }
      const tiny = [...document.querySelectorAll('body *')].filter((el) => {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
        const s = getComputedStyle(el); const b = el.getBoundingClientRect();
        return b.width > 0 && s.visibility !== 'hidden' && parseFloat(s.fontSize) < 10.5;
      }).map((el) => `${el.textContent.trim().slice(0, 30)} (${getComputedStyle(el).fontSize})`);
      return { overflow, wide: wide.slice(0, 5), tiny: [...new Set(tiny)].slice(0, 5) };
    });
    const bad = r.overflow > 0 || r.wide.length;
    if (bad) problems++;
    console.log(`${bad ? '✗' : '✓'} ${d.name.padEnd(13)} ${path.padEnd(28)} overflow=${r.overflow}px${r.wide.length ? '\n     wide: ' + r.wide.join('\n           ') : ''}${r.tiny.length ? '\n     small text: ' + r.tiny.join(' | ') : ''}`);
  }
  await page.close();
}
await browser.close();
console.log(`\n${problems} page/device combinations with sideways overflow`);
process.exitCode = problems ? 1 : 0;
