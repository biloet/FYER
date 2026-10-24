(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const pointer = { x: 0, y: 0, nx: 0, ny: 0 };

  // ---------- Hero scene: rotating zk-sphere + drifting dust ----------
  const canvas = $("#scene");
  const hero = $("#hero");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, cx, cy, radius, heroVisible = true;
    const N = 900;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const sphere = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      return { x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r, flash: 0 };
    });
    const dust = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + .3, v: Math.random() * .00025 + .00008,
    }));
    let rotY = 0, rotX = -0.35, tiltX = 0, tiltY = 0;

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wide = w > 980;
      cx = wide ? w * 0.72 : w / 2;
      cy = wide ? h * 0.46 : h * 0.62;
      radius = wide ? Math.min(w, h) * 0.36 : Math.min(w, h) * 0.42;
    }
    resize();
    addEventListener("resize", resize);
    new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(hero);

    function frame() {
      requestAnimationFrame(frame);
      if (!heroVisible) return;
      ctx.clearRect(0, 0, w, h);

      // dust
      for (const p of dust) {
        p.y -= p.v; if (p.y < 0) { p.y = 1; p.x = Math.random(); }
        ctx.fillStyle = `rgba(150,255,140,${0.25 * p.s})`;
        ctx.fillRect(p.x * w + pointer.nx * 12 * p.s, p.y * h + pointer.ny * 12 * p.s, p.s, p.s);
      }

      // sphere
      rotY += 0.0016;
      tiltX += (pointer.ny * 0.35 - tiltX) * 0.04;
      tiltY += (pointer.nx * 0.5 - tiltY) * 0.04;
      const ay = rotY + tiltY, ax = rotX + tiltX;
      const cosY = Math.cos(ay), sinY = Math.sin(ay), cosX = Math.cos(ax), sinX = Math.sin(ax);
      if (Math.random() < 0.25) sphere[(Math.random() * N) | 0].flash = 1;

      for (const p of sphere) {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2; // 0 back, 1 front
        const persp = 1 + z2 * 0.25;
        const sx = cx + x1 * radius * persp;
        const sy = cy + y1 * radius * persp;
        const size = 0.6 + depth * 1.5;
        if (p.flash > 0.02) {
          ctx.fillStyle = `rgba(190,255,150,${p.flash * depth})`;
          ctx.beginPath(); ctx.arc(sx, sy, size * 2.6, 0, 6.283); ctx.fill();
          p.flash *= 0.94;
        }
        ctx.fillStyle = `rgba(${90 + depth * 60 | 0},255,${100 + depth * 30 | 0},${0.12 + depth * 0.75})`;
        ctx.fillRect(sx, sy, size, size);
      }

      // equator glow ring
      ctx.strokeStyle = "rgba(124,255,107,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 1.35, radius * 0.32, -0.25 + tiltY * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }

  // ---------- Pointer: cursor glow, hero card tilt ----------
  const card = $(".hero-card");
  if (finePointer && !reduced) {
    document.body.classList.add("has-cursor");
    const glow = $(".cursor-glow");
    addEventListener("pointermove", (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      pointer.nx = e.clientX / innerWidth - 0.5;
      pointer.ny = e.clientY / innerHeight - 0.5;
      glow.style.setProperty("--cx", e.clientX + "px");
      glow.style.setProperty("--cy", e.clientY + "px");
      if (card) {
        card.style.setProperty("--ry", (-12 + pointer.nx * 26).toFixed(2) + "deg");
        card.style.setProperty("--rx", (6 - pointer.ny * 20).toFixed(2) + "deg");
        card.style.setProperty("--sx", (50 + pointer.nx * 120).toFixed(1) + "%");
        card.style.setProperty("--sy", (pointer.ny * 120).toFixed(1) + "%");
      }
    }, { passive: true });

    // spotlight on cards
    $$(".spot, .step").forEach((el) =>
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      })
    );

    // magnetic buttons
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  // ---------- Statement: split into words ----------
  const statement = $("#statementText");
  const highlight = new Set(["decide", "read", "it."]);
  let words = [];
  if (statement) {
    const text = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = text
      .map((t) => `<span class="sw${highlight.has(t) ? " hl" : ""}">${t}</span>`)
      .join(" ");
    words = [...statement.querySelectorAll(".sw")];
  }

  // ---------- Scroll-driven effects ----------
  const nav = $("#nav");
  const heroCopy = $(".hero-copy");
  const heroVisual = $(".hero-visual");
  const steps = $("#steps");
  const stepsLine = $(".steps-line i");
  let ticking = false;

  function onScroll() {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;
    nav.classList.toggle("scrolled", y > 30);

    if (!reduced) {
      if (y < vh * 1.2) {
        heroCopy.style.translate = `0 ${y * 0.25}px`;
        heroCopy.style.opacity = String(Math.max(0, 1 - y / (vh * 0.8)));
        heroVisual.style.translate = `0 ${y * 0.12}px`;
        heroVisual.style.scale = String(1 - y / (vh * 6));
      }

      if (words.length) {
        const r = statement.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        const lit = Math.round(p * words.length);
        words.forEach((wd, i) => wd.classList.toggle("on", i < lit));
      }
    }

    if (steps && stepsLine) {
      const r = steps.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height * 0.9)));
      stepsLine.style.setProperty("--p", p.toFixed(3));
    }
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // ---------- Count-up on fees ----------
  const counters = $$("[data-count]");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const end = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const decimals = (el.dataset.count.split(".")[1] || "").length;
      if (reduced || end === 0) return;
      const t0 = performance.now();
      const dur = 1400;
      (function tick(t) {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = (end * eased).toFixed(decimals) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countIO.observe(c));
})();
