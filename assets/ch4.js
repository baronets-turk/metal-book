(function () {
  const { el, renders, P, setupCanvas, mix, jolt, drawLattice, say } = window.MB;
  const TAU = 6.2832;
  const K = {};
  const NARROW = window.matchMedia('(max-width: 700px)').matches;

  function readColours() {
    const css = getComputedStyle(document.documentElement);
    ['tin', 'tin-rich', 'delta', 'bronze', 'liquid', 'well', 'text', 'line', 'muted', 'patina', 'danger', 'copper', 'squeeze', 'stretch', 'lead', 'sans'].forEach((name) => {
      K[name] = css.getPropertyValue('--' + name).trim();
    });
  }

  function rgbOf(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  function hash(a, b) {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function clamp(v) {
    return Math.max(0, Math.min(1, v));
  }

  function lerp(a, b, k) {
    return a + (b - a) * k;
  }

  function along(table, x) {
    if (x <= table[0][0]) {
      return table[0].slice(1);
    }
    for (let i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        const a = table[i - 1];
        const b = table[i];
        const k = (x - a[0]) / (b[0] - a[0]);
        return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
      }
    }
    return null;
  }

  function choice(id, onChange) {
    const box = el(id);
    const buttons = Array.from(box.querySelectorAll('button'));
    const pick = (b) => {
      buttons.forEach((x) => x.classList.toggle('on', x === b));
      box.dataset.value = b.dataset.value;
    };
    buttons.forEach((b) => {
      b.onclick = () => {
        pick(b);
        onChange();
      };
    });
    pick(buttons.find((b) => b.classList.contains('on')) || buttons[0]);
    return () => box.dataset.value;
  }

  function mixture() {
    const COLOUR = [
      [0.2, 243, 191, 168], [1.1, 245, 197, 176], [2.1, 246, 201, 179], [3.0, 246, 201, 178],
      [4.3, 240, 196, 173], [5.2, 241, 199, 174], [6.2, 243, 204, 179], [7.3, 244, 204, 178],
      [8.2, 245, 208, 183], [9.3, 244, 209, 184], [10.6, 243, 211, 186], [11.8, 245, 216, 193],
      [13.2, 238, 212, 190], [14.0, 241, 215, 192], [15.4, 239, 216, 194], [16.7, 239, 216, 194],
      [17.4, 236, 214, 191], [18.9, 231, 209, 186], [19.4, 233, 215, 196], [21.4, 231, 212, 191],
      [26.1, 222, 207, 189], [31.5, 218, 209, 199]
    ];
    const FREEZE = [[0, 1085, 1085], [5, 1049, 954], [10, 999, 843], [16, 950, 818], [19, 889, 818]];
    const ZONES = [[7, 15, 'patina'], [17, 19, 'danger'], [20, 25, 'delta']];
    const W = NARROW ? 360 : 760;
    const H = 150;
    const M = NARROW ? 26 : 34;
    const TOP = 44;
    const BAR = 54;
    const ctx = setupCanvas(el('x-chart'), W, H);
    const xOf = (tin) => M + (W - 2 * M) * tin / 30;

    function render() {
      ctx.clearRect(0, 0, W, H);
      const paint = ctx.createLinearGradient(xOf(0), 0, xOf(30), 0);
      paint.addColorStop(0, 'rgb(' + COLOUR[0].slice(1).join(',') + ')');
      for (const row of COLOUR) {
        if (row[0] <= 30) {
          paint.addColorStop(row[0] / 30, 'rgb(' + row.slice(1).join(',') + ')');
        }
      }
      paint.addColorStop(1, 'rgb(' + along(COLOUR, 30).map(Math.round).join(',') + ')');
      ctx.fillStyle = paint;
      ctx.fillRect(xOf(0), TOP, xOf(30) - xOf(0), BAR);
      ctx.font = '12px ' + K.sans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1;
      FREEZE.forEach(([tin, starts, ends], i) => {
        const y = i % 2 ? 26 : 10;
        ctx.strokeStyle = K.muted;
        ctx.beginPath();
        ctx.moveTo(xOf(tin), y + 8);
        ctx.lineTo(xOf(tin), TOP);
        ctx.stroke();
        ctx.fillStyle = K.text;
        ctx.fillText(starts === ends ? starts : starts + '–' + ends, xOf(tin), y);
      });
      ctx.fillStyle = K.muted;
      ctx.textBaseline = 'top';
      for (let tin = 0; tin <= 30; tin += 5) {
        ctx.fillText(tin, xOf(tin), TOP + BAR + 6);
      }
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      for (const [from, to, colour] of ZONES) {
        ctx.strokeStyle = K[colour];
        ctx.beginPath();
        ctx.moveTo(xOf(from) + 3, TOP + BAR + 34);
        ctx.lineTo(xOf(to) - 3, TOP + BAR + 34);
        ctx.stroke();
      }
    }

    renders.push(render);
    render();
  }

  function atoms() {
    const SIZE = { cu: 135, sn: 145, error: 5 };
    const PILE = { cu: [5, 4, 3, 2, 1], sn: [4, 3, 1] };
    const W = NARROW ? 360 : 760;
    const SCALE = NARROW ? 0.36 : 0.4;
    const GAP = 22;
    const PAIR = 2 * (SIZE.cu + SIZE.sn) * SCALE + GAP;
    const MID = NARROW ? W / 2 : 210;
    const PX = (NARROW ? W / 2 : 560) - PAIR / 2;
    const ARM = 80;
    const PR = 9;
    const BEAM = NARROW ? 104 : 118;
    const BASE = NARROW ? BEAM + 44 + 2 * (SIZE.sn + SIZE.error) * SCALE : 152;
    const H = BASE + 28;
    const ctx = setupCanvas(el('a-canvas'), W, H);
    const fillOf = (tin) => tin ? K.tin : 'rgb(' + P.atom.join(',') + ')';

    function pile(x, rows, r, fill) {
      rows.forEach((n, j) => {
        for (let i = 0; i < n; i++) {
          disc(x + (i - (n - 1) / 2) * r * 2.06, BEAM - 3 - r - j * r * 1.78, r, fill, 1);
        }
      });
    }

    function disc(x, y, r, fill, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function sized(x, size, fill) {
      const y = BASE - size * SCALE;
      disc(x, y, (size + SIZE.error) * SCALE, fill, 0.35);
      disc(x, y, (size - SIZE.error) * SCALE, fill, 1);
      ctx.fillStyle = K.text;
      ctx.fillText(size, x, BASE + 16);
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px ' + K.sans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = K.muted;
      ctx.fillStyle = K.muted;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(MID - ARM - 54, BEAM);
      ctx.lineTo(MID + ARM + 54, BEAM);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MID, BEAM + 2);
      ctx.lineTo(MID - 12, BEAM + 24);
      ctx.lineTo(MID + 12, BEAM + 24);
      ctx.closePath();
      ctx.fill();
      pile(MID - ARM, PILE.sn, PR * SIZE.sn / SIZE.cu, fillOf(true));
      pile(MID + ARM, PILE.cu, PR, fillOf(false));
      const cx = PX + SIZE.cu * SCALE;
      const sx = PX + 2 * SIZE.cu * SCALE + GAP + SIZE.sn * SCALE;
      sized(cx, SIZE.cu, fillOf(false));
      sized(sx, SIZE.sn, fillOf(true));
      ctx.strokeStyle = K.muted;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PX - 6, BASE - 2 * SIZE.cu * SCALE);
      ctx.lineTo(PX + PAIR + 6, BASE - 2 * SIZE.cu * SCALE);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    renders.push(render);
    render();
  }

  function delta() {
    const W = NARROW ? 320 : 440;
    const H = NARROW ? 170 : 210;
    const A = NARROW ? 19 : 22;
    const R = A * 0.43;
    const SIZE = 145 / 135;
    const BAND = A * 4.2;
    const B = A * 0.9;

    function ball(ctx, x, y, tin) {
      ctx.fillStyle = tin ? K.tin : 'rgb(' + P.atom.join(',') + ')';
      ctx.beginPath();
      ctx.arc(x, y, tin ? R * SIZE : R, 0, TAU);
      ctx.fill();
    }

    function panel(id, share, split) {
      const ctx = setupCanvas(el(id), W, H);
      const rh = A * 0.866;
      const mid = W / 2;
      return () => {
        ctx.clearRect(0, 0, W, H);
        for (let r = -1; r * rh < H + A; r++) {
          for (let c = -1; c * A < W + A; c++) {
            const x = c * A + (r % 2 ? A / 2 : 0);
            if (!split || Math.abs(x - mid) > BAND / 2 + R) {
              ball(ctx, x, r * rh + 4, hash(r + 3, c + 9) < share);
            }
          }
        }
        if (!split) {
          return;
        }
        ctx.fillStyle = K.delta;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(mid - BAND / 2 - R - 4, 0, BAND + 2 * R + 8, H);
        ctx.globalAlpha = 1;
        const n = Math.floor(BAND / B);
        for (let j = -1; j * B < H + B; j++) {
          for (let i = 0; i < n; i++) {
            ball(ctx, mid - ((n - 1) * B) / 2 + i * B, j * B + 6, (i + 2 * j + 50) % 5 === 0);
          }
        }
        ctx.strokeStyle = K.well;
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        const path = () => {
          ctx.beginPath();
          for (let k = 0; k <= 8; k++) {
            ctx[k ? 'lineTo' : 'moveTo'](mid + (hash(k, 5) - 0.5) * BAND * 0.5, (H * k) / 8);
          }
          ctx.stroke();
        };
        path();
        ctx.strokeStyle = K.danger;
        ctx.lineWidth = 2;
        path();
      };
    }

    function drops(id) {
      const ctx = setupCanvas(el(id), W, H);
      const rh = A * 0.866;
      const wide = A * 1.33;
      const inside = (x, y, grow) => ((x - W / 2) / (A * 3.4 + grow)) ** 2 + ((y - H / 2) / (A * 2.3 + grow)) ** 2 < 1;
      return () => {
        ctx.clearRect(0, 0, W, H);
        for (let r = -1; r * rh < H + A; r++) {
          for (let c = -1; c * A < W + A; c++) {
            const x = c * A + (r % 2 ? A / 2 : 0);
            if (!inside(x, r * rh + 4, R)) {
              ball(ctx, x, r * rh + 4, hash(r + 3, c + 9) < 1 / 18);
            }
          }
        }
        ctx.fillStyle = K.lead;
        for (let r = -6; r <= 6; r++) {
          for (let c = -6; c <= 6; c++) {
            const x = W / 2 + c * wide + (r % 2 ? wide / 2 : 0);
            const y = H / 2 + r * wide * 0.866;
            if (inside(x, y, -R * 1.33)) {
              ctx.beginPath();
              ctx.arc(x, y, R * 1.33, 0, TAU);
              ctx.fill();
            }
          }
        }
      };
    }

    [panel('d-low', 1 / 18, false), panel('d-high', 1 / 12, true), drops('d-lead')].forEach((render) => {
      renders.push(render);
      render();
    });
  }

  function hold() {
    const g = NARROW
      ? { w: 360, h: 170, a: 20, cols: 18, rows: 9, r: 9.2, left: 10, bottom: 158, bulk: true }
      : { w: 760, h: 276, a: 26, cols: 29, rows: 11, r: 12, left: 13, bottom: 258, bulk: true };
    const PLANE = NARROW ? 4 : 5;
    const TIN = { r: PLANE, c: NARROW ? 11 : 18 };
    const SIZE = 145 / 135;
    const PUSH = 0.07;
    const EASE = 0.3;
    const STEPS = [
      { tin: false, at: null },
      { tin: true, at: null },
      { tin: false, at: 0.5 },
      { tin: true, at: 0.18 },
      { tin: true, at: 'tin' },
      { tin: true, at: 'tin', shake: true },
      { tin: true, at: 0.86 },
      { tin: false, small: true, at: 'tin' }
    ];
    const SMALL = { r: PLANE + 1, c: TIN.c - (PLANE % 2 ? 0 : 1), scale: 0.84 };
    const ctx = setupCanvas(el('h-canvas'), g.w, g.h);
    const rh = g.a * 0.866;
    const home = (r, c) => g.left + c * g.a + (r % 2 ? g.a / 2 : 0);
    const tinX = home(TIN.r, TIN.c);
    const tinY = g.bottom - TIN.r * rh;
    const place = (at) => at === 'tin' ? tinX : at * g.w;
    let step = 0;
    let x = null;
    let from = null;
    let started = 0;
    let running = false;

    function shifted(r, c) {
      const x0 = home(r, c);
      const dy = r - PLANE - 0.5;
      if (x === null || dy < 0) {
        return x0;
      }
      const hw = 2 + 0.9 * (dy - 0.5);
      const t = clamp(0.5 - (x0 - x) / g.a / (2 * hw));
      return x0 + t * t * (3 - 2 * t) * g.a;
    }

    function ease() {
      return x !== null && STEPS[step].tin ? lerp(1, EASE, clamp(1 - Math.abs(x - tinX) / (2 * g.a))) : 1;
    }

    function near(r, c) {
      const dx = (shifted(r, c) - tinX) / g.a;
      const dy = (g.bottom - r * rh - tinY) / g.a;
      return { dx, dy, k: Math.exp(-(dx * dx + dy * dy) / 1.4) };
    }

    function beside(r, c) {
      const dx = (shifted(r, c) - tinX) / g.a;
      const dy = (g.bottom - r * rh - (tinY - rh)) / g.a;
      return { dx, dy, k: Math.exp(-(dx * dx + dy * dy) / 1.4) };
    }

    function jig(r, c) {
      if (STEPS[step].small && !(r === SMALL.r && c === SMALL.c)) {
        const n = beside(r, c);
        const d = Math.hypot(n.dx, n.dy) || 1;
        return [-PUSH * 0.8 * g.a * n.k * n.dx / d, -PUSH * 0.8 * g.a * n.k * n.dy / d];
      }
      if (!STEPS[step].tin || (r === TIN.r && c === TIN.c)) {
        return [0, 0];
      }
      const n = near(r, c);
      const d = Math.hypot(n.dx, n.dy) || 1;
      const push = PUSH * g.a * n.k * ease();
      return [push * n.dx / d, push * n.dy / d];
    }

    function kind(r, c) {
      if (STEPS[step].tin && r === TIN.r && c === TIN.c) {
        return { scale: SIZE, fill: K.tin };
      }
      if (STEPS[step].small && r === SMALL.r && c === SMALL.c) {
        return { scale: SMALL.scale, fill: K['tin-rich'] };
      }
      let squeeze = STEPS[step].tin ? near(r, c).k * ease() : 0;
      let stretch = 0;
      if (x !== null) {
        const dx = (shifted(r, c) - x) / g.a;
        const dy = r - PLANE - 0.5;
        const k = Math.exp(-(dx * dx * 0.3 + dy * dy * 0.45));
        if (dy > 0) {
          squeeze = Math.max(squeeze, STEPS[step].small ? k * (1 - 0.7 * beside(r, c).k) : k);
        } else {
          stretch = k;
        }
      }
      const side = squeeze >= stretch ? 'squeeze' : 'stretch';
      return { scale: 1, fill: mix(P.atom, rgbOf(K[side]), clamp(Math.max(squeeze, stretch) * 1.15)) };
    }

    function render() {
      const held = x !== null && (STEPS[step].tin || STEPS[step].small) && Math.abs(x - tinX) < g.a;
      drawLattice(ctx, g, x === null ? [] : [{ x, p: PLANE, dir: 1, state: held ? 'stuck' : 'moving' }], null, { kind, jig });
    }

    function labels() {
      say(el('h-count'), ['stepCount', { n: step + 1, total: STEPS.length }]);
      say(el('h-caption'), 'hold.' + step);
      el('h-back').disabled = step === 0;
      el('h-next').disabled = step === STEPS.length - 1;
    }

    function frame(t) {
      const k = clamp((t - started) / 900);
      const to = place(STEPS[step].at);
      x = STEPS[step].shake ? to - Math.sin(k * 3.1416) * g.a * 0.45 : lerp(from, to, k * k * (3 - 2 * k));
      render();
      if (k < 1) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function go(to) {
      const forward = to === step + 1;
      step = Math.max(0, Math.min(STEPS.length - 1, to));
      labels();
      const s = STEPS[step];
      if (s.at === null) {
        x = null;
      } else if (forward && x !== null && STEPS[step - 1].tin === s.tin) {
        from = x;
        started = performance.now();
        if (!running) {
          running = true;
          requestAnimationFrame(frame);
        }
        return;
      } else {
        x = place(s.at);
      }
      render();
    }

    el('h-back').onclick = () => go(step - 1);
    el('h-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  function lensTin() {
    const g = { w: 920, h: 400, a: 20, cols: 46, rows: 22, r: 8.2, left: 0, bottom: 388, bulk: true };
    const SMAX = 24;
    const SPEED = 900;
    const BUDGET = 3;
    const SIZE = 145 / 135;
    const canvas = el('t-canvas');
    const ctx = setupCanvas(canvas, g.w, g.h);
    const caption = el('t-caption');
    let ds = [];
    let blows = 0;
    let left = 0;
    let busy = false;
    let last = 0;
    let seedShift = 0;

    const amount = choice('t-amount', reset);

    function isTin(r, c) {
      const n = +amount();
      return n > 0 && hash(r * 3 + 1 + seedShift, c * 7 + 2) < 1 / n;
    }

    function shiftOf(r, x0, skip) {
      let u = 0;
      for (const d of ds) {
        const dy = r - d.p - 0.5;
        if (d === skip || dy <= 0) {
          continue;
        }
        const hw = 2 + 0.9 * (dy - 0.5);
        const t = clamp(0.5 - (d.dir * (x0 - d.x) / g.a) / (2 * hw));
        u += t * t * (3 - 2 * t);
      }
      return u * g.a;
    }

    function tinAhead(d, before) {
      const extra = ds.length + 22;
      let best = null;
      for (const r of [d.p, d.p + 1]) {
        for (let c = -extra; c < g.cols + extra; c++) {
          if (!isTin(r, c)) {
            continue;
          }
          const x0 = g.left + c * g.a + (r % 2 ? g.a / 2 : 0);
          const x = x0 + shiftOf(r, x0, d);
          const was = (x - before) * d.dir;
          const now = (x - d.x) * d.dir;
          if (was > 0 && now <= 0 && (!best || was < best.was)) {
            best = { x: x, was: was };
          }
        }
      }
      return best;
    }

    function render() {
      const fill = K.tin;
      drawLattice(ctx, g, ds, null, { kind: (r, c) => (isTin(r, c) ? { scale: SIZE, fill: fill } : null) });
    }

    function meters() {
      el('t-blows').textContent = blows;
      el('t-left').textContent = left;
      el('t-inside').textContent = ds.length;
      const full = ds.length >= SMAX;
      el('t-light').disabled = full;
      el('t-hard').disabled = full;
    }

    function advance(dt) {
      for (const d of ds) {
        if (d.state !== 'move' || d.dead) {
          continue;
        }
        const before = d.x;
        d.x += d.dir * d.v * dt;
        const tin = tinAhead(d, before);
        if (tin) {
          if (d.budget > 0) {
            d.budget--;
          } else {
            d.state = 'stuck';
            d.held = true;
            d.x = tin.x - d.dir * 0.5 * g.a;
            continue;
          }
        }
        for (const e of ds) {
          if (e === d || e.dead || d.dead || d.state !== 'move') {
            continue;
          }
          const dp = Math.abs(e.p - d.p);
          const was = (e.x - before) * d.dir;
          const ahead = (e.x - d.x) * d.dir;
          if (was < 0) {
            continue;
          }
          if (dp === 0) {
            if (e.dir !== d.dir && ahead < 0.6 * g.a) {
              d.dead = true;
              e.dead = true;
              left += 2;
            } else if (e.dir === d.dir && e.state === 'stuck' && ahead < 2.2 * g.a) {
              d.state = 'stuck';
              d.held = false;
              d.x = e.x - d.dir * 2 * g.a;
            }
          } else if (dp <= 2 && ahead < 1.2 * g.a && (e.state === 'stuck' || e.dir !== d.dir)) {
            d.state = 'stuck';
            e.state = 'stuck';
            d.held = false;
            e.held = false;
            d.x = e.x - d.dir * g.a;
          }
        }
        if (!d.dead && d.state === 'move' && (d.x < -2 * g.a || d.x > g.w + 2 * g.a)) {
          d.dead = true;
          left++;
        }
      }
      ds = ds.filter((d) => !d.dead);
    }

    function finish(hard, leftBefore, freed) {
      busy = false;
      meters();
      const parts = [['tinBlow', { passed: left - leftBefore, inside: ds.length }]];
      if (ds.length >= SMAX) {
        parts.push('tinFull');
      } else if (+amount() === 0) {
        parts.push('tinPure');
      } else if (hard) {
        parts.push(freed ? 'tinHardFreed' : 'tinHard');
      } else {
        parts.push('tinLight');
      }
      say(caption, ...parts);
    }

    function hit(hard) {
      if (busy || ds.length >= SMAX) {
        return;
      }
      busy = true;
      blows++;
      jolt(el('w-tin'));
      const leftBefore = left;
      let freed = 0;
      if (hard) {
        for (const d of ds) {
          if (d.held) {
            d.held = false;
            d.state = 'move';
            d.budget = BUDGET;
            d.v = SPEED * (0.6 + 0.8 * Math.random());
            freed++;
          }
        }
      }
      for (let i = 0; i < 3; i++) {
        const p = 1 + Math.floor(Math.random() * (g.rows - 3));
        const x = g.w * (0.2 + 0.6 * Math.random());
        for (const dir of [1, -1]) {
          ds.push({
            p: p,
            x: x + dir * 1.2 * g.a,
            dir: dir,
            v: SPEED * (0.4 + 1.2 * Math.random()),
            budget: hard ? BUDGET : 0,
            state: 'move'
          });
        }
      }
      last = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.03, (now - last) / 1000);
        last = now;
        advance(dt);
        render();
        if (ds.some((d) => d.state === 'move')) {
          requestAnimationFrame(tick);
        } else {
          finish(hard, leftBefore, freed);
        }
      };
      requestAnimationFrame(tick);
    }

    function reset() {
      if (busy) {
        return;
      }
      ds = [];
      blows = 0;
      left = 0;
      seedShift = Math.floor(Math.random() * 50);
      say(caption, +amount() === 0 ? 'tinStartPure' : 'tinStart');
      meters();
      render();
    }

    el('t-light').onclick = () => hit(false);
    el('t-hard').onclick = () => hit(true);
    el('t-reset').onclick = reset;
    renders.push(render);
    reset();
  }

  function cored() {
    const W = NARROW ? 360 : 560;
    const H = 360;
    const GW = 300;
    const STEPS = [
      { grow: 0, temp: 1100, x: 0.07 },
      { grow: 0.14, temp: 1000, x: 0.2 },
      { grow: 0.6, temp: 920, x: 0.41 },
      { grow: 0.94, temp: 840, x: 0.62 },
      { grow: 1, temp: 700, x: 0.82, solid: 1 },
      { grow: 1, temp: 700, x: 0.82, solid: 1, even: 1 }
    ];
    const COPPER = [[0, 1150], [0.09, 1085], [0.42, 1085], [1, 640]];
    const BRONZE = [[0, 1150], [0.2, 1000], [0.62, 840], [0.9, 640]];
    const LAYERS = 5;
    const canvas = el('c-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const graph = el('c-graph');
    const gtx = setupCanvas(graph, GW, H);
    const seeds = [];
    for (let i = 0; i < 8; i++) {
      seeds.push({
        x: W * (0.13 + 0.25 * (i % 4) + 0.1 * (hash(i, 3) - 0.5) + (i > 3 ? -0.03 : 0.03)),
        y: H * (0.27 + 0.46 * Math.floor(i / 4) + 0.16 * (hash(i + 5, 9) - 0.5)),
        ang: hash(i, 17) * TAU,
        len: (NARROW ? 62 : 84) * (0.75 + 0.5 * hash(i + 2, 4))
      });
    }
    let step = 0;
    let now = Object.assign({ solid: 0, even: 0 }, STEPS[0]);
    let from = now;
    let started = 0;
    let running = false;

    function arms(seed, len) {
      const out = [];
      for (let k = 0; k < 4; k++) {
        const a = seed.ang + k * TAU / 4;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        out.push([seed.x, seed.y, seed.x + dx * len, seed.y + dy * len]);
        for (const pos of [0.35, 0.6, 0.82]) {
          if (len < seed.len * pos) {
            continue;
          }
          const bx = seed.x + dx * seed.len * pos;
          const by = seed.y + dy * seed.len * pos;
          const side = Math.min(seed.len * 0.42 * (1.1 - pos), len - seed.len * pos);
          out.push([bx, by, bx - dy * side, by + dx * side]);
          out.push([bx, by, bx + dy * side, by - dx * side]);
        }
      }
      return out;
    }

    function render() {
      const cu = P.atom;
      const sn = rgbOf(K['tin-rich']);
      const flat = cu.map((v, i) => Math.round(lerp(v, sn[i], 0.45)));
      const shade = (k) => {
        const rgb = cu.map((v, i) => Math.round(lerp(lerp(v, sn[i], k), flat[i], now.even)));
        return 'rgb(' + rgb.join(',') + ')';
      };
      const rest = rgbOf(K.liquid).map((v, i) => lerp(lerp(v, rgbOf(K.delta)[i], now.solid), flat[i], now.even));
      ctx.fillStyle = 'rgb(' + rest.map(Math.round).join(',') + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (let j = LAYERS - 1; j >= 0; j--) {
        const born = j / LAYERS;
        if (now.grow <= born) {
          continue;
        }
        const done = Math.min(now.grow, (j + 1) / LAYERS);
        ctx.strokeStyle = shade(j / (LAYERS - 1));
        ctx.lineWidth = 2 * (3 + 21 * done);
        for (const seed of seeds) {
          const reach = seed.len * (0.12 + 0.88 * done);
          ctx.beginPath();
          for (const s of arms(seed, reach)) {
            ctx.moveTo(s[0], s[1]);
            ctx.lineTo(s[2], s[3]);
          }
          ctx.stroke();
        }
      }
      drawGraph();
    }

    function drawGraph() {
      const M = { l: 44, r: 10, t: 14, b: 16 };
      const xOf = (v) => M.l + (GW - M.l - M.r) * v;
      const yOf = (t) => M.t + (H - M.t - M.b) * (1150 - t) / (1150 - 600);
      gtx.clearRect(0, 0, GW, H);
      gtx.font = '12px ' + K.sans;
      gtx.textAlign = 'right';
      gtx.textBaseline = 'middle';
      gtx.lineWidth = 1;
      for (const t of [1085, 1000, 840]) {
        gtx.strokeStyle = K.line;
        gtx.setLineDash([4, 4]);
        gtx.beginPath();
        gtx.moveTo(M.l, yOf(t));
        gtx.lineTo(GW - M.r, yOf(t));
        gtx.stroke();
        gtx.setLineDash([]);
        gtx.fillStyle = K.muted;
        gtx.fillText(t, M.l - 6, yOf(t));
      }
      [[COPPER, 'rgb(' + P.atom.join(',') + ')'], [BRONZE, K['tin-rich']]].forEach(([curve, colour]) => {
        gtx.strokeStyle = colour;
        gtx.lineWidth = 2.5;
        gtx.beginPath();
        curve.forEach((p, i) => {
          gtx[i ? 'lineTo' : 'moveTo'](xOf(p[0]), yOf(p[1]));
        });
        gtx.stroke();
      });
      if (!now.even) {
        gtx.fillStyle = K.text;
        gtx.beginPath();
        gtx.arc(xOf(now.x), yOf(along(BRONZE, now.x)[0]), 6, 0, TAU);
        gtx.fill();
      }
    }

    function labels() {
      say(el('c-count'), ['stepCount', { n: step + 1, total: STEPS.length }]);
      say(el('c-caption'), 'cored.' + step);
      if (STEPS[step].even) {
        say(el('c-temp'), 'coredHeat');
      } else {
        el('c-temp').textContent = STEPS[step].temp + ' °C';
      }
      el('c-back').disabled = step === 0;
      el('c-next').disabled = step === STEPS.length - 1;
    }

    function frame(t) {
      const k = clamp((t - started) / 900);
      const e = k * k * (3 - 2 * k);
      const to = Object.assign({ solid: 0, even: 0 }, STEPS[step]);
      now = {};
      for (const key of Object.keys(to)) {
        now[key] = lerp(from[key], to[key], e);
      }
      render();
      if (k < 1) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function go(to) {
      step = Math.max(0, Math.min(STEPS.length - 1, to));
      from = now;
      started = performance.now();
      labels();
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    el('c-back').onclick = () => go(step - 1);
    el('c-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  function edge() {
    const W = NARROW ? 360 : 920;
    const H = NARROW ? 250 : 260;
    const LIMIT = 3;
    const NEED = 5;
    const canvas = el('e-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const caption = el('e-caption');
    let hits = 0;
    let total = 0;
    let anneals = 0;
    let cracked = false;
    let done = false;

    function hardness(k) {
      return clamp(1 - k / 0.3) * hits / (LIMIT + 1);
    }

    function render() {
      const bronze = rgbOf(K.bronze);
      const x0 = W * 0.06;
      const x1 = W * 0.94;
      const mid = H * 0.36;
      const thin = Math.min(1, total / NEED);
      ctx.clearRect(0, 0, W, H);
      const n = 60;
      for (let i = 0; i < n; i++) {
        const k0 = i / n;
        const k1 = (i + 1) / n;
        const half = (k) => H * (0.1 + 0.2 * Math.pow(1 - k, 1.6) + 0.02 * thin * clamp(1 - k / 0.2));
        ctx.fillStyle = mix(bronze, P.hot, 0.85 * hardness(1 - k1));
        ctx.beginPath();
        ctx.moveTo(lerp(x0, x1, k0), mid - half(1 - k0));
        ctx.lineTo(lerp(x0, x1, k1) + 0.6, mid - half(1 - k1));
        ctx.lineTo(lerp(x0, x1, k1) + 0.6, mid + half(1 - k1));
        ctx.lineTo(lerp(x0, x1, k0), mid + half(1 - k0));
        ctx.fill();
      }
      const base = H * 0.86;
      for (let i = 0; i < n; i++) {
        const k0 = i / n;
        const k1 = (i + 1) / n;
        const thick = (k) => {
          const edgeward = clamp(1 - k / 0.3);
          const taper = lerp(1, lerp(0.55, 0.12, thin), edgeward * edgeward);
          return H * 0.13 * taper * (k < 0.02 ? k / 0.02 : 1);
        };
        ctx.fillStyle = mix(bronze, P.hot, 0.85 * hardness(1 - k1));
        ctx.beginPath();
        ctx.moveTo(lerp(x0, x1, k0), base - thick(1 - k0));
        ctx.lineTo(lerp(x0, x1, k1) + 0.6, base - thick(1 - k1));
        ctx.lineTo(lerp(x0, x1, k1) + 0.6, base);
        ctx.lineTo(lerp(x0, x1, k0), base);
        ctx.fill();
      }
      if (cracked) {
        ctx.strokeStyle = K.danger;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1 + 2, mid - H * 0.05);
        ctx.lineTo(x1 - W * 0.03, mid - H * 0.02);
        ctx.lineTo(x1 - W * 0.045, mid + H * 0.04);
        ctx.lineTo(x1 - W * 0.08, mid + H * 0.03);
        ctx.stroke();
      }
    }

    function meters() {
      const e = 1 + 0.25 * hits;
      el('e-edge').textContent = '×' + e.toFixed(2);
      el('e-edge-bar').style.width = (100 * e / 2) + '%';
      el('e-body').textContent = '×1.00';
      el('e-body-bar').style.width = '50%';
      say(el('e-count'), ['edgeCount', { blows: total, anneals: anneals }]);
      el('e-hit').disabled = cracked || done;
      el('e-anneal').disabled = cracked || done;
    }

    function hit() {
      hits++;
      total++;
      jolt(el('w-edge'));
      if (hits > LIMIT) {
        cracked = true;
        say(caption, 'edgeCrack');
      } else if (total >= NEED) {
        done = true;
        say(caption, ['edgeDone', { blows: total, anneals: anneals }]);
      } else if (hits === LIMIT) {
        say(caption, 'edgeLimit');
      } else {
        say(caption, 'edgeHit');
      }
      meters();
      render();
    }

    function anneal() {
      if (hits === 0) {
        say(caption, 'edgeWasted');
      } else {
        say(caption, 'edgeAnneal');
      }
      anneals++;
      hits = 0;
      meters();
      render();
    }

    el('e-hit').onclick = hit;
    el('e-anneal').onclick = anneal;
    el('e-reset').onclick = () => {
      hits = 0;
      total = 0;
      anneals = 0;
      cracked = false;
      done = false;
      say(caption, 'edgeStart');
      meters();
      render();
    };
    renders.push(render);
    say(caption, 'edgeStart');
    meters();
    render();
  }

  readColours();
  renders.unshift(readColours);
  [['w-mix', mixture], ['w-atoms', atoms], ['w-hold', hold], ['w-delta', delta],['w-tin', lensTin], ['w-cored', cored], ['w-edge', edge]].forEach(([id, start]) => {
    if (el(id)) {
      start();
    }
  });
})();
