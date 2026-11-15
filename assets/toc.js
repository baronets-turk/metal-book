(function () {
  const bar = document.querySelector('.topbar');
  const heads = [];
  document.querySelectorAll('main section').forEach((section) => {
    const title = section.querySelector('h2');
    if (title) {
      heads.push({ mark: section.querySelector('.step') || title, text: title.textContent });
    }
  });
  document.querySelectorAll('main ~ div').forEach((block) => {
    const step = block.querySelector(':scope > .step');
    if (step) {
      heads.push({ mark: step, text: step.textContent.split(' · ')[0] });
    }
  });
  if (!bar || !heads.length) {
    return;
  }

  const wide = window.matchMedia('(min-width: 1440px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const home = bar.querySelector('a[href$="index.html"]');

  const nav = document.createElement('nav');
  nav.className = 'side-toc';
  if (home) {
    nav.setAttribute('aria-label', home.textContent.replace(/^[^\p{L}]+/u, '').trim());
  }
  const pct = document.createElement('div');
  pct.className = 'side-toc-pct';
  pct.setAttribute('aria-hidden', 'true');
  const list = document.createElement('div');
  list.className = 'side-toc-list';
  const fill = document.createElement('span');
  fill.className = 'side-toc-fill';
  list.append(fill);

  function go(mark) {
    const top = mark.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 16;
    window.scrollTo({ top, behavior: still.matches ? 'instant' : 'smooth' });
  }

  const links = heads.map((head) => {
    const link = document.createElement('a');
    const label = document.createElement('span');
    link.href = '#';
    label.textContent = head.text.replace(/\s+/g, ' ').trim();
    link.append(label);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      go(head.mark);
    });
    list.append(link);
    return link;
  });
  nav.append(pct, list);
  bar.after(nav);

  let current = -2;
  let shown = '';
  let queued = false;

  function reveal(link) {
    if (nav.scrollHeight <= nav.clientHeight) {
      return;
    }
    const top = list.offsetTop + link.offsetTop;
    if (top < nav.scrollTop || top + link.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTop = top - nav.clientHeight / 2;
    }
  }

  function update() {
    queued = false;
    if (!wide.matches) {
      return;
    }
    const doc = document.documentElement;
    const y = window.scrollY;
    const view = window.innerHeight;
    const top = bar.offsetHeight;
    const height = doc.scrollHeight;
    const max = height - view;
    const rest = Math.max(0, max - y);
    const ref = y + top + (view - top) * Math.min(1, Math.max(0.3, 1 - rest / (view - top)));
    const starts = heads.map((head) => head.mark.getBoundingClientRect().top + y);
    starts.push(height);

    let active = -1;
    for (let i = 0; i < heads.length; i++) {
      if (starts[i] <= ref) {
        active = i;
      }
    }

    if (active !== current) {
      current = active;
      links.forEach((link, i) => {
        link.classList.toggle('on', i === active);
        link.classList.toggle('done', i < active);
        if (i === active) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
      if (active >= 0) {
        reveal(links[active]);
      }
    }

    let reach = 0;
    if (active >= 0) {
      const span = starts[active + 1] - starts[active];
      const frac = span > 0 ? Math.min(1, Math.max(0, (ref - starts[active]) / span)) : 1;
      reach = links[active].offsetTop + frac * links[active].offsetHeight;
    }
    fill.style.height = reach + 'px';

    const text = Math.round(max > 0 ? Math.min(1, y / max) * 100 : 100) + ' %';
    if (text !== shown) {
      shown = text;
      pct.textContent = text;
    }
  }

  function queue() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  wide.addEventListener('change', queue);
  if (window.ResizeObserver) {
    new ResizeObserver(queue).observe(document.body);
  }
  queue();
})();
