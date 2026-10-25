const W = 1920, H = 1080, DUR = 17;
const c = document.getElementById("c");
const ctx = c.getContext("2d");

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = (k) => 1 - Math.pow(1 - k, 4);            // easeOutQuart
const eio = (k) => k < .5 ? 8 * k ** 4 : 1 - Math.pow(-2 * k + 2, 4) / 2;
// envelope: fade in over [a, a+i], out over [b-o, b]
const env = (t, a, b, i = .6, o = .5) => Math.min(prog(t, a, a + i), 1 - prog(t, b - o, b));
let seed = 1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const G1 = "#d4ff6a", G2 = "#7cff6b", G3 = "#00c805", TXT = "#ecfdec", MUTED = "#87ad92";

function grad(x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, G1); g.addColorStop(.5, G2); g.addColorStop(1, G3);
  return g;
}

// text with blur-in, rise and tracking
function text(str, x, y, { size = 96, weight = 900, font = "Inter", color = TXT, alpha = 1, blur = 0, rise = 0,
  align = "center", track = 0, gradient = false, glow = 0 } = {}) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `${weight} ${size}px "${font}"`;
  ctx.letterSpacing = track + "px";
  ctx.textAlign = align; ctx.textBaseline = "middle";
  if (blur > .2) ctx.filter = `blur(${blur}px)`;
  let fill = color;
  if (gradient) {
    const w = ctx.measureText(str).width;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    fill = grad(x0, x0 + w);
  }
  if (glow) { ctx.shadowColor = "rgba(124,255,107,.55)"; ctx.shadowBlur = glow; }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y + rise);
  ctx.restore();
}

// words appear one by one (blur + rise)
function words(str, x, y, t, start, step, opts = {}) {
  const parts = str.split(" ");
  ctx.save();
  ctx.font = `${opts.weight || 900} ${opts.size || 96}px "Inter"`;
  ctx.letterSpacing = (opts.track || 0) + "px";
  const space = ctx.measureText(" ").width;
  const widths = parts.map((p) => ctx.measureText(p).width);
  ctx.restore();
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  let cx = x - total / 2;
  const out = opts.out ?? 1;
  parts.forEach((p, i) => {
    const k = eo(prog(t, start + i * step, start + i * step + .9));
    text(p, cx, y, { ...opts, align: "left", alpha: k * out, blur: (1 - k) * 18 + (1 - out) * 14, rise: (1 - k) * 40 });
    cx += widths[i] + space;
  });
}

// ---------- static assets ----------
seed = 7;
const dust = Array.from({ length: 260 }, () => ({ x: rnd() * W, y: rnd() * H, s: rnd() * 2 + .4, v: rnd() * 14 + 4 }));
const N = 1500, golden = Math.PI * (3 - Math.sqrt(5));
seed = 21;
const sphere = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y);
  return { x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r,
    sx: rnd() * W, sy: rnd() * H, d: rnd() * .5, f: rnd() };
});
const noise = document.createElement("canvas");
noise.width = noise.height = 256;
{
  const n = noise.getContext("2d"), img = n.createImageData(256, 256);
  seed = 99;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  n.putImageData(img, 0, 0);
}
const ledger = (() => {
  seed = 42;
  const hex = () => "0x" + Math.floor(rnd() * 0xffff).toString(16).padStart(4, "0") + "…" + Math.floor(rnd() * 0xffff).toString(16).padStart(4, "0");
  return Array.from({ length: 16 }, (_, i) => ({
    from: hex(), to: hex(), amt: (rnd() * 40 + .1).toFixed(4) + " ETH",
    time: `12:${String(4 + (i * 7) % 56).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`,
    block: "#" + (1204511 + i * 3),
  }));
})();

// ---------- layers ----------
function background(t) {
  ctx.fillStyle = "#020604"; ctx.fillRect(0, 0, W, H);
  // aurora
  const blobs = [
    [W * (.25 + .08 * Math.sin(t * .15)), H * (.2 + .06 * Math.cos(t * .2)), 900, "rgba(0,200,5,.28)"],
    [W * (.8 + .05 * Math.cos(t * .12)), H * (.75 + .05 * Math.sin(t * .17)), 800, "rgba(31,122,58,.30)"],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  for (const p of dust) {
    const y = (p.y - t * p.v + H * 10) % H;
    ctx.fillStyle = `rgba(150,255,140,${.22 * p.s})`;
    ctx.fillRect(p.x + Math.sin(t * .3 + p.y) * 6, y, p.s, p.s);
  }
}

function drawSphere(t, { cx = W / 2, cy = H / 2, R = 380, alpha = 1, form = 1, spin = 0, flashes = 0 } = {}) {
  if (alpha <= 0) return;
  const ry = t * .18 + spin, rx = -.35 + Math.sin(t * .2) * .05;
  const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
  // core glow
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
  g.addColorStop(0, `rgba(0,200,5,${.35 * alpha * form})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
  for (let i = 0; i < N; i++) {
    const p = sphere[i];
    const x1 = p.x * cY - p.z * sY, z1 = p.x * sY + p.z * cY;
    const y1 = p.y * cX - z1 * sX, z2 = p.y * sX + z1 * cX;
    const d = (z2 + 1) / 2, persp = 1 + z2 * .25;
    const k = eio(clamp((form - p.d) / (1 - p.d * .5)));
    const x = lerp(p.sx, cx + x1 * R * persp, k), y = lerp(p.sy, cy + y1 * R * persp, k);
    const s = (.8 + d * 2.2) * (1 + (1 - k) * 1.2);
    const a = alpha * (k < 1 ? .8 + k * .2 : 1) * (.25 + d * .7);
    if (flashes && d > .55 && ((p.f * 13 + t * .9) % 1) < flashes) {
      ctx.fillStyle = `rgba(200,255,160,${.5 * alpha * d})`;
      ctx.beginPath(); ctx.arc(x, y, s * 2.4, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = `rgba(${90 + d * 70 | 0},255,${100 + d * 40 | 0},${a})`;
    ctx.fillRect(x, y, s, s);
  }
  ctx.strokeStyle = `rgba(124,255,107,${.18 * alpha * form})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.45 * form, R * .32 * form, -.22, 0, 6.283); ctx.stroke();
}

function post(t, frame) {
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .95);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(1,3,2,.85)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // grain
  ctx.save();
  ctx.globalAlpha = .07; ctx.globalCompositeOperation = "overlay";
  const ox = (frame * 73) % 256, oy = (frame * 151) % 256;
  ctx.fillStyle = ctx.createPattern(noise, "repeat");
  ctx.translate(-ox, -oy); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
  // letterbox: closed-ish until reveal, then opens
  const lb = 110 * (1 - eio(prog(t, 7.2, 8.4)));
  if (lb > .5) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb); }
  // fades from/to black
  const black = Math.max(1 - prog(t, 0, .8), prog(t, DUR - .9, DUR));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

function flash(t, at, dur = .35, strength = .5) {
  const k = prog(t, at, at + dur);
  if (k <= 0 || k >= 1) return;
  ctx.fillStyle = `rgba(180,255,160,${(1 - k) ** 2 * strength})`;
  ctx.fillRect(0, 0, W, H);
}

