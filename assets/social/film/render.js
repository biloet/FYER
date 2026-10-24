const { chromium } = require('playwright');
const fs = require('fs');
// usage: node render.js <html> <outdir> <fps> <dur> [times...]  (times => stills only)
(async () => {
  const [html, out, fpsS, durS, ...times] = process.argv.slice(2);
  const fps = +fpsS, dur = +durS;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const workers = times.length ? 1 : 4;
  const total = Math.round(fps * dur);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.error('ERR', e.message));
    await p.goto('file://' + html);
    await p.evaluate(() => window.ready);
    const list = times.length ? times.map(Number) : Array.from({ length: total }, (_, i) => i).filter(i => i % workers === w).map(i => i / fps);
    for (const t of list) {
      const i = Math.round(t * fps);
      await p.evaluate(([t, i]) => window.draw(t, i), [t, i]);
      const name = times.length ? `still_${t.toFixed(1)}.jpg` : `f_${String(i).padStart(5, '0')}.jpg`;
      await p.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 94 });
    }
  }));
  console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close();
})();
