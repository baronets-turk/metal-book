(function () {
  const box = document.getElementById('quiz-box');
  const data = window.QUIZ || [];
  const UI = window.UI;
  if (!box || !data.length) {
    return;
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

  function build() {
    box.textContent = '';
    let answered = 0;
    let right = 0;
    const count = (text, n) => text.replace('{n}', n).replace('{total}', data.length);
    const total = h('div', 'quiz-total', count(UI.quizAnswered, 0));
    data.forEach((item, i) => {
      const card = h('div', 'quiz-card');
      card.append(h('div', 'quiz-q', (i + 1) + '. ' + item.q));
      const why = h('div', 'quiz-why');
      const buttons = item.options.map((text, k) => {
        const btn = h('button', 'quiz-opt', text);
        btn.onclick = () => {
          buttons.forEach((b) => {
            b.disabled = true;
          });
          buttons[item.answer].classList.add('right');
          if (k === item.answer) {
            right++;
          } else {
            btn.classList.add('wrong');
          }
          answered++;
          why.textContent = (k === item.answer ? UI.quizRight : UI.quizWrong) + ' ' + item.why + ' ' + UI.quizSection.replace('{name}', item.where);
          why.style.display = 'block';
          total.textContent = answered < data.length
            ? count(UI.quizAnswered, answered)
            : count(UI.quizResult, right);
          again.style.display = answered === data.length ? 'inline-block' : 'none';
        };
        return btn;
      });
      card.append(...buttons, why);
      box.append(card);
    });
    const again = h('button', 'ghost', UI.quizAgain);
    again.style.display = 'none';
    again.onclick = build;
    const row = h('div', 'quiz-end');
    row.append(total, again);
    box.append(row);
  }

  build();
})();
