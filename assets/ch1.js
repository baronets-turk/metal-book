(function () {
  const { el, renders, P, setupCanvas, mix, jolt, drawLattice } = window.MB;

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
    const flintText = [
      '',
      'Кремень: откололась острая пластина. Именно это и нужно: так делают ножи и скребки.',
      'Кремень: ещё один скол. Каждый удар что-то отнимает.',
      'Кремень раскололся. Камень не умеет менять форму: он либо цел, либо разбит.'
    ];
    const copperText = [
      '',
      'Медь: вмятина. Ничего не откололось.',
      'Медь: кусок стал ниже и шире.',
      'Медь: ещё шире. Меди столько же, сколько было.',
      'Медь: уже похоже на лепёшку.',
      'Медь: лепёшка. Тот же кусок, другая форма, ни одного осколка.'
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
      caption.textContent = flintText[f];
    };
    el('hit-copper').onclick = () => {
      c = Math.min(5, c + 1);
      render();
      jolt(el('copper-svg'));
      caption.textContent = copperText[c];
    };
    el('reset-w1').onclick = () => {
      f = 0;
      c = 0;
      render();
      caption.textContent = 'Два куска на вид похожи: оба твёрдые, оба тяжёлые.';
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
      ctx.fillText('МЕДЬ', 20, 26);
      ctx.fillText('КАМЕНЬ', W / 2 + 20, 26);
      drawMetal();
      drawStone();
      el('w2-metal').textContent = s === 0
        ? 'Медь: ряды на месте.'
        : s >= 1
          ? 'Медь: слой встал на шаг дальше. Все связи целы, форма изменилась.'
          : 'Медь: слой съезжает. Общий «клей» держит атомы в любом положении.';
      el('w2-stone').textContent = broken
        ? 'Камень: связи порвались и обратно не срастаются. Это трещина.'
        : s === 0
          ? 'Камень: каждый атом держится за своих соседей жёсткими связями.'
          : 'Камень: связи между слоями растягиваются…';
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
    const texts = [
      'Кристалл целый. Складки ещё нет.',
      'Складка вошла слева. Над выделенным цветом местом в верхней половине на один ряд атомов больше, чем в нижней.',
      'Складка сдвинулась. Слева от неё верх уже переехал на один атом, справа ещё нет.',
      'Ещё шаг. Рвётся и заново смыкается только одна линия связей, поэтому усилие маленькое.',
      'Почти у края.',
      'Складка вышла наружу. Решётка снова идеальная, но верх сдвинут на один атом: на краях ступеньки.'
    ];
    const d = { p: 3, x: stops[0], dir: 1, state: 'move' };
    let step = 0;
    let raf = 0;

    function render() {
      drawLattice(ctx, g, [d], null);
      el('w3-caption').textContent = texts[step];
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
      caption.textContent = 'Трещина. Складкам почти некуда двигаться, металл не смог уступить удару, сминаясь, и разошёлся в самом забитом месте.';
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
      let tail = '';
      if (ds.length === 0) {
        tail = ' Решётка снова ровная, а кусок снаружи стал площе.';
      } else if (ds.length > SMAX * 0.6) {
        tail = ' Почти всё забито: металл твёрдый и вот-вот треснет.';
      } else if (stuckNew > 0) {
        tail = ' Застрявшие складки загораживают дорогу следующим.';
      }
      caption.textContent = 'Удар ' + blows + ': родилось три пары складок, ушло из окна ' + passed + ', застряло ' + Math.max(0, stuckNew) + '.' + tail;
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
      caption.textContent = 'Свежий самородок: ряды ровные, складок нет. Бей и следи, сколько складок проходит насквозь, а сколько застревает.';
      meters();
      render();
    };
    renders.push(render);
    meters();
    render();
  }

  experimentHit();
  experimentShift();
  experimentFold();
  lens();
})();
