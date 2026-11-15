(function () {
  const UI = window.UI;
  const KEY = 'metal-book-lang';
  const BLOCKS = 'h1, h2, h3, p, li, dt, dd, div.note, div.step, div.eyebrow';
  const CONTROLS = 'a, button, input, canvas, svg, summary';
  const here = UI.lang;
  const other = here === 'en' ? 'ru' : 'en';
  const file = location.pathname.split('/').pop() || 'index.html';
  const otherUrl = (here === 'en' ? 'ru/' : '../') + file;

  function collect(doc) {
    return Array.from(doc.querySelectorAll(BLOCKS)).filter((node) => !node.closest('nav') && !node.parentElement.closest(BLOCKS));
  }

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function remember(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {
      return;
    }
  }

  function barHeight() {
    const bar = document.querySelector('.topbar');
    return bar ? bar.offsetHeight : 0;
  }

  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (walker.nextNode()) {
      list.push(walker.currentNode);
    }
    return list;
  }

  const blocks = collect(document);
  document.querySelectorAll('.widget').forEach((widget) => {
    textNodes(widget).forEach((node) => {
      node.own = node.nodeValue;
    });
    widget.querySelectorAll('*').forEach((node) => {
      node.own = true;
    });
  });

  const jump = /^#b(\d+)$/.exec(location.hash);
  const fromOutside = !document.referrer || new URL(document.referrer).origin !== location.origin;
  if (!jump && fromOutside && stored() === other) {
    location.replace(otherUrl);
    return;
  }
  if (jump && blocks[+jump[1]]) {
    history.replaceState(null, '', location.pathname);
    window.addEventListener('load', () => {
      document.documentElement.style.scrollBehavior = 'auto';
      blocks[+jump[1]].scrollIntoView();
      window.scrollBy(0, -barHeight() - 12);
      document.documentElement.style.scrollBehavior = '';
    });
  }

  function currentBlock() {
    const i = blocks.findIndex((node) => node.getBoundingClientRect().bottom > barHeight() + 8);
    return window.scrollY < 40 || i < 0 ? null : i;
  }

  const box = document.createElement('div');
  box.className = 'theme-switch lang-switch';
  ['en', 'ru'].forEach((lang) => {
    const btn = document.createElement('button');
    btn.textContent = lang.toUpperCase();
    btn.classList.toggle('on', lang === here);
    btn.onclick = () => {
      remember(lang);
      if (lang !== here) {
        const i = currentBlock();
        location.href = otherUrl + (i === null ? '' : '#b' + i);
      }
    };
    box.append(btn);
  });
  (document.querySelector('.topbar') || document.body).append(box);

  function load(url) {
    return fetch(url).then((res) => (res.ok ? res.text() : Promise.reject(new Error(url + ' ' + res.status))));
  }

  function literal(source, name, open, close) {
    const start = source.indexOf('window.' + name + ' = ' + open);
    if (start < 0) {
      return null;
    }
    const from = source.indexOf(open, start);
    const to = source.indexOf('\n' + close + ';', from);
    return new Function('return ' + source.slice(from, to + 2))();
  }

  let loading = null;

  function otherPage() {
    if (!loading) {
      const uiTag = document.querySelector('script[src*="ui.' + here + '.js"]');
      loading = Promise.all([load(otherUrl), load(uiTag.src.replace('ui.' + here, 'ui.' + other))]).then(([html, ui]) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const list = collect(doc);
        if (list.length !== blocks.length) {
          return Promise.reject(new Error('block count ' + blocks.length + ' vs ' + list.length));
        }
        return { doc, blocks: list, strings: literal(html, 'T', '{', '}'), quiz: literal(html, 'QUIZ', '[', ']'), ui: literal(ui, 'UI', '{', '}') };
      });
      loading.catch((err) => {
        console.warn('peek unavailable:', err.message);
        chip.remove();
      });
    }
    return loading;
  }

  const touch = window.matchMedia('(hover: none)').matches;
  const kept = new Map();

  function swapBlock(node, page, on) {
    if (on === kept.has(node)) {
      return;
    }
    if (on) {
      kept.set(node, node.innerHTML);
      node.innerHTML = page.blocks[blocks.indexOf(node)].innerHTML;
      node.lang = other;
    } else {
      node.innerHTML = kept.get(node);
      kept.delete(node);
      node.removeAttribute('lang');
    }
    node.classList.toggle('peek', on);
    if (window.MB) {
      window.MB.footnotes(node);
    }
  }

  function swapStatic(mine, theirs, on) {
    const nodes = Array.from(mine.childNodes).filter((node) => node.own !== undefined);
    if (mine.said || mine.matches(BLOCKS) || nodes.length !== theirs.childNodes.length) {
      return;
    }
    nodes.forEach((node, i) => {
      const twin = theirs.childNodes[i];
      if (node.nodeType === 1 && twin.nodeType === 1) {
        swapStatic(node, twin, on);
      } else if (node.nodeType === 3 && twin.nodeType === 3 && node.own.trim()) {
        node.nodeValue = on ? twin.nodeValue : node.own;
      }
    });
  }

  function swapWidget(widget, page, on) {
    swapStatic(widget, page.doc.getElementById(widget.id), on);
    widget.strings = on ? page.strings : null;
    widget.classList.toggle('peek', on);
    blocks.filter((node) => widget.contains(node)).forEach((node) => swapBlock(node, page, on));
    window.MB.resay(widget);
  }

  function swapCard(card, page, on) {
    card.fill((on ? page.quiz : window.QUIZ)[card.index], on ? page.ui : UI);
    card.classList.toggle('peek', on);
  }

  function toggle(unit) {
    return otherPage().then((page) => {
      const on = !unit.classList.contains('peek');
      if (unit.classList.contains('widget')) {
        swapWidget(unit, page, on);
      } else if (unit.classList.contains('quiz-card')) {
        swapCard(unit, page, on);
      } else {
        swapBlock(unit, page, on);
      }
      place(unit);
    }, () => null);
  }

  function unitOf(node) {
    if (!node.closest) {
      return null;
    }
    const card = node.closest('.quiz-card');
    if (card) {
      return card;
    }
    let block = node.closest(BLOCKS);
    while (block && block.parentElement.closest(BLOCKS)) {
      block = block.parentElement.closest(BLOCKS);
    }
    if (block && blocks.includes(block)) {
      return block;
    }
    const widget = node.closest('.widget');
    return widget && widget.id && window.MB ? widget : null;
  }

  const chip = document.createElement('button');
  chip.className = 'peek-chip';
  chip.style.display = 'none';
  document.body.append(chip);
  let target = null;

  function place(unit) {
    if (touch) {
      return;
    }
    target = unit;
    const rect = unit.getBoundingClientRect();
    const on = unit.classList.contains('peek');
    chip.textContent = (on ? here : other).toUpperCase();
    chip.title = on ? UI.peekBack : UI.peekShow;
    chip.classList.toggle('on', on);
    chip.style.display = 'block';
    chip.style.top = rect.top + window.scrollY + 'px';
    chip.style.left = Math.max(4, rect.left - 46) + 'px';
  }

  chip.onclick = () => {
    if (target) {
      toggle(target);
    }
  };

  if (touch) {
    document.addEventListener('click', (e) => {
      if (e.target.closest(CONTROLS)) {
        return;
      }
      const unit = unitOf(e.target);
      if (unit && String(window.getSelection()) === '') {
        toggle(unit);
      }
    });
  } else {
    document.addEventListener('mouseover', (e) => {
      const unit = unitOf(e.target);
      if (unit) {
        place(unit);
      }
    });
  }
})();
