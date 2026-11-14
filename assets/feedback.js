(function () {
  const KEY = 'metal-book-feedback';
  const TAGS = ['Непонятно', 'Похоже на ошибку', 'Хочу подробнее', 'Другое'];
  const page = location.pathname.split('/').pop() || 'index.html';
  let items = load();
  let pending = null;
  let tag = TAGS[0];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      return;
    }
  }

  function h(tagName, cls, text) {
    const node = document.createElement(tagName);
    if (cls) {
      node.className = cls;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function sectionFor(node) {
    let found = '';
    document.querySelectorAll('h1, h2, h3').forEach((x) => {
      if (x.closest('.fb')) {
        return;
      }
      if (x.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
        found = x.textContent.trim();
      }
    });
    return found;
  }

  function widgetInfo(w) {
    const title = w.querySelector('.widget-title strong');
    const state = Array.from(w.querySelectorAll('.caption, .meter-head'))
      .map((x) => Array.from(x.childNodes).map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' | ');
    return { widgetId: w.id, widgetTitle: title ? title.textContent.trim() : '', state: state };
  }

  function exportText() {
    const pages = [];
    items.forEach((it) => {
      if (!pages.includes(it.page)) {
        pages.push(it.page);
      }
    });
    const out = ['Замечания к учебнику metal-book', ''];
    let n = 0;
    pages.forEach((p) => {
      const list = items.filter((it) => it.page === p);
      out.push('Файл: ' + p + ' (' + list[0].pageTitle + ')');
      list.forEach((it) => {
        n++;
        out.push(n + '. [' + it.tag + '] Раздел: «' + it.section + '»');
        if (it.widgetId) {
          out.push('   Опыт: «' + it.widgetTitle + '» (#' + it.widgetId + ')');
        }
        if (it.quote) {
          out.push('   Выделенный текст: «' + it.quote + '»');
        }
        if (it.state) {
          out.push('   Состояние опыта: ' + it.state);
        }
        out.push('   Комментарий: ' + (it.comment || 'нет'));
      });
      out.push('');
    });
    return out.join('\n');
  }

  const root = h('div', 'fb');
  const markBtn = h('button', 'fb-mark', 'Отметить это место');
  const fab = h('button', 'fb-fab');
  const dialog = h('div', 'fb-card fb-dialog');
  const drawer = h('div', 'fb-card fb-drawer');
  root.append(markBtn, fab, dialog, drawer);
  document.body.append(root);

  function refreshFab() {
    fab.textContent = 'Замечания: ' + items.length;
  }

  function openDialog(data) {
    pending = data;
    tag = TAGS[0];
    markBtn.style.display = 'none';
    drawer.style.display = 'none';
    dialog.textContent = '';
    dialog.append(h('strong', '', data.widgetId && !data.quote ? 'Замечание к опыту «' + data.widgetTitle + '»' : 'Замечание к тексту'));
    if (data.quote) {
      dialog.append(h('blockquote', '', data.quote));
    }
    const chips = h('div', 'fb-chips');
    TAGS.forEach((t) => {
      const chip = h('button', 'fb-chip' + (t === tag ? ' on' : ''), t);
      chip.onclick = () => {
        tag = t;
        chips.querySelectorAll('.fb-chip').forEach((c) => c.classList.toggle('on', c === chip));
      };
      chips.append(chip);
    });
    const area = h('textarea');
    area.placeholder = 'Что именно не так или непонятно (можно оставить пустым)';
    const row = h('div', 'fb-row');
    const ok = h('button', '', 'Сохранить');
    const cancel = h('button', 'ghost', 'Отмена');
    ok.onclick = () => {
      items.push(Object.assign({ page: page, pageTitle: document.title, tag: tag, comment: area.value.trim() }, pending));
      save();
      refreshFab();
      dialog.style.display = 'none';
    };
    cancel.onclick = () => {
      dialog.style.display = 'none';
    };
    row.append(ok, cancel);
    dialog.append(chips, area, row);
    dialog.style.display = 'block';
    area.focus();
  }

  function copy(text, done) {
    const fallback = () => {
      const area = h('textarea');
      area.value = text;
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      area.remove();
      done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true), fallback);
    } else {
      fallback();
    }
  }

  function openDrawer() {
    dialog.style.display = 'none';
    drawer.textContent = '';
    drawer.append(h('strong', '', 'Замечания для доработки'));
    if (!items.length) {
      drawer.append(h('p', 'fb-muted', 'Пока пусто. Выдели любой текст на странице или нажми «Отметить» в углу опыта.'));
    }
    const list = h('div', 'fb-list');
    items.forEach((it, i) => {
      const item = h('div', 'fb-item');
      item.append(h('b', '', it.tag + ' · ' + it.page));
      item.append(h('div', 'fb-muted', it.quote ? '«' + it.quote.slice(0, 140) + (it.quote.length > 140 ? '…' : '') + '»' : 'Опыт «' + it.widgetTitle + '»'));
      if (it.comment) {
        item.append(h('div', '', it.comment));
      }
      const del = h('button', 'ghost fb-mini', 'Удалить');
      del.onclick = () => {
        items.splice(i, 1);
        save();
        refreshFab();
        openDrawer();
      };
      item.append(del);
      list.append(item);
    });
    const row = h('div', 'fb-row');
    const copyBtn = h('button', '', 'Скопировать для Claude');
    const clear = h('button', 'ghost', 'Очистить всё');
    const close = h('button', 'ghost', 'Закрыть');
    const manual = h('textarea', 'fb-manual');
    manual.readOnly = true;
    manual.style.display = 'none';
    copyBtn.disabled = !items.length;
    copyBtn.onclick = () => {
      const text = exportText();
      copy(text, (ok) => {
        copyBtn.textContent = ok ? 'Скопировано. Вставь в чат' : 'Не вышло: скопируй вручную ниже';
        if (!ok) {
          manual.value = text;
          manual.style.display = 'block';
          manual.select();
        }
      });
    };
    clear.onclick = () => {
      items = [];
      save();
      refreshFab();
      openDrawer();
    };
    close.onclick = () => {
      drawer.style.display = 'none';
    };
    row.append(copyBtn, clear, close);
    drawer.append(list, row, manual);
    drawer.style.display = 'block';
  }

  function onSelection() {
    const sel = window.getSelection();
    const text = sel ? sel.toString().replace(/\s+/g, ' ').trim() : '';
    if (!text || !sel.rangeCount) {
      markBtn.style.display = 'none';
      return;
    }
    const range = sel.getRangeAt(0);
    const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    if (!start || start.closest('.fb')) {
      return;
    }
    const rect = range.getBoundingClientRect();
    const w = start.closest('.widget');
    const data = Object.assign({ quote: text.slice(0, 600), section: sectionFor(start) }, w ? widgetInfo(w) : {});
    markBtn.style.display = 'block';
    markBtn.style.top = Math.min(window.innerHeight - 50, rect.bottom + 8) + 'px';
    markBtn.style.left = Math.max(8, Math.min(window.innerWidth - 190, rect.left)) + 'px';
    markBtn.onclick = () => openDialog(data);
  }

  markBtn.onmousedown = (e) => e.preventDefault();
  document.addEventListener('mouseup', () => setTimeout(onSelection, 0));
  document.addEventListener('touchend', () => setTimeout(onSelection, 0));
  document.addEventListener('scroll', () => {
    markBtn.style.display = 'none';
  }, { passive: true });
  fab.onclick = openDrawer;

  document.querySelectorAll('.widget').forEach((w) => {
    const head = w.querySelector('.widget-title');
    if (!head) {
      return;
    }
    const btn = h('button', 'ghost fb-mini', 'Отметить');
    btn.onclick = () => openDialog(Object.assign({ quote: '', section: sectionFor(w) }, widgetInfo(w)));
    head.append(btn);
  });

  refreshFab();
})();
