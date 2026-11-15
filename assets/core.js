window.MB = (function () {
  const el = (id) => document.getElementById(id);
  const renders = [];
  const P = {};

  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    const rgb = (name) => {
      const v = css.getPropertyValue(name).trim();
      return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    };
    Object.assign(P, {
      atom: rgb('--atom'),
      hot: rgb('--atom-hot'),
      bond: rgb('--bond'),
      danger: rgb('--danger'),
      move: css.getPropertyValue('--fold-move').trim(),
      stuck: css.getPropertyValue('--patina').trim(),
      muted: css.getPropertyValue('--muted').trim(),
      stoneA: css.getPropertyValue('--stone-a').trim(),
      stoneB: css.getPropertyValue('--stone-b').trim()
    });
  }

  readPalette();
  window.addEventListener('themechange', () => {
    readPalette();
    renders.forEach((f) => f());
  });

  function setupCanvas(canvas, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function mix(a, b, t) {
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  }

  function jolt(node) {
    node.classList.remove('jolt');
    void node.getBoundingClientRect();
    node.classList.add('jolt');
  }

  function drawLattice(ctx, g, dislocs, crack, opts) {
    const o = opts || {};
    const base = o.base || P.atom;
    ctx.clearRect(0, 0, g.w, g.h);
    const rh = g.a * 0.866;
    const extra = g.bulk ? dislocs.length + 22 : 0;
    for (let r = 0; r < g.rows; r++) {
      for (let c = -extra; c < g.cols + extra; c++) {
        const x0 = g.left + c * g.a + (r % 2 ? g.a / 2 : 0);
        let u = 0;
        let heat = 0;
        for (const d of dislocs) {
          const dy = r - d.p - 0.5;
          const dx = (x0 - d.x) / g.a;
          heat += 1 / (1 + 0.9 * (dx * dx + dy * dy));
          if (dy > 0) {
            const hw = 2 + 0.9 * (dy - 0.5);
            const t = Math.max(0, Math.min(1, 0.5 - (d.dir * dx) / (2 * hw)));
            u += t * t * (3 - 2 * t);
          }
        }
        let x = x0 + u * g.a;
        if (x < -g.r || x > g.w + g.r) {
          continue;
        }
        let y = g.bottom - r * rh;
        if (crack && x < g.left + crack.len) {
          const k = crack.gap * (1 - (x - g.left) / crack.len);
          y += r > crack.p ? -k : k;
        }
        if (o.skip && o.skip(x, y)) {
          continue;
        }
        if (o.jig) {
          const j = o.jig(r, c);
          x += j[0];
          y += j[1];
        }
        ctx.beginPath();
        ctx.arc(x, y, g.r, 0, Math.PI * 2);
        ctx.fillStyle = mix(base, P.hot, Math.min(1, heat * 0.9));
        ctx.fill();
      }
    }
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const d of dislocs) {
      const y = g.bottom - (d.p + 0.5) * rh;
      const arm = g.a * 0.55;
      ctx.strokeStyle = d.state === 'stuck' ? P.stuck : P.move;
      ctx.beginPath();
      ctx.moveTo(d.x - arm, y);
      ctx.lineTo(d.x + arm, y);
      ctx.moveTo(d.x, y);
      ctx.lineTo(d.x, y - d.dir * arm * 1.3);
      ctx.stroke();
    }
  }

  return { el, renders, P, setupCanvas, mix, jolt, drawLattice };
})();

(function () {
  const items = Array.from(document.querySelectorAll('ol.sources > li'));
  document.querySelectorAll('ol.sources a').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
  document.querySelectorAll('a.fn').forEach((a) => {
    const n = items.findIndex((li) => '#' + li.id === a.getAttribute('href')) + 1;
    a.textContent = n ? '[' + n + ']' : '[?]';
    a.title = 'Источник ' + n + ' в списке в конце главы';
  });
})();
