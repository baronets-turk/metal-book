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
        const kind = o.kind ? o.kind(r, c) : null;
        ctx.beginPath();
        ctx.arc(x, y, kind ? g.r * kind.scale : g.r, 0, Math.PI * 2);
        ctx.fillStyle = kind ? kind.fill : mix(base, P.hot, Math.min(1, heat * 0.9));
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

  function fmt(text, values) {
    return text.replace(/\{(\w+)\}/g, (m, k) => values[k]);
  }

  function tr(node, key) {
    const widget = node.closest('.widget');
    const path = key.split('.');
    const value = ((widget && widget.strings) || window.T)[path[0]];
    return path.length > 1 ? value[path[1]] : value;
  }

  function say(node, ...parts) {
    node.said = parts;
    node.textContent = parts.map((p) => (typeof p === 'string' ? tr(node, p) : fmt(tr(node, p[0]), p[1]))).join(' ');
  }

  function resay(root) {
    root.querySelectorAll('*').forEach((node) => {
      if (node.said) {
        say(node, ...node.said);
      }
    });
    renders.forEach((f) => f());
  }

  const SKIP = '.old-name, .fn-pop, script, style, canvas, button, a, nav, ol.sources, .credit, .quiz, #quiz-box';
  let placeAny = null;
  let placeEach = [];
  try {
    const list = window.PLACES || [];
    placeAny = list.length ? new RegExp('(?<![\\p{L}])(?:' + list.map((p) => p[0]).join('|') + ')(?![\\p{L}])', 'gu') : null;
    placeEach = list.map((p) => [new RegExp('^(?:' + p[0] + ')$', 'u'), p[1]]);
  } catch (e) {
    placeAny = null;
  }

  function places(root) {
    if (!placeAny) {
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement && !node.parentElement.closest(SKIP)) {
        nodes.push(node);
      }
    }
    for (const node of nodes) {
      const text = node.nodeValue;
      placeAny.lastIndex = 0;
      let at = 0;
      let m = placeAny.exec(text);
      if (!m) {
        continue;
      }
      const parts = document.createDocumentFragment();
      while (m) {
        const entry = placeEach.find((p) => p[0].test(m[0]));
        if (entry) {
          parts.append(text.slice(at, m.index));
          const span = document.createElement('span');
          span.className = 'old-name';
          span.tabIndex = 0;
          span.dataset.now = entry[1];
          span.textContent = m[0];
          parts.append(span);
          at = m.index + m[0].length;
        }
        m = placeAny.exec(text);
      }
      parts.append(text.slice(at));
      node.replaceWith(parts);
    }
  }

  function footnotes(root) {
    places(root.body || root);
    const items = Array.from(document.querySelectorAll('ol.sources > li'));
    root.querySelectorAll('ol.sources a').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener';
    });
    root.querySelectorAll('a.fn').forEach((a) => {
      const n = items.findIndex((li) => '#' + li.id === a.getAttribute('href')) + 1;
      a.textContent = n ? '[' + n + ']' : '[?]';
      a.setAttribute('aria-label', fmt(window.UI.footnote, { n }));
    });
  }

  footnotes(document);

  const pop = document.createElement('div');
  pop.className = 'fn-pop';
  pop.hidden = true;
  document.body.append(pop);
  const touch = window.matchMedia('(hover: none)');
  let popFor = null;
  let popTimer = 0;

  function hideNote() {
    pop.hidden = true;
    popFor = null;
  }

  function showNote(a) {
    clearTimeout(popTimer);
    const now = a.dataset.now;
    const item = now ? null : document.getElementById(a.getAttribute('href').slice(1));
    if ((!item && !now) || popFor === a) {
      return;
    }
    popFor = a;
    if (now) {
      pop.textContent = now;
    } else {
      pop.innerHTML = item.innerHTML;
    }
    pop.hidden = false;
    const rect = a.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, rect.left - 24));
    const above = rect.top > pop.offsetHeight + 70;
    pop.style.left = left + window.scrollX + 'px';
    pop.style.top = (above ? rect.top - pop.offsetHeight - 6 : rect.bottom + 6) + window.scrollY + 'px';
  }

  function noteLink(e) {
    const a = e.target.closest ? e.target.closest('a.fn, .old-name') : null;
    return a && !pop.contains(a) ? a : null;
  }

  document.addEventListener('mouseover', (e) => {
    const a = noteLink(e);
    if (a) {
      showNote(a);
    } else if (pop.contains(e.target)) {
      clearTimeout(popTimer);
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (noteLink(e) || pop.contains(e.target)) {
      clearTimeout(popTimer);
      popTimer = setTimeout(hideNote, 300);
    }
  });
  let openAtDown = false;
  document.addEventListener('pointerdown', () => {
    openAtDown = !pop.hidden || !tip.hidden;
  }, true);
  document.addEventListener('click', (e) => {
    const note = e.target.closest('.widget .note');
    if (!note || openAtDown || !pop.hidden || !tip.hidden) {
      return;
    }
    const open = note.classList.contains('open');
    if (!open || e.target.closest('b') === note.firstElementChild) {
      note.classList.toggle('open', !open);
      e.stopImmediatePropagation();
    }
  });
  document.addEventListener('click', (e) => {
    const a = noteLink(e);
    const wasOpen = openAtDown || !pop.hidden;
    openAtDown = false;
    if (a && a.dataset.now) {
      e.stopImmediatePropagation();
      tip.hidden = true;
      showNote(a);
      return;
    }
    if (a && touch.matches) {
      e.preventDefault();
      tip.hidden = true;
      showNote(a);
      return;
    }
    const hit = touch.matches && !a && !pop.contains(e.target) ? celsiusAt(e.clientX, e.clientY) : null;
    if (hit) {
      hideNote();
      showTip(hit, e.clientX);
      e.stopImmediatePropagation();
    } else if (!pop.contains(e.target) && (wasOpen || (touch.matches && !tip.hidden))) {
      hideNote();
      tip.hidden = true;
      e.stopImmediatePropagation();
    }
  });

  const NUM = /[−-]?\d+(?:[.,]\d+)?/g;
  const CELSIUS = /([−-]?\d+(?:[.,]\d+)?(?:(?:–|,? (?:to|and|до|и) |, )[−-]?\d+(?:[.,]\d+)?)*)\s*°C/g;

  function fahrenheit(text) {
    return text.replace(NUM, (n) => {
      const mark = /[.,]/.exec(n);
      const digits = mark ? n.length - mark.index - 1 : 0;
      const f = parseFloat(n.replace('−', '-').replace(',', '.')) * 1.8 + 32;
      return f.toFixed(digits).replace('-', '−').replace('.', mark ? mark[0] : '.');
    }) + ' °F';
  }

  function caretAt(x, y) {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      return pos && { node: pos.offsetNode, offset: pos.offset };
    }
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      return range && { node: range.startContainer, offset: range.startOffset };
    }
    return null;
  }

  function celsiusAt(x, y) {
    const caret = caretAt(x, y);
    if (!caret || caret.node.nodeType !== 3) {
      return null;
    }
    for (const m of caret.node.nodeValue.matchAll(CELSIUS)) {
      if (caret.offset < m.index || caret.offset > m.index + m[0].length) {
        continue;
      }
      const range = document.createRange();
      range.setStart(caret.node, m.index);
      range.setEnd(caret.node, m.index + m[0].length);
      const rect = Array.from(range.getClientRects()).find((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
      if (rect) {
        return { rect, text: fahrenheit(m[1]) };
      }
    }
    return null;
  }

  const tip = document.createElement('div');
  tip.className = 'deg-tip';
  tip.hidden = true;
  document.body.append(tip);

  function showTip(hit, at) {
    tip.hidden = false;
    tip.textContent = hit.text;
    const half = tip.offsetWidth / 2;
    const x = Math.max(half + 4, Math.min(window.innerWidth - half - 4, at));
    tip.style.left = x + 'px';
    tip.style.top = hit.rect.top + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    const hit = celsiusAt(e.clientX, e.clientY);
    tip.hidden = !hit;
    if (hit) {
      showTip(hit, e.clientX);
    }
  });
  document.addEventListener('scroll', () => {
    tip.hidden = true;
  }, { passive: true });

  return { el, renders, P, setupCanvas, mix, jolt, drawLattice, fmt, footnotes, tr, say, resay };
})();
