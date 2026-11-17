(function () {
  const { el, renders, P, setupCanvas, mix, jolt, drawLattice, tr, say } = window.MB;

  function experimentHit() {
    const pieces = Array.from(document.querySelectorAll('#flint .piece'));
    const stages = [
      ['', '', '', '', ''],
      ['', 'translate(-10px,-26px) rotate(-14deg)', '', '', ''],
      ['', 'translate(-10px,-26px) rotate(-14deg)', '', '', 'translate(-20px,10px) rotate(10deg)'],
      [
        'translate(-22px,14px) rotate(-18deg)',
        'translate(-14px,-30px) rotate(-24deg)',
        'translate(24px,-10px) rotate(16deg)',
        'translate(22px,12px) rotate(-10deg)',
        'translate(-12px,8px) rotate(22deg)'
      ]
    ];
    const blob = el('copper-blob');
    const caption = el('w1-caption');
    let f = 0;
    let c = 0;

    function render() {
      pieces.forEach((p, i) => { p.style.transform = stages[f][i]; });
      const k = 1 + 0.16 * c;
      blob.style.transform = 'scale(' + k + ',' + 1 / k + ')';
    }

    el('hit-flint').onclick = () => {
      f = Math.min(3, f + 1);
      render();
      jolt(el('flint-svg'));
      say(caption, 'flint.' + (f - 1));
    };
    el('hit-copper').onclick = () => {
      c = Math.min(5, c + 1);
      render();
      jolt(el('copper-svg'));
      say(caption, 'copper.' + (c - 1));
    };
    el('reset-w1').onclick = () => {
      f = 0;
      c = 0;
      render();
      say(caption, 'hitStart');
    };
  }

  function experimentShift() {
    const W = 780;
    const H = 250;
    const ctx = setupCanvas(el('w2-canvas'), W, H);
    const slider = el('w2-slider');
    const a = 40;
    const cols = 7;
    const R = 15;
    let s = 0;
    let broken = false;
    let raf = 0;

    function atomPos(panelX, row, col, shift, lift) {
      const top = row >= 2;
      return {
        x: panelX + 48 + col * a + (top ? shift * a : 0),
        y: 205 - row * a - (top ? lift : 0)
      };
    }

    function drawMetal() {
      const px = 0;
      for (const top of [false, true]) {
        const p0 = atomPos(px, top ? 3 : 1, 0, s, 0);
        ctx.fillStyle = 'rgba(217,138,78,0.2)';
        ctx.beginPath();
        ctx.roundRect(p0.x - R - 6, p0.y - R - 6, (cols - 1) * a + 2 * R + 12, a + 2 * R + 12, 18);
        ctx.fill();
      }
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < cols; c++) {
          const p = atomPos(px, r, c, s, 0);
          ctx.beginPath();
          ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
          ctx.fillStyle = mix(P.atom, P.hot, 0);
          ctx.fill();
        }
      }
    }

    function drawStone() {
      const px = W / 2;
      const lift = broken ? 14 : 0;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < cols; c++) {
          const p = atomPos(px, r, c, s, lift);
          ctx.strokeStyle = mix(P.bond, P.bond, 0);
          if (c < cols - 1) {
            const q = atomPos(px, r, c + 1, s, lift);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
          if (r === 0 || r === 2) {
            const q = atomPos(px, r + 1, c, s, lift);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
          if (r === 1) {
            const q = atomPos(px, 2, c, s, lift);
            if (broken) {
              ctx.strokeStyle = mix(P.danger, P.danger, 0);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + 5, p.y - R - 7);
              ctx.moveTo(q.x, q.y);
              ctx.lineTo(q.x - 5, q.y + R + 7);
              ctx.stroke();
            } else {
              ctx.strokeStyle = mix(P.bond, P.danger, Math.min(1, s / 0.3));
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }
        }
      }
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < cols; c++) {
          const p = atomPos(px, r, c, s, lift);
          ctx.beginPath();
          ctx.arc(p.x, p.y, R - 2, 0, Math.PI * 2);
          ctx.fillStyle = (r + c) % 2 ? P.stoneA : P.stoneB;
          ctx.fill();
        }
      }
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = P.muted;
      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.fillText(tr(ctx.canvas, 'labelMetal'), 20, 26);
      ctx.fillText(tr(ctx.canvas, 'labelStone'), W / 2 + 20, 26);
      drawMetal();
      drawStone();
      say(el('w2-metal'), s === 0 ? 'metalStill' : s >= 1 ? 'metalDone' : 'metalMoving');
      say(el('w2-stone'), broken ? 'stoneBroken' : s === 0 ? 'stoneStill' : 'stoneStretch');
    }

    function settle() {
      const target = Math.round(s);
      cancelAnimationFrame(raf);
      const tick = () => {
        s += (target - s) * 0.25;
        if (Math.abs(target - s) < 0.01) {
          s = target;
        } else {
          raf = requestAnimationFrame(tick);
        }
        slider.value = s * 100;
        render();
      };
      tick();
    }

    slider.oninput = () => {
      cancelAnimationFrame(raf);
      s = slider.value / 100;
      if (s > 0.3) {
        broken = true;
      }
      render();
    };
    slider.onchange = settle;
    el('w2-reset').onclick = () => {
      cancelAnimationFrame(raf);
      s = 0;
      broken = false;
      slider.value = 0;
      render();
    };
    renders.push(render);
    render();
  }

  function experimentFold() {
    const g = { w: 780, h: 240, a: 28, cols: 25, rows: 8, r: 11.5, left: 32, bottom: 212, bulk: false };
    const ctx = setupCanvas(el('w3-canvas'), g.w, g.h);
    const stops = [-14, 5, 10, 15, 20, 40].map((k) => g.left + k * g.a);
    const d = { p: 3, x: stops[0], dir: 1, state: 'move' };
    let step = 0;
    let raf = 0;

    function render() {
      drawLattice(ctx, g, [d], null);
      say(el('w3-caption'), 'fold.' + step);
    }

    function animateTo(target) {
      cancelAnimationFrame(raf);
      const tick = () => {
        d.x += (target - d.x) * 0.16;
        if (Math.abs(target - d.x) < 0.5) {
          d.x = target;
        } else {
          raf = requestAnimationFrame(tick);
        }
        render();
      };
      tick();
    }

    el('w3-hit').onclick = () => {
      if (step >= stops.length - 1) {
        return;
      }
      step++;
      jolt(el('w3'));
      animateTo(stops[step]);
    };
    el('w3-reset').onclick = () => {
      cancelAnimationFrame(raf);
      step = 0;
      d.x = stops[0];
      render();
    };
    renders.push(render);
    render();
  }

  function lens() {
    const g = { w: 920, h: 400, a: 20, cols: 46, rows: 22, r: 8.2, left: 0, bottom: 388, bulk: true };
    const ctx = setupCanvas(el('lens-canvas'), g.w, g.h);
    const SMAX = 24;
    const SPEED = 1000;
    const caption = el('lens-caption');
    let ds = [];
    let blows = 0;
    let done = 0;
    let crack = null;
    let busy = false;
    let last = 0;

    function meters() {
      const k = Math.min(1, ds.length / SMAX);
      const root = Math.sqrt(k);
      el('m-hard').textContent = '×' + (1 + root).toFixed(1);
      el('b-hard').style.width = (10 + 90 * root) + '%';
      el('m-duct').textContent = Math.round(100 * (1 - k)) + '%';
      el('b-duct').style.width = 100 * (1 - k) + '%';
      el('m-blows').textContent = blows;
      el('m-stuck').textContent = ds.length;
      const f = 1 + 0.9 * (1 - Math.exp(-done / 50));
      const w = 80 * f;
      const h = 46 / f;
      const nugget = el('nugget');
      nugget.setAttribute('x', 110 - w / 2);
      nugget.setAttribute('width', w);
      nugget.setAttribute('y', 92 - h);
      nugget.setAttribute('height', h);
      nugget.setAttribute('rx', Math.min(14, h / 2.4));
      const cracks = el('nugget-cracks');
      cracks.setAttribute('visibility', crack ? 'visible' : 'hidden');
      if (crack) {
        const xl = 110 - w / 2;
        const xr = 110 + w / 2;
        const ym = 92 - h / 2;
        el('crack-l').setAttribute('d', 'M' + (xl - 1) + ' ' + ym + ' l9 -3 l6 4 l8 -2');
        el('crack-r').setAttribute('d', 'M' + (xr + 1) + ' ' + (ym + 2) + ' l-8 2 l-7 -5 l-6 2');
      }
    }

    function render() {
      drawLattice(ctx, g, ds, crack);
    }

    function advance(dt) {
      for (const d of ds) {
        if (d.state !== 'move') {
          continue;
        }
        const before = d.x;
        d.x += d.dir * d.v * dt;
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
              done += 2;
            } else if (e.dir === d.dir && e.state === 'stuck' && ahead < 2.2 * g.a) {
              d.state = 'stuck';
              d.x = e.x - d.dir * 2 * g.a;
            }
          } else if (dp <= 2 && ahead < 1.2 * g.a && (e.state === 'stuck' || e.dir !== d.dir)) {
            d.state = 'stuck';
            e.state = 'stuck';
            d.x = e.x - d.dir * g.a;
          }
        }
        if (!d.dead && d.state === 'move' && (d.x < -2 * g.a || d.x > g.w + 2 * g.a)) {
          d.dead = true;
          done++;
        }
      }
      ds = ds.filter((d) => !d.dead);
    }

    function startCrack() {
      const counts = {};
      let best = ds[0].p;
      for (const d of ds) {
        counts[d.p] = (counts[d.p] || 0) + 1;
        if (counts[d.p] > counts[best]) {
          best = d.p;
        }
      }
      crack = { p: best, len: 1, gap: 0 };
      const target = g.w * 0.55;
      const tick = () => {
        crack.len += (target - crack.len) * 0.12;
        crack.gap = 16 * (crack.len / target);
        render();
        if (target - crack.len > 1) {
          requestAnimationFrame(tick);
        }
      };
      tick();
      say(caption, 'lensCrack');
      el('lens-hit').disabled = true;
      meters();
    }

    function finish(doneBefore, stuckBefore) {
      busy = false;
      const passed = done - doneBefore;
      const stuckNew = ds.length - stuckBefore;
      meters();
      if (ds.length >= SMAX) {
        startCrack();
        return;
      }
      const parts = [['lensBlow', { n: blows, passed, stuck: Math.max(0, stuckNew) }]];
      if (ds.length === 0) {
        parts.push('lensClean');
      } else if (ds.length > SMAX * 0.6) {
        parts.push('lensFull');
      } else if (stuckNew > 0) {
        parts.push('lensBlocked');
      }
      say(caption, ...parts);
    }

    function hit() {
      if (busy || crack) {
        return;
      }
      busy = true;
      blows++;
      jolt(el('w4'));
      const doneBefore = done;
      const stuckBefore = ds.length;
      for (let i = 0; i < 3; i++) {
        const p = 1 + Math.floor(Math.random() * (g.rows - 3));
        const x = g.w * (0.2 + 0.6 * Math.random());
        for (const dir of [1, -1]) {
          ds.push({
            p: p,
            x: x + dir * 1.2 * g.a,
            dir: dir,
            v: SPEED * (0.4 + 1.2 * Math.random()),
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
          finish(doneBefore, stuckBefore);
        }
      };
      requestAnimationFrame(tick);
    }

    el('lens-hit').onclick = hit;
    el('lens-reset').onclick = () => {
      if (busy) {
        return;
      }
      ds = [];
      blows = 0;
      done = 0;
      crack = null;
      el('lens-hit').disabled = false;
      say(caption, 'lensStart');
      meters();
      render();
    };
    renders.push(render);
    meters();
    render();
  }

  function experimentSteps() {
    const N = 7;
    const A = 38;
    const R = 10;
    const UP = 3;
    const DOWN = 2;
    const PAD = 22;
    const TOP = 42;
    const W = PAD * 2 + (N + 1) * A;
    const H = TOP + (UP + DOWN - 1) * A + 28;
    const smooth = (t) => {
      const k = Math.max(0, Math.min(1, t));
      return k * k * (3 - 2 * k);
    };

    function panel(key, last, shift, core, captions) {
      const ctx = setupCanvas(el(key + '-canvas'), W, H);
      let pos = 0;
      let target = 0;
      let speed = 2;
      let worst = 0;
      let raf = 0;
      let prev = 0;

      const upX = (r, c) => PAD + A / 2 + (c + shift(pos, r, c)) * A;
      const upY = (r) => TOP + (UP - r) * A;
      const lowX = (c) => PAD + A / 2 + c * A;
      const lowY = (q) => TOP + (UP + q - 1) * A;

      function line(x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      function render() {
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.5;
        const calm = mix(P.bond, P.bond, 0);
        for (let q = 1; q <= DOWN; q++) {
          for (let c = 0; c < N; c++) {
            if (c < N - 1) {
              line(lowX(c), lowY(q), lowX(c + 1), lowY(q), calm);
            }
            if (q < DOWN) {
              line(lowX(c), lowY(q), lowX(c), lowY(q + 1), calm);
            }
          }
        }
        for (let r = 1; r <= UP; r++) {
          for (let c = 0; c < N; c++) {
            if (c < N - 1) {
              line(upX(r, c), upY(r), upX(r, c + 1), upY(r), calm);
            }
            if (r < UP) {
              line(upX(r, c), upY(r), upX(r + 1, c), upY(r + 1), calm);
            }
          }
        }
        let tense = 0;
        for (let c = 0; c < N; c++) {
          const near = [];
          for (let i = 0; i < N; i++) {
            near.push([Math.abs(upX(1, i) - lowX(c)), i]);
          }
          near.sort((p, q) => p[0] - q[0]);
          const best = near[0];
          if (best[0] > 0.51 * A) {
            continue;
          }
          const color = mix(P.bond, P.danger, Math.min(1, best[0] / (0.4 * A)));
          line(lowX(c), lowY(1), upX(1, best[1]), upY(1), color);
          if (near[1][0] - best[0] < 0.04 * A) {
            line(lowX(c), lowY(1), upX(1, near[1][1]), upY(1), color);
          }
          if (best[0] > 0.15 * A) {
            tense++;
          }
        }
        if (pos === 0) {
          worst = 0;
        }
        worst = Math.max(worst, tense);
        const xd = core ? core(pos) : null;
        for (let q = 1; q <= DOWN; q++) {
          for (let c = 0; c < N; c++) {
            ctx.beginPath();
            ctx.arc(lowX(c), lowY(q), R, 0, Math.PI * 2);
            ctx.fillStyle = mix(P.atom, P.hot, 0);
            ctx.fill();
          }
        }
        for (let r = 1; r <= UP; r++) {
          for (let c = 0; c < N; c++) {
            const k = xd === null ? 0 : Math.max(0, 1 - Math.abs(c - xd));
            ctx.beginPath();
            ctx.arc(upX(r, c), upY(r), R, 0, Math.PI * 2);
            ctx.fillStyle = mix(P.atom, P.hot, k);
            ctx.fill();
          }
        }
        if (xd !== null && xd > -0.5 && xd < N - 0.5) {
          const x = PAD + A / 2 + (xd + 0.5) * A;
          const y = (upY(1) + lowY(1)) / 2 + 4;
          ctx.lineWidth = 3;
          line(x - 9, y, x + 9, y, P.move);
          line(x, y, x, y - 11, P.move);
        }
        ctx.fillStyle = P.muted;
        ctx.font = '600 13px -apple-system, sans-serif';
        ctx.fillText(tr(ctx.canvas, 'pushLabel'), PAD, 22);
        el(key + '-now').textContent = tense;
        el(key + '-max').textContent = worst;
        say(el(key + '-cap'), captions(Math.round(pos)));
        el(key + '-back').disabled = target === 0 && pos === 0;
        el(key + '-step').disabled = target === last;
      }

      function tick(now) {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        const dir = Math.sign(target - pos);
        pos += dir * speed * dt;
        if ((target - pos) * dir <= 0) {
          pos = target;
        }
        raf = pos === target ? 0 : requestAnimationFrame(tick);
        render();
      }

      function go(to, v) {
        target = Math.max(0, Math.min(last, to));
        speed = v;
        if (!raf && target !== pos) {
          prev = performance.now();
          raf = requestAnimationFrame(tick);
        }
        render();
      }

      el(key + '-step').onclick = () => go(Math.floor(pos + 1e-6) + 1, 2);
      el(key + '-back').onclick = () => go(Math.ceil(pos - 1e-6) - 1, 2);
      el(key + '-play').onclick = () => {
        if (pos >= last) {
          pos = 0;
        }
        go(last, 0.8);
      };
      renders.push(render);
      render();
    }

    panel('w5a', 4, (p) => p / 4, null, (i) => 'whole.' + i);

    const core = (p) => (p <= 1 ? -2.5 + 2.5 * p : p <= N ? p - 1 : N - 1 + 2.5 * (p - N));
    panel('w5b', N + 1, (p, r, c) => smooth(0.5 - (c - core(p)) / (2 * (1.5 + 0.5 * (r - 1)))), core, (i) => (
      i === 0 ? 'whole.0' : i === 1 ? 'stepIn' : i <= N ? 'stepMove' : 'stepOut'
    ));
  }

  function source() {
    const NARROW = window.matchMedia('(max-width: 700px)').matches;
    const g = NARROW
      ? { w: 360, h: 170, a: 20, cols: 18, rows: 8, r: 9.2, left: 10, bottom: 154, bulk: true }
      : { w: 760, h: 260, a: 26, cols: 29, rows: 10, r: 12, left: 13, bottom: 240, bulk: true };
    const PLANE = g.rows / 2 - 1;
    const MARK = Math.floor(g.cols / 2);
    const STEPS = [
      { view: 'block' },
      { view: 'rows', gap: null },
      { view: 'loop' },
      { view: 'rows', gap: 1.3 },
      { view: 'rows', gap: NARROW ? 5.5 : 9 }
    ];
    const ctx = setupCanvas(el('p-canvas'), g.w, g.h);
    const rh = g.a * 0.866;
    const cx = g.left + MARK * g.a;
    const cy = g.bottom - (PLANE + 0.5) * rh;
    let step = 0;
    let gap = null;
    let from = 0;
    let started = 0;
    let running = false;
    let text = '';

    function arrow(x1, y1, x2, y2, width) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = width * 3.2;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.moveTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
      ctx.stroke();
    }

    function block() {
      const s = NARROW ? 42 : 84;
      const d = NARROW ? 5 : 8;
      const mx = g.w / 2;
      const my = g.h / 2 + 6;
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.fillStyle = mix(P.atom, P.atom, 0);
      [[-1, 1, [[-s, -s], [s, -s], [-s, s]]], [1, -1, [[s, -s], [s, s], [-s, s]]]].forEach(([dx, dy, shape]) => {
        ctx.beginPath();
        shape.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](mx + x + dx * d, my + y + dy * d));
        ctx.closePath();
        ctx.fill();
      });
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(mx + s + d, my - s - d);
      ctx.lineTo(mx - s - d, my + s + d);
      ctx.stroke();
      ctx.setLineDash([]);
      arrow(mx, my - s - d - 28, mx, my - s - d - 6, 4);
      arrow(mx, my + s + d + 28, mx, my + s + d + 6, 4);
      ctx.strokeStyle = P.move;
      arrow(mx - s * 0.1, my - s * 0.55, mx - s * 0.55, my - s * 0.1, 3);
      arrow(mx + s * 0.1, my + s * 0.55, mx + s * 0.55, my + s * 0.1, 3);
    }

    function loop() {
      const w = NARROW ? 300 : 440;
      const h = NARROW ? 130 : 200;
      const r = h * 0.3;
      const mx = g.w / 2;
      const my = g.h / 2;
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.fillStyle = mix(P.atom, P.atom, 0);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(mx - w / 2, my - h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = mix(P.hot, P.hot, 0);
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = P.move;
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = i * 0.7854 + 0.3927;
        arrow(mx + Math.cos(angle) * (r + 8), my + Math.sin(angle) * (r + 8), mx + Math.cos(angle) * (r + 24), my + Math.sin(angle) * (r + 24), 2);
      }
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(mx - w / 2, my);
      ctx.lineTo(mx + w / 2, my);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = P.move;
      [-r, r].forEach((dx) => {
        ctx.beginPath();
        ctx.arc(mx + dx, my, 7, 0, 6.2832);
        ctx.fill();
      });
    }

    function rows() {
      const folds = gap === null ? [] : [
        { x: cx - gap * g.a, p: PLANE, dir: -1, state: 'moving' },
        { x: cx + gap * g.a, p: PLANE, dir: 1, state: 'moving' }
      ];
      const kind = (r, c) => c === (r > PLANE && folds.length ? MARK - 1 : MARK) ? { scale: 1, fill: P.stuck } : null;
      drawLattice(ctx, g, folds, null, { kind });
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(g.w, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      if (gap === null) {
        ctx.strokeStyle = P.move;
        arrow(g.w * 0.12, cy - rh * 1.5, g.w * 0.26, cy - rh * 1.5, 3);
        arrow(g.w * 0.88, cy + rh * 1.5, g.w * 0.74, cy + rh * 1.5, 3);
      }
    }

    function render() {
      text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
      ({ block, loop, rows })[STEPS[step].view]();
    }

    function labels() {
      say(el('p-count'), ['stepCount', { n: step + 1, total: STEPS.length }]);
      say(el('p-caption'), 'source.' + step);
      el('p-back').disabled = step === 0;
      el('p-next').disabled = step === STEPS.length - 1;
    }

    function frame(t) {
      const k = Math.max(0, Math.min(1, (t - started) / 1000));
      gap = from + (STEPS[step].gap - from) * k * k * (3 - 2 * k);
      render();
      if (k < 1 && STEPS[step].gap) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function go(to) {
      const before = STEPS[step];
      step = Math.max(0, Math.min(STEPS.length - 1, to));
      labels();
      const now = STEPS[step];
      if (now.gap && before.gap && now.gap > before.gap) {
        from = gap;
        started = performance.now();
        if (!running) {
          running = true;
          requestAnimationFrame(frame);
        }
        return;
      }
      gap = now.gap || null;
      render();
    }

    el('p-back').onclick = () => go(step - 1);
    el('p-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  function wall() {
    const NARROW = window.matchMedia('(max-width: 700px)').matches;
    const g = NARROW
      ? { w: 360, h: 170, a: 20, cols: 18, rows: 8, r: 9.2, left: 10, bottom: 154, bulk: true }
      : { w: 760, h: 260, a: 26, cols: 29, rows: 10, r: 12, left: 13, bottom: 240, bulk: true };
    const PLANE = g.rows / 2 - 1;
    const EDGE = g.w * 0.66;
    const TILT = 0.42;
    const FAR = -(EDGE / g.a) - 3;
    const STEPS = NARROW
      ? [[], [-8], [-1.6], [-1.6, -4.4, -7.4]]
      : [[], [-15], [-1.6], [-1.6, -4.6, -8]];
    const ctx = setupCanvas(el('b-canvas'), g.w, g.h);
    let step = 0;
    let at = [];
    let from = [];
    let started = 0;
    let running = false;

    function render() {
      const folds = at.map((x) => ({ x: EDGE + x * g.a, p: PLANE, dir: 1, state: step >= 2 ? 'stuck' : 'moving' }));
      drawLattice(ctx, g, folds, null, { skip: (x) => x > EDGE - g.r * 0.7 });
      ctx.fillStyle = mix(P.atom, P.atom, 0);
      const rh = g.a * 0.866;
      const cos = Math.cos(TILT);
      const sin = Math.sin(TILT);
      for (let r = -22; r < 22; r++) {
        for (let c = -22; c < 22; c++) {
          const u = c * g.a + (r % 2 ? g.a / 2 : 0);
          const v = r * rh;
          const x = EDGE + g.a * 0.8 + u * cos - v * sin;
          const y = g.h / 2 + u * sin + v * cos;
          if (x > EDGE + g.r * 0.7 && x < g.w + g.r && y > g.bottom - (g.rows - 1) * rh - 2 && y < g.bottom + 2) {
            ctx.beginPath();
            ctx.arc(x, y, g.r, 0, 6.2832);
            ctx.fill();
          }
        }
      }
    }

    function labels() {
      say(el('b-count'), ['stepCount', { n: step + 1, total: STEPS.length }]);
      say(el('b-caption'), 'wall.' + step);
      el('b-back').disabled = step === 0;
      el('b-next').disabled = step === STEPS.length - 1;
    }

    function frame(t) {
      const k = Math.max(0, Math.min(1, (t - started) / 1100));
      const e = k * k * (3 - 2 * k);
      at = STEPS[step].map((to, i) => from[i] + (to - from[i]) * e);
      render();
      if (k < 1) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function go(to) {
      const forward = to > step;
      step = Math.max(0, Math.min(STEPS.length - 1, to));
      labels();
      if (!forward) {
        at = STEPS[step].slice();
        render();
        return;
      }
      from = STEPS[step].map((_, i) => (i < at.length ? at[i] : FAR - i * 3));
      started = performance.now();
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    el('b-back').onclick = () => go(step - 1);
    el('b-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  function notch() {
    const NARROW = window.matchMedia('(max-width: 700px)').matches;
    const W = NARROW ? 320 : 440;
    const H = NARROW ? 130 : 150;
    const SIDE = 44;
    const TOP = 26;
    const THICK = H - 2 * TOP;
    const DEEP = THICK * 0.26;
    const LINES = 8;

    function panel(id, cut) {
      const ctx = setupCanvas(el(id), W, H);
      return () => {
        const css = getComputedStyle(document.documentElement);
        const text = css.getPropertyValue('--text').trim();
        const mid = W / 2;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = mix(P.atom, P.atom, 0);
        ctx.fillRect(SIDE, TOP, W - 2 * SIDE, THICK);
        if (cut) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.moveTo(mid - DEEP * 0.4, TOP - 1);
          ctx.lineTo(mid, TOP + DEEP);
          ctx.lineTo(mid + DEEP * 0.4, TOP - 1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = text;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < LINES; i++) {
          const depth = (THICK * (i + 0.5)) / LINES;
          const push = cut ? (DEEP + 5 - Math.min(depth, 5)) * Math.exp(-depth / (DEEP * 1.6)) : 0;
          ctx.beginPath();
          for (let x = SIDE; x <= W - SIDE; x += 2) {
            const bump = Math.exp(-(((x - mid) / (DEEP * 0.9)) ** 2));
            ctx[x === SIDE ? 'moveTo' : 'lineTo'](x, TOP + depth + push * bump);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        [[SIDE - 8, SIDE - 34], [W - SIDE + 8, W - SIDE + 34]].forEach(([x1, x2]) => {
          const way = x2 > x1 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(x1, H / 2);
          ctx.lineTo(x2, H / 2);
          ctx.moveTo(x2 - way * 9, H / 2 - 7);
          ctx.lineTo(x2, H / 2);
          ctx.lineTo(x2 - way * 9, H / 2 + 7);
          ctx.stroke();
        });
        if (cut) {
          ctx.fillStyle = 'rgb(' + P.danger.join(',') + ')';
          ctx.beginPath();
          ctx.arc(mid, TOP + DEEP + 1, 4, 0, 6.2832);
          ctx.fill();
        }
      };
    }

    [panel('x-smooth', false), panel('x-cut', true)].forEach((render) => {
      renders.push(render);
      render();
    });
  }

  if (el('w-notch')) {
    notch();
  }
  if (el('w-pair')) {
    source();
  }
  if (el('w-wall')) {
    wall();
  }
  experimentHit();
  experimentShift();
  experimentFold();
  experimentSteps();
  lens();
})();
