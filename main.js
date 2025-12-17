(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Theme toggle (persistent)
  const modeBtn = $("#modeBtn");
  const themeKey = "site-theme";
  const saved = localStorage.getItem(themeKey);
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  modeBtn?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(themeKey, next);
  });

  // ---------- Year
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());

  // ---------- Scroll meter
  const meter = $("#scrollMeterFill");
  const setMeter = () => {
    if (!meter) return;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const p = (doc.scrollTop / max) * 100;
    meter.style.width = `${p}%`;
    const miniScroll = $("#miniScroll");
    if (miniScroll) miniScroll.textContent = `${Math.round(p)}%`;
  };
  window.addEventListener("scroll", setMeter, { passive: true });
  setMeter();

  // ---------- Interaction tracking (quiet, internal)
  const state = {
    interactions: 0,
    lastMove: performance.now(),
    lastDown: 0,
    dwellStart: performance.now(),
    pointer: { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
    ambient: { mode: "idle", energy: 0 }
  };

  const bump = (n = 1) => {
    state.interactions += n;
    sessionStorage.setItem("interactions", String(state.interactions));
  };
  state.interactions = Number(sessionStorage.getItem("interactions") || "0");

  // ---------- Pointer telemetry
  let last = { x: 0, y: 0, t: performance.now() };
  window.addEventListener("pointermove", (e) => {
    const t = performance.now();
    const dt = Math.max(8, t - last.t);
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;

    state.pointer.vx = dx / dt;
    state.pointer.vy = dy / dt;
    state.pointer.speed = Math.min(2.5, Math.hypot(state.pointer.vx, state.pointer.vy));
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;

    last = { x: e.clientX, y: e.clientY, t };

    const miniCursor = $("#miniCursor");
    if (miniCursor) miniCursor.textContent = `${Math.round(e.clientX)}×${Math.round(e.clientY)}`;

    state.lastMove = t;
  }, { passive: true });

  window.addEventListener("pointerdown", () => {
    bump(1);
    state.lastDown = performance.now();
  }, { passive: true });

  // ---------- Dwell counter (quiet)
  const miniDwell = $("#miniDwell");
  const dwellTick = () => {
    const t = performance.now();
    const seconds = Math.max(0, (t - state.dwellStart) / 1000);
    if (miniDwell) miniDwell.textContent = `${seconds.toFixed(1)}s`;
    requestAnimationFrame(dwellTick);
  };
  if (miniDwell) requestAnimationFrame(dwellTick);

  // ---------- Footer hidden panel (triple-click zone or button)
  const diag = $("#diag");
  const footPeek = $("#footPeek");
  const diagClose = $("#diagClose");
  let clickStreak = 0;
  let clickTimer = 0;

  const openDiag = () => {
    if (!diag) return;
    diag.hidden = false;
    bump(2);
    updateDiag();
  };
  const closeDiag = () => {
    if (!diag) return;
    diag.hidden = true;
    bump(1);
  };

  footPeek?.addEventListener("click", () => {
    if (!diag) return;
    diag.hidden ? openDiag() : closeDiag();
  });
  diagClose?.addEventListener("click", closeDiag);

  document.addEventListener("click", (e) => {
    const foot = e.target.closest?.(".foot");
    if (!foot) return;

    const now = performance.now();
    if (now - clickTimer > 520) clickStreak = 0;
    clickTimer = now;
    clickStreak += 1;
    if (clickStreak >= 3) {
      clickStreak = 0;
      openDiag();
    }
  }, true);

  const updateDiag = () => {
    const dSession = $("#dSession");
    const dInteractions = $("#dInteractions");
    const dVel = $("#dVel");
    const dState = $("#dState");
    if (!dSession) return;

    const sidKey = "session-id";
    let sid = sessionStorage.getItem(sidKey);
    if (!sid) {
      sid = Math.random().toString(16).slice(2, 10).toUpperCase();
      sessionStorage.setItem(sidKey, sid);
    }

    dSession.textContent = sid;
    dInteractions.textContent = String(state.interactions);
    dVel.textContent = `${state.pointer.speed.toFixed(2)}`;
    dState.textContent = `${state.ambient.mode}/${state.ambient.energy.toFixed(2)}`;
  };

  // ---------- Index page ambient canvas
  const ambient = $("#ambientCanvas");
  if (ambient) {
    const ctx = ambient.getContext("2d", { alpha: true });
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = ambient.getBoundingClientRect();
      const w = Math.max(520, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      ambient.width = Math.floor(w * DPR);
      ambient.height = Math.floor(h * DPR);
      ambient.dataset.w = String(w);
      ambient.dataset.h = String(h);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => Number(ambient.dataset.w || "980");
    const H = () => Number(ambient.dataset.h || "520");

    const count = 54;
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.6,
      t: Math.random() * 1000
    }));

    const lineMax = 120;
    const meta = $("#panelMeta");
    const tagA = $("#tagA");
    const tagB = $("#tagB");
    const telem = $("#telemetry");

    let lastT = performance.now();
    let energy = 0;

    const draw = (t) => {
      const dt = Math.min(40, t - lastT);
      lastT = t;

      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      const idleFor = t - state.lastMove;
      const active = idleFor < 1100;
      const speed = state.pointer.speed;

    // energy responds to speed and decays
      energy = Math.max(0, energy * 0.965 + speed * 0.08);
      energy = Math.min(1.25, energy);
      // base time drift
      let drift = 0.12 + 0.38 * (0.5 + 0.5 * Math.sin(t / 9000));

      // 🔹 NEW: behavior-based modifiers (scroll + linger)
      const mod = window.__ambientModifiers?.() || { phase: 0, linger: 0 };        
      energy *= (1 - mod.linger * 0.35);
      drift += mod.phase * 0.25;

      state.ambient.energy = energy;
      state.ambient.mode = active ? (energy > 0.45 ? "active" : "tracking") : "idle";

  

      // cursor influence (non-obvious: depends on velocity, not position alone)
      const px = state.pointer.x, py = state.pointer.y;
      const pull = 0.4 + 0.9 * energy;

      for (const p of pts) {
        p.t += dt;

        // base flow
        p.x += p.vx * dt * drift;
        p.y += p.vy * dt * drift;

        // edge wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // velocity-weighted cursor shear field
        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        const influence = Math.exp(-d2 / (120000 / (1 + energy * 1.8)));

        // shear based on pointer velocity direction (feels “alive” but not loud)
        const sx = -state.pointer.vy * 18 * influence * pull;
        const sy = state.pointer.vx * 18 * influence * pull;

        p.x += sx * (dt / 16);
        p.y += sy * (dt / 16);
      }

      // lines
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < lineMax) {
            const alpha = (1 - d / lineMax) * (0.08 + 0.14 * energy);
            ctx.strokeStyle = `rgba(166,183,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // points
      for (const p of pts) {
        const tw = 0.55 + 0.45 * Math.sin((p.t / 1000) + p.r);
        const a = 0.25 + 0.35 * energy;
        ctx.fillStyle = `rgba(232,236,246,${a * (0.65 + 0.35 * tw)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // quiet UI readouts
      if (meta) {
        const now = new Date();
        meta.textContent = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • ${state.ambient.mode}`;
      }
      if (tagA) tagA.textContent = state.ambient.mode;
      if (tagB) tagB.textContent = energy > 0.55 ? "adaptive" : "stable";
      if (telem) telem.textContent = String(Math.round(energy * 100));

      if (diag && !diag.hidden) updateDiag();
      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
  }

  // ---------- Resume interactions (readability-first)
  const expandAll = $("#expandAll");
  const collapseAll = $("#collapseAll");
  const details = $$(".details");

  const focusNote = $("#focusNote");
  const setFocusNote = (txt) => { if (focusNote) focusNote.textContent = txt; };

  expandAll?.addEventListener("click", () => {
    details.forEach(d => d.open = true);
    bump(1);
    setFocusNote("Expanded.");
  });
  collapseAll?.addEventListener("click", () => {
    details.forEach(d => d.open = false);
    bump(1);
    setFocusNote("Collapsed.");
  });

  // Subtle focus hint based on keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") setFocusNote("Keyboard focus active.");
  }, { passive: true });

  // Skills: selection readout (improves scanability)
  const skillGrid = $("#skillGrid");
  const skillReadout = $("#skillReadout");
  if (skillGrid && skillReadout) {
    skillGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-skill]");
      if (!btn) return;
      bump(1);

      $$(".pill", skillGrid).forEach(p => p.classList.remove("isOn"));
      btn.classList.add("isOn");

      const label = btn.getAttribute("data-skill") || "Skill";
      const t = performance.now();
      const rhythm = (t - state.lastDown) < 900 ? "dense" : "steady";
      skillReadout.textContent = `${label} • scan mode: ${rhythm}`;
    });
  }

  // ---------- Projects page interactions
  const signal = $("#projSignal");
  const setSignal = (txt) => { if (signal) signal.textContent = txt; };

  // Project 1: Vector Field canvas
  const pField = $("#pField");
  if (pField) {
    const ctx = pField.getContext("2d", { alpha: true });
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = pField.getBoundingClientRect();
      const w = Math.max(520, Math.floor(rect.width));
      const h = 320;
      pField.width = Math.floor(w * DPR);
      pField.height = Math.floor(h * DPR);
      pField.dataset.w = String(w);
      pField.dataset.h = String(h);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => Number(pField.dataset.w || "860");
    const H = () => Number(pField.dataset.h || "320");

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: 0.2 + Math.random() * 0.8
    }));

    let hovering = false;
    pField.addEventListener("pointerenter", () => { hovering = true; setSignal("field: engaged"); bump(1); });
    pField.addEventListener("pointerleave", () => { hovering = false; setSignal("field: idle"); });

    let lastT = performance.now();
    const tick = (t) => {
      const dt = Math.min(34, t - lastT);
      lastT = t;

      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      const speed = state.pointer.speed;
      const energy = hovering ? (0.25 + speed * 0.9) : (0.08 + speed * 0.35);
      const curl = 0.9 + 1.6 * energy;

      // faint grid
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--line2");
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const px = state.pointer.x, py = state.pointer.y;
      for (const p of particles) {
        // center drift
        const cx = (p.x - w / 2) / w;
        const cy = (p.y - h / 2) / h;
        const ang = Math.atan2(cy, cx) + curl * 0.45;

        // non-obvious: pointer affects rotation direction based on velocity sign
        const vSign = Math.sign(state.pointer.vx + 0.0001);
        const s = (0.22 + 0.65 * p.a) * (0.6 + 0.9 * energy);

        p.vx += Math.cos(ang) * s * vSign * 0.3;
        p.vy += Math.sin(ang) * s * vSign * 0.3;

        // pointer proximity pushes gently away (keeps readable)
        const dx = p.x - px, dy = p.y - py;
        const d2 = dx*dx + dy*dy;
        const repel = Math.exp(-d2 / 90000) * (0.18 + 0.8 * energy);
        p.vx += (dx / (Math.sqrt(d2) + 1)) * repel * 0.6;
        p.vy += (dy / (Math.sqrt(d2) + 1)) * repel * 0.6;

        // friction + integrate
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        // wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // render particles and trails
      ctx.lineWidth = 1;
      for (const p of particles) {
        ctx.strokeStyle = `rgba(119,242,210,${0.06 + 0.09 * energy})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 10, p.y - p.vy * 10);
        ctx.stroke();

        ctx.fillStyle = `rgba(232,236,246,${0.18 + 0.22 * energy})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Project 2: SVG graph (scroll + dwell changes)
  const pGraph = $("#pGraph");
  if (pGraph) {
    const nodesG = $("#graphNodes", pGraph);
    const linesG = $("#graphLines", pGraph);
    const w = 860, h = 320;

    const nodes = Array.from({ length: 11 }, (_, i) => ({
      id: i,
      x: 80 + Math.random() * (w - 160),
      y: 60 + Math.random() * (h - 120),
      vx: 0,
      vy: 0,
      r: 8 + Math.random() * 6
    }));

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const j = (i + 1) % nodes.length;
      edges.push([i, j]);
      if (i % 2 === 0) edges.push([i, (i + 3) % nodes.length]);
    }

    const mk = (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag);

    const nodeEls = nodes.map(n => {
      const c = mk("circle");
      c.setAttribute("r", n.r);
      c.setAttribute("fill", "rgba(232,236,246,0.45)");
      c.setAttribute("stroke", "rgba(166,183,255,0.35)");
      c.setAttribute("stroke-width", "1.2");
      nodesG.appendChild(c);
      return c;
    });

    const edgeEls = edges.map(() => {
      const l = mk("line");
      l.setAttribute("stroke", "rgba(166,183,255,0.22)");
      l.setAttribute("stroke-width", "1.2");
      linesG.appendChild(l);
      return l;
    });

    let hovering = false;
    pGraph.addEventListener("pointerenter", () => { hovering = true; setSignal("graph: engaged"); bump(1); });
    pGraph.addEventListener("pointerleave", () => { hovering = false; setSignal("graph: idle"); });

    let lastScroll = window.scrollY;
    let scrollDir = 0;

    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      scrollDir = Math.sign(y - lastScroll);
      lastScroll = y;
    }, { passive: true });

    let lastT = performance.now();
    const step = (t) => {
      const dt = Math.min(34, t - lastT);
      lastT = t;

      const idleFor = t - state.lastMove;
      const paused = idleFor > 950;
      const speed = state.pointer.speed;

      // non-obvious: scrolling sets a slow bias; pausing “tightens” the network
      const bias = (0.02 + 0.10 * speed) * (scrollDir || 1);
      const tighten = paused ? 0.92 : 0.98;

      const px = state.pointer.x;
      const py = state.pointer.y;

      for (const n of nodes) {
        // boundary pull
        const bx = (w / 2 - n.x) * 0.0006;
        const by = (h / 2 - n.y) * 0.0006;

        // hover modifies elasticity
        const elastic = hovering ? 0.014 : 0.009;

        // gentle orbital term controlled by scroll direction
        const ox = -(n.y - h / 2) * 0.0004 * bias;
        const oy =  (n.x - w / 2) * 0.0004 * bias;

        // cursor avoidance (keeps it from sitting under the pointer)
        const dx = n.x - (px / window.innerWidth) * w;
        const dy = n.y - (py / window.innerHeight) * h;
        const d2 = dx*dx + dy*dy;
        const repel = Math.exp(-d2 / 12000) * (0.08 + 0.35 * speed);

        n.vx += (bx + ox) + (dx / (Math.sqrt(d2) + 1)) * repel;
        n.vy += (by + oy) + (dy / (Math.sqrt(d2) + 1)) * repel;

        // edge springs
        for (const [a, b] of edges) {
          if (a !== n.id && b !== n.id) continue;
          const o = nodes[a === n.id ? b : a];
          const ex = o.x - n.x;
          const ey = o.y - n.y;
          const dist = Math.hypot(ex, ey) + 0.0001;
          const target = paused ? 115 : 135;
          const f = (dist - target) * elastic;
          n.vx += (ex / dist) * f;
          n.vy += (ey / dist) * f;
        }

        // integrate + friction
        n.vx *= tighten;
        n.vy *= tighten;
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);

        // clamp
        n.x = Math.max(24, Math.min(w - 24, n.x));
        n.y = Math.max(24, Math.min(h - 24, n.y));
      }

      // render
      nodes.forEach((n, i) => {
        nodeEls[i].setAttribute("cx", n.x.toFixed(2));
        nodeEls[i].setAttribute("cy", n.y.toFixed(2));
        nodeEls[i].setAttribute("fill", `rgba(232,236,246,${0.30 + 0.18 * (hovering ? 1 : 0.7)})`);
      });

      edges.forEach(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const alpha = 0.10 + 0.16 * (paused ? 1 : 0.6) + 0.10 * speed;
        edgeEls[i].setAttribute("x1", A.x.toFixed(2));
        edgeEls[i].setAttribute("y1", A.y.toFixed(2));
        edgeEls[i].setAttribute("x2", B.x.toFixed(2));
        edgeEls[i].setAttribute("y2", B.y.toFixed(2));
        edgeEls[i].setAttribute("stroke", `rgba(166,183,255,${Math.min(0.35, alpha)})`);
      });

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  // Project 3: Time lens panel
  const timeLens = $("#timeLens");
  const localTime = $("#localTime");
  const rhythm = $("#rhythm");
  const focus = $("#focus");
  if (timeLens && localTime && rhythm && focus) {
    let lastTap = 0;
    let beat = 0;

    timeLens.addEventListener("pointerdown", () => {
      const t = performance.now();
      const dt = t - lastTap;
      lastTap = t;
      if (dt < 700) beat = Math.min(6, beat + 1);
      else beat = Math.max(0, beat - 1);
      bump(1);
    });

    const tick = () => {
      const now = new Date();
      localTime.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      const hour = now.getHours();
      const phase = hour < 6 ? "late" : hour < 12 ? "morning" : hour < 18 ? "day" : "evening";
      const idleFor = performance.now() - state.lastMove;
      const f = idleFor > 1200 ? "resting" : idleFor > 650 ? "observing" : "active";

      const r = beat > 4 ? "dense" : beat > 2 ? "steady" : "quiet";
      rhythm.textContent = `${phase} • ${r}`;
      focus.textContent = f;

      // subtle structural change based on rhythm/phase (never harms readability)
      const pad = phase === "late" ? 16 : phase === "morning" ? 14 : 12;
      timeLens.style.gap = `${Math.max(8, pad - beat)}px`;
      timeLens.style.transform = `translateY(${Math.sin(now.getTime() / 6000) * (beat ? 0.6 : 0.25)}px)`;

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- Tableau embed sizing improvement (safe)
  const tPlaceholder = $("#tableauViz");
  if (tPlaceholder) {
    const obj = $("object", tPlaceholder);
    const fit = () => {
      const rect = tPlaceholder.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.round(Math.min(740, Math.max(520, rect.width * 0.62)));
      if (obj) {
        obj.style.width = `${w}px`;
        obj.style.height = `${h}px`;
      }
    };
    fit();
    window.addEventListener("resize", fit);
  }
})();


// INDEX — advanced ambient extensions
const hero = document.querySelector(".hero");
let phase = 0;
let linger = 0;
let lastMove = performance.now();

window.addEventListener("scroll", () => {
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  phase = rect.bottom < window.innerHeight * 0.4 ? 1 : 0;
});

window.addEventListener("pointermove", () => {
  lastMove = performance.now();
});

setInterval(() => {
  const idle = performance.now() - lastMove;
  linger = idle > 900 ? Math.min(1, linger + 0.05) : Math.max(0, linger - 0.05);
}, 120);

// Hook into your existing canvas loop
window.__ambientModifiers = () => ({
  phase,
  linger
});
