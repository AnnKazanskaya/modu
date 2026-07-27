// ============================================================
//  modu — каталог диванов
//  ЧТОБЫ ДОБАВИТЬ ДИВАН: добавьте объект в массив PRODUCTS ниже.
//  photos — список файлов из assets/photos/ (сколько угодно, 1–6).
// ============================================================
const PRODUCTS = [
  {
    name: 'Кремовая нежность',
    price: 'от 150 000 ₽',
    desc: 'Мягкий модульный диван с кушеткой. Глубокая посадка, объёмные подушки, букле кремового оттенка. Собираем под вашу комнату — длину, форму и ткань выбираете вы.',
    photos: ['sofa1-1.jpg', 'sofa1-2.jpg', 'sofa1-3.jpg'],
  },
  {
    name: 'Синий вечер',
    price: 'от 165 000 ₽',
    desc: 'Глубокий диван в синем велюре с мягкими подушками. Спокойный характер и обволакивающая посадка — для долгих вечеров. Размер и оттенок велюра — под ваш интерьер.',
    photos: ['sofa2-1.jpg', 'sofa2-2.jpg', 'sofa2-3.jpg'],
  },
  {
    name: 'Тихий шалфей',
    price: 'от 155 000 ₽',
    desc: 'Прямой трёхместный диван в мягком велюре оттенка шалфея. Спокойный природный цвет, чистые линии и глубокая посадка. Длину и ткань подбираем под вас.',
    photos: ['sofa3-1.jpg'],
  },
  {
    name: 'Медовый сон',
    price: 'от 140 000 ₽',
    desc: 'Мягкая кровать с объёмным изголовьем в тёплом букле медового оттенка. Основание — под любой матрас от 160 до 220 см. Уют, в который хочется нырнуть вечером.',
    photos: ['bed1-1.jpg'],
  },
  {
    name: 'Песочная дюна',
    price: 'от 145 000 ₽',
    desc: 'Кровать с фактурным изголовьем песочного оттенка и мягким основанием. Спокойный тёплый характер и опора под любой матрас 160–220 см.',
    photos: ['bed2-1.jpg', 'bed2-2.jpg'],
  },
];

const BASE = 'assets/photos/';
const MOBILE_PREVIEW = 4;      // сколько карточек показываем на телефоне до «Смотреть все»

// ---------- отрисовка карточек ----------
const grid = document.getElementById('pgrid');
const cardTimers = [];

function buildCards() {
  if (!grid) return;
  grid.innerHTML = '';
  PRODUCTS.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'pcard';
    card.dataset.i = i;

    const media = document.createElement('div');
    media.className = 'pcard__media';
    p.photos.forEach((src, k) => {
      const img = document.createElement('img');
      img.src = BASE + src;
      img.alt = p.name;
      img.loading = 'lazy';
      if (k === 0) img.classList.add('active');
      img.addEventListener('error', () => { img.style.display = 'none'; });
      media.appendChild(img);
    });

    const foot = document.createElement('div');
    foot.className = 'pcard__foot';
    foot.innerHTML = `<h3 class="pcard__name">${p.name}</h3><span class="pcard__price">${p.price}</span>`;

    card.appendChild(media);
    card.appendChild(foot);
    card.addEventListener('click', () => openModal(i));
    grid.appendChild(card);

    // автолистание фото в карточке (плавное перелистывание), со сдвигом старта
    const imgs = Array.from(media.querySelectorAll('img'));
    if (imgs.length > 1) {
      let a = 0;
      const t = setInterval(() => {
        imgs[a].classList.remove('active');
        a = (a + 1) % imgs.length;
        imgs[a].classList.add('active');
      }, 3200 + i * 700);
      cardTimers.push(t);
    }
  });

  setupCollapse();
}

// ---------- «Смотреть все» + туман на мобильном ----------
const wrap = document.getElementById('pgridWrap');
const moreBox = document.getElementById('pgridMore');
const showAllBtn = document.getElementById('showAll');
let expanded = false;

function isMobile() { return window.matchMedia('(max-width: 680px)').matches; }

function setupCollapse() {
  if (!wrap || !moreBox) return;
  const cards = Array.from(grid.children);
  const need = isMobile() && cards.length > MOBILE_PREVIEW && !expanded;
  if (need) {
    // высота = низ 4-й карточки + «подсматривание» следующего ряда (в тумане)
    const forth = cards[MOBILE_PREVIEW - 1];
    const h = forth.offsetTop + forth.offsetHeight + 150;
    wrap.classList.add('collapsed');
    wrap.style.maxHeight = h + 'px';
    moreBox.classList.add('show');
  } else {
    wrap.classList.remove('collapsed');
    wrap.style.maxHeight = '';
    moreBox.classList.remove('show');
  }
}

showAllBtn?.addEventListener('click', () => {
  expanded = true;
  wrap.classList.remove('collapsed');
  wrap.style.maxHeight = '';
  moreBox.classList.remove('show');
});

let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setupCollapse, 200); });

// ============================================================
//  Модалка — раскрытая карточка с каруселью
// ============================================================
const modal = document.getElementById('pmodal');
const pmTrack = document.getElementById('pmTrack');
const pmDots = document.getElementById('pmDots');
const pmPrev = document.getElementById('pmPrev');
const pmNext = document.getElementById('pmNext');
const pmName = document.getElementById('pmName');
const pmPrice = document.getElementById('pmPrice');
const pmDesc = document.getElementById('pmDesc');
let pmI = 0, pmCount = 0, pmAuto = null;

function openModal(i) {
  const p = PRODUCTS[i];
  pmName.textContent = p.name;
  pmPrice.textContent = p.price;
  pmDesc.textContent = p.desc;

  // слайды
  pmTrack.innerHTML = '';
  pmDots.innerHTML = '';
  const photos = p.photos.length ? p.photos : ['sofa1-1.jpg'];
  photos.forEach((src, k) => {
    const img = document.createElement('img');
    img.src = BASE + src; img.alt = p.name;
    img.addEventListener('error', () => { img.style.background = '#ECECEA'; });
    pmTrack.appendChild(img);
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'Фото ' + (k + 1));
    if (k === 0) d.classList.add('active');
    d.addEventListener('click', () => { pmGo(k); restartAuto(); });
    pmDots.appendChild(d);
  });
  pmCount = photos.length;
  pmI = 0;
  pmTrack.style.transform = 'translateX(0)';
  updateDots();
  const multi = pmCount > 1;
  pmPrev.style.display = pmNext.style.display = multi ? '' : 'none';

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  if (multi) startAuto();
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  stopAuto();
}

function pmGo(n) {
  pmI = (n + pmCount) % pmCount;
  pmTrack.style.transform = `translateX(-${pmI * 100}%)`;
  updateDots();
}
function updateDots() {
  Array.from(pmDots.children).forEach((d, k) => d.classList.toggle('active', k === pmI));
}
function startAuto() { stopAuto(); pmAuto = setInterval(() => pmGo(pmI + 1), 4000); }
function stopAuto() { if (pmAuto) { clearInterval(pmAuto); pmAuto = null; } }
function restartAuto() { if (pmCount > 1) startAuto(); }

pmPrev?.addEventListener('click', () => { pmGo(pmI - 1); restartAuto(); });
pmNext?.addEventListener('click', () => { pmGo(pmI + 1); restartAuto(); });
document.getElementById('pmodalClose')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') { pmGo(pmI - 1); restartAuto(); }
  if (e.key === 'ArrowRight') { pmGo(pmI + 1); restartAuto(); }
});

// свайп в модалке
let sx = null;
pmTrack?.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
pmTrack?.addEventListener('touchend', (e) => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 40) { pmGo(dx < 0 ? pmI + 1 : pmI - 1); restartAuto(); }
  sx = null;
});

// ---------- запуск ----------
buildCards();
