(function () {
  const { el, renders, P, setupCanvas, mix, jolt, drawLattice, say } = window.MB;
  const MELT = 1085;
  const GLOW = [
    [525, [70, 8, 4]],
    [700, [140, 24, 12]],
    [800, [190, 44, 22]],
    [900, [228, 72, 30]],
    [1000, [248, 112, 44]],
    [1100, [255, 150, 56]],
    [1200, [255, 188, 96]]
  ].map((row, i) => row.concat('glow.' + i));

  function glow(t) {
    if (t < GLOW[0][0]) {
      return null;
    }
    for (let i = GLOW.length - 1; i >= 0; i--) {
      if (t >= GLOW[i][0]) {
        const a = GLOW[i];
        const b = GLOW[Math.min(i + 1, GLOW.length - 1)];
        const k = b === a ? 0 : (t - a[0]) / (b[0] - a[0]);
        return { rgb: a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)), name: (k > 0.5 ? b : a)[2] };
      }
    }
    return null;
  }

  function atomRgb(t) {
    const g = glow(t);
    if (!g) {
      return P.atom;
    }
    const k = Math.min(1, 0.25 + (t - 525) / 300);
    return P.atom.map((v, i) => Math.round(v + (g.rgb[i] - v) * k));
  }

  function amplitude(t, a) {
    return a * 0.15 * Math.sqrt((t + 273) / (MELT + 273));
  }

  function hash(a, b) {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function onScreen(node) {
    const r = node.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function experimentVibration() {
    const W = 780;
    const H = 260;
    const a = 30;
    const cols = 24;
    const rows = 8;
    const canvas = el('v-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const slider = el('v-slider');
    const atoms = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        atoms.push({
          x: 36 + c * a + (r % 2 ? a / 2 : 0),
          y: 228 - r * a * 0.866,
          f1: hash(r, c) * 6.28,
          f2: hash(c, r + 7) * 6.28,
          w1: 5 + hash(r + 3, c) * 4,
          w2: 5 + hash(r, c + 5) * 4,
          dx: 0,
          dy: 0
        });
      }
    }
    let last = 0;

    function caption(t) {
      const g = glow(t);
      el('v-temp').textContent = t + ' °C';
      say(el('v-glow'), g ? g.name : 'noGlow');
      if (t >= MELT) {
        return 'heatMelt';
      }
      if (t >= 525) {
        return 'heatGlow';
      }
      if (t >= 200) {
        return 'heatAnneal';
      }
      return 'heatRoom';
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!onScreen(canvas)) {
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = +slider.value;
      const amp = amplitude(t, a);
      const melted = t >= MELT;
      const sec = now / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = mix(atomRgb(t), P.atom, 0);
      for (const p of atoms) {
        if (melted) {
          p.dx += (Math.random() - 0.5) * 60 * dt;
          p.dy += (Math.random() - 0.5) * 60 * dt;
          p.dx = Math.max(-p.x + 12, Math.min(W - p.x - 12, p.dx));
          p.dy = Math.max(-p.y + 12, Math.min(H - p.y - 12, p.dy));
        } else {
          p.dx *= 0.9;
          p.dy *= 0.9;
        }
        ctx.beginPath();
        ctx.arc(p.x + p.dx + amp * Math.sin(sec * p.w1 + p.f1), p.y + p.dy + amp * Math.sin(sec * p.w2 + p.f2), 11, 0, 6.2832);
        ctx.fill();
      }
    }

    slider.oninput = () => {
      say(el('v-caption'), caption(+slider.value));
    };
    slider.oninput();
    requestAnimationFrame(frame);
  }

  function lens() {
    const g = { w: 920, h: 400, a: 20, cols: 46, rows: 22, r: 8.2, left: 0, bottom: 388, bulk: true };
    const rh = g.a * 0.866;
    const canvas = el('a-canvas');
    const ctx = setupCanvas(canvas, g.w, g.h);
    const slider = el('a-slider');
    const SMAX = 24;
    const ANGLES = [12, -18, 25];
    const SHADES = [[255, 255, 255], [0, 0, 0], [120, 60, 20]];
    let ds = [];
    let grains = [];
    let running = false;
    let done = false;
    let recovery = 0;
    let incubation = 0;
    let annihilated = 0;
    let pair = null;
    let recoveryOver = false;
    let start = 0;
    let last = 0;

    function seed() {
      ds = [];
      let guard = 0;
      while (ds.length < 20 && guard < 2000) {
        guard++;
        const d = {
          p: 3 + Math.floor(Math.random() * (g.rows - 7)),
          x: g.w * (0.2 + 0.6 * Math.random()),
          dir: Math.random() < 0.5 ? 1 : -1,
          state: 'stuck'
        };
        if (!ds.some((e) => e.p === d.p && Math.abs(e.x - d.x) < 4 * g.a)) {
          ds.push(d);
        }
      }
      grains = [];
      running = false;
      done = false;
      recovery = 0;
      incubation = 0;
      annihilated = 0;
      pair = null;
      recoveryOver = false;
      start = ds.length;
    }

    function yOf(d) {
      return g.bottom - (d.p + 0.5) * rh;
    }

    function owner(x, y) {
      let best = -1;
      let depth = 0;
      for (let i = 0; i < grains.length; i++) {
        const v = grains[i].r - Math.hypot(x - grains[i].x, y - grains[i].y);
        if (v > depth) {
          depth = v;
          best = i;
        }
      }
      return best;
    }

    function covered() {
      for (let x = 0; x <= g.w; x += 46) {
        for (let y = 0; y <= g.h; y += 40) {
          if (owner(x, y) < 0) {
            return false;
          }
        }
      }
      return true;
    }

    function stage(t) {
      if (done) {
        return 'annealDone';
      }
      if (!running) {
        return grains.length || annihilated ? 'annealOut' : 'annealStart';
      }
      if (t < 250 && grains.length) {
        return 'annealStalled';
      }
      if (t < 150) {
        return 'annealCold';
      }
      if (t < 250) {
        return recoveryOver ? 'recoveryOver' : 'recovery';
      }
      return 'recryst';
    }

    function meters() {
      const t = +slider.value;
      const k = Math.sqrt(Math.min(1, ds.length / SMAX));
      el('a-temp').textContent = t + ' °C';
      el('a-hard').textContent = '×' + (1 + k).toFixed(1);
      el('a-hard-bar').style.width = (10 + 90 * k) + '%';
      say(el('a-left'), ['leftOf', { n: ds.length, total: start }]);
      el('a-grains').textContent = grains.length;
      say(el('a-caption'), stage(t));
      say(el('a-fire'), running ? 'fireOut' : 'fireIn');
      el('a-fire').disabled = done;
    }

    function render(now) {
      const t = running ? +slider.value : 20;
      const amp = amplitude(t, g.a) * 0.4;
      const sec = (now || 0) / 1000;
      const jig = (r, c) => [
        amp * Math.sin(sec * (6 + 3 * hash(r, c)) + hash(c, r) * 6.28),
        amp * Math.sin(sec * (6 + 3 * hash(c + 9, r)) + hash(r + 4, c) * 6.28)
      ];
      const base = atomRgb(t);
      drawLattice(ctx, g, ds, null, { skip: (x, y) => owner(x, y) >= 0, jig: jig, base: base });
      grains.forEach((gr, i) => {
        ctx.fillStyle = mix(base, SHADES[i], 0.14);
        const n = Math.ceil(gr.r / rh) + 1;
        const cos = Math.cos(gr.ang);
        const sin = Math.sin(gr.ang);
        for (let row = -n; row <= n; row++) {
          for (let col = -n; col <= n; col++) {
            const lx = (col + (row & 1 ? 0.5 : 0)) * g.a;
            const ly = row * rh;
            const x = gr.x + lx * cos - ly * sin;
            const y = gr.y + lx * sin + ly * cos;
            if (x < -g.r || x > g.w + g.r || y < -g.r || y > g.h + g.r) {
              continue;
            }
            if (Math.hypot(lx, ly) > gr.r || owner(x, y) !== i) {
              continue;
            }
            const j = jig(row + 31 * i, col);
            ctx.beginPath();
            ctx.arc(x + j[0], y + j[1], g.r, 0, 6.2832);
            ctx.fill();
          }
        }
      });
    }

    function closestPair() {
      let best = null;
      let dist = 4 * g.a;
      for (let i = 0; i < ds.length; i++) {
        for (let k = i + 1; k < ds.length; k++) {
          if (ds[i].dir === ds[k].dir) {
            continue;
          }
          const v = Math.hypot(ds[i].x - ds[k].x, yOf(ds[i]) - yOf(ds[k]));
          if (v < dist) {
            dist = v;
            best = [ds[i], ds[k]];
          }
        }
      }
      return best;
    }

    function advance(dt) {
      const t = +slider.value;
      if (t < 150 || done) {
        return;
      }
      const speed = Math.min(10, Math.exp((t - 300) / 180));
      const slow = Math.max(0.6, speed);
      if (pair && !(ds.includes(pair[0]) && ds.includes(pair[1]))) {
        pair.forEach((d) => {
          d.state = 'stuck';
        });
        pair = null;
      }
      if (pair) {
        const dir = Math.sign(pair[1].x - pair[0].x) || 1;
        pair[0].x += dir * 40 * slow * dt;
        pair[1].x -= dir * 40 * slow * dt;
        if ((pair[1].x - pair[0].x) * dir <= g.a) {
          ds = ds.filter((d) => d !== pair[0] && d !== pair[1]);
          annihilated += 2;
          pair = null;
        }
      } else if (annihilated >= 4) {
        recoveryOver = true;
      } else if (!recoveryOver) {
        recovery += dt * slow;
        if (recovery > 1.5) {
          recovery = 0;
          pair = closestPair();
          if (pair) {
            pair.forEach((d) => {
              d.state = 'move';
            });
          } else {
            recoveryOver = true;
          }
        }
      }
      if (t < 250) {
        return;
      }
      incubation += dt * speed;
      const free = ds.filter((d) => owner(d.x, yOf(d)) < 0);
      if (grains.length < ANGLES.length && free.length && incubation > 1 + grains.length * 2.5) {
        const crowd = (c) => ds.filter((e) => Math.hypot(e.x - c.x, yOf(e) - yOf(c)) < 4 * g.a).length;
        const d = free.reduce((best, c) => (crowd(c) > crowd(best) ? c : best));
        grains.push({ x: d.x, y: yOf(d), r: 3, ang: ANGLES[grains.length] * Math.PI / 180 });
      }
      for (const gr of grains) {
        gr.r += 7 * speed * dt;
      }
      ds = ds.filter((d) => owner(d.x, yOf(d)) < 0);
      if (grains.length && covered()) {
        done = true;
        running = false;
      }
    }

    function frame(now) {
      if (!running) {
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (onScreen(canvas)) {
        advance(dt);
        render(now);
        meters();
      }
      if (running) {
        requestAnimationFrame(frame);
      } else {
        render(0);
        meters();
      }
    }

    el('a-fire').onclick = () => {
      running = !running;
      jolt(el('w-anneal'));
      meters();
      if (running) {
        last = performance.now();
        requestAnimationFrame(frame);
      } else {
        render(0);
      }
    };
    el('a-reset').onclick = () => {
      seed();
      render(0);
      meters();
    };
    slider.oninput = meters;
    renders.push(() => render(0));
    seed();
    render(0);
    meters();
  }

  function cycleGame() {
    const LIMIT = 5;
    const GOAL = 5;
    let thick = 20;
    let hard = 0;
    let blows = 0;
    let anneals = 0;
    let broken = false;

    function render(text) {
      const w = 60 * 20 / thick;
      const h = thick * 2.4;
      const bar = el('c-bar');
      bar.setAttribute('x', 160 - w / 2);
      bar.setAttribute('width', w);
      bar.setAttribute('y', 96 - h);
      bar.setAttribute('height', h);
      bar.setAttribute('rx', Math.min(8, h / 2.5));
      el('c-cracks').setAttribute('visibility', broken ? 'visible' : 'hidden');
      el('c-crack-l').setAttribute('d', 'M' + (160 - w / 2 - 1) + ' ' + (96 - h / 2) + ' l10 -2 l7 3 l9 -2');
      el('c-crack-r').setAttribute('d', 'M' + (160 + w / 2 + 1) + ' ' + (96 - h / 2) + ' l-9 2 l-8 -3 l-8 2');
      say(el('c-thick'), ['thickness', { n: thick.toFixed(1) }]);
      el('c-reserve').textContent = Math.round(100 * (1 - hard / LIMIT)) + '%';
      el('c-reserve-bar').style.width = 100 * (1 - hard / LIMIT) + '%';
      say(el('c-count'), ['cycleCount', { blows, anneals }]);
      el('c-hit').disabled = broken || thick <= GOAL;
      el('c-anneal').disabled = broken || thick <= GOAL;
      say(el('c-caption'), text);
    }

    el('c-hit').onclick = () => {
      jolt(el('w-cycle'));
      if (hard >= LIMIT) {
        broken = true;
        render('cycleBroken');
        return;
      }
      blows++;
      hard++;
      thick *= 0.88;
      if (thick <= GOAL) {
        render(['cycleDone', { blows, anneals }]);
        return;
      }
      render(hard >= LIMIT ? 'cycleLimit' : 'cycleHit');
    };
    el('c-anneal').onclick = () => {
      if (hard === 0) {
        render('cycleWasted');
        return;
      }
      hard = 0;
      anneals++;
      render('cycleAnneal');
    };
    el('c-reset').onclick = () => {
      thick = 20;
      hard = 0;
      blows = 0;
      anneals = 0;
      broken = false;
      render('cycleStart');
    };
    el('c-reset').onclick();
  }

  function oxide() {
    const NARROW = window.matchMedia('(max-width: 700px)').matches;
    const W = NARROW ? 360 : 760;
    const H = NARROW ? 200 : 240;
    const R = NARROW ? 10 : 13;
    const O = R * 0.62;
    const A = R * 2.1;
    const TAU = 6.2832;
    const ROW = A * 0.866;
    const BASE = H - R - 4;
    const PAIRS = NARROW ? [[0.5, 0.28], [0.16, 0.2], [0.84, 0.36]] : [[0.5, 0.28], [0.14, 0.2], [0.3, 0.42], [0.72, 0.36], [0.9, 0.16]];
    const MID = Math.round(W / 2 / A);
    const ctx = setupCanvas(el('o-canvas'), W, H);
    const K = {};
    let step = 0;
    let k = 0;
    let started = 0;
    let running = false;

    function ball(x, y, r, fill) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    function metal(rows, top) {
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c * A < W + A; c++) {
          ball(c * A + (r % 2 ? A / 2 : 0), top + r * ROW, R, K.atom);
        }
      }
    }

    function pair(x, y, gap) {
      ball(x - gap, y, O, K.oxygen);
      ball(x + gap, y, O, K.oxygen);
    }

    function meeting() {
      const top = BASE - ROW;
      metal(2, top);
      PAIRS.slice(1).forEach(([x, y]) => pair(x * W, y * H, O * 0.85));
      const land = top - R - O * 0.55;
      const fall = step === 0 ? 0 : step === 1 ? k : 1;
      const open = step === 2 ? k : 0;
      const x = MID * A + A / 2;
      const y = PAIRS[0][1] * H + (land - O * 1.6 - PAIRS[0][1] * H) * fall + O * 1.6 * open;
      pair(x, y, O * 0.85 + (A / 2 - O * 0.85) * open);
      if (step > 0) {
        ctx.strokeStyle = K.text;
        ctx.lineWidth = 2;
        [-1, 1].forEach((side) => {
          const cx = x + side * A / 2;
          ctx.beginPath();
          if (step === 2 && k === 1) {
            ctx.ellipse(cx, top - O * 0.6, R + 4, R + O + 5, 0, 0, TAU);
          } else {
            ctx.arc(cx, top, R + 3, 0, TAU);
          }
          ctx.stroke();
        });
      }
    }

    function layers() {
      const rows = [[1, K.oxide], [2, K.cuprite]];
      let y = R + 6;
      rows.forEach(([copper, tint]) => {
        ctx.fillStyle = tint;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(0, y - R - 3, W, 2 * ROW + 4);
        ctx.globalAlpha = 1;
        for (let r = 0; r < 2; r++) {
          let x = -A + (r ? A * 0.7 : 0);
          for (let i = 0; x < W + A; i++) {
            const oxygen = i % (copper + 1) === copper;
            ball(x, y + r * ROW, oxygen ? O : R, oxygen ? K.oxygen : K.atom);
            x += oxygen ? R + O : (i + 1) % (copper + 1) === copper ? R + O : A;
          }
        }
        y += 2 * ROW + 6;
      });
      metal(Math.max(2, Math.floor((H - y) / ROW) + 1), y + 2);
    }

    function render() {
      const css = getComputedStyle(document.documentElement);
      ['oxygen', 'oxide', 'cuprite', 'text'].forEach((name) => {
        K[name] = css.getPropertyValue('--' + name).trim();
      });
      K.atom = 'rgb(' + P.atom.join(',') + ')';
      ctx.clearRect(0, 0, W, H);
      if (step === 3) {
        layers();
      } else {
        meeting();
      }
    }

    function labels() {
      say(el('o-count'), ['stepCount', { n: step + 1, total: 4 }]);
      say(el('o-caption'), 'oxide.' + step);
      el('o-back').disabled = step === 0;
      el('o-next').disabled = step === 3;
    }

    function frame(t) {
      const p = Math.max(0, Math.min(1, (t - started) / 900));
      k = p * p * (3 - 2 * p);
      render();
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function go(to) {
      const forward = to > step;
      step = Math.max(0, Math.min(3, to));
      labels();
      k = forward && (step === 1 || step === 2) ? 0 : 1;
      if (k === 0) {
        started = performance.now();
        if (!running) {
          running = true;
          requestAnimationFrame(frame);
        }
      }
      render();
    }

    el('o-back').onclick = () => go(step - 1);
    el('o-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  if (el('w-oxide')) {
    oxide();
  }
  experimentVibration();
  lens();
  cycleGame();
})();
