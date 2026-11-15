(function () {
  const KEY = 'metal-book-theme';
  const MODES = [['light', window.UI.themeLight], ['dark', window.UI.themeDark], ['system', window.UI.themeSystem]];
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';
  try {
    mode = localStorage.getItem(KEY) || 'system';
  } catch (e) {
    mode = 'system';
  }

  function apply() {
    const resolved = mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = resolved;
    window.dispatchEvent(new Event('themechange'));
  }

  apply();
  mq.addEventListener('change', () => {
    if (mode === 'system') {
      apply();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div');
    box.className = 'theme-switch';
    const buttons = MODES.map(([value, label]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.onclick = () => {
        mode = value;
        try {
          localStorage.setItem(KEY, mode);
        } catch (e) {
          mode = value;
        }
        apply();
        mark();
      };
      box.append(btn);
      return btn;
    });
    function mark() {
      buttons.forEach((b, i) => b.classList.toggle('on', MODES[i][0] === mode));
    }
    mark();
    (document.querySelector('.topbar') || document.body).append(box);
  });
})();
