(function () {
  const { el, renders, P, setupCanvas, mix, jolt, say, tr } = window.MB;
  const MELT = 1085;
  const TAU = 6.2832;
  const GLOW = [
    [525, [70, 8, 4]],
    [700, [140, 24, 12]],
    [800, [190, 44, 22]],
    [900, [228, 72, 30]],
    [1000, [248, 112, 44]],
    [1100, [255, 150, 56]],
    [1200, [255, 188, 96]]
  ];
  const K = {};
  const NARROW = window.matchMedia('(max-width: 700px)').matches;

  function readColours() {
    const css = getComputedStyle(document.documentElement);
    ['oxygen', 'carbon', 'hydrogen', 'ore', 'oxide', 'clay', 'wood', 'liquid', 'air', 'well', 'on-accent', 'text', 'line', 'sans'].forEach((name) => {
      K[name] = css.getPropertyValue('--' + name).trim();
    });
  }

  function rgbOf(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  function glow(t) {
    if (t < GLOW[0][0]) {
      return null;
    }
    for (let i = GLOW.length - 1; i >= 0; i--) {
      if (t >= GLOW[i][0]) {
        const a = GLOW[i];
        const b = GLOW[Math.min(i + 1, GLOW.length - 1)];
        const k = b === a ? 0 : (t - a[0]) / (b[0] - a[0]);
        return a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k));
      }
    }
    return null;
  }

  function hotRgb(base, t) {
    const g = glow(t);
    if (!g) {
      return base;
    }
    const k = Math.min(1, 0.25 + (t - 525) / 300);
    return base.map((v, i) => Math.round(v + (g[i] - v) * k));
  }

  function css(rgb) {
    return 'rgb(' + rgb.join(',') + ')';
  }

  function hash(a, b) {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  function onScreen(node) {
    const r = node.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function clamp(v) {
    return Math.max(0, Math.min(1, v));
  }

  function part(t, a, b) {
    const k = clamp((t - a) / (b - a));
    return k * k * (3 - 2 * k);
  }

  function lerp(a, b, k) {
    return a + (b - a) * k;
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

  function fire() {
    const W = 920;
    const H = 360;
    const TEMP = {
      wood: { open: [600, 680, 760], pit: [660, 760, 880] },
      charcoal: { open: [750, 860, 980], pit: [820, 1000, 1250] }
    };
    const MARKS = [525, 600, 1085, 1200];
    const canvas = el('f-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const cx = 340;
    const ground = 286;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = 600;
    let last = 0;
    let time = 0;
    const fuel = choice('f-fuel', change);
    const walls = choice('f-walls', change);
    const air = choice('f-air', change);

    function target() {
      return TEMP[fuel()][walls()][+air()];
    }

    function scaleY(t) {
      return 326 - (t / 1400) * 296;
    }

    function pipe(x0, y0, x1, y1) {
      ctx.strokeStyle = K.wood;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = K.clay;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(lerp(x0, x1, 0.86), lerp(y0, y1, 0.86));
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const ux = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0);
      const uy = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
      ctx.strokeStyle = K.carbon;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      [0.25, 0.5, 0.72].forEach((k) => {
        const nx = lerp(x0, x1, k);
        const ny = lerp(y0, y1, k);
        ctx.beginPath();
        ctx.moveTo(nx - uy * 4, ny + ux * 4);
        ctx.lineTo(nx + uy * 4, ny - ux * 4);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = P.muted;
      ctx.beginPath();
      ctx.ellipse(x0 - ux * 30, y0 - uy * 30 + 34, 30, 20, 0, Math.PI, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x0 - ux * 17, y0 - uy * 17, 17, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = K.air;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const drift = (time * 60) % 16;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -drift;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x1 + ux * 8 - uy * i * 5, y1 + uy * 8 + ux * i * 5);
        ctx.quadraticCurveTo(x1 + ux * 30 - uy * i * 9, y1 + uy * 30 + ux * i * 9 + 4, x1 + ux * 52 - uy * i * 16, y1 + uy * 52 + ux * i * 16);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    function log(x, y, len, r, ang) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = K.wood;
      ctx.beginPath();
      ctx.roundRect(-len / 2, -r, len, r * 2, r * 0.45);
      ctx.fill();
      ctx.strokeStyle = K.carbon;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-len / 2 + 8, i * r * 0.45);
        ctx.bezierCurveTo(-len / 6, i * r * 0.45 + 3, len / 6, i * r * 0.45 - 3, len / 2 - r, i * r * 0.45);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = mix(rgbOf(K.wood), rgbOf(K.clay), 0.7);
      ctx.beginPath();
      ctx.ellipse(len / 2 - r * 0.2, 0, r * 0.5, r * 0.94, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = K.wood;
      ctx.lineWidth = 1.2;
      [0.62, 0.3].forEach((k) => {
        ctx.beginPath();
        ctx.ellipse(len / 2 - r * 0.2, 0, r * 0.5 * k, r * 0.94 * k, 0, 0, TAU);
        ctx.stroke();
      });
      ctx.restore();
    }

    function tongue(x, y, w, h, sway, fill, alpha) {
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.bezierCurveTo(x - w / 2, y - h * 0.45, x - w * 0.18 + sway, y - h * 0.62, x + sway, y - h);
      ctx.bezierCurveTo(x + w * 0.12 + sway * 0.5, y - h * 0.55, x + w / 2, y - h * 0.4, x + w / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function flames(y, list, g, lift) {
      const outer = mix(GLOW[3][1], g, 0.25);
      const core = css(GLOW[6][1]);
      const mid = css(GLOW[5][1]);
      list.forEach((f, i) => {
        const beat = 0.86 + 0.14 * Math.sin(time * 7 + i * 1.9);
        const sway = 7 * Math.sin(time * 3.1 + i * 1.3);
        const h = (f[2] + lift) * beat;
        tongue(f[0], y, f[1], h, sway, outer, 0.85);
        tongue(f[0], y, f[1] * 0.62, h * 0.68, sway * 0.7, mid, 0.9);
        tongue(f[0], y, f[1] * 0.3, h * 0.38, sway * 0.4, core, 0.95);
      });
    }

    function lumpShape(x, y, r, i) {
      ctx.beginPath();
      for (let v = 0; v < 7; v++) {
        const a = (v / 7) * TAU + hash(i, 20) * 2;
        const d = r * (0.72 + 0.4 * hash(i * 7 + v, 21));
        const px = x + Math.cos(a) * d * 1.15;
        const py = y + Math.sin(a) * d * 0.85;
        if (v === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
    }

    function soil(pit, base) {
      ctx.fillStyle = mix(rgbOf(K.clay), rgbOf(K.wood), 0.45);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, ground, 700, H - ground);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = K.wood;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground);
      ctx.lineTo(700, ground);
      ctx.stroke();
      ctx.fillStyle = K.clay;
      for (let i = 0; i < 16; i++) {
        const x = 20 + hash(i, 51) * 660;
        if (Math.abs(x - cx) < 190) {
          continue;
        }
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(x, ground + 12 + hash(i, 52) * 46, 5 + 6 * hash(i, 53), 3 + 3 * hash(i, 54), 0, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (pit) {
        ctx.fillStyle = K.well;
        ctx.beginPath();
        ctx.moveTo(cx - 150, ground - 40);
        ctx.lineTo(cx - 118, base + 14);
        ctx.lineTo(cx + 118, base + 14);
        ctx.lineTo(cx + 150, ground - 40);
        ctx.closePath();
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        [[K.wood, 24], [K.clay, 20]].forEach((pass) => {
          ctx.strokeStyle = pass[0];
          ctx.lineWidth = pass[1];
          ctx.beginPath();
          ctx.moveTo(cx - 158, ground - 44);
          ctx.lineTo(cx - 124, base + 18);
          ctx.lineTo(cx + 124, base + 18);
          ctx.lineTo(cx + 158, ground - 44);
          ctx.stroke();
        });
        ctx.strokeStyle = K.wood;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 9; i++) {
          const k = hash(i, 61);
          const side = i % 2 ? 1 : -1;
          const x = cx + side * lerp(156, 126, k);
          const y = lerp(ground - 38, base + 8, k);
          ctx.beginPath();
          ctx.moveTo(x - 5, y - 4);
          ctx.lineTo(x + 4, y + 5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    function render() {
      const pit = walls() === 'pit';
      const wood = fuel() === 'wood';
      const pipes = +air();
      const g = glow(cur);
      const base = pit ? ground + 26 : ground;
      ctx.clearRect(0, 0, W, H);
      soil(pit, base);
      if (g) {
        const k = clamp((cur - 500) / 700);
        const halo = ctx.createRadialGradient(cx, base - 40, 10, cx, base - 40, 120 + 90 * k);
        halo.addColorStop(0, 'rgba(' + g.join(',') + ',' + (0.35 + 0.45 * k) + ')');
        halo.addColorStop(1, 'rgba(' + g.join(',') + ',0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, 700, H);
      }
      const lift = (cur - 600) * 0.2;
      const melted = cur >= MELT;
      const py = base - (wood ? 52 : 66);
      if (wood) {
        log(cx - 62, base - 12, 150, 13, 0.05);
        log(cx + 58, base - 12, 150, 13, -0.06);
        if (g) {
          flames(base - 22, [[cx - 72, 44, 96], [cx - 8, 54, 128], [cx + 60, 46, 104]], g, lift);
        }
        log(cx - 6, base - 34, 172, 12, -0.14);
        log(cx + 8, base - 40, 168, 12, 0.2);
      } else {
        const cold = rgbOf(K.carbon);
        const lump = hotRgb(cold, cur);
        if (g && pipes) {
          flames(base - 44, [[cx - 54, 26, 30], [cx + 6, 30, 40], [cx + 62, 24, 28]], g, lift * 0.3);
        }
        for (let i = 0; i < 34; i++) {
          const row = i < 13 ? 0 : i < 24 ? 1 : i < 31 ? 2 : 3;
          const inRow = i - [0, 13, 24, 31][row];
          const count = [13, 11, 7, 3][row];
          const x = cx + (inRow - (count - 1) / 2) * 18 + (hash(i, 1) - 0.5) * 6;
          const y = base - 8 - row * 15 + (hash(i, 2) - 0.5) * 4;
          const edge = Math.abs(inRow - (count - 1) / 2) / count;
          const pulse = pipes ? 0.06 * Math.sin(time * 5 + i) : 0;
          ctx.fillStyle = css(lump.map((v, j) => Math.round(lerp(v, cold[j], clamp(edge * 1.1 + (pipes ? 0 : 0.25) + pulse)))));
          lumpShape(x, y, 10 + 3 * hash(i, 4), i);
          ctx.fill();
          ctx.strokeStyle = K.well;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      if (melted) {
        ctx.fillStyle = K.liquid;
        ctx.beginPath();
        ctx.ellipse(cx, py + 6, 32, 10, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = css(GLOW[6][1]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(cx - 8, py + 3, 12, 3, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = css(hotRgb(P.atom, cur));
        ctx.beginPath();
        ctx.moveTo(cx - 24, py + 4);
        ctx.bezierCurveTo(cx - 28, py - 8, cx - 12, py - 14, cx - 2, py - 10);
        ctx.bezierCurveTo(cx + 6, py - 16, cx + 26, py - 10, cx + 24, py + 2);
        ctx.bezierCurveTo(cx + 22, py + 12, cx - 18, py + 12, cx - 24, py + 4);
        ctx.fill();
        ctx.strokeStyle = K.text;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(GLOW[6][1]);
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(cx - 8, py - 4, 9, 3, -0.3, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (wood && g) {
        flames(base - 30, [[cx - 40, 30, 62], [cx + 34, 32, 70]], g, lift * 0.6);
        ctx.fillStyle = P.muted;
        for (let i = 0; i < 5; i++) {
          const rise = (time * 22 + i * 37) % 110;
          ctx.globalAlpha = 0.22 * (1 - rise / 110);
          ctx.beginPath();
          ctx.arc(cx - 30 + i * 16 + 10 * Math.sin(time + i), base - 170 - rise, 9 + rise * 0.12, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (g && pipes) {
        ctx.fillStyle = css(GLOW[6][1]);
        for (let i = 0; i < 9; i++) {
          const rise = (time * 70 + i * 53) % 150;
          ctx.globalAlpha = 0.9 * (1 - rise / 150);
          ctx.beginPath();
          ctx.arc(cx + (hash(i, 71) - 0.5) * 150 + 8 * Math.sin(time * 2 + i), base - 60 - rise, 1.6, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (pipes >= 1) {
        pipe(70, 150, cx - (pit ? 100 : 80), base - 30);
      }
      if (pipes >= 2) {
        pipe(610, 150, cx + (pit ? 100 : 80), base - 30);
        pipe(150, 96, cx - 46, base - 58);
        pipe(530, 96, cx + 46, base - 58);
      }
      ctx.fillStyle = K.line;
      ctx.beginPath();
      ctx.roundRect(752, 22, 18, 312, 9);
      ctx.fill();
      ctx.fillStyle = g ? css(g) : css(P.atom);
      ctx.beginPath();
      ctx.roundRect(752, scaleY(cur), 18, 334 - scaleY(cur), 9);
      ctx.fill();
      ctx.font = (NARROW ? 28 : 13) + 'px ' + K.sans;
      ctx.textBaseline = 'middle';
      MARKS.forEach((m) => {
        if (NARROW && (m === 525 || m === 1200)) {
          return;
        }
        const y = scaleY(m);
        ctx.strokeStyle = m === MELT ? css(P.atom) : P.muted;
        ctx.lineWidth = m === MELT ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(744, y);
        ctx.lineTo(784, y);
        ctx.stroke();
        ctx.fillStyle = m === MELT ? K.text : P.muted;
        ctx.fillText(m + ' °C', 792, y);
      });
    }

    function meters() {
      const t = target();
      el('f-temp').textContent = Math.round(cur / 10) * 10 + ' °C';
      let key = 'fireCharcoalOne';
      if (t >= MELT) {
        key = 'fireDone';
      } else if (fuel() === 'wood') {
        key = walls() === 'open' && air() === '0' ? 'fireCamp' : 'fireWood';
      } else if (air() === '0') {
        key = 'fireNoAir';
      } else if (walls() === 'open') {
        key = 'fireOpen';
      }
      say(el('f-caption'), key);
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = target();
      const settled = cur === t;
      requestAnimationFrame(frame);
      if (!onScreen(canvas) || (still && settled)) {
        return;
      }
      cur += (t - cur) * Math.min(1, dt * 3);
      if (Math.abs(t - cur) < 1) {
        cur = t;
      }
      time = still ? 0 : now / 1000;
      render();
      el('f-temp').textContent = Math.round(cur / 10) * 10 + ' °C';
    }

    function change() {
      meters();
    }

    renders.push(render);
    render();
    meters();
    requestAnimationFrame(frame);
  }

  function smelt() {
    const W = NARROW ? 520 : 920;
    const H = 380;
    const R = { Cu: 15, O: 11, C: 12, H: 7 };
    const EQ = [
      'Cu<sub>2</sub>CO<sub>3</sub>(OH)<sub>2</sub> → 2CuO + CO<sub>2</sub> + H<sub>2</sub>O',
      'C + O<sub>2</sub> → CO<sub>2</sub>',
      'CO<sub>2</sub> + C → 2CO',
      'CuO + CO → Cu + CO<sub>2</sub>',
      'Cu + Cu + Cu + …'
    ];
    const SPOT = [[152, 206], [92, 214], [128, 246], [170, 240], [132, 276]];
    const DUR = [5, 5, 5, 6, 7];
    const canvas = el('s-canvas');
    const ctx = setupCanvas(canvas, W, H);
    let step = 0;
    let t = 0;
    let last = 0;
    let playing = false;

    function ball(kind, x, y) {
      const colour = { Cu: css(P.atom), O: K.oxygen, C: K.carbon, H: K.hydrogen }[kind];
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, R[kind], 0, TAU);
      ctx.fill();
      if (kind !== 'H') {
        ctx.fillStyle = K['on-accent'];
        ctx.font = '600 ' + (kind === 'Cu' ? 12 : 11) + 'px ' + K.sans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kind, x, y + 0.5);
        ctx.textAlign = 'left';
      }
    }

    function heat(x, y, k) {
      if (k <= 0) {
        return;
      }
      const g = GLOW[6][1];
      const halo = ctx.createRadialGradient(x, y, 4, x, y, 90);
      halo.addColorStop(0, 'rgba(' + g.join(',') + ',' + 0.7 * k + ')');
      halo.addColorStop(1, 'rgba(' + g.join(',') + ',0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 90, y - 90, 180, 180);
    }

    function lumpSites(x0, y0, cols, rows) {
      const sites = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - (r % 2); c++) {
          sites.push([x0 + c * 25 + (r % 2 ? 12.5 : 0), y0 + r * 21.6]);
        }
      }
      return sites;
    }

    function inset() {
      ctx.strokeStyle = K.clay;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(34, 196);
      ctx.quadraticCurveTo(50, 300, 132, 300);
      ctx.quadraticCurveTo(214, 300, 230, 196);
      ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const row = i < 5 ? 0 : i < 12 ? 1 : i < 20 ? 2 : 3;
        const inRow = i - [0, 5, 12, 20][row];
        const count = [5, 7, 8, 6][row];
        const x = 132 + (inRow - (count - 1) / 2) * 19 + (hash(i, 11) - 0.5) * 5;
        const y = 280 - row * 17 + (hash(i, 12) - 0.5) * 4;
        const hotness = clamp(1 - Math.hypot(x - 100, y - 222) / 90);
        ctx.fillStyle = mix(rgbOf(K.carbon), GLOW[5][1], hotness * 0.8);
        ctx.beginPath();
        ctx.ellipse(x, y, 9 + 2 * hash(i, 13), 7 + 2 * hash(i, 14), hash(i, 15) * 3, 0, TAU);
        ctx.fill();
      }
      [[152, 206], [170, 240], [118, 262], [196, 226]].forEach((p, i) => {
        if (i === 1 && step === 4) {
          return;
        }
        ctx.fillStyle = i <= 1 && step >= 1 ? K.oxide : K.ore;
        ctx.beginPath();
        ctx.roundRect(p[0] - 7, p[1] - 5, 14, 10, 3);
        ctx.fill();
      });
      if (step === 4) {
        ctx.fillStyle = t > 0.55 ? K.liquid : css(P.atom);
        ctx.beginPath();
        ctx.arc(132, 280, 6, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = K.wood;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(8, 150);
      ctx.lineTo(78, 208);
      ctx.stroke();
      ctx.strokeStyle = K.air;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(82, 212);
      ctx.lineTo(104, 228);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = P.move;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(SPOT[step][0], SPOT[step][1], 20, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = K.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(262, 24);
      ctx.lineTo(262, H - 24);
      ctx.stroke();
    }

    function malachite() {
      const shake = (i) => 2.2 * part(t, 0, 0.25) * (1 - part(t, 0.85, 1)) * Math.sin(t * 90 + i * 2.1);
      const leave = part(t, 0.3, 0.8);
      const leave2 = part(t, 0.42, 0.92);
      const turn = part(t, 0.4, 0.95);
      [470, 720].forEach((ux, u) => {
        const uy = 250;
        ctx.fillStyle = mix(rgbOf(K.ore), rgbOf(K.oxide), turn);
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.roundRect(ux - 100, uy - 20, 200, 84, 18);
        ctx.fill();
        ctx.globalAlpha = 1;
        const k = u ? leave2 : leave;
        const gx = ux + (u ? 60 : -40) * k;
        const gy = uy - 44 - 230 * k;
        const wx = ux - 62 + (u ? 40 : -90) * k;
        const wy = uy + 34 - 300 * k;
        ball('O', lerp(ux - 22, gx - 23, part(k, 0, 0.3)) + shake(1), lerp(uy - 62, gy, part(k, 0, 0.3)));
        ball('O', lerp(ux + 22, gx + 23, part(k, 0, 0.3)) + shake(2), lerp(uy - 62, gy, part(k, 0, 0.3)));
        ball('C', gx + shake(3), gy);
        ball('O', lerp(ux, ux - 12, k) + shake(4), lerp(uy - 16, uy + 22, k));
        ball('Cu', ux - 36 + shake(5), uy + 22);
        ball('Cu', ux + 36 + shake(6), uy + 22);
        ball('O', lerp(ux + 62, ux + 60, k) + shake(7), lerp(uy + 34, uy + 22, k));
        ball('O', wx + shake(8), wy);
        ball('H', wx - 13, wy - 10);
        ball('H', lerp(ux + 76, wx + 13, part(k, 0, 0.35)), lerp(uy + 24, wy - 10, part(k, 0, 0.35)));
      });
    }

    function burn() {
      const sites = lumpSites(520, 232, 9, 5);
      const taken = [0, 8];
      heat(sites[0][0], sites[0][1] - 10, part(t, 0.38, 0.5) * (1 - part(t, 0.62, 0.9)));
      heat(sites[8][0], sites[8][1] - 10, part(t, 0.58, 0.7) * (1 - part(t, 0.82, 1)));
      sites.forEach((s, i) => {
        if (!taken.includes(i)) {
          ball('C', s[0], s[1]);
        }
      });
      taken.forEach((i, n) => {
        const a = part(t, 0.05 + n * 0.2, 0.4 + n * 0.2);
        const b = part(t, 0.45 + n * 0.2, 0.9 + n * 0.1);
        const sx = sites[i][0];
        const sy = sites[i][1];
        const cxm = lerp(sx, sx + (n ? 60 : -60), b);
        const cym = lerp(sy, 40 - 40, b);
        const ox = lerp(300 + n * 10, sx, a);
        const oy = lerp(90 + n * 70, sy - 46, a);
        const join = part(t, 0.38 + n * 0.2, 0.46 + n * 0.2);
        ball('O', lerp(ox - 11, cxm - 23, join), lerp(oy, cym, join));
        ball('O', lerp(ox + 11, cxm + 23, join), lerp(oy, cym, join));
        ball('C', cxm, cym);
      });
    }

    function monoxide() {
      const sites = lumpSites(520, 232, 9, 5);
      const taken = [2, 6];
      sites.forEach((s, i) => {
        if (!taken.includes(i)) {
          ball('C', s[0], s[1]);
        }
      });
      taken.forEach((i, n) => {
        const a = part(t, 0.04 + n * 0.22, 0.38 + n * 0.22);
        const b = part(t, 0.46 + n * 0.22, 0.95);
        const sx = sites[i][0];
        const sy = sites[i][1];
        const mx = lerp(300, sx, a);
        const my = lerp(300 - n * 180, sy - 48, a);
        const split = part(t, 0.38 + n * 0.22, 0.46 + n * 0.22);
        const c1x = lerp(mx, sx - 150 - n * 20, b);
        const c1y = lerp(my, -30, b);
        const c2x = lerp(sx, sx + 110 + n * 20, b);
        const c2y = lerp(sy, -30, b);
        ball('O', lerp(mx - 23, c1x - 20, split), lerp(my, c1y, split));
        ball('C', c1x, c1y);
        ball('O', lerp(mx + 23, c2x + 20, split), lerp(my, c2y, split));
        ball('C', c2x, c2y);
      });
    }

    function reduce() {
      const cells = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          cells.push({ kind: (r + c) % 2 ? 'O' : 'Cu', x: 560 + c * 27, y: 236 + r * 27 });
        }
      }
      const coppers = cells.filter((c) => c.kind === 'Cu');
      const oxygens = cells.filter((c) => c.kind === 'O');
      const home = [[588, 250], [614, 250], [601, 272.5], [627, 272.5]];
      const pull = part(t, 0.8, 1);
      ctx.fillStyle = mix(rgbOf(K.oxide), P.atom, part(t, 0.3, 0.9));
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.roundRect(530, 208, 150, 86, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      coppers.forEach((c, i) => {
        ball('Cu', lerp(c.x, home[i][0], pull), lerp(c.y, home[i][1], pull));
      });
      oxygens.forEach((o, i) => {
        const wave = i < 2 ? 0 : 0.34;
        const a = part(t, 0.02 + wave, 0.3 + wave);
        const b = part(t, 0.34 + wave, 0.64 + wave);
        const side = o.y < 250 ? -1 : 1;
        const sx = 300 + i * 12;
        const sy = side < 0 ? 60 + i * 30 : 340 - i * 20;
        const cx0 = lerp(sx, o.x, a);
        const cy0 = lerp(sy, o.y + side * 46, a);
        const ex = o.x + (i % 2 ? 120 : -60);
        const ey = side < 0 ? -40 : H + 40;
        const mx = lerp(cx0, ex, b);
        const my = lerp(cy0, ey, b);
        const grab = part(t, 0.3 + wave, 0.36 + wave);
        ball('O', mx - 20 * (1 - grab) - 23 * grab, my);
        ball('C', mx, my);
        ball('O', lerp(o.x, mx + 23, grab), lerp(o.y, my, grab));
      });
    }

    function gather() {
      const sites = [];
      for (let r = -2; r <= 2; r++) {
        const count = 5 - Math.abs(r);
        for (let c = 0; c < count; c++) {
          sites.push([600 + (c - (count - 1) / 2) * 30, 236 + r * 26]);
        }
      }
      const late = [3, 7, 15, 18];
      const melt = part(t, 0.58, 0.82);
      const colour = melt > 0 ? mix(P.atom, rgbOf(K.liquid), melt) : css(P.atom);
      const sec = t * DUR[4];
      heat(600, 236, melt * 0.8);
      sites.forEach((s, i) => {
        const n = late.indexOf(i);
        let x = s[0];
        let y = s[1];
        if (n >= 0) {
          const a = part(t, 0.03 + n * 0.1, 0.25 + n * 0.1);
          x = lerp(300 + n * 10, s[0], a);
          y = lerp(n % 2 ? 330 : 70, s[1], a);
        }
        x = lerp(x, s[0] + (hash(i, 21) - 0.5) * 12 + 3 * Math.sin(sec * 3 + i), melt);
        y = lerp(y, s[1] + (hash(i, 22) - 0.5) * 12 + 3 * Math.sin(sec * 2.6 + i * 2), melt);
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(x, y, R.Cu, 0, TAU);
        ctx.fill();
      });
      if (melt > 0) {
        ctx.globalAlpha = melt;
        ctx.fillStyle = K.text;
        ctx.font = '600 ' + (NARROW ? 22 : 15) + 'px ' + K.sans;
        ctx.fillText('> ' + MELT + ' °C', NARROW ? 700 : 780, 60);
        ctx.globalAlpha = 1;
      }
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (NARROW) {
        ctx.translate(-340, 0);
      } else {
        inset();
        ctx.beginPath();
        ctx.rect(264, 0, W - 264, H);
        ctx.clip();
      }
      ctx.translate(600, 250);
      ctx.scale(NARROW ? 1.1 : 1.25, NARROW ? 1.1 : 1.25);
      ctx.translate(-600, -250);
      [malachite, burn, monoxide, reduce, gather][step]();
      ctx.restore();
    }

    function show() {
      el('s-count').textContent = (step + 1) + ' / ' + EQ.length;
      el('s-eq').innerHTML = EQ[step];
      el('s-back').disabled = step === 0;
      el('s-next').disabled = step === EQ.length - 1;
      say(el('s-caption'), 'smelt.' + step);
    }

    function frame(now) {
      if (!playing) {
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (onScreen(canvas)) {
        t = Math.min(1, t + dt / DUR[step]);
        render();
      }
      if (t >= 1) {
        playing = false;
        return;
      }
      requestAnimationFrame(frame);
    }

    function play(to) {
      step = to;
      t = 0;
      show();
      render();
      if (!playing) {
        playing = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    }

    el('s-back').onclick = () => play(step - 1);
    el('s-next').onclick = () => play(step + 1);
    el('s-again').onclick = () => play(step);
    renders.push(render);
    show();
    render();
    const starter = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        starter.disconnect();
        play(0);
      }
    }, { threshold: 0.6 });
    starter.observe(canvas);
  }

  function freeze() {
    const W = 640;
    const H = 400;
    const a = 20;
    const r = 8.2;
    const rh = a * 0.866;
    const GW = 300;
    const GH = 400;
    const SPAN = 18;
    const MODE = { slow: { rate: 90, grow: 40, nuclei: 3 }, fast: { rate: 260, grow: 75, nuclei: 8 } };
    const ANGLES = [0, 14, -14, 26, -26, 7, -20, 20];
    const SHADES = [[255, 255, 255], [0, 0, 0], [120, 60, 20], [255, 220, 150], [60, 30, 10]];
    const canvas = el('z-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const graph = el('z-graph');
    const gtx = setupCanvas(graph, GW, GH);
    const liquid = [];
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 34; col++) {
        liquid.push({ x: -10 + col * a + (row % 2 ? a / 2 : 0), y: -8 + row * rh, dx: 0, dy: 0, i: liquid.length });
      }
    }
    const runs = { slow: [], fast: [] };
    let grains = [];
    let phase = 'solid';
    let mode = 'slow';
    let temp = 20;
    let disorder = 0;
    let clock = 0;
    let last = 0;
    let running = false;
    let doneMode = '';

    function whole() {
      grains = [{ x: W / 2, y: H / 2, r: 2000, ang: 0 }];
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

    function solidShare() {
      let n = 0;
      let all = 0;
      for (let x = 0; x <= W; x += 20) {
        for (let y = 0; y <= H; y += 20) {
          all++;
          if (owner(x, y) >= 0) {
            n++;
          }
        }
      }
      return n / all;
    }

    function nucleate() {
      grains = [];
      disorder = 0;
      let guard = 0;
      let gap = mode === 'slow' ? 230 : 130;
      const turn = Math.floor(Math.random() * ANGLES.length);
      while (grains.length < MODE[mode].nuclei) {
        guard++;
        if (guard % 400 === 0) {
          gap *= 0.9;
        }
        const g = { x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80), r: 2, ang: ANGLES[(grains.length + turn) % ANGLES.length] * Math.PI / 180 };
        if (!grains.some((e) => Math.hypot(e.x - g.x, e.y - g.y) < gap)) {
          grains.push(g);
        }
      }
    }

    function render(now) {
      const sec = (now || 0) / 1000;
      const amp = a * 0.06 * Math.sqrt((temp + 273) / (MELT + 273));
      const base = hotRgb(P.atom, temp).map((v, i) => Math.round(lerp(v, P.atom[i], 0.35)));
      const wild = disorder * a * 0.3;
      ctx.clearRect(0, 0, W, H);
      if (phase === 'superheat' || phase === 'liquid' || phase === 'cooling' || phase === 'growing') {
        ctx.fillStyle = K.liquid;
        for (const p of liquid) {
          const x = p.x + p.dx;
          const y = p.y + p.dy;
          if (grains.length && owner(x, y) >= 0) {
            continue;
          }
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }
      grains.forEach((g, i) => {
        ctx.fillStyle = grains.length > 1 ? mix(base, SHADES[i % SHADES.length], 0.14) : css(base);
        const n = Math.ceil(Math.min(g.r, 760) / rh) + 1;
        const cos = Math.cos(g.ang);
        const sin = Math.sin(g.ang);
        for (let row = -n; row <= n; row++) {
          for (let col = -n; col <= n; col++) {
            const lx = (col + (row & 1 ? 0.5 : 0)) * a;
            const ly = row * rh;
            let x = g.x + lx * cos - ly * sin;
            let y = g.y + lx * sin + ly * cos;
            if (x < -r || x > W + r || y < -r || y > H + r) {
              continue;
            }
            if (Math.hypot(lx, ly) > g.r || owner(x, y) !== i) {
              continue;
            }
            x += amp * Math.sin(sec * (6 + 3 * hash(row, col)) + hash(col, row) * TAU) + wild * (hash(row + 5, col) - 0.5) * 2;
            y += amp * Math.sin(sec * (6 + 3 * hash(col + 9, row)) + hash(row + 4, col) * TAU) + wild * (hash(row, col + 8) - 0.5) * 2;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fill();
          }
        }
      });
    }

    function plot() {
      const x0 = 62;
      const y0 = GH - 40;
      const px = (s) => x0 + (s / SPAN) * (GW - x0 - 12);
      const py = (v) => y0 - ((v - 500) / 800) * (y0 - 20);
      gtx.clearRect(0, 0, GW, GH);
      gtx.font = '12px ' + K.sans;
      gtx.textBaseline = 'middle';
      gtx.strokeStyle = P.muted;
      gtx.lineWidth = 1;
      gtx.beginPath();
      gtx.moveTo(x0, 14);
      gtx.lineTo(x0, y0);
      gtx.lineTo(GW - 8, y0);
      gtx.stroke();
      gtx.fillStyle = P.muted;
      [600, 800, 1000, 1200].forEach((v) => {
        gtx.textAlign = 'right';
        gtx.fillText(v, x0 - 6, py(v));
        gtx.beginPath();
        gtx.moveTo(x0 - 3, py(v));
        gtx.lineTo(x0, py(v));
        gtx.stroke();
      });
      gtx.setLineDash([4, 5]);
      gtx.strokeStyle = css(P.atom);
      gtx.beginPath();
      gtx.moveTo(x0, py(MELT));
      gtx.lineTo(GW - 8, py(MELT));
      gtx.stroke();
      gtx.setLineDash([]);
      gtx.textAlign = 'right';
      gtx.fillStyle = K.text;
      gtx.fillText(MELT + ' °C', GW - 10, py(MELT) - 10);
      gtx.fillStyle = P.muted;
      gtx.textAlign = 'center';
      gtx.fillText(tr(graph, 'freezeAxisTime'), (x0 + GW) / 2, GH - 14);
      gtx.save();
      gtx.translate(12, (y0 + 14) / 2);
      gtx.rotate(-Math.PI / 2);
      gtx.fillText(tr(graph, 'freezeAxisTemp'), 0, 0);
      gtx.restore();
      gtx.textAlign = 'left';
      [['slow', K.air], ['fast', K.liquid]].forEach((pair) => {
        const run = runs[pair[0]];
        if (run.length < 2) {
          return;
        }
        gtx.strokeStyle = pair[1];
        gtx.lineWidth = 2.5;
        gtx.lineJoin = 'round';
        gtx.beginPath();
        run.forEach((p, i) => {
          if (i) {
            gtx.lineTo(px(p[0]), py(p[1]));
          } else {
            gtx.moveTo(px(p[0]), py(p[1]));
          }
        });
        gtx.stroke();
      });
    }

    function meters() {
      el('z-temp').textContent = Math.round(temp / 5) * 5 + ' °C';
      el('z-grains').textContent = phase === 'liquid' || phase === 'cooling' ? 0 : grains.length;
      el('z-melt').disabled = running || phase === 'liquid';
      el('z-slow').disabled = phase !== 'liquid';
      el('z-fast').disabled = phase !== 'liquid';
      const key = {
        solid: doneMode ? (doneMode === 'slow' ? 'freezeDoneSlow' : 'freezeDoneFast') : 'freezeStart',
        heating: 'freezeHeating',
        melting: 'freezeMelting',
        superheat: 'freezeSuperheat',
        liquid: 'freezeLiquid',
        cooling: 'freezeCooling',
        growing: 'freezeGrowing',
        cooled: 'freezeCooled'
      }[phase];
      say(el('z-caption'), key);
    }

    function advance(dt) {
      if (phase === 'heating') {
        temp = Math.min(MELT, temp + 520 * dt);
        if (temp >= MELT) {
          phase = 'melting';
        }
      } else if (phase === 'melting') {
        disorder = Math.min(1, disorder + dt / 1.6);
        if (disorder >= 1) {
          phase = 'superheat';
          grains = [];
          for (const p of liquid) {
            p.dx = (hash(p.i, 3) - 0.5) * a * 0.6;
            p.dy = (hash(p.i, 4) - 0.5) * a * 0.6;
          }
        }
      } else if (phase === 'superheat') {
        temp = Math.min(1200, temp + 200 * dt);
        if (temp >= 1200) {
          phase = 'liquid';
          running = false;
        }
      } else if (phase === 'cooling') {
        clock += dt;
        temp = Math.max(MELT, temp - MODE[mode].rate * dt);
        runs[mode].push([clock, temp]);
        if (temp <= MELT) {
          phase = 'growing';
          nucleate();
        }
      } else if (phase === 'growing') {
        clock += dt;
        for (const g of grains) {
          g.r += MODE[mode].grow * dt;
        }
        runs[mode].push([clock, MELT]);
        if (solidShare() >= 1) {
          phase = 'cooled';
          disorder = 0;
        }
      } else if (phase === 'cooled') {
        clock += dt;
        temp = Math.max(600, temp - MODE[mode].rate * dt);
        runs[mode].push([clock, temp]);
        if (temp <= 600) {
          phase = 'solid';
          doneMode = mode;
          running = false;
        }
      }
      if (phase === 'superheat' || phase === 'liquid' || phase === 'cooling' || phase === 'growing') {
        for (const p of liquid) {
          p.dx = Math.max(-a * 0.3, Math.min(a * 0.3, p.dx + (Math.random() - 0.5) * 40 * dt));
          p.dy = Math.max(-a * 0.3, Math.min(a * 0.3, p.dy + (Math.random() - 0.5) * 40 * dt));
        }
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (onScreen(canvas)) {
        advance(dt);
        render(now);
        plot();
        meters();
      }
      if (running || phase === 'liquid') {
        requestAnimationFrame(frame);
      } else {
        render(0);
        meters();
      }
    }

    function start() {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function draw() {
      render(0);
      plot();
    }

    el('z-melt').onclick = () => {
      phase = 'heating';
      disorder = 0;
      jolt(el('w-freeze'));
      meters();
      start();
    };
    ['slow', 'fast'].forEach((m) => {
      el('z-' + m).onclick = () => {
        mode = m;
        phase = 'cooling';
        clock = 0;
        runs[m] = [[0, temp]];
        running = true;
        meters();
      };
    });
    el('z-reset').onclick = () => {
      running = false;
      phase = 'solid';
      doneMode = '';
      temp = 20;
      disorder = 0;
      runs.slow = [];
      runs.fast = [];
      whole();
      draw();
      meters();
    };
    renders.push(draw);
    whole();
    draw();
    meters();
  }

  function cast() {
    const W = 920;
    const H = 360;
    const canvas = el('k-canvas');
    const ctx = setupCanvas(canvas, W, H);
    const damp = choice('k-damp', reset);
    const warm = choice('k-warm', reset);
    const hot = choice('k-hot', reset);
    const riser = choice('k-riser', reset);
    let t = -1;
    let last = 0;
    let playing = false;

    function cavity() {
      const wide = riser() === 'yes';
      const path = new Path2D();
      path.moveTo(wide ? 226 : 262, 86);
      path.lineTo(wide ? 354 : 298, 86);
      path.lineTo(wide ? 340 : 298, 176);
      path.lineTo(430, 180);
      path.lineTo(700, 214);
      path.lineTo(700, 226);
      path.lineTo(430, 262);
      path.lineTo(214, 262);
      path.quadraticCurveTo(196, 262, 196, 244);
      path.lineTo(196, 196);
      path.quadraticCurveTo(196, 178, 214, 178);
      path.lineTo(wide ? 240 : 262, 176);
      path.closePath();
      return path;
    }

    function faults() {
      return {
        misrun: warm() === 'no' && hot() === 'no',
        gasDamp: damp() === 'yes',
        gasHot: hot() === 'yes',
        pipe: riser() === 'no'
      };
    }

    function label(key, x, y, tx, ty) {
      ctx.strokeStyle = K.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = K.text;
      ctx.font = '13px ' + K.sans;
      ctx.textBaseline = 'middle';
      ctx.textAlign = tx > 600 ? 'right' : 'left';
      ctx.fillText(tr(canvas, key), tx + (tx > 600 ? 0 : 4), ty + (ty > 200 ? 10 : -10));
      ctx.textAlign = 'left';
    }

    function render() {
      const f = faults();
      const path = cavity();
      const fill = part(t, 0, 0.42);
      const set = part(t, 0.46, 0.9);
      const end = part(t, 0.86, 1);
      const reach = f.misrun ? 590 : 706;
      const metal = hot() === 'yes' ? GLOW[6][1] : GLOW[5][1];
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = warm() === 'yes' ? mix(rgbOf(K.clay), GLOW[2][1], 0.22) : K.clay;
      ctx.beginPath();
      ctx.roundRect(140, 86, 620, 230, 10);
      ctx.fill();
      if (damp() === 'yes') {
        ctx.fillStyle = K.air;
        for (let i = 0; i < 46; i++) {
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.arc(152 + hash(i, 31) * 596, 98 + hash(i, 32) * 206, 2.2, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = K.well;
      ctx.fill(path);
      if (t >= 0) {
        ctx.save();
        ctx.clip(path);
        const level = lerp(262, 86, part(fill, 0.75, 1));
        const front = lerp(196, reach, part(fill, 0, 0.8));
        ctx.fillStyle = css(metal);
        ctx.beginPath();
        ctx.rect(190, level, front - 190, 262 - level + 4);
        ctx.fill();
        if (fill < 1) {
          ctx.fillRect(272, 80, 12, 190);
        }
        if (f.misrun) {
          ctx.fillStyle = K.well;
          ctx.beginPath();
          ctx.rect(reach, 150, 200, 140);
          ctx.fill();
          ctx.fillStyle = css(metal);
          ctx.beginPath();
          ctx.ellipse(reach, 220, 10 * part(fill, 0.7, 1), 16, 0, 0, TAU);
          ctx.fill();
        }
        if (set > 0) {
          const fed = riser() === 'yes';
          ctx.strokeStyle = css(P.atom);
          ctx.fillStyle = css(P.atom);
          ctx.lineJoin = 'round';
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, fed ? 176 : 0, W, H);
          ctx.clip();
          ctx.lineWidth = set * 96;
          ctx.stroke(path);
          if (set >= 1) {
            ctx.fill(path);
          }
          ctx.restore();
          if (fed) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, W, 176);
            ctx.clip();
            ctx.lineWidth = set * 52 + end * 90;
            ctx.stroke(path);
            if (end >= 1) {
              ctx.fill(path);
            }
            ctx.restore();
          }
          if (f.misrun) {
            ctx.fillStyle = K.well;
            ctx.beginPath();
            ctx.moveTo(reach + 8, 150);
            ctx.lineTo(reach + 200, 150);
            ctx.lineTo(reach + 200, 290);
            ctx.lineTo(reach + 8, 290);
            ctx.quadraticCurveTo(reach + 14, 220, reach + 8, 150);
            ctx.fill();
          }
        }
        if (end > 0) {
          ctx.fillStyle = K.well;
          ctx.globalAlpha = end;
          const holes = (f.gasDamp ? 16 : 0) + (f.gasHot ? 7 : 0);
          for (let i = 0; i < holes; i++) {
            const x = 214 + hash(i, 41) * (f.misrun ? 330 : 420);
            const half = x < 430 ? 34 : lerp(34, 4, (x - 430) / 270);
            ctx.beginPath();
            ctx.arc(x, 220 + (hash(i, 42) - 0.5) * 2 * (half - 4), 2.5 + 2.5 * hash(i, 43), 0, TAU);
            ctx.fill();
          }
          ctx.beginPath();
          if (f.pipe) {
            ctx.moveTo(266, 196);
            ctx.quadraticCurveTo(300, 190, 340, 198);
            ctx.quadraticCurveTo(318, 226, 304, 244);
            ctx.quadraticCurveTo(290, 226, 266, 196);
          } else {
            ctx.moveTo(244, 84);
            ctx.lineTo(338, 84);
            ctx.quadraticCurveTo(304, 108, 290, 150);
            ctx.quadraticCurveTo(278, 108, 244, 84);
          }
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        if (fill > 0 && fill < 1) {
          ctx.fillStyle = css(metal);
          ctx.fillRect(272, 24, 12, 64);
        }
        if (end >= 1 && !NARROW) {
          if (f.misrun) {
            label('castLabelMisrun', 640, 220, 742, 150);
          }
          if (f.gasDamp || f.gasHot) {
            label('castLabelGas', 400, 236, 400, 296);
          }
          label(f.pipe ? 'castLabelPipe' : 'castLabelPipeSafe', f.pipe ? 304 : 290, f.pipe ? 214 : 110, f.pipe ? 180 : 420, f.pipe ? 60 : 60);
        }
      }
    }

    function result() {
      const f = faults();
      const parts = [];
      if (f.misrun) {
        parts.push('castMisrun');
      }
      if (f.gasDamp) {
        parts.push('castGasDamp');
      }
      if (f.gasHot) {
        parts.push('castGasHot');
      }
      parts.push(f.pipe ? 'castPipe' : 'castPipeSafe');
      if (parts.length === 1 && !f.pipe) {
        parts.unshift('castGood');
      }
      say(el('k-caption'), ...parts);
    }

    function frame(now) {
      if (!playing) {
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (onScreen(canvas)) {
        t = Math.min(1, t + dt / 6);
        render();
      }
      if (t >= 1) {
        playing = false;
        el('k-pour').disabled = false;
        result();
        return;
      }
      requestAnimationFrame(frame);
    }

    function reset() {
      playing = false;
      t = -1;
      el('k-pour').disabled = false;
      say(el('k-caption'), 'castStart');
      render();
    }

    el('k-pour').onclick = () => {
      t = 0;
      playing = true;
      el('k-pour').disabled = true;
      say(el('k-caption'), 'castPouring');
      jolt(el('w-cast'));
      last = performance.now();
      requestAnimationFrame(frame);
    };
    renders.push(render);
    reset();
  }

  function gas() {
    const g = NARROW
      ? { w: 360, h: 176, a: 20, r: 8.4, cols: 17, rows: 8 }
      : { w: 760, h: 240, a: 26, r: 11, cols: 28, rows: 9 };
    const WALL = 12;
    const COUNT = 14;
    const KEPT = 0;
    const STEPS = [
      { front: 0, bubble: 0, join: 0 },
      { front: 0.35, bubble: 0, join: 0 },
      { front: 0.6, bubble: 0, join: 0 },
      { front: 0.66, bubble: 1, join: 1 },
      { front: 1.1, bubble: 1, join: 1 }
    ];
    const ctx = setupCanvas(el('g-canvas'), g.w, g.h);
    const rh = g.a * 0.866;
    const top = (g.h - (g.rows - 1) * rh) / 2;
    const hole = { x: g.w * 0.82, y: g.h / 2, r: g.a * 1.55 };
    const homes = Array.from({ length: COUNT }, (_, i) => ({
      x: i === KEPT ? g.w * 0.16 : WALL + 14 + hash(i, 3) * (g.w - WALL - 28),
      y: 14 + hash(i, 7) * (g.h - 28)
    }));
    let step = 0;
    let now = Object.assign({}, STEPS[0]);
    let from = now;
    let started = 0;
    let running = false;

    function gasAt(i) {
      const home = homes[i];
      if (i === KEPT) {
        return home;
      }
      const front = now.front * g.w;
      const pushed = home.x < front + 10 ? Math.min(front + 10 + hash(i, 11) * g.w * 0.16, g.w - 10) : home.x;
      const angle = hash(i, 13) * TAU;
      const reach = hole.r * 0.62 * Math.sqrt(hash(i, 17));
      return {
        x: lerp(pushed, hole.x + Math.cos(angle) * reach, now.join),
        y: lerp(home.y, hole.y + Math.sin(angle) * reach, now.join)
      };
    }

    function render() {
      readColours();
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.fillStyle = K.clay;
      ctx.fillRect(0, 0, WALL, g.h);
      const front = now.front * g.w;
      const solid = 'rgb(' + P.atom.join(',') + ')';
      for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
          const x0 = WALL + g.r + 2 + c * g.a + (r % 2 ? g.a / 2 : 0);
          const y0 = top + r * rh;
          const frozen = x0 < front;
          const x = frozen ? x0 : x0 + (hash(r, c) - 0.5) * g.a * 0.5;
          const y = frozen ? y0 : y0 + (hash(c, r + 40) - 0.5) * g.a * 0.5;
          if (x > g.w + g.r || Math.hypot(x - hole.x, y - hole.y) < hole.r * now.bubble + g.r * 0.6 * now.bubble) {
            continue;
          }
          ctx.fillStyle = frozen ? solid : K.liquid;
          ctx.beginPath();
          ctx.arc(x, y, g.r, 0, TAU);
          ctx.fill();
        }
      }
      ctx.fillStyle = K.hydrogen;
      ctx.strokeStyle = K.well;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < COUNT; i++) {
        const p = gasAt(i);
        ctx.beginPath();
        ctx.arc(p.x, p.y, g.r * 0.42, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    function labels() {
      say(el('g-count'), ['stepCount', { n: step + 1, total: STEPS.length }]);
      say(el('g-caption'), 'gas.' + step);
      el('g-back').disabled = step === 0;
      el('g-next').disabled = step === STEPS.length - 1;
    }

    function frame(t) {
      const k = part(t, started, started + 1000);
      now = {};
      for (const key of Object.keys(STEPS[step])) {
        now[key] = lerp(from[key], STEPS[step][key], k);
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

    el('g-back').onclick = () => go(step - 1);
    el('g-next').onclick = () => go(step + 1);
    renders.push(render);
    labels();
    render();
  }

  function beds() {
    const W = NARROW ? 320 : 280;
    const H = NARROW ? 150 : 190;
    const FLOOR = H - 20;
    const STREAMS = [0.25, 0.75];

    function panel(id, size, gap, reach, spent) {
      const ctx = setupCanvas(el(id), W, H);
      return () => {
        readColours();
        const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        STREAMS.forEach((sx, n) => {
          const top = FLOOR - (FLOOR - 8) * reach;
          const turn = FLOOR - (FLOOR - 8) * spent;
          [[H - 3, Math.max(top, turn), K.oxygen], [turn, top, muted]].forEach(([from, to, colour]) => {
            if (from <= to) {
              return;
            }
            ctx.strokeStyle = colour;
            ctx.beginPath();
            for (let y = from; y >= to; y -= 2) {
              const x = sx * W + (y < FLOOR ? Math.sin((FLOOR - y) / (size * 1.1) + n) * Math.min(size * 0.35, 5) : 0);
              ctx[y === from ? 'moveTo' : 'lineTo'](x, y);
            }
            ctx.stroke();
          });
        });
        ctx.fillStyle = K.carbon;
        const step = size * 2 + gap;
        for (let r = 0; r < 40; r++) {
          for (let c = -1; c * step < W + step; c++) {
            const wide = gap > size;
            const x = wide ? (c * W) / 2 + (hash(r, c) - 0.5) * 10 : c * step + (r % 2 ? step / 2 : 0) + (hash(r, c) - 0.5) * gap * 0.6;
            const y = FLOOR - size - r * (wide ? size * 2 + 8 : step * 0.9) + (hash(c, r + 9) - 0.5) * (wide ? 8 : gap * 0.6);
            if (y > size * 0.9 && (wide ? c >= 0 && c <= 2 : gap < 3 || STREAMS.every((sx) => Math.abs(x - sx * W) > size + gap / 2 - 1))) {
              ctx.beginPath();
              ctx.arc(x, y, size, 0, TAU);
              ctx.fill();
            }
          }
        }
        STREAMS.forEach((sx) => {
          const top = FLOOR - (FLOOR - 8) * reach;
          ctx.strokeStyle = spent < reach ? muted : K.oxygen;
          ctx.beginPath();
          ctx.moveTo(sx * W - 7, top + 8);
          ctx.lineTo(sx * W, top);
          ctx.lineTo(sx * W + 7, top + 8);
          ctx.stroke();
        });
      };
    }

    [panel('q-dust', 3, 1, 0, 1), panel('q-even', 11, 5, 1, 0.45), panel('q-big', 30, 44, 1, 1)].forEach((render) => {
      renders.push(render);
      render();
    });
  }

  readColours();
  renders.push(readColours);
  if (el('q-dust')) {
    beds();
  }
  if (el('g-canvas')) {
    gas();
  }
  if (el('f-canvas')) {
    fire();
  }
  if (el('s-canvas')) {
    smelt();
  }
  if (el('z-canvas')) {
    freeze();
  }
  if (el('k-canvas')) {
    cast();
  }
})();
