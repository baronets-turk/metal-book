(function () {
  const UI = window.UI;
  const KEY = 'metal-book-lang';
  const BLOCKS = 'h1, h2, h3, p, li, dt, dd, div.note, div.step, div.eyebrow';
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

  const blocks = collect(document);
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

  let loading = null;

  function otherBlocks() {
    if (!loading) {
      loading = fetch(otherUrl)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(res.status))))
        .then((html) => {
          const list = collect(new DOMParser().parseFromString(html, 'text/html'));
          if (list.length !== blocks.length) {
            return Promise.reject(new Error('block count ' + blocks.length + ' vs ' + list.length));
          }
          return list;
        });
      loading.catch((err) => {
        console.warn('peek unavailable:', err.message);
        chip.remove();
      });
    }
    return loading;
  }

  const saved = new Map();
  const touch = window.matchMedia('(hover: none)').matches;

  function toggle(node) {
    if (saved.has(node)) {
      node.innerHTML = saved.get(node);
      saved.delete(node);
      node.classList.remove('peek');
      node.removeAttribute('lang');
      refresh(node);
      return Promise.resolve();
    }
    return otherBlocks().then((list) => {
      saved.set(node, node.innerHTML);
      node.innerHTML = list[blocks.indexOf(node)].innerHTML;
      node.classList.add('peek');
      node.lang = other;
      refresh(node);
    }, () => null);
  }

  function refresh(node) {
    if (window.MB) {
      window.MB.footnotes(node);
    }
    place(node);
  }

  const chip = document.createElement('button');
  chip.className = 'peek-chip';
  chip.style.display = 'none';
  document.body.append(chip);
  let target = null;

  function place(node) {
    if (touch) {
      return;
    }
    target = node;
    const rect = node.getBoundingClientRect();
    const peeked = saved.has(node);
    chip.textContent = (peeked ? here : other).toUpperCase();
    chip.title = peeked ? UI.peekBack : UI.peekShow;
    chip.classList.toggle('on', peeked);
    chip.style.display = 'block';
    chip.style.top = rect.top + window.scrollY + 'px';
    chip.style.left = Math.max(4, rect.left - 46) + 'px';
  }

  chip.onclick = () => {
    if (target) {
      toggle(target);
    }
  };

  function blockOf(node) {
    const found = node.closest ? node.closest(BLOCKS) : null;
    if (!found) {
      return null;
    }
    let top = found;
    while (top.parentElement.closest(BLOCKS)) {
      top = top.parentElement.closest(BLOCKS);
    }
    return blocks.includes(top) ? top : null;
  }

  if (touch) {
    document.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, canvas, svg, summary')) {
        return;
      }
      const node = blockOf(e.target);
      if (node && String(window.getSelection()) === '') {
        toggle(node);
      }
    });
  } else {
    document.addEventListener('mouseover', (e) => {
      const node = blockOf(e.target);
      if (node) {
        place(node);
      }
    });
  }
})();
