// Partikel jaringan di latar belakang
(() => {
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d");
  let w, h, pts;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    const n = Math.min(90, Math.floor((w * h) / 18000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.fillStyle = "rgba(57,255,136,.6)";
      ctx.fillRect(p.x, p.y, 1.6, 1.6);
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 130) {
          ctx.strokeStyle = `rgba(57,255,136,${0.12 * (1 - d / 130)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  addEventListener("resize", resize);
  resize();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) draw();
})();

// Nav saat scroll & menu mobile
const nav = document.getElementById("nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20));
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => {
  burger.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    burger.classList.remove("open");
    navLinks.classList.remove("open");
  })
);

// Animasi muncul + counter
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || "0", 10);
  const pre = el.dataset.prefix || "";
  const suf = el.dataset.suffix || "";
  const start = performance.now();
  const dur = 1600;
  (function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const v = target * (1 - Math.pow(1 - t, 3));
    el.textContent = pre + v.toFixed(dec) + suf;
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(e.target);
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 60}ms`;
  io.observe(el);
});

// Efek sorotan kursor pada kartu
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

// Terminal mengetik
(() => {
  const lines = [
    ["c", "$ fyer connect --wallet"],
    ["", "✓ Dompet terhubung: 0x7a...e91f"],
    ["c", "$ fyer shield 2.5 ETH"],
    ["", "⟳ Membuat zero-knowledge proof..."],
    ["", "✓ 2.5 ETH berhasil di-shield"],
    ["c", "$ fyer send 1.0 ETH --stealth"],
    ["", "✓ Terkirim. Jejak: tidak ada 🌿"],
  ];
  const el = document.getElementById("typer");
  let li = 0, ci = 0, html = "";

  function step() {
    if (li >= lines.length) {
      setTimeout(() => { li = 0; ci = 0; html = ""; el.innerHTML = ""; step(); }, 3500);
      return;
    }
    const [cls, text] = lines[li];
    ci++;
    const part = text.slice(0, ci);
    el.innerHTML = html + (cls ? `<span class="c">${part}</span>` : part);
    if (ci >= text.length) {
      html += (cls ? `<span class="c">${text}</span>` : text) + "\n";
      li++; ci = 0;
      setTimeout(step, 450);
    } else {
      setTimeout(step, cls ? 38 : 18);
    }
  }
  step();
})();

// Salin contract address
document.getElementById("copyCa").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(document.getElementById("ca").textContent);
    e.target.textContent = "Tersalin!";
  } catch {
    e.target.textContent = "Gagal";
  }
  setTimeout(() => (e.target.textContent = "Salin"), 1500);
});

// Form waitlist
document.getElementById("ctaForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("ctaMsg").textContent = "✓ Terima kasih! Anda masuk daftar tunggu.";
  e.target.reset();
});

document.getElementById("year").textContent = new Date().getFullYear();
