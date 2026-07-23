// ============================================================
//  modu — умная форма заказа
//  Собирает ответы в живую сводку и формирует готовую заявку.
//  Бэкенда нет: «Отправить» открывает готовое письмо (mailto),
//  «Скопировать» кладёт текст заявки в буфер.
// ============================================================

// !!! ЗАМЕНИТЕ на вашу реальную почту для приёма заявок:
const ORDER_EMAIL = 'hello@modu.ru';

// Палитра оттенков (как в конструкторе)
const COLORS = [
  { name: 'крем',  hex: '#EAE3D6' },
  { name: 'песок', hex: '#D8C7AC' },
  { name: 'овёс',  hex: '#C9B79B' },
  { name: 'глина', hex: '#B79A7B' },
  { name: 'тауп',  hex: '#9D8A77' },
  { name: 'мокко', hex: '#7E6B58' },
  { name: 'шалфей', hex: '#A7AA98' },
  { name: 'графит', hex: '#4A4A48' },
];

// Текущее состояние заявки
const order = {
  'Форма': 'Прямой',
  'Длина': '300 см',
  'Глубина': '100 см',
  'Жёсткость': 'Средний',
  'Ткань': 'Букле',
  'Оттенок': 'крем',
  'Бюджет': '150–250 тыс ₽',
  'Способ связи': 'Telegram',
};

// ---------- Сегментные кнопки ----------
document.querySelectorAll('.opts').forEach(box => {
  const field = box.dataset.field;
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      box.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      order[field] = btn.dataset.val;
      renderSummary();
    });
  });
});

// ---------- Ползунки размеров ----------
function bindRange(id, field, unit) {
  const el = document.getElementById(id);
  const lbl = document.getElementById(id + '-val');
  el.addEventListener('input', () => {
    const v = el.value + ' ' + unit;
    lbl.textContent = v;
    order[field] = v;
    renderSummary();
  });
}
bindRange('len', 'Длина', 'см');
bindRange('dep', 'Глубина', 'см');

// ---------- Оттенки ----------
const colorsBox = document.getElementById('colors');
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch' + (i === 0 ? ' active' : '');
  b.style.background = c.hex;
  b.title = c.name;
  b.setAttribute('aria-label', c.name);
  b.addEventListener('click', () => {
    colorsBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
    order['Оттенок'] = c.name;
    renderSummary();
  });
  colorsBox.appendChild(b);
});

// ---------- Живая сводка ----------
const summaryEl = document.getElementById('summary');
function renderSummary() {
  summaryEl.innerHTML = '';
  for (const [k, v] of Object.entries(order)) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    summaryEl.append(dt, dd);
  }
}
renderSummary();

// ---------- Сборка текста заявки ----------
function buildText() {
  const name = (document.getElementById('name').value || '').trim();
  const contact = (document.getElementById('contact').value || '').trim();
  const note = (document.getElementById('note').value || '').trim();

  let t = 'Заявка на диван modu\n\n';
  if (name) t += 'Имя: ' + name + '\n';
  for (const [k, v] of Object.entries(order)) t += k + ': ' + v + '\n';
  if (contact) t += 'Контакт: ' + contact + '\n';
  if (note) t += '\nКомментарий:\n' + note + '\n';
  return t;
}

// ---------- Тост ----------
const toast = document.getElementById('toast');
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ---------- Отправить (открыть письмо) ----------
document.getElementById('send').addEventListener('click', () => {
  const body = encodeURIComponent(buildText());
  const subject = encodeURIComponent('Заявка на диван — ' + order['Форма']);
  window.location.href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
  showToast('Открываем письмо… Если не открылось — нажмите «Скопировать».');
});

// ---------- Скопировать текст ----------
document.getElementById('copy').addEventListener('click', async () => {
  const text = buildText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Текст заявки скопирован — пришлите его нам в Telegram или на почту.');
  } catch {
    // запасной путь, если буфер недоступен
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    showToast('Текст заявки скопирован.');
  }
});
